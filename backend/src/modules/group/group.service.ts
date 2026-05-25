import {
  NotFoundError,
  ForbiddenError,
  FreeQuotaExceededError,
  ConflictError,
} from "../../lib/errors";
import { config } from "../../config";
import { isUserPremium } from "../../lib/entitlement";
import {
  AppUser,
  Balance,
  cleanForFirestore,
  collectionNames,
  collectionRef,
  createId,
  docRef,
  getDoc,
  getQuery,
  groupMemberId,
  Group,
  GroupMember,
  balanceId,
} from "../../lib/firestore-db";

interface CreateGroupInput {
  name: string;
  category: string;
  members?: string[];
}

interface UpdateGroupInput {
  name?: string;
  category?: string;
}

export async function createGroup(userId: string, input: CreateGroupInput) {
  if (!(await isUserPremium(userId))) {
    const activeGroups = await getQuery<Group>(
      collectionRef(collectionNames.groups)
        .where("ownerId", "==", userId)
        .where("status", "==", "active"),
    );
    if (activeGroups.length >= config.freeTier.maxGroups) {
      throw new FreeQuotaExceededError(
        `Free tier limit of ${config.freeTier.maxGroups} groups reached`,
      );
    }
  }

  const now = new Date();
  const group: Group = {
    id: createId(),
    name: input.name,
    category: input.category,
    ownerId: userId,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  const membership: GroupMember = {
    groupId: group.id,
    userId,
    role: "owner",
    joinedAt: now,
    isActive: true,
  };
  const balance: Balance = {
    groupId: group.id,
    userId,
    balance: 0,
  };

  const batch = collectionRef(collectionNames.groups).firestore.batch();
  batch.set(docRef(collectionNames.groups, group.id), cleanForFirestore(group));
  batch.set(
    docRef(collectionNames.groupMembers, groupMemberId(group.id, userId)),
    cleanForFirestore(membership),
  );
  batch.set(
    docRef(collectionNames.balances, balanceId(group.id, userId)),
    cleanForFirestore(balance),
  );
  // add optional initial members
  if (input.members && Array.isArray(input.members) && input.members.length > 0) {
    const unique = Array.from(new Set(input.members));
    for (const memberId of unique) {
      if (memberId === userId) continue;
      const userExists = await getDoc<AppUser>(collectionNames.users, memberId);
      if (!userExists) continue;

      const member: GroupMember = {
        groupId: group.id,
        userId: memberId,
        role: "member",
        joinedAt: now,
        isActive: true,
      };

      batch.set(
        docRef(collectionNames.groupMembers, groupMemberId(group.id, memberId)),
        cleanForFirestore(member),
      );

      batch.set(
        docRef(collectionNames.balances, balanceId(group.id, memberId)),
        cleanForFirestore({ groupId: group.id, userId: memberId, balance: 0 }),
        { merge: true },
      );
    }
  }

  await batch.commit();

  return group;
}

export async function getGroups(userId: string) {
  const memberships = await getQuery<GroupMember>(
    collectionRef(collectionNames.groupMembers)
      .where("userId", "==", userId)
      .where("isActive", "==", true),
  );

  const groups = await Promise.all(
    memberships.map(async (membership) => {
      const group = await getDoc<Group>(collectionNames.groups, membership.groupId);
      if (!group) return null;
      const activeMembers = await getActiveMembers(group.id);

      // fetch latest activity (audit log) for this group
      const logs = (
        await getQuery(
          collectionRef(collectionNames.auditLogs)
            .where("entityType", "==", "group")
            .where("entityId", "==", group.id),
        )
      ).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());

      let latestActivity: { description: string; time: string; actorDisplayName?: string } | null = null;
      if (logs.length > 0) {
        const log = logs[0];
        const actor = await getDoc<AppUser>(collectionNames.users, log.actorUserId);
        latestActivity = {
          description: log.action,
          time: log.createdAt.toISOString(),
          actorDisplayName: actor?.displayName ?? undefined,
        };
      }

      return {
        ...group,
        role: membership.role,
        memberCount: activeMembers.length,
        latestActivity,
      };
    }),
  );

  return groups
    .filter((group): group is Group & { role: string } => group !== null)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getGroup(groupId: string, userId: string) {
  const membership = await getMembership(groupId, userId);
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }

  const group = await getDoc<Group>(collectionNames.groups, groupId);
  if (!group) {
    throw new NotFoundError("Group not found");
  }

  const activeMembers = await getActiveMembers(groupId);

  return {
    ...group,
    role: membership.role,
    memberCount: activeMembers.length,
  };
}

