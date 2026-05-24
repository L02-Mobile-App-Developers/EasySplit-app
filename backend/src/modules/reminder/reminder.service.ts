import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../lib/errors";
import { assertGroupMember, assertPremiumGroup } from "../../lib/entitlement";
import {
  Balance,
  cleanForFirestore,
  collectionNames,
  collectionRef,
  createId,
  docRef,
  getDoc,
  getQuery,
  GroupMember,
  paginate,
  publicUserMap,
  Reminder,
  sortByDateDesc,
} from "../../lib/firestore-db";

interface CreateReminderInput {
  targetUserIds: string[];
  channel?: string;
  messageTemplate?: string;
  scheduledAt?: string;
}

export async function createReminder(
  groupId: string,
  userId: string,
  input: CreateReminderInput,
) {
  await assertGroupMember(groupId, userId);
  await assertPremiumGroup(groupId, userId);

  const { targetUserIds, channel = "in_app", messageTemplate, scheduledAt } = input;

  if (!targetUserIds || targetUserIds.length === 0) {
    throw new ValidationError("At least one targetUserId is required");
  }

  const activeMembers = await getQuery<GroupMember>(
    collectionRef(collectionNames.groupMembers)
      .where("groupId", "==", groupId)
      .where("isActive", "==", true),
  );
  const memberIds = new Set(activeMembers.map((member) => member.userId));

  for (const targetUserId of targetUserIds) {
    if (!memberIds.has(targetUserId)) {
      throw new ValidationError(
        `User ${targetUserId} is not an active group member`,
      );
    }
  }

  const balances = await getQuery<Balance>(
    collectionRef(collectionNames.balances).where("groupId", "==", groupId),
  );
  const balanceMap = new Map(
    balances.map((balance) => [balance.userId, balance.balance]),
  );

  for (const targetUserId of targetUserIds) {
    const balance = balanceMap.get(targetUserId) ?? 0;
    if (balance >= 0) {
      throw new ValidationError(
        `User ${targetUserId} does not have a negative balance (current: ${balance}). Only users in debt can be reminded.`,
      );
    }
  }

  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const recentReminders = (
    await getQuery<Reminder>(
      collectionRef(collectionNames.reminders).where("groupId", "==", groupId),
    )
  ).filter(
    (reminder) =>
      targetUserIds.includes(reminder.targetUserId) &&
      reminder.createdAt >= twentyFourHoursAgo &&
      (messageTemplate === undefined || reminder.message === messageTemplate),
  );

  const recentTargets = new Set(
    recentReminders.map((reminder) => reminder.targetUserId),
  );
  const duplicateTargets = targetUserIds.filter((targetUserId) =>
    recentTargets.has(targetUserId),
  );

  if (duplicateTargets.length > 0) {
    throw new ValidationError(
      `Reminders for users [${duplicateTargets.join(", ")}] were already sent within the last 24 hours`,
    );
  }

  const message = messageTemplate || "Please settle your outstanding debt in the group.";
  const now = new Date();
  const reminders: Reminder[] = targetUserIds.map((targetUserId) => ({
    id: createId(),
    groupId,
    targetUserId,
    type: "debt_reminder",
    status: "queued",
    message,
    channel,
    scheduledAt: scheduledAt ? new Date(scheduledAt) : now,
    createdBy: userId,
    createdAt: now,
  }));

  const batch = collectionRef(collectionNames.reminders).firestore.batch();
  for (const reminder of reminders) {
    batch.set(
      docRef(collectionNames.reminders, reminder.id),
      cleanForFirestore(reminder),
    );
  }
  await batch.commit();

  return Promise.all(reminders.map(enrichReminder));
}

export async function getReminders(
  groupId: string,
  userId: string,
  page: number = 1,
  limit: number = 20,
) {
  await assertGroupMember(groupId, userId);

  const reminders = sortByDateDesc(
    await getQuery<Reminder>(
      collectionRef(collectionNames.reminders).where("groupId", "==", groupId),
    ),
    (reminder) => reminder.createdAt,
  );
  const result = paginate(reminders, page, limit);

  return {
    items: await Promise.all(result.items.map(enrichReminder)),
    pagination: result.pagination,
  };
}

export async function cancelReminder(
  groupId: string,
  reminderId: string,
  userId: string,
) {
  await assertGroupMember(groupId, userId);

  const reminder = await getDoc<Reminder>(
    collectionNames.reminders,
    reminderId,
  );

  if (!reminder || reminder.groupId !== groupId) {
    throw new NotFoundError("Reminder not found");
  }

  if (reminder.createdBy !== userId) {
    throw new ForbiddenError("Only the reminder creator can cancel this reminder");
  }

  if (reminder.status !== "queued") {
    throw new ValidationError(
      `Cannot cancel reminder with status "${reminder.status}". Only queued reminders can be canceled.`,
    );
  }

  const updated: Reminder = {
    ...reminder,
    status: "failed",
  };

  await docRef(collectionNames.reminders, reminderId).set(
    cleanForFirestore(updated),
  );

  return enrichReminder(updated);
}

async function enrichReminder(reminder: Reminder) {
  const users = await publicUserMap([reminder.targetUserId, reminder.createdBy]);

  return {
    ...reminder,
    targetUser: users.get(reminder.targetUserId) ?? null,
    creator: users.get(reminder.createdBy) ?? null,
  };
}
