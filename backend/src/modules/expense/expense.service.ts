import { prisma } from "../../lib/prisma";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from "../../lib/errors";
import { Prisma } from "@prisma/client";

interface ParticipantInput {
  userId: string;
  value: number;
}

interface CreateExpenseInput {
  description: string;
  amount: number;
  currency?: string;
  paidByUserId: string;
  splitMode: "equal" | "amount" | "percent" | "weight";
  participants: ParticipantInput[];
}

interface UpdateExpenseInput {
  description?: string;
  amount?: number;
  currency?: string;
  paidByUserId?: string;
  splitMode?: "equal" | "amount" | "percent" | "weight";
  participants?: ParticipantInput[];
}

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

function computeShares(
  amount: number,
  splitMode: string,
  participants: ParticipantInput[],
): Map<string, number> {
  const shares = new Map<string, number>();

  switch (splitMode) {
    case "equal": {
      const share = Math.floor(amount / participants.length);
      const remainder = amount % participants.length;
      participants.forEach((p, i) => {
        shares.set(p.userId, i === 0 ? share + remainder : share);
      });
      break;
    }
    case "amount": {
      const total = participants.reduce((s, p) => s + p.value, 0);
      if (total !== amount) {
        throw new ValidationError(
          `Sum of participant amounts (${total}) must equal total amount (${amount})`,
        );
      }
      participants.forEach((p) => shares.set(p.userId, p.value));
      break;
    }
    case "percent": {
      const totalPct = participants.reduce((s, p) => s + p.value, 0);
      if (totalPct !== 100) {
        throw new ValidationError(
          `Sum of percentages (${totalPct}) must equal 100`,
        );
      }
      participants.forEach((p) =>
        shares.set(p.userId, Math.round((amount * p.value) / 100)),
      );
      break;
    }
    case "weight": {
      const totalWeight = participants.reduce((s, p) => s + p.value, 0);
      if (totalWeight <= 0) {
        throw new ValidationError("Total weight must be greater than 0");
      }
      let distributed = 0;
      participants.forEach((p, i) => {
        const share =
          i === participants.length - 1
            ? amount - distributed
            : Math.floor((amount * p.value) / totalWeight);
        shares.set(p.userId, share);
        distributed += share;
      });
      break;
    }
    default:
      throw new ValidationError(`Unknown split mode: ${splitMode}`);
  }

  return shares;
}

async function recalculateBalances(groupId: string) {
  // Sum all positive amounts (what each user paid) and negative amounts (what each user owes)
  // Then derive net balance per user

  // Get all expenses for the group
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: { participants: true },
  });

  // Calculate net position for each user
  const netMap = new Map<string, number>();

  for (const expense of expenses) {
    // Payer is owed the full amount
    netMap.set(
      expense.paidByUserId,
      (netMap.get(expense.paidByUserId) ?? 0) + expense.amount,
    );

    // Each participant owes their share
    const shares = computeShares(
      expense.amount,
      expense.splitMode,
      expense.participants.map((p: { userId: string; value: number }) => ({ userId: p.userId, value: p.value })),
    );
    for (const [userId, share] of shares) {
      netMap.set(userId, (netMap.get(userId) ?? 0) - share);
    }
  }

  // Upsert balances
  const upserts = Array.from(netMap.entries()).map(([userId, balance]) =>
    prisma.balance.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId, balance },
      update: { balance },
    }),
  );

  await prisma.$transaction(upserts);
}

// ─── Public API ─────────────────────────────────────────────────────

export async function createExpense(
  groupId: string,
  userId: string,
  input: CreateExpenseInput,
) {
  // Validate membership for the creator
  await assertGroupMember(groupId, userId);

  // Validate all participants are active group members
  const memberIds = new Set(
    (
      await prisma.groupMember.findMany({
        where: { groupId, isActive: true },
        select: { userId: true },
      })
    ).map((m: { userId: string }) => m.userId),
  );

  const allUserIds = [
    input.paidByUserId,
    ...input.participants.map((p) => p.userId),
  ];
  for (const uid of allUserIds) {
    if (!memberIds.has(uid)) {
      throw new ValidationError(`User ${uid} is not an active group member`);
    }
  }

  // Compute shares for validation
  computeShares(input.amount, input.splitMode, input.participants);

  // Create expense in a transaction
  const expense = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.expense.create({
      data: {
        groupId,
        description: input.description,
        amount: input.amount,
        currency: input.currency ?? "VND",
        paidByUserId: input.paidByUserId,
        splitMode: input.splitMode,
        createdBy: userId,
        participants: {
          create: input.participants.map((p) => ({
            userId: p.userId,
            value: p.value,
          })),
        },
      },
      include: {
        participants: true,
        payer: { select: { id: true, displayName: true, email: true } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
    });

    return created;
  });

  // Recalculate all balances for the group
  await recalculateBalances(groupId);

  return expense;
}

