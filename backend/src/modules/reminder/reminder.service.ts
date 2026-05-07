import { prisma } from "../../lib/prisma";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../lib/errors";
import { assertGroupMember, assertPremiumGroup } from "../../lib/entitlement";

interface CreateReminderInput {
  targetUserIds: string[];
  channel?: string;
  messageTemplate?: string;
  scheduledAt?: string;
}

/**
 * POST /groups/:groupId/reminders
 * Create debt reminders for specified target users (Premium).
 * One reminder is created per target user.
 */
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

  // Validate that each target user is an active group member
  const memberIds = new Set(
    (
      await prisma.groupMember.findMany({
        where: { groupId, isActive: true },
        select: { userId: true },
      })
    ).map((m: { userId: string }) => m.userId),
  );

  for (const tid of targetUserIds) {
    if (!memberIds.has(tid)) {
      throw new ValidationError(`User ${tid} is not an active group member`);
    }
  }

  // Validate each target user has balance < 0 (is in debt)
  const balances = await prisma.balance.findMany({
    where: { groupId, userId: { in: targetUserIds } },
  });
  const balanceMap = new Map<string, number>(balances.map((b: { userId: string; balance: number }) => [b.userId, b.balance]));

  for (const tid of targetUserIds) {
    const bal = balanceMap.get(tid) ?? 0;
    if (bal >= 0) {
      throw new ValidationError(
        `User ${tid} does not have a negative balance (current: ${bal}). Only users in debt can be reminded.`,
      );
    }
  }

  // Validate no duplicate reminder within 24h for same (target + group + message template)
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const recentReminders = await prisma.reminder.findMany({
    where: {
      groupId,
      targetUserId: { in: targetUserIds },
      message: messageTemplate ?? undefined,
      createdAt: { gte: twentyFourHoursAgo },
    },
    select: { targetUserId: true },
  });

  const recentTargets = new Set(recentReminders.map((r: { targetUserId: string }) => r.targetUserId));
  const duplicateTargets = targetUserIds.filter((tid) => recentTargets.has(tid));

  if (duplicateTargets.length > 0) {
    throw new ValidationError(
      `Reminders for users [${duplicateTargets.join(", ")}] were already sent within the last 24 hours`,
    );
  }

  // Build the message
  const defaultMessage = "Please settle your outstanding debt in the group.";
  const message = messageTemplate || defaultMessage;

  // Create one reminder per target user
  const reminders = await Promise.all(
    targetUserIds.map((tid) =>
      prisma.reminder.create({
        data: {
          groupId,
          targetUserId: tid,
          type: "debt_reminder",
          status: "queued",
          message,
          channel,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
          createdBy: userId,
        },
        include: {
          targetUser: { select: { id: true, displayName: true, email: true } },
          creator: { select: { id: true, displayName: true, email: true } },
        },
      }),
    ),
  );

  return reminders;
}

/**
 * GET /groups/:groupId/reminders
 * List reminders with pagination.
 */
export async function getReminders(
  groupId: string,
  userId: string,
  page: number = 1,
  limit: number = 20,
) {
  await assertGroupMember(groupId, userId);

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.reminder.findMany({
      where: { groupId },
      skip,
      take: limit,
      include: {
        targetUser: { select: { id: true, displayName: true, email: true } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.reminder.count({ where: { groupId } }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * POST /groups/:groupId/reminders/:reminderId/cancel
 * Cancel a reminder (only the creator can cancel).
 */
export async function cancelReminder(
  groupId: string,
  reminderId: string,
  userId: string,
) {
  await assertGroupMember(groupId, userId);

  const reminder = await prisma.reminder.findFirst({
    where: { id: reminderId, groupId },
  });

  if (!reminder) {
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

  const updated = await prisma.reminder.update({
    where: { id: reminderId },
    data: { status: "failed" },
    include: {
      targetUser: { select: { id: true, displayName: true, email: true } },
      creator: { select: { id: true, displayName: true, email: true } },
    },
  });

  return updated;
}
