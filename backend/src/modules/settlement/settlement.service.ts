import { prisma } from "../../lib/prisma";
import {
  NotFoundError,
  ValidationError,
  FreeQuotaExceededError,
  PremiumRequiredError,
} from "../../lib/errors";
import { config } from "../../config";
import { Prisma } from "@prisma/client";
import {
  assertPremiumGroup,
  isPremiumSubscriptionActive,
} from "../../lib/entitlement";

// ─── Helpers ────────────────────────────────────────────────────────

async function assertGroupMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }
  return membership;
}

async function checkSmartSettleQuota(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (isPremiumSubscriptionActive(subscription)) {
    return;
  }

  // Free users: check monthly quota
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = await prisma.auditLog.count({
    where: {
      actorUserId: userId,
      action: "smart_settle",
      createdAt: { gte: startOfMonth },
    },
  });

  if (count >= config.freeTier.smartSettlePerMonth) {
    throw new FreeQuotaExceededError(
      `Smart settle quota exceeded (${config.freeTier.smartSettlePerMonth}/month). Upgrade to Premium for unlimited usage.`,
    );
  }
}

interface DebtEdge {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

interface Transfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

interface LockedBalance {
  userId: string;
  balance: number;
}

interface LockedGroupBalance {
  userId: string;
  balance: number;
}

type SettlementSnapshot = {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note: string | null;
  createdBy: string;
  createdAt: string;
};

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function toSettlementSnapshot(settlement: {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note: string | null;
  createdBy: string;
  createdAt: Date;
}): SettlementSnapshot {
  return {
    id: settlement.id,
    groupId: settlement.groupId,
    fromUserId: settlement.fromUserId,
    toUserId: settlement.toUserId,
    amount: settlement.amount,
    note: settlement.note,
    createdBy: settlement.createdBy,
    createdAt: settlement.createdAt.toISOString(),
  };
}

async function writeFinancialAudit(
  tx: Prisma.TransactionClient,
  input: {
    actorUserId: string;
    action: string;
    groupId: string;
    before: unknown;
    after: unknown;
    requestId?: string;
  },
) {
  await tx.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: "group",
      entityId: input.groupId,
      before: input.before === null ? Prisma.JsonNull : toInputJson(input.before),
      after: input.after === null ? Prisma.JsonNull : toInputJson(input.after),
      requestId: input.requestId ?? null,
    },
  });
}

async function lockSettlementBalances(
  tx: Prisma.TransactionClient,
  groupId: string,
  fromUserId: string,
  toUserId: string,
): Promise<Map<string, number>> {
  const rows = await tx.$queryRaw<LockedBalance[]>`
    SELECT user_id AS "userId", balance
    FROM balances
    WHERE group_id = ${groupId}::uuid
      AND user_id IN (${fromUserId}::uuid, ${toUserId}::uuid)
    ORDER BY user_id
    FOR UPDATE
  `;

  return new Map(rows.map((row) => [row.userId, row.balance]));
}

async function lockGroupBalances(
  tx: Prisma.TransactionClient,
  groupId: string,
): Promise<LockedGroupBalance[]> {
  return tx.$queryRaw<LockedGroupBalance[]>`
    SELECT user_id AS "userId", balance
    FROM balances
    WHERE group_id = ${groupId}::uuid
    ORDER BY user_id
    FOR UPDATE
  `;
}

function generateMinTransferSuggestions(
  balances: Array<{ userId: string; balance: number }>,
  maxTransfers: number = 50,
): Transfer[] {
  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ userId: b.userId, balance: b.balance }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ userId: b.userId, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length && transfers.length < maxTransfers) {
    const credit = creditors[ci];
    const debit = debtors[di];
    const amount = Math.min(credit.balance, debit.balance);

    transfers.push({
      fromUserId: debit.userId,
      toUserId: credit.userId,
      amount,
    });

    credit.balance -= amount;
    debit.balance -= amount;

    if (credit.balance === 0) ci++;
    if (debit.balance === 0) di++;
  }

  return transfers;
}