export async function getExpenses(
  groupId: string,
  userId: string,
  page: number,
  limit: number,
) {
  await assertGroupMember(groupId, userId);

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where: { groupId },
      skip,
      take: limit,
      include: {
        participants: {
          include: {
            user: { select: { id: true, displayName: true, email: true } },
          },
        },
        payer: { select: { id: true, displayName: true, email: true } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.count({ where: { groupId } }),
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

export async function getExpense(
  groupId: string,
  expenseId: string,
  userId: string,
) {
  await assertGroupMember(groupId, userId);

  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, groupId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, displayName: true, email: true } },
        },
      },
      payer: { select: { id: true, displayName: true, email: true } },
      creator: { select: { id: true, displayName: true, email: true } },
    },
  });

  if (!expense) {
    throw new NotFoundError("Expense not found");
  }

  return expense;
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  userId: string,
  input: UpdateExpenseInput,
) {
  const membership = await assertGroupMember(groupId, userId);

  // Fetch the existing expense
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, groupId },
  });
  if (!existing) {
    throw new NotFoundError("Expense not found");
  }

  // Only the creator or group owner/admin can update
  const canUpdate =
    existing.createdBy === userId || membership.role === "owner" || membership.role === "admin";
  if (!canUpdate) {
    throw new ForbiddenError("Only the expense creator or group admin can update this expense");
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Delete old participants
    await tx.expenseParticipant.deleteMany({
      where: { expenseId },
    });

    // Merge fields
    const description = input.description ?? existing.description;
    const amount = input.amount ?? existing.amount;
    const currency = input.currency ?? existing.currency;
    const paidByUserId = input.paidByUserId ?? existing.paidByUserId;
    const splitMode = input.splitMode ?? existing.splitMode;
    const participants = input.participants ?? [];

    // Validate participants if provided
    if (input.participants) {
      const memberIds = new Set(
        (
          await tx.groupMember.findMany({
            where: { groupId, isActive: true },
            select: { userId: true },
          })
        ).map((m: { userId: string }) => m.userId),
      );

      const allUserIds = [
        paidByUserId,
        ...participants.map((p) => p.userId),
      ];
      for (const uid of allUserIds) {
        if (!memberIds.has(uid)) {
          throw new ValidationError(`User ${uid} is not an active group member`);
        }
      }

      computeShares(amount, splitMode, participants);
    }

    const result = await tx.expense.update({
      where: { id: expenseId },
      data: {
        description,
        amount,
        currency,
        paidByUserId,
        splitMode,
        ...(input.participants && {
          participants: {
            create: participants.map((p) => ({
              userId: p.userId,
              value: p.value,
            })),
          },
        }),
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, displayName: true, email: true } },
          },
        },
        payer: { select: { id: true, displayName: true, email: true } },
        creator: { select: { id: true, displayName: true, email: true } },
      },
    });

    return result;
  });

  // Recalculate balances
  await recalculateBalances(groupId);

  return updated;
}

export async function deleteExpense(
  groupId: string,
  expenseId: string,
  userId: string,
) {
  const membership = await assertGroupMember(groupId, userId);

  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, groupId },
  });
  if (!existing) {
    throw new NotFoundError("Expense not found");
  }

  // Only creator or group owner/admin can delete
  const canDelete =
    existing.createdBy === userId || membership.role === "owner" || membership.role === "admin";
  if (!canDelete) {
    throw new ForbiddenError("Only the expense creator or group admin can delete this expense");
  }

  await prisma.expense.delete({ where: { id: expenseId } });

  // Recalculate balances
  await recalculateBalances(groupId);

  return { id: expenseId };
}