export async function updateGroup(
  groupId: string,
  userId: string,
  input: UpdateGroupInput,
) {
  await assertOwnerOrAdmin(groupId, userId);

  const group = await getDoc<Group>(collectionNames.groups, groupId);
  if (!group) {
    throw new NotFoundError("Group not found");
  }

  const updated: Group = {
    ...group,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.category !== undefined && { category: input.category }),
    updatedAt: new Date(),
  };

  await docRef(collectionNames.groups, groupId).set(cleanForFirestore(updated));
  return updated;
}

export async function closeGroup(groupId: string, userId: string) {
  await assertOwnerOrAdmin(groupId, userId);

  const group = await getDoc<Group>(collectionNames.groups, groupId);
  if (!group) {
    throw new NotFoundError("Group not found");
  }

  const updated: Group = {
    ...group,
    status: "closed",
    updatedAt: new Date(),
  };

  await docRef(collectionNames.groups, groupId).set(cleanForFirestore(updated));
  return updated;
}

export async function getMembers(groupId: string, userId: string) {
  const membership = await getMembership(groupId, userId);
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }

  const members = await getActiveMembers(groupId);
  const users = await Promise.all(
    members.map(async (member) => ({
      member,
      user: await getDoc<AppUser>(collectionNames.users, member.userId),
    })),
  );

  return users
    .filter((entry) => entry.user !== null)
    .sort((a, b) => a.member.joinedAt.getTime() - b.member.joinedAt.getTime())
    .map(({ member, user }) => ({
      userId: member.userId,
      displayName: user!.displayName,
      email: user!.email,
      avatarUrl: user!.avatarUrl,
      role: member.role,
      joinedAt: member.joinedAt,
    }));
}

export async function addMember(
  groupId: string,
  userId: string,
  targetUserId: string,
  role: string = "member",
) {
  await assertOwnerOrAdmin(groupId, userId);

  const targetUser = await getDoc<AppUser>(collectionNames.users, targetUserId);
  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  const existing = await getMembership(groupId, targetUserId);
  if (existing) {
    if (existing.isActive) {
      throw new ConflictError("User is already a member of this group");
    }

    const updated: GroupMember = {
      ...existing,
      isActive: true,
      role,
      joinedAt: new Date(),
    };
    await docRef(
      collectionNames.groupMembers,
      groupMemberId(groupId, targetUserId),
    ).set(cleanForFirestore(updated));
    await ensureBalance(groupId, targetUserId);
    return { userId: targetUserId, role, joinedAt: updated.joinedAt };
  }

  const member: GroupMember = {
    groupId,
    userId: targetUserId,
    role,
    joinedAt: new Date(),
    isActive: true,
  };

  const batch = collectionRef(collectionNames.groupMembers).firestore.batch();
  batch.set(
    docRef(collectionNames.groupMembers, groupMemberId(groupId, targetUserId)),
    cleanForFirestore(member),
  );
  batch.set(
    docRef(collectionNames.balances, balanceId(groupId, targetUserId)),
    cleanForFirestore({ groupId, userId: targetUserId, balance: 0 }),
    { merge: true },
  );
  await batch.commit();

  return {
    userId: member.userId,
    role: member.role,
    joinedAt: member.joinedAt,
  };
}

export async function updateMemberRole(
  groupId: string,
  userId: string,
  targetUserId: string,
  newRole: string,
) {
  await assertOwnerOrAdmin(groupId, userId);

  const member = await getMembership(groupId, targetUserId);
  if (!member || !member.isActive) {
    throw new NotFoundError("Member not found");
  }

  if (member.role === "owner") {
    throw new ForbiddenError("Cannot change the owner's role");
  }

  const updated: GroupMember = {
    ...member,
    role: newRole,
  };
  await docRef(
    collectionNames.groupMembers,
    groupMemberId(groupId, targetUserId),
  ).set(cleanForFirestore(updated));

  return {
    userId: updated.userId,
    role: updated.role,
    joinedAt: updated.joinedAt,
  };
}

