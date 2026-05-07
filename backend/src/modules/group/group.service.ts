import { prisma } from "../../lib/prisma";
import {
  NotFoundError,
  ForbiddenError,
  FreeQuotaExceededError,
  ConflictError,
} from "../../lib/errors";
import { config } from "../../config";

interface CreateGroupInput {
  name: string;
  category: string;
}

interface UpdateGroupInput {
  name?: string;
  category?: string;
}

function isPremiumPlan(plan: string): boolean {
  return plan === "premium";
}

export async function createGroup(userId: string, input: CreateGroupInput) {
  // Check subscription for free tier quota
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = subscription?.plan ?? "free";

  if (!isPremiumPlan(plan)) {
    const activeGroupCount = await prisma.group.count({
      where: { ownerId: userId, status: "active" },
    });
    if (activeGroupCount >= config.freeTier.maxGroups) {
      throw new FreeQuotaExceededError(
        `Free tier limit of ${config.freeTier.maxGroups} groups reached`,
      );
    }
  }

  const group = await prisma.group.create({
    data: {
      name: input.name,
      category: input.category,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: "owner",
        },
      },
    },
  });

  return {
    id: group.id,
    name: group.name,
    category: group.category,
    ownerId: group.ownerId,
    status: group.status,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export async function getGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId, isActive: true },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          category: true,
          ownerId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
    orderBy: { group: { updatedAt: "desc" } },
  });

  return memberships.map((m) => ({
    ...m.group,
    role: m.role,
  }));
}

export async function getGroup(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId },
  });
  if (!group) {
    throw new NotFoundError("Group not found");
  }

  return {
    ...group,
    role: membership.role,
    memberCount: await prisma.groupMember.count({
      where: { groupId, isActive: true },
    }),
  };
}

export async function updateGroup(
  groupId: string,
  userId: string,
  input: UpdateGroupInput,
) {
  await assertOwnerOrAdmin(groupId, userId);

  const group = await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.category !== undefined && { category: input.category }),
    },
  });

  return group;
}

export async function closeGroup(groupId: string, userId: string) {
  await assertOwnerOrAdmin(groupId, userId);

  const group = await prisma.group.update({
    where: { id: groupId },
    data: { status: "closed" },
  });

  return group;
}

export async function getMembers(groupId: string, userId: string) {
  // Verify request user is a member
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }

  const members = await prisma.groupMember.findMany({
    where: { groupId, isActive: true },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  return members.map((m) => ({
    userId: m.userId,
    displayName: m.user.displayName,
    email: m.user.email,
    avatarUrl: m.user.avatarUrl,
    role: m.role,
    joinedAt: m.joinedAt,
  }));
}

export async function addMember(
  groupId: string,
  userId: string,
  targetUserId: string,
  role: string = "member",
) {
  await assertOwnerOrAdmin(groupId, userId);

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });
  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
  if (existing) {
    if (existing.isActive) {
      throw new ConflictError("User is already a member of this group");
    }
    await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: targetUserId } },
      data: { isActive: true, role },
    });
    return { userId: targetUserId, role, joinedAt: new Date() };
  }

  const member = await prisma.groupMember.create({
    data: {
      groupId,
      userId: targetUserId,
      role,
    },
  });

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

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
  if (!member || !member.isActive) {
    throw new NotFoundError("Member not found");
  }

  if (member.role === "owner") {
    throw new ForbiddenError("Cannot change the owner\'s role");
  }

  const updated = await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: targetUserId } },
    data: { role: newRole },
  });

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
  await assertOwner(groupId, userId);

  if (userId === targetUserId) {
    throw new ForbiddenError("Owner cannot remove themselves");
  }

  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: targetUserId } },
  });
  if (!member || !member.isActive) {
    throw new NotFoundError("Member not found");
  }

  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: targetUserId } },
    data: { isActive: false },
  });
}

// --- Helper functions ---

async function assertOwner(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }
  if (membership.role !== "owner") {
    throw new ForbiddenError("Only the owner can perform this action");
  }
}

async function assertOwnerOrAdmin(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }
  if (membership.role !== "owner" && membership.role !== "admin") {
    throw new ForbiddenError("Insufficient permissions");
  }
}

