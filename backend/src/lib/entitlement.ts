import { prisma } from "./prisma";
import { NotFoundError, PremiumRequiredError } from "./errors";
import { config } from "../config";

type SubscriptionLike = {
  plan: string;
  status: string;
  currentPeriodEnd?: Date | null;
} | null;

export function isPremiumSubscriptionActive(
  subscription: SubscriptionLike,
  now = new Date(),
): boolean {
  if (!subscription || subscription.plan !== "premium") {
    return false;
  }

  if (["trialing", "active", "grace_period"].includes(subscription.status)) {
    return true;
  }

  if (subscription.status === "canceled") {
    return (
      subscription.currentPeriodEnd !== null &&
      subscription.currentPeriodEnd !== undefined &&
      subscription.currentPeriodEnd > now
    );
  }

  return false;
}

export async function getGroupOwnerSubscription(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: {
      ownerId: true,
      owner: {
        select: {
          subscription: true,
        },
      },
    },
  });
  if (!group) {
    throw new NotFoundError("Group not found");
  }

  return {
    ownerId: group.ownerId,
    subscription: group.owner.subscription,
  };
}

export async function isUserPremium(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  return isPremiumSubscriptionActive(subscription);
}

export async function isGroupOwnerPremium(groupId: string): Promise<boolean> {
  const { subscription } = await getGroupOwnerSubscription(groupId);
  return isPremiumSubscriptionActive(subscription);
}

/**
 * Assert that the given user is an active member of the group.
 * Throws NotFoundError if not.
 */
export async function assertGroupMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }
  return membership;
}

/**
 * Assert that the group's owner has an active Premium subscription.
 * Throws PremiumRequiredError if not.
 */
export async function assertPremiumGroup(groupId: string, _userId?: string) {
  const { subscription } = await getGroupOwnerSubscription(groupId);
  if (!isPremiumSubscriptionActive(subscription)) {
    throw new PremiumRequiredError(
      "This group requires a Premium subscription to use this feature",
    );
  }
}

/**
 * Compute the cutoff date for free-tier history access.
 * Returns a Date that is `historyDays` days in the past.
 */
export function getFreeHistoryCutoff(): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.freeTier.historyDays);
  return cutoff;
}
