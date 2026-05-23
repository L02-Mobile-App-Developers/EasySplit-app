import { NotFoundError, PremiumRequiredError } from "./errors";
import { config } from "../config";
import {
  collectionNames,
  getDoc,
  groupMemberId,
  Group,
  GroupMember,
  Subscription,
  subscriptionId,
} from "./firestore-db";

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
  const group = await getDoc<Group>(collectionNames.groups, groupId);
  if (!group) {
    throw new NotFoundError("Group not found");
  }

  const subscription = await getDoc<Subscription>(
    collectionNames.subscriptions,
    subscriptionId(group.ownerId),
  );

  return {
    ownerId: group.ownerId,
    subscription,
  };
}

export async function isUserPremium(userId: string): Promise<boolean> {
  const subscription = await getDoc<Subscription>(
    collectionNames.subscriptions,
    subscriptionId(userId),
  );
  return isPremiumSubscriptionActive(subscription);
}

export async function isGroupOwnerPremium(groupId: string): Promise<boolean> {
  const { subscription } = await getGroupOwnerSubscription(groupId);
  return isPremiumSubscriptionActive(subscription);
}

export async function assertGroupMember(groupId: string, userId: string) {
  const membership = await getDoc<GroupMember>(
    collectionNames.groupMembers,
    groupMemberId(groupId, userId),
  );
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }
  return membership;
}

export async function assertPremiumGroup(groupId: string, _userId?: string) {
  void _userId;

  const { subscription } = await getGroupOwnerSubscription(groupId);
  if (!isPremiumSubscriptionActive(subscription)) {
    throw new PremiumRequiredError(
      "This group requires a Premium subscription to use this feature",
    );
  }
}

export function getFreeHistoryCutoff(): Date {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.freeTier.historyDays);
  return cutoff;
}
