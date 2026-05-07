import { prisma } from "./prisma";
import { NotFoundError, PremiumRequiredError } from "./errors";
import { config } from "../config";
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
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { ownerId: true },
  });
  if (!group) {
    throw new NotFoundError("Group not found");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: group.ownerId },
  });

  const plan = subscription?.plan ?? "free";
  const status = subscription?.status ?? "active";

  if (plan !== "premium") {
    throw new PremiumRequiredError(
      "This group requires a Premium subscription to use this feature",
    );
  }
  if (status === "expired") {
    throw new PremiumRequiredError(
      "The Premium subscription for this group has expired",
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