export async function removeMember(
  groupId: string,
  userId: string,
  targetUserId: string,
) {
  // If the requester is removing someone else, require owner.
  if (userId !== targetUserId) {
    await assertOwner(groupId, userId);
  }

  const member = await getMembership(groupId, targetUserId);
  if (!member || !member.isActive) {
    throw new NotFoundError("Member not found");
  }

  // Owner cannot remove themselves; they must delete the group instead.
  if (member.role === "owner" && userId === targetUserId) {
    throw new ForbiddenError("Owner cannot remove themselves");
  }

  await docRef(
    collectionNames.groupMembers,
    groupMemberId(groupId, targetUserId),
  ).set(cleanForFirestore({ ...member, isActive: false }));
}

export async function deleteGroup(groupId: string, userId: string) {
  await assertOwner(groupId, userId);

  // delete group and related documents: members, balances, expenses, settlements, reminders, audit logs
  const batch = collectionRef(collectionNames.groups).firestore.batch();

  // delete group doc
  batch.delete(docRef(collectionNames.groups, groupId));

  // delete group members
  const members = await getQuery<GroupMember>(
    collectionRef(collectionNames.groupMembers).where("groupId", "==", groupId),
  );
  members.forEach((m) => batch.delete(docRef(collectionNames.groupMembers, m.id)));

  // delete balances
  const balances = await getQuery<Balance>(
    collectionRef(collectionNames.balances).where("groupId", "==", groupId),
  );
  balances.forEach((b) => batch.delete(docRef(collectionNames.balances, b.id)));

  // delete expenses
  const expenses = await getQuery<any>(
    collectionRef(collectionNames.expenses).where("groupId", "==", groupId),
  );
  expenses.forEach((e) => batch.delete(docRef(collectionNames.expenses, e.id)));

  // delete settlements
  const settlements = await getQuery<any>(
    collectionRef(collectionNames.settlements).where("groupId", "==", groupId),
  );
  settlements.forEach((s) => batch.delete(docRef(collectionNames.settlements, s.id)));

  // delete reminders
  const reminders = await getQuery<any>(
    collectionRef(collectionNames.reminders).where("groupId", "==", groupId),
  );
  reminders.forEach((r) => batch.delete(docRef(collectionNames.reminders, r.id)));

  // delete audit logs for this group
  const logs = await getQuery<any>(
    collectionRef(collectionNames.auditLogs).where("entityType", "==", "group").where("entityId", "==", groupId),
  );
  logs.forEach((l) => batch.delete(docRef(collectionNames.auditLogs, l.id)));

  await batch.commit();
}

async function getMembership(groupId: string, userId: string) {
  return getDoc<GroupMember>(
    collectionNames.groupMembers,
    groupMemberId(groupId, userId),
  );
}

async function getActiveMembers(groupId: string) {
  return getQuery<GroupMember>(
    collectionRef(collectionNames.groupMembers)
      .where("groupId", "==", groupId)
      .where("isActive", "==", true),
  );
}

async function ensureBalance(groupId: string, userId: string) {
  const existing = await getDoc<Balance>(
    collectionNames.balances,
    balanceId(groupId, userId),
  );
  if (existing) {
    return;
  }

  await docRef(collectionNames.balances, balanceId(groupId, userId)).set(
    cleanForFirestore({ groupId, userId, balance: 0 }),
  );
}

async function assertOwner(groupId: string, userId: string) {
  const membership = await getMembership(groupId, userId);

  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }
  if (membership.role !== "owner") {
    throw new ForbiddenError("Only the owner can perform this action");
  }
}

async function assertOwnerOrAdmin(groupId: string, userId: string) {
  const membership = await getMembership(groupId, userId);

  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new ForbiddenError("Insufficient permissions");
  }
}