async function assertPremiumGroupForTransaction(
  tx: Prisma.TransactionClient,
  groupId: string,
) {
  const group = await tx.group.findUnique({
    where: { id: groupId },
    select: {
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

  if (!isPremiumSubscriptionActive(group.owner.subscription)) {
    throw new PremiumRequiredError(
      "This group requires a Premium subscription to use this feature",
    );
  }
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * GET /groups/:groupId/debts
 * Compute debt edges from current balances in the group.
 */
export async function getDebts(groupId: string, userId: string) {
  const membership = await assertGroupMember(groupId, userId);

  const balances = await prisma.balance.findMany({
    where: { groupId },
    include: {
      user: { select: { id: true, displayName: true, email: true, avatarUrl: true } },
    },
  });

  // Separate creditors (+) and debtors (−)
  let creditors = balances
    .filter((b: { balance: number }) => b.balance > 0)
    .map((b: { userId: string; balance: number; user: any }) => ({ userId: b.userId, balance: b.balance, user: b.user }))
    .sort((a: { balance: number }, b: { balance: number }) => b.balance - a.balance);

  let debtors = balances
    .filter((b: { balance: number }) => b.balance < 0)
    .map((b: { userId: string; balance: number; user: any }) => ({ userId: b.userId, balance: -b.balance, user: b.user }))
    .sort((a: { balance: number }, b: { balance: number }) => b.balance - a.balance);

  const edges: DebtEdge[] = [];

  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debit = debtors[di];
    const amount = Math.min(credit.balance, debit.balance);

    edges.push({
      fromUserId: debit.userId,
      toUserId: credit.userId,
      amount,
    });

    credit.balance -= amount;
    debit.balance -= amount;

    if (credit.balance === 0) ci++;
    if (debit.balance === 0) di++;
  }

  // Attach user info
  const enrichedEdges = edges.map((edge) => {
    const fromUser = balances.find((b: { userId: string }) => b.userId === edge.fromUserId)?.user ?? null;
    const toUser = balances.find((b: { userId: string }) => b.userId === edge.toUserId)?.user ?? null;
    return {
      ...edge,
      fromUser,
      toUser,
    };
  });

  return enrichedEdges;
}

/**
 * POST /groups/:groupId/smart-settle/suggestions
 * Generate min-transfer settlement suggestions.
 */
export async function generateSmartSettle(
  groupId: string,
  userId: string,
  algorithm: string = "min_transfer",
  maxTransfers: number = 50,
) {
  await assertGroupMember(groupId, userId);
  await checkSmartSettleQuota(userId);

  if (algorithm !== "min_transfer") {
    throw new ValidationError(`Unsupported algorithm: ${algorithm}`);
  }

  const balances = await prisma.balance.findMany({
    where: { groupId },
  });

  const transfers = generateMinTransferSuggestions(balances, maxTransfers);

  // Ghi audit log để đếm quota (chỉ khi gọi từ endpoint chính thức)
  await prisma.auditLog.create({
    data: {
      actorUserId: userId,
      action: "smart_settle",
      entityType: "group",
      entityId: groupId,
      after: { algorithm, totalTransfers: transfers.length },
    },
  });

  return {
    transfers,
    totalTransfers: transfers.length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * POST /groups/:groupId/settlements
 * Create a manual settlement (X pays Y).
 */
export async function createSettlement(
  groupId: string,
  userId: string,
  input: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    note?: string;
  },
  requestId?: string,
) {
  await assertGroupMember(groupId, userId);

  // Validate amount
  if (input.amount <= 0) {
    throw new ValidationError("Amount must be greater than 0");
  }

  // From and To must be different
  if (input.fromUserId === input.toUserId) {
    throw new ValidationError("Cannot settle with yourself");
  }

  // Transaction: validate locked balances, create settlement, update balances, audit.
  const settlement = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const memberIds = new Set(
      (
        await tx.groupMember.findMany({
          where: { groupId, isActive: true },
          select: { userId: true },
        })
      ).map((m: { userId: string }) => m.userId),
    );

    if (!memberIds.has(input.fromUserId)) {
      throw new ValidationError("fromUserId is not an active group member");
    }
    if (!memberIds.has(input.toUserId)) {
      throw new ValidationError("toUserId is not an active group member");
    }

    const lockedBalances = await lockSettlementBalances(
      tx,
      groupId,
      input.fromUserId,
      input.toUserId,
    );
    const fromAmount = lockedBalances.get(input.fromUserId) ?? 0;
    const toAmount = lockedBalances.get(input.toUserId) ?? 0;

    if (fromAmount >= 0) {
      throw new ValidationError(
        "The payer (fromUserId) must have a negative balance (owes money)",
      );
    }
    if (toAmount <= 0) {
      throw new ValidationError(
        "The receiver (toUserId) must have a positive balance (is owed money)",
      );
    }

    const maxAllowed = Math.min(Math.abs(fromAmount), toAmount);
    if (input.amount > maxAllowed) {
      throw new ValidationError(
        `Amount (${input.amount}) exceeds the maximum allowed settlement of ${maxAllowed}`,
      );
    }

    const created = await tx.settlement.create({
      data: {
        groupId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        amount: input.amount,
        note: input.note ?? null,
        createdBy: userId,
      },
    });

    // Update balances: from (+P), to (−P)
    await tx.balance.update({
      where: { groupId_userId: { groupId, userId: input.fromUserId } },
      data: { balance: { increment: input.amount } },
    });

    await tx.balance.update({
      where: { groupId_userId: { groupId, userId: input.toUserId } },
      data: { balance: { increment: -input.amount } },
    });

    await writeFinancialAudit(tx, {
      actorUserId: userId,
      action: "settlement_created",
      groupId,
      before: null,
      after: toSettlementSnapshot(created),
      requestId,
    });

    return created;
  });

  return settlement;
}

/**
 * GET /groups/:groupId/settlements
 * List settlements with pagination.
 */
export async function getSettlements(
  groupId: string,
  userId: string,
  page: number = 1,
  limit: number = 20,
) {
  await assertGroupMember(groupId, userId);

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.settlement.findMany({
      where: { groupId },
      skip,
      take: limit,
      include: {
        fromUser: { select: { id: true, displayName: true, email: true } },
        toUser: { select: { id: true, displayName: true, email: true } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.settlement.count({ where: { groupId } }),
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
 * GET /groups/:groupId/settlements/:settlementId
 * Get a single settlement detail.
 */
export async function getSettlement(
  groupId: string,
  settlementId: string,
  userId: string,
) {
  await assertGroupMember(groupId, userId);

  const settlement = await prisma.settlement.findFirst({
    where: { id: settlementId, groupId },
    include: {
      fromUser: { select: { id: true, displayName: true, email: true } },
      toUser: { select: { id: true, displayName: true, email: true } },
      creator: { select: { id: true, displayName: true, email: true } },
    },
  });

  if (!settlement) {
    throw new NotFoundError("Settlement not found");
  }

  return settlement;
}

/**
 * POST /groups/:groupId/group-settlement (Premium)
 * One-click group settlement (simulate or commit).
 */
export async function groupSettlement(
  groupId: string,
  userId: string,
  input: {
    mode: "simulate" | "commit";
    note?: string;
  },
  requestId?: string,
) {
  if (input.mode === "simulate") {
    await assertGroupMember(groupId, userId);
    await assertPremiumGroup(groupId, userId);
    const suggestion = await generateSmartSettle(groupId, userId, "min_transfer", 50);

    return {
      mode: "simulate",
      ...suggestion,
    };
  }

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const membership = await tx.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership || !membership.isActive) {
      throw new NotFoundError("Group not found");
    }
    await assertPremiumGroupForTransaction(tx, groupId);

    const lockedBalances = await lockGroupBalances(tx, groupId);
    const beforeBalances = lockedBalances.map((balance) => ({
      userId: balance.userId,
      balance: balance.balance,
    }));
    const transfers = generateMinTransferSuggestions(lockedBalances, 50);
    const balanceMap = new Map(
      lockedBalances.map((balance) => [balance.userId, balance.balance]),
    );
    const createdSettlements = [];

    for (const transfer of transfers) {
      if (transfer.amount <= 0) {
        throw new ValidationError("Settlement transfer amount must be greater than 0");
      }

      const fromBalance = balanceMap.get(transfer.fromUserId) ?? 0;
      const toBalance = balanceMap.get(transfer.toUserId) ?? 0;

      if (fromBalance >= 0) {
        throw new ValidationError(
          "The payer (fromUserId) must have a negative balance (owes money)",
        );
      }
      if (toBalance <= 0) {
        throw new ValidationError(
          "The receiver (toUserId) must have a positive balance (is owed money)",
        );
      }

      const maxAllowed = Math.min(Math.abs(fromBalance), toBalance);
      if (transfer.amount > maxAllowed) {
        throw new ValidationError(
          `Amount (${transfer.amount}) exceeds the maximum allowed settlement of ${maxAllowed}`,
        );
      }

      const settlement = await tx.settlement.create({
        data: {
          groupId,
          fromUserId: transfer.fromUserId,
          toUserId: transfer.toUserId,
          amount: transfer.amount,
          note: input.note ?? null,
          createdBy: userId,
        },
      });
      createdSettlements.push(settlement);

      await tx.balance.update({
        where: { groupId_userId: { groupId, userId: transfer.fromUserId } },
        data: { balance: { increment: transfer.amount } },
      });

      await tx.balance.update({
        where: { groupId_userId: { groupId, userId: transfer.toUserId } },
        data: { balance: { increment: -transfer.amount } },
      });

      balanceMap.set(transfer.fromUserId, fromBalance + transfer.amount);
      balanceMap.set(transfer.toUserId, toBalance - transfer.amount);
    }

    const afterBalances = await tx.balance.findMany({
      where: { groupId },
      orderBy: { userId: "asc" },
    });

    const balanceSum = afterBalances.reduce(
      (sum, balance) => sum + balance.balance,
      0,
    );
    if (balanceSum !== 0) {
      throw new ValidationError("Group balance sum must remain zero");
    }

    await writeFinancialAudit(tx, {
      actorUserId: userId,
      action: "group_settlement_committed",
      groupId,
      before: {
        balances: beforeBalances,
        transfers,
      },
      after: {
        settlements: createdSettlements.map(toSettlementSnapshot),
        balances: afterBalances.map((balance) => ({
          userId: balance.userId,
          balance: balance.balance,
        })),
      },
      requestId,
    });

    return {
      totalSettlements: createdSettlements.length,
      settlements: createdSettlements,
    };
  });

  return {
    mode: "commit",
    totalSettlements: result.totalSettlements,
    settlements: result.settlements,
    generatedAt: new Date().toISOString(),
  };
}
