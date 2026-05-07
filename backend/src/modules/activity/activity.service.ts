import { prisma } from "../../lib/prisma";
import { assertGroupMember } from "../../lib/entitlement";
import { config } from "../../config";

interface HistoryFilters {
  page?: number;
  limit?: number;
  from?: string;
  to?: string;
  actorId?: string;
  type?: string;
}

/**
 * GET /groups/:groupId/activities
 * Return recent activity feed (AuditLog entries for the group).
 * Free tier: limited to the last 90 days.
 */
export async function getActivities(
  groupId: string,
  userId: string,
  page: number = 1,
  limit: number = 20,
) {
  await assertGroupMember(groupId, userId);

  const skip = (page - 1) * limit;

  // Free tier: cap the earliest date to historyDays ago
  const historyCutoff = new Date();
  historyCutoff.setDate(historyCutoff.getDate() - config.freeTier.historyDays);

  const where: Record<string, unknown> = {
    entityType: "group",
    entityId: groupId,
    createdAt: { gte: historyCutoff },
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      include: {
        actor: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
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
 * GET /groups/:groupId/history
 * Return comprehensive history with advanced filtering.
 * Free tier: `from` is capped to 90 days.
 * Premium: full access to all filters and time range.
 */
export async function getHistory(
  groupId: string,
  userId: string,
  filters: HistoryFilters,
) {
  await assertGroupMember(groupId, userId);

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const skip = (page - 1) * limit;

  // Determine the subscription plan for the user
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  const plan = subscription?.plan ?? "free";
  const status = subscription?.status ?? "active";
  const isPremium = plan === "premium" && status !== "expired";

  // Build filters
  const where: Record<string, unknown> = {
    entityType: "group",
    entityId: groupId,
  };

  // Time range filter
  const fromDate = filters.from ? new Date(filters.from) : null;
  const toDate = filters.to ? new Date(filters.to) : null;

  // Free tier: cap `from` to historyDays
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

  const createdAtFilter: Record<string, Date> = {};
  createdAtFilter.gte = effectiveFrom;
  if (toDate) {
    createdAtFilter.lte = toDate;
  }
  where.createdAt = createdAtFilter;

  // Actor filter
  if (filters.actorId) {
    where.actorUserId = filters.actorId;
  }

  // Type filter - maps to action prefix matching
  if (filters.type) {
    const validTypes = ["expense", "settlement", "reminder", "member", "group"];
    if (validTypes.includes(filters.type)) {
      where.action = { startsWith: filters.type };
    }
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      include: {
        actor: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    meta: {
      plan,
      historyDays: isPremium ? null : config.freeTier.historyDays,
    },
  };
}
