import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { config } from "../../config";

interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string | null;
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return user;
}

export async function updateMe(userId: string, input: UpdateProfileInput) {
  if (input.displayName !== undefined && input.displayName.trim().length === 0) {
    throw new ValidationError("Display name cannot be empty");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.displayName !== undefined && { displayName: input.displayName }),
      ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
    },
    select: {
      id: true,
      displayName: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
    },
  });
  return user;
}

export async function getSubscription(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (!subscription) {
    return {
      plan: "free",
      status: "active",
      currentPeriodStart: null,
      currentPeriodEnd: null,
    };
  }
  return {
    plan: subscription.plan,
    status: subscription.status,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
  };
}

export async function getUsage(userId: string) {
  const groupCount = await prisma.group.count({
    where: { ownerId: userId, status: "active" },
  });

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const smartSettleCount = await prisma.auditLog.count({
    where: {
      actorUserId: userId,
      action: "smart_settle",
      createdAt: { gte: startOfMonth },
    },
  });

  return {
    groupCount,
    smartSettleUsedThisMonth: smartSettleCount,
    freeMaxGroups: config.freeTier.maxGroups,
    freeSmartSettlePerMonth: config.freeTier.smartSettlePerMonth,
  };
}
