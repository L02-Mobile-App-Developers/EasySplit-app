import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors";

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

type ExpenseWithParticipants = Prisma.ExpenseGetPayload<{
  include: { participants: true };
}>;

type ExpenseAuditSnapshot = {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  currency: string;
  paidByUserId: string;
  splitMode: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  participants: ParticipantInput[];
};

async function assertGroupMember(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }
  return membership;
}

function assertNoDuplicateParticipants(participants: ParticipantInput[]) {
  const seen = new Set<string>();
  for (const participant of participants) {
    if (seen.has(participant.userId)) {
      throw new ValidationError(`Duplicate participant: ${participant.userId}`);
    }
    seen.add(participant.userId);
  }
}

export function computeShares(
  amount: number,
  splitMode: string,
  participants: ParticipantInput[],
): Map<string, number> {
  if (participants.length === 0) {
    throw new ValidationError("At least one participant required");
  }

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
      if (participants.some((p) => p.value <= 0)) {
        throw new ValidationError("Percent values must be greater than 0");
      }
      if (totalPct !== 100) {
        throw new ValidationError(
          `Sum of percentages (${totalPct}) must equal 100`,
        );
      }

      let distributed = 0;
      participants.forEach((p) => {
        const share = Math.floor((amount * p.value) / 100);
        shares.set(p.userId, share);
        distributed += share;
      });

      let remainder = amount - distributed;
      for (const participant of participants) {
        if (remainder <= 0) break;
        shares.set(participant.userId, (shares.get(participant.userId) ?? 0) + 1);
        remainder -= 1;
      }
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

async function validateActiveGroupUsers(
  tx: Prisma.TransactionClient,
  groupId: string,
  paidByUserId: string,
  participants: ParticipantInput[],
) {
  assertNoDuplicateParticipants(participants);

  const memberIds = new Set(
    (
      await tx.groupMember.findMany({
        where: { groupId, isActive: true },
        select: { userId: true },
      })
    ).map((m) => m.userId),
  );

  const allUserIds = [paidByUserId, ...participants.map((p) => p.userId)];
  for (const uid of allUserIds) {
    if (!memberIds.has(uid)) {
      throw new ValidationError(`User ${uid} is not an active group member`);
    }
  }
}

function toAuditSnapshot(expense: ExpenseWithParticipants): ExpenseAuditSnapshot {
  return {
    id: expense.id,
    groupId: expense.groupId,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    paidByUserId: expense.paidByUserId,
    splitMode: expense.splitMode,
    createdBy: expense.createdBy,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    participants: expense.participants.map((p) => ({
      userId: p.userId,
      value: p.value,
    })),
  };
}

function toInputJson(value: ExpenseAuditSnapshot): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function writeExpenseAudit(
  tx: Prisma.TransactionClient,
  actorUserId: string,
  action: string,
  groupId: string,
  before: ExpenseAuditSnapshot | null,
  after: ExpenseAuditSnapshot | null,
  requestId?: string,
) {
  await tx.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType: "group",
      entityId: groupId,
      before: before ? toInputJson(before) : Prisma.JsonNull,
      after: after ? toInputJson(after) : Prisma.JsonNull,
      requestId: requestId ?? null,
    },
  });
}

async function recalculateBalances(
  tx: Prisma.TransactionClient,
  groupId: string,
) {
  const expenses = await tx.expense.findMany({
    where: { groupId },
    include: { participants: true },
  });

  const netMap = new Map<string, number>();

  for (const expense of expenses) {
    netMap.set(
      expense.paidByUserId,
      (netMap.get(expense.paidByUserId) ?? 0) + expense.amount,
    );

    const shares = computeShares(
      expense.amount,
      expense.splitMode,
      expense.participants.map((p) => ({
        userId: p.userId,
        value: p.value,
      })),
    );

    for (const [userId, share] of shares) {
      netMap.set(userId, (netMap.get(userId) ?? 0) - share);
    }
  }

  const activeMembers = await tx.groupMember.findMany({
    where: { groupId, isActive: true },
    select: { userId: true },
  });

  for (const member of activeMembers) {
    await tx.balance.upsert({
      where: { groupId_userId: { groupId, userId: member.userId } },
      create: {
        groupId,
        userId: member.userId,
        balance: netMap.get(member.userId) ?? 0,
      },
      update: { balance: netMap.get(member.userId) ?? 0 },
    });
  }

  await tx.balance.updateMany({
    where: {
      groupId,
      userId: { notIn: activeMembers.map((member) => member.userId) },
    },
    data: { balance: 0 },
  });
}

async function getExpenseWithParticipants(
  tx: Prisma.TransactionClient,
  groupId: string,
  expenseId: string,
) {
  return tx.expense.findFirst({
    where: { id: expenseId, groupId },
    include: { participants: true },
  });
}

