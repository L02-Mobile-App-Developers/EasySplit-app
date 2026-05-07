import { prisma } from "../../lib/prisma";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  PremiumRequiredError,
} from "../../lib/errors";
import { config } from "../../config";
import { Prisma } from "@prisma/client";

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

async function assertPremiumGroup(groupId: string, userId: string) {
  // Premium is based on the group owner's subscription
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

  // Premium is valid if plan is premium and status is active/trialing/grace_period/canceled (not expired)
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

async function checkSmartSettleQuota(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });
  const plan = subscription?.plan ?? "free";
  const status = subscription?.status ?? "active";

  // Premium users have no quota
  if (plan === "premium" && status !== "expired") {
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
    throw new ForbiddenError(
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

  // Separate creditors (+) and debtors (−)
  let creditors = balances
    .filter((b: { balance: number }) => b.balance > 0)
    .map((b: { userId: string; balance: number }) => ({ userId: b.userId, balance: b.balance }))
    .sort((a: { balance: number }, b: { balance: number }) => b.balance - a.balance);

  let debtors = balances
    .filter((b: { balance: number }) => b.balance < 0)
    .map((b: { userId: string; balance: number }) => ({ userId: b.userId, balance: -b.balance }))
    .sort((a: { balance: number }, b: { balance: number }) => b.balance - a.balance);

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

  // Ensure both users are active members
  const memberIds = new Set(
    (
      await prisma.groupMember.findMany({
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

  // Get current balances
  const fromBalance = await prisma.balance.findUnique({
    where: { groupId_userId: { groupId, userId: input.fromUserId } },
  });
  const toBalance = await prisma.balance.findUnique({
    where: { groupId_userId: { groupId, userId: input.toUserId } },
  });

  const fromAmount = fromBalance?.balance ?? 0;
  const toAmount = toBalance?.balance ?? 0;

  // Validation rules from spec §8.3
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

  // Transaction: create settlement + update balances
  const settlement = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
    await tx.balance.upsert({
      where: { groupId_userId: { groupId, userId: input.fromUserId } },
      create: { groupId, userId: input.fromUserId, balance: input.amount },
      update: { balance: { increment: input.amount } },
    });

    await tx.balance.upsert({
      where: { groupId_userId: { groupId, userId: input.toUserId } },
      create: { groupId, userId: input.toUserId, balance: -input.amount },
      update: { balance: { increment: -input.amount } },
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
) {
  await assertGroupMember(groupId, userId);
  await assertPremiumGroup(groupId, userId);

  // Generate suggestions
  const suggestion = await generateSmartSettle(groupId, userId, "min_transfer", 50);

  if (input.mode === "simulate") {
    return {
      mode: "simulate",
      ...suggestion,
    };
  }

  // mode === "commit"
  const settlements = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const createdSettlements = [];

    for (const transfer of suggestion.transfers) {
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

      // Update balances
      await tx.balance.upsert({
        where: { groupId_userId: { groupId, userId: transfer.fromUserId } },
        create: { groupId, userId: transfer.fromUserId, balance: transfer.amount },
        update: { balance: { increment: transfer.amount } },
      });

      await tx.balance.upsert({
        where: { groupId_userId: { groupId, userId: transfer.toUserId } },
        create: { groupId, userId: transfer.toUserId, balance: -transfer.amount },
        update: { balance: { increment: -transfer.amount } },
      });
    }

    return createdSettlements;
  });

  return {
    mode: "commit",
    totalSettlements: settlements.length,
    settlements,
    generatedAt: new Date().toISOString(),
  };
}
