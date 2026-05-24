import {
  assertGroupMember,
  getGroupOwnerSubscription,
  isPremiumSubscriptionActive,
} from "../../lib/entitlement";
import { config } from "../../config";
import {
  AuditLog,
  collectionNames,
  collectionRef,
  getQuery,
  paginate,
  publicUserMap,
  sortByDateDesc,
} from "../../lib/firestore-db";

interface HistoryFilters {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  actorId?: string;
  type?: string;
}

export async function getActivities(
  groupId: string,
  userId: string,
  page: number = 1,
  limit: number = 20,
) {
  await assertGroupMember(groupId, userId);

  const historyCutoff = new Date();
  historyCutoff.setDate(historyCutoff.getDate() - config.freeTier.historyDays);

  const logs = sortByDateDesc(
    (
      await getQuery<AuditLog>(
        collectionRef(collectionNames.auditLogs)
          .where("entityType", "==", "group")
          .where("entityId", "==", groupId),
      )
    ).filter((log) => log.createdAt >= historyCutoff),
    (log) => log.createdAt,
  );
  const result = paginate(logs, page, limit);

  return {
    items: await enrichAuditLogs(result.items),
    pagination: result.pagination,
  };
}

export async function getHistory(
  groupId: string,
  userId: string,
  filters: HistoryFilters,
) {
  await assertGroupMember(groupId, userId);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const { subscription } = await getGroupOwnerSubscription(groupId);
  const plan = subscription?.plan ?? "free";
  const isPremium = isPremiumSubscriptionActive(subscription);

  const fromDate = filters.from ? new Date(filters.from) : null;
  const toDate = filters.to ? new Date(filters.to) : null;

  const historyCutoff = new Date();
  historyCutoff.setDate(historyCutoff.getDate() - config.freeTier.historyDays);

  let effectiveFrom: Date;
  if (isPremium && fromDate) {
    effectiveFrom = fromDate;
  } else if (fromDate && fromDate < historyCutoff) {
    effectiveFrom = historyCutoff;
  } else {
    effectiveFrom = fromDate ?? historyCutoff;
  }

  const validTypes = ["expense", "settlement", "reminder", "member", "group"];
  const logs = sortByDateDesc(
    (
      await getQuery<AuditLog>(
        collectionRef(collectionNames.auditLogs)
          .where("entityType", "==", "group")
          .where("entityId", "==", groupId),
      )
    ).filter((log) => {
      if (log.createdAt < effectiveFrom) {
        return false;
      }
      if (toDate && log.createdAt > toDate) {
        return false;
      }
      if (filters.actorId && log.actorUserId !== filters.actorId) {
        return false;
      }
      if (
        filters.type &&
        validTypes.includes(filters.type) &&
        !log.action.startsWith(filters.type)
      ) {
        return false;
      }
      return true;
    }),
    (log) => log.createdAt,
  );
  const result = paginate(logs, page, limit);

  return {
    items: await enrichAuditLogs(result.items),
    pagination: result.pagination,
    meta: {
      plan,
      historyDays: isPremium ? null : config.freeTier.historyDays,
    },
  };
}

async function enrichAuditLogs(logs: AuditLog[]) {
  const users = await publicUserMap(logs.map((log) => log.actorUserId));

  return logs.map((log) => ({
    ...log,
    actor: users.get(log.actorUserId) ?? null,
  }));
}
