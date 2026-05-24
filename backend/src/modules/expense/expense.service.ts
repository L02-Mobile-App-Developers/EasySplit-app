import { Transaction } from "firebase-admin/firestore";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../lib/errors";
import {
  AuditLog,
  Balance,
  balanceId,
  cleanForFirestore,
  collectionNames,
  collectionRef,
  createId,
  docRef,
  Expense,
  ExpenseParticipant,
  getDoc,
  getDocInTransaction,
  getQuery,
  getQueryInTransaction,
  groupMemberId,
  GroupMember,
  paginate,
  publicUserMap,
  sortByDateDesc,
} from "../../lib/firestore-db";

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
  const membership = await getDoc<GroupMember>(
    collectionNames.groupMembers,
    groupMemberId(groupId, userId),
  );
  if (!membership || !membership.isActive) {
    throw new NotFoundError("Group not found");
  }
  return membership;
}

async function assertGroupMemberInTransaction(
  transaction: Transaction,
  groupId: string,
  userId: string,
) {
  const membership = await getDocInTransaction<GroupMember>(
    transaction,
    collectionNames.groupMembers,
    groupMemberId(groupId, userId),
  );
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

function validateActiveGroupUsers(
  activeMembers: GroupMember[],
  paidByUserId: string,
  participants: ParticipantInput[],
) {
  assertNoDuplicateParticipants(participants);

  const memberIds = new Set(activeMembers.map((member) => member.userId));
  const allUserIds = [paidByUserId, ...participants.map((p) => p.userId)];
  for (const uid of allUserIds) {
    if (!memberIds.has(uid)) {
      throw new ValidationError(`User ${uid} is not an active group member`);
    }
  }
}

function toAuditSnapshot(expense: Expense): ExpenseAuditSnapshot {
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

function writeExpenseAudit(
  transaction: Transaction,
  actorUserId: string,
  action: string,
  groupId: string,
  before: ExpenseAuditSnapshot | null,
  after: ExpenseAuditSnapshot | null,
  requestId?: string,
) {
  const now = new Date();
  const audit: AuditLog = {
    id: requestId ?? createId(),
    actorUserId,
    action,
    entityType: "group",
    entityId: groupId,
    before,
    after,
    requestId: requestId ?? null,
    createdAt: now,
  };
  transaction.set(
    docRef(collectionNames.auditLogs, audit.id),
    cleanForFirestore(audit),
  );
}

function recalculateBalances(
  transaction: Transaction,
  groupId: string,
  expenses: Expense[],
  activeMembers: GroupMember[],
  existingBalances: Balance[],
) {
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

  const activeMemberIds = new Set(activeMembers.map((member) => member.userId));

  for (const member of activeMembers) {
    transaction.set(
      docRef(collectionNames.balances, balanceId(groupId, member.userId)),
      cleanForFirestore({
        groupId,
        userId: member.userId,
        balance: netMap.get(member.userId) ?? 0,
      }),
    );
  }

  for (const balance of existingBalances) {
    if (!activeMemberIds.has(balance.userId)) {
      transaction.set(
        docRef(collectionNames.balances, balanceId(groupId, balance.userId)),
        cleanForFirestore({ ...balance, balance: 0 }),
      );
    }
  }
}

function sharesToParticipants(
  participants: ParticipantInput[],
  shares: Map<string, number>,
): ExpenseParticipant[] {
  return participants.map((participant) => ({
    userId: participant.userId,
    value: shares.get(participant.userId) ?? 0,
  }));
}

async function readGroupState(transaction: Transaction, groupId: string) {
  const [activeMembers, expenses, balances] = await Promise.all([
    getQueryInTransaction<GroupMember>(
      transaction,
      collectionRef(collectionNames.groupMembers)
        .where("groupId", "==", groupId)
        .where("isActive", "==", true),
    ),
    getQueryInTransaction<Expense>(
      transaction,
      collectionRef(collectionNames.expenses).where("groupId", "==", groupId),
    ),
    getQueryInTransaction<Balance>(
      transaction,
      collectionRef(collectionNames.balances).where("groupId", "==", groupId),
    ),
  ]);

  return { activeMembers, expenses, balances };
}

async function getExpenseForResponse(expense: Expense | string) {
  const expenseRecord =
    typeof expense === "string"
      ? await getDoc<Expense>(collectionNames.expenses, expense)
      : expense;
  if (!expenseRecord) {
    throw new NotFoundError("Expense not found");
  }

  const users = await publicUserMap([
    expenseRecord.paidByUserId,
    expenseRecord.createdBy,
    ...expenseRecord.participants.map((participant) => participant.userId),
  ]);

  return {
    ...expenseRecord,
    participants: expenseRecord.participants.map((participant) => ({
      expenseId: expenseRecord.id,
      userId: participant.userId,
      value: participant.value,
      user: users.get(participant.userId) ?? null,
    })),
    payer: users.get(expenseRecord.paidByUserId) ?? null,
    creator: users.get(expenseRecord.createdBy) ?? null,
  };
}

export async function createExpense(
  groupId: string,
  userId: string,
  input: CreateExpenseInput,
  requestId?: string,
) {
  assertNoDuplicateParticipants(input.participants);
  computeShares(input.amount, input.splitMode, input.participants);

  const created = await collectionRef(collectionNames.expenses).firestore.runTransaction(
    async (transaction) => {
      await assertGroupMemberInTransaction(transaction, groupId, userId);
      const { activeMembers, expenses, balances } = await readGroupState(
        transaction,
        groupId,
      );
      validateActiveGroupUsers(
        activeMembers,
        input.paidByUserId,
        input.participants,
      );

      const now = new Date();
      const expense: Expense = {
        id: createId(),
        groupId,
        description: input.description,
        amount: input.amount,
        currency: input.currency ?? "VND",
        paidByUserId: input.paidByUserId,
        splitMode: input.splitMode,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
        participants: input.participants,
      };

      transaction.set(
        docRef(collectionNames.expenses, expense.id),
        cleanForFirestore(expense),
      );
      recalculateBalances(
        transaction,
        groupId,
        [...expenses, expense],
        activeMembers,
        balances,
      );
      writeExpenseAudit(
        transaction,
        userId,
        "expense_created",
        groupId,
        null,
        toAuditSnapshot(expense),
        requestId,
      );

      return expense;
    },
  );

  return getExpenseForResponse(created);
}

export async function getExpenses(
  groupId: string,
  userId: string,
  page: number,
  limit: number,
) {
  await assertGroupMember(groupId, userId);

  const expenses = sortByDateDesc(
    await getQuery<Expense>(
      collectionRef(collectionNames.expenses).where("groupId", "==", groupId),
    ),
    (expense) => expense.createdAt,
  );
  const result = paginate(expenses, page, limit);

  return {
    items: await Promise.all(result.items.map(getExpenseForResponse)),
    pagination: result.pagination,
  };
}

export async function getExpense(
  groupId: string,
  expenseId: string,
  userId: string,
) {
  await assertGroupMember(groupId, userId);

  const expense = await getDoc<Expense>(collectionNames.expenses, expenseId);
  if (!expense || expense.groupId !== groupId) {
    throw new NotFoundError("Expense not found");
  }

  return getExpenseForResponse(expense);
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  userId: string,
  input: UpdateExpenseInput,
  requestId?: string,
) {
  const updated = await collectionRef(collectionNames.expenses).firestore.runTransaction(
    async (transaction) => {
      const membership = await assertGroupMemberInTransaction(
        transaction,
        groupId,
        userId,
      );
      const existing = await getDocInTransaction<Expense>(
        transaction,
        collectionNames.expenses,
        expenseId,
      );
      if (!existing || existing.groupId !== groupId) {
        throw new NotFoundError("Expense not found");
      }

      const { activeMembers, expenses, balances } = await readGroupState(
        transaction,
        groupId,
      );

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
      const participants = input.participants ?? existingParticipants;
      const amountChanged =
        input.amount !== undefined && input.amount !== existing.amount;
      const splitModeChanged =
        input.splitMode !== undefined && input.splitMode !== existing.splitMode;

      validateActiveGroupUsers(activeMembers, paidByUserId, participants);
      const shares = computeShares(amount, splitMode, participants);

      const participantsToPersist =
        input.participants !== undefined
          ? participants
          : (amountChanged || splitModeChanged) && splitMode === "equal"
            ? sharesToParticipants(participants, shares)
            : participants;

      const updatedExpense: Expense = {
        ...existing,
        description,
        amount,
        currency,
        paidByUserId,
        splitMode,
        participants: participantsToPersist,
        updatedAt: new Date(),
      };

      transaction.set(
        docRef(collectionNames.expenses, expenseId),
        cleanForFirestore(updatedExpense),
      );
      recalculateBalances(
        transaction,
        groupId,
        expenses.map((expense) =>
          expense.id === expenseId ? updatedExpense : expense,
        ),
        activeMembers,
        balances,
      );

      writeExpenseAudit(
        transaction,
        userId,
        "expense_updated",
        groupId,
        toAuditSnapshot(existing),
        toAuditSnapshot(updatedExpense),
        requestId,
      );

      return updatedExpense;
    },
  );

  return getExpenseForResponse(updated);
}

export async function deleteExpense(
  groupId: string,
  expenseId: string,
  userId: string,
  requestId?: string,
) {
  await collectionRef(collectionNames.expenses).firestore.runTransaction(
    async (transaction) => {
      const membership = await assertGroupMemberInTransaction(
        transaction,
        groupId,
        userId,
      );
      const existing = await getDocInTransaction<Expense>(
        transaction,
        collectionNames.expenses,
        expenseId,
      );
      if (!existing || existing.groupId !== groupId) {
        throw new NotFoundError("Expense not found");
      }

      const { activeMembers, expenses, balances } = await readGroupState(
        transaction,
        groupId,
      );

      const canDelete =
        existing.createdBy === userId ||
        membership.role === "owner" ||
        membership.role === "admin";
      if (!canDelete) {
        throw new ForbiddenError("Only the expense creator or group admin can delete this expense");
      }

      transaction.delete(docRef(collectionNames.expenses, expenseId));
      recalculateBalances(
        transaction,
        groupId,
        expenses.filter((expense) => expense.id !== expenseId),
        activeMembers,
        balances,
      );
      writeExpenseAudit(
        transaction,
        userId,
        "expense_deleted",
        groupId,
        toAuditSnapshot(existing),
        null,
        requestId,
      );
    },
  );

  return { id: expenseId };
}
