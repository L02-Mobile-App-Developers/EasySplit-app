import { Transaction } from "firebase-admin/firestore";
import {
  NotFoundError,
  ValidationError,
  FreeQuotaExceededError,
  PremiumRequiredError,
} from "../../lib/errors";
import { config } from "../../config";
import {
  assertPremiumGroup,
  isPremiumSubscriptionActive,
} from "../../lib/entitlement";
import {
  AuditLog,
  Balance,
  balanceId,
  cleanForFirestore,
  collectionNames,
  collectionRef,
  createId,
  docRef,
  getDoc,
  getDocInTransaction,
  getQuery,
  getQueryInTransaction,
  groupMemberId,
  Group,
  GroupMember,
  paginate,
  publicUserMap,
  Settlement,
  sortByDateDesc,
  Subscription,
  subscriptionId,
} from "../../lib/firestore-db";

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

async function checkSmartSettleQuota(userId: string) {
  const subscription = await getDoc<Subscription>(
    collectionNames.subscriptions,
    subscriptionId(userId),
  );

  if (isPremiumSubscriptionActive(subscription)) {
    return;
  }

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const count = (
    await getQuery<AuditLog>(
      collectionRef(collectionNames.auditLogs)
        .where("actorUserId", "==", userId)
        .where("action", "==", "smart_settle"),
    )
  ).filter((log) => log.createdAt >= startOfMonth).length;

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

function toSettlementSnapshot(settlement: Settlement): SettlementSnapshot {
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

function writeFinancialAudit(
  transaction: Transaction,
  input: {
    actorUserId: string;
    action: string;
    groupId: string;
    before: unknown;
    after: unknown;
    requestId?: string;
  },
) {
  const audit: AuditLog = {
    id: input.requestId ?? createId(),
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: "group",
    entityId: input.groupId,
    before: input.before,
    after: input.after,
    requestId: input.requestId ?? null,
    createdAt: new Date(),
  };

  transaction.set(
    docRef(collectionNames.auditLogs, audit.id),
    cleanForFirestore(audit),
  );
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
  transaction: Transaction,
  groupId: string,
) {
  const group = await getDocInTransaction<Group>(
    transaction,
    collectionNames.groups,
    groupId,
  );

  if (!group) {
    throw new NotFoundError("Group not found");
  }

  const subscription = await getDocInTransaction<Subscription>(
    transaction,
    collectionNames.subscriptions,
    subscriptionId(group.ownerId),
  );

  if (!isPremiumSubscriptionActive(subscription)) {
    throw new PremiumRequiredError(
      "This group requires a Premium subscription to use this feature",
    );
  }
}

function assertActiveSettlementMembers(
  activeMembers: GroupMember[],
  fromUserId: string,
  toUserId: string,
) {
  const memberIds = new Set(activeMembers.map((member) => member.userId));

  if (!memberIds.has(fromUserId)) {
    throw new ValidationError("fromUserId is not an active group member");
  }
  if (!memberIds.has(toUserId)) {
    throw new ValidationError("toUserId is not an active group member");
  }
}

function validateSettlementBalances(
  fromUserId: string,
  toUserId: string,
  amount: number,
  balanceMap: Map<string, number>,
) {
  const fromAmount = balanceMap.get(fromUserId) ?? 0;
  const toAmount = balanceMap.get(toUserId) ?? 0;

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
  if (amount > maxAllowed) {
    throw new ValidationError(
      `Amount (${amount}) exceeds the maximum allowed settlement of ${maxAllowed}`,
    );
  }
}

async function enrichSettlement(settlement: Settlement | string) {
  const record =
    typeof settlement === "string"
      ? await getDoc<Settlement>(collectionNames.settlements, settlement)
      : settlement;
  if (!record) {
    throw new NotFoundError("Settlement not found");
  }

  const users = await publicUserMap([
    record.fromUserId,
    record.toUserId,
    record.createdBy,
  ]);

  return {
    ...record,
    fromUser: users.get(record.fromUserId) ?? null,
    toUser: users.get(record.toUserId) ?? null,
    creator: users.get(record.createdBy) ?? null,
  };
}

export async function getDebts(groupId: string, userId: string) {
  await assertGroupMember(groupId, userId);

  const balances = await getQuery<Balance>(
    collectionRef(collectionNames.balances).where("groupId", "==", groupId),
  );

  const creditors = balances
    .filter((b) => b.balance > 0)
    .map((b) => ({ userId: b.userId, balance: b.balance }))
    .sort((a, b) => b.balance - a.balance);

  const debtors = balances
    .filter((b) => b.balance < 0)
    .map((b) => ({ userId: b.userId, balance: -b.balance }))
    .sort((a, b) => b.balance - a.balance);

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

  const users = await publicUserMap(
    edges.flatMap((edge) => [edge.fromUserId, edge.toUserId]),
  );

  return edges.map((edge) => ({
    ...edge,
    fromUser: users.get(edge.fromUserId) ?? null,
    toUser: users.get(edge.toUserId) ?? null,
  }));
}

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

  const balances = await getQuery<Balance>(
    collectionRef(collectionNames.balances).where("groupId", "==", groupId),
  );
  const transfers = generateMinTransferSuggestions(balances, maxTransfers);

  const audit: AuditLog = {
    id: createId(),
    actorUserId: userId,
    action: "smart_settle",
    entityType: "group",
    entityId: groupId,
    before: null,
    after: { algorithm, totalTransfers: transfers.length },
    requestId: null,
    createdAt: new Date(),
  };
  await docRef(collectionNames.auditLogs, audit.id).set(cleanForFirestore(audit));

  return {
    transfers,
    totalTransfers: transfers.length,
    generatedAt: new Date().toISOString(),
  };
}

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

  if (input.amount <= 0) {
    throw new ValidationError("Amount must be greater than 0");
  }

  if (input.fromUserId === input.toUserId) {
    throw new ValidationError("Cannot settle with yourself");
  }

  const settlement = await collectionRef(collectionNames.settlements).firestore.runTransaction(
    async (transaction) => {
      const [activeMembers, fromBalance, toBalance] = await Promise.all([
        getQueryInTransaction<GroupMember>(
          transaction,
          collectionRef(collectionNames.groupMembers)
            .where("groupId", "==", groupId)
            .where("isActive", "==", true),
        ),
        getDocInTransaction<Balance>(
          transaction,
          collectionNames.balances,
          balanceId(groupId, input.fromUserId),
        ),
        getDocInTransaction<Balance>(
          transaction,
          collectionNames.balances,
          balanceId(groupId, input.toUserId),
        ),
      ]);

      assertActiveSettlementMembers(
        activeMembers,
        input.fromUserId,
        input.toUserId,
      );

      const balanceMap = new Map<string, number>([
        [input.fromUserId, fromBalance?.balance ?? 0],
        [input.toUserId, toBalance?.balance ?? 0],
      ]);
      validateSettlementBalances(
        input.fromUserId,
        input.toUserId,
        input.amount,
        balanceMap,
      );

      const created: Settlement = {
        id: createId(),
        groupId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        amount: input.amount,
        note: input.note ?? null,
        createdBy: userId,
        createdAt: new Date(),
      };

      transaction.set(
        docRef(collectionNames.settlements, created.id),
        cleanForFirestore(created),
      );
      transaction.set(
        docRef(collectionNames.balances, balanceId(groupId, input.fromUserId)),
        cleanForFirestore({
          groupId,
          userId: input.fromUserId,
          balance: (fromBalance?.balance ?? 0) + input.amount,
        }),
      );
      transaction.set(
        docRef(collectionNames.balances, balanceId(groupId, input.toUserId)),
        cleanForFirestore({
          groupId,
          userId: input.toUserId,
          balance: (toBalance?.balance ?? 0) - input.amount,
        }),
      );
      writeFinancialAudit(transaction, {
        actorUserId: userId,
        action: "settlement_created",
        groupId,
        before: null,
        after: toSettlementSnapshot(created),
        requestId,
      });

      return created;
    },
  );

  return settlement;
}