async function getExpenseForResponse(expenseId: string) {
  return prisma.expense.findUniqueOrThrow({
    where: { id: expenseId },
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
}

async function replaceParticipants(
  tx: Prisma.TransactionClient,
  expenseId: string,
  participants: ParticipantInput[],
) {
  await tx.expenseParticipant.deleteMany({
    where: { expenseId },
  });

  await tx.expenseParticipant.createMany({
    data: participants.map((p) => ({
      expenseId,
      userId: p.userId,
      value: p.value,
    })),
  });
}

function sharesToParticipants(
  participants: ParticipantInput[],
  shares: Map<string, number>,
): ParticipantInput[] {
  return participants.map((participant) => ({
    userId: participant.userId,
    value: shares.get(participant.userId) ?? 0,
  }));
}

export async function createExpense(
  groupId: string,
  userId: string,
  input: CreateExpenseInput,
  requestId?: string,
) {
  await assertGroupMember(groupId, userId);
  computeShares(input.amount, input.splitMode, input.participants);

  const expenseId = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      await validateActiveGroupUsers(
        tx,
        groupId,
        input.paidByUserId,
        input.participants,
      );

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
        include: { participants: true },
      });

      await recalculateBalances(tx, groupId);
      await writeExpenseAudit(
        tx,
        userId,
        "expense_created",
        groupId,
        null,
        toAuditSnapshot(created),
        requestId,
      );

      return created.id;
    },
  );

  return getExpenseForResponse(expenseId);
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
  requestId?: string,
) {
  const membership = await assertGroupMember(groupId, userId);

  const updatedExpenseId = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const existing = await getExpenseWithParticipants(tx, groupId, expenseId);
      if (!existing) {
        throw new NotFoundError("Expense not found");
      }

      const canUpdate =
        existing.createdBy === userId ||
        membership.role === "owner" ||
        membership.role === "admin";
      if (!canUpdate) {
        throw new ForbiddenError("Only the expense creator or group admin can update this expense");
      }

      const description = input.description ?? existing.description;
      const amount = input.amount ?? existing.amount;
      const currency = input.currency ?? existing.currency;
      const paidByUserId = input.paidByUserId ?? existing.paidByUserId;
      const splitMode = input.splitMode ?? existing.splitMode;
      const existingParticipants = existing.participants.map((p) => ({
        userId: p.userId,
        value: p.value,
      }));
      const participants =
        input.participants ?? existingParticipants;
      const amountChanged =
        input.amount !== undefined && input.amount !== existing.amount;
      const splitModeChanged =
        input.splitMode !== undefined && input.splitMode !== existing.splitMode;

      await validateActiveGroupUsers(tx, groupId, paidByUserId, participants);
      const shares = computeShares(amount, splitMode, participants);

      // Participant rows are stable for metadata-only updates. If the caller
      // changes an equal split without sending participants, persist the
      // recalculated shares so stored participant values match the new amount.
      const participantsToPersist =
        input.participants !== undefined
          ? participants
          : (amountChanged || splitModeChanged) && splitMode === "equal"
            ? sharesToParticipants(participants, shares)
            : null;

      const before = toAuditSnapshot(existing);

      await tx.expense.update({
        where: { id: expenseId },
        data: {
          description,
          amount,
          currency,
          paidByUserId,
          splitMode,
        },
      });

      if (participantsToPersist) {
        await replaceParticipants(tx, expenseId, participantsToPersist);
      }

      await recalculateBalances(tx, groupId);

      const updated = await getExpenseWithParticipants(tx, groupId, expenseId);
      if (!updated) {
        throw new NotFoundError("Expense not found");
      }

      await writeExpenseAudit(
        tx,
        userId,
        "expense_updated",
        groupId,
        before,
        toAuditSnapshot(updated),
        requestId,
      );

      return updated.id;
    },
  );

  return getExpenseForResponse(updatedExpenseId);
}

export async function deleteExpense(
  groupId: string,
  expenseId: string,
  userId: string,
  requestId?: string,
) {
  const membership = await assertGroupMember(groupId, userId);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await getExpenseWithParticipants(tx, groupId, expenseId);
    if (!existing) {
      throw new NotFoundError("Expense not found");
    }

    const canDelete =
      existing.createdBy === userId ||
      membership.role === "owner" ||
      membership.role === "admin";
    if (!canDelete) {
      throw new ForbiddenError("Only the expense creator or group admin can delete this expense");
    }

    const before = toAuditSnapshot(existing);

    await tx.expense.delete({ where: { id: expenseId } });
    await recalculateBalances(tx, groupId);
    await writeExpenseAudit(
      tx,
      userId,
      "expense_deleted",
      groupId,
      before,
      null,
      requestId,
    );
  });

  return { id: expenseId };
}
