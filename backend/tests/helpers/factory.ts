import { prisma } from "./setup";

/**
 * Create a test user with a free subscription.
 */
export async function createUser(overrides: Partial<{
  displayName: string;
  email: string;
  passwordHash: string;
}> = {}) {
  const data = {
    displayName: overrides.displayName ?? "Test User",
    email: overrides.email ?? `test_${Date.now()}@example.com`,
    passwordHash: overrides.passwordHash ?? "fake-hash",
  };

  const user = await prisma.user.create({
    data: {
      ...data,
      subscription: {
        create: {
          plan: "free",
          status: "active",
        },
      },
    },
  });
  return user;
}

/**
 * Create a test user with a premium subscription.
 */
export async function createPremiumUser(overrides: Partial<{
  displayName: string;
  email: string;
  passwordHash: string;
}> = {}) {
  const data = {
    displayName: overrides.displayName ?? "Premium User",
    email: overrides.email ?? `premium_${Date.now()}@example.com`,
    passwordHash: overrides.passwordHash ?? "fake-hash",
  };

  const user = await prisma.user.create({
    data: {
      ...data,
      subscription: {
        create: {
          plan: "premium",
          status: "active",
        },
      },
    },
  });
  return user;
}

/**
 * Create a test group with the given user as owner & member.
 */
export async function createGroup(
  ownerId: string,
  overrides: Partial<{ name: string; category: string; status: string }> = {},
) {
  const data = {
    name: overrides.name ?? "Test Group",
    category: overrides.category ?? "trip",
    status: overrides.status ?? "active",
  };

  const group = await prisma.group.create({
    data: {
      ...data,
      ownerId,
      members: {
        create: {
          userId: ownerId,
          role: "owner",
        },
      },
    },
  });
  return group;
}

/**
 * Add a member to an existing group.
 */
export async function addMember(
  groupId: string,
  userId: string,
  role: string = "member",
) {
  return prisma.groupMember.create({
    data: { groupId, userId, role },
  });
}

/**
 * Create an expense and recalculate balances.
 */
export async function createExpense(
  groupId: string,
  creatorId: string,
  paidByUserId: string,
  amount: number,
  participants: Array<{ userId: string; value: number }>,
  splitMode: string = "amount",
) {
  const expense = await prisma.expense.create({
    data: {
      groupId,
      description: "Test expense",
      amount,
      currency: "VND",
      paidByUserId,
      splitMode,
      createdBy: creatorId,
      participants: {
        create: participants.map((p) => ({
          userId: p.userId,
          value: p.value,
        })),
      },
    },
  });

  // Recalculate balances
  await recalculateBalances(groupId);

  return expense;
}

/**
 * Recalculate all balances for a group (same logic as expense.service).
 */
async function recalculateBalances(groupId: string) {
  const expenses = await prisma.expense.findMany({
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
      expense.participants.map((p) => ({ userId: p.userId, value: p.value })),
    );

    for (const [userId, share] of shares) {
      netMap.set(userId, (netMap.get(userId) ?? 0) - share);
    }
  }

  const upserts = Array.from(netMap.entries()).map(([userId, balance]) =>
    prisma.balance.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId, balance },
      update: { balance },
    }),
  );

  await prisma.$transaction(upserts);
}

function computeShares(
  amount: number,
  splitMode: string,
  participants: Array<{ userId: string; value: number }>,
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
      participants.forEach((p) => shares.set(p.userId, p.value));
      break;
    }
    case "percent": {
      participants.forEach((p) =>
        shares.set(p.userId, Math.round((amount * p.value) / 100)),
      );
      break;
    }
    case "weight": {
      const totalWeight = participants.reduce((s, p) => s + p.value, 0);
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
  }

  return shares;
}