export async function getSettlements(
  groupId: string,
  userId: string,
  page: number = 1,
  limit: number = 20,
) {
  await assertGroupMember(groupId, userId);

  const settlements = sortByDateDesc(
    await getQuery<Settlement>(
      collectionRef(collectionNames.settlements).where("groupId", "==", groupId),
    ),
    (settlement) => settlement.createdAt,
  );
  const result = paginate(settlements, page, limit);

  return {
    items: await Promise.all(result.items.map(enrichSettlement)),
    pagination: result.pagination,
  };
}

export async function getSettlement(
  groupId: string,
  settlementId: string,
  userId: string,
) {
  await assertGroupMember(groupId, userId);

  const settlement = await getDoc<Settlement>(
    collectionNames.settlements,
    settlementId,
  );
  if (!settlement || settlement.groupId !== groupId) {
    throw new NotFoundError("Settlement not found");
  }

  return enrichSettlement(settlement);
}

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

  const result = await collectionRef(collectionNames.settlements).firestore.runTransaction(
    async (transaction) => {
      await assertGroupMemberInTransaction(transaction, groupId, userId);
      await assertPremiumGroupForTransaction(transaction, groupId);

      const balances = await getQueryInTransaction<Balance>(
        transaction,
        collectionRef(collectionNames.balances).where("groupId", "==", groupId),
      );
      const beforeBalances = balances.map((balance) => ({
        userId: balance.userId,
        balance: balance.balance,
      }));
      const transfers = generateMinTransferSuggestions(balances, 50);
      const balanceMap = new Map(
        balances.map((balance) => [balance.userId, balance.balance]),
      );
      const createdSettlements: Settlement[] = [];

      for (const transfer of transfers) {
        if (transfer.amount <= 0) {
          throw new ValidationError("Settlement transfer amount must be greater than 0");
        }

        validateSettlementBalances(
          transfer.fromUserId,
          transfer.toUserId,
          transfer.amount,
          balanceMap,
        );

        const fromBalance = balanceMap.get(transfer.fromUserId) ?? 0;
        const toBalance = balanceMap.get(transfer.toUserId) ?? 0;

        const settlement: Settlement = {
          id: createId(),
          groupId,
          fromUserId: transfer.fromUserId,
          toUserId: transfer.toUserId,
          amount: transfer.amount,
          note: input.note ?? null,
          createdBy: userId,
          createdAt: new Date(),
        };
        createdSettlements.push(settlement);

        transaction.set(
          docRef(collectionNames.settlements, settlement.id),
          cleanForFirestore(settlement),
        );

        const nextFromBalance = fromBalance + transfer.amount;
        const nextToBalance = toBalance - transfer.amount;
        balanceMap.set(transfer.fromUserId, nextFromBalance);
        balanceMap.set(transfer.toUserId, nextToBalance);
      }

      for (const [memberUserId, balance] of balanceMap) {
        transaction.set(
          docRef(collectionNames.balances, balanceId(groupId, memberUserId)),
          cleanForFirestore({ groupId, userId: memberUserId, balance }),
        );
      }

      const afterBalances = [...balanceMap.entries()]
        .map(([memberUserId, balance]) => ({
          userId: memberUserId,
          balance,
        }))
        .sort((a, b) => a.userId.localeCompare(b.userId));

      const balanceSum = afterBalances.reduce(
        (sum, balance) => sum + balance.balance,
        0,
      );
      if (balanceSum !== 0) {
        throw new ValidationError("Group balance sum must remain zero");
      }

      writeFinancialAudit(transaction, {
        actorUserId: userId,
        action: "group_settlement_committed",
        groupId,
        before: {
          balances: beforeBalances,
          transfers,
        },
        after: {
          settlements: createdSettlements.map(toSettlementSnapshot),
          balances: afterBalances,
        },
        requestId,
      });

      return {
        totalSettlements: createdSettlements.length,
        settlements: createdSettlements,
      };
    },
  );

  return {
    mode: "commit",
    totalSettlements: result.totalSettlements,
    settlements: result.settlements,
    generatedAt: new Date().toISOString(),
  };
}
