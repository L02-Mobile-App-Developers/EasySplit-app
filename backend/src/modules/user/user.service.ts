import { NotFoundError, ValidationError } from "../../lib/errors";
import { config } from "../../config";
import {
  AppUser,
  AuditLog,
  cleanForFirestore,
  collectionNames,
  collectionRef,
  docRef,
  getDoc,
  getQuery,
  sortByDateDesc,
  Subscription,
  subscriptionId,
} from "../../lib/firestore-db";

interface UpdateProfileInput {
  displayName?: string;
  avatarUrl?: string | null;
}

function toMe(user: AppUser) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export async function getMe(userId: string) {
  const user = await getDoc<AppUser>(collectionNames.users, userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return toMe(user);
}

export async function updateMe(userId: string, input: UpdateProfileInput) {
  if (input.displayName !== undefined && input.displayName.trim().length === 0) {
    throw new ValidationError("Display name cannot be empty");
  }

  const user = await getDoc<AppUser>(collectionNames.users, userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const updated: AppUser = {
    ...user,
    displayName: input.displayName ?? user.displayName,
    avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : user.avatarUrl,
  };

  await docRef(collectionNames.users, userId).set(cleanForFirestore(updated));
  return toMe(updated);
}

export async function getSubscription(userId: string) {
  const subscription = await getDoc<Subscription>(
    collectionNames.subscriptions,
    subscriptionId(userId),
  );
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
  const groups = await getQuery<{ id: string }>(
    collectionRef(collectionNames.groups)
      .where("ownerId", "==", userId)
      .where("status", "==", "active"),
  );

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const smartSettleLogs = (
    await getQuery<AuditLog>(
      collectionRef(collectionNames.auditLogs)
        .where("actorUserId", "==", userId)
        .where("action", "==", "smart_settle"),
    )
  ).filter((log) => log.createdAt >= startOfMonth);

  return {
    groupCount: groups.length,
    smartSettleUsedThisMonth: sortByDateDesc(
      smartSettleLogs,
      (log) => log.createdAt,
    ).length,
    freeMaxGroups: config.freeTier.maxGroups,
    freeSmartSettlePerMonth: config.freeTier.smartSettlePerMonth,
  };
}
