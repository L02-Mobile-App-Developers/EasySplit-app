import { cleanDatabase, closeConnection, prisma } from "../helpers/setup";
import { addMember, createGroup, createUser } from "../helpers/factory";

const expenseService = require("../../src/modules/expense/expense.service") as typeof import("../../src/modules/expense/expense.service");

async function getBalanceSum(groupId: string): Promise<number> {
  const balances = await prisma.balance.findMany({
    where: { groupId },
    select: { balance: true },
  });
  return balances.reduce((sum, balance) => sum + balance.balance, 0);
}

async function getBalanceCount(groupId: string): Promise<number> {
  return prisma.balance.count({ where: { groupId } });
}

async function getExpenseParticipants(expenseId: string) {
  return prisma.expenseParticipant.findMany({
    where: { expenseId },
    orderBy: { userId: "asc" },
  });
}

describe("expense financial transactions", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeConnection();
  });

  async function createThreeMemberGroup() {
    const owner = await createUser({ email: `owner_${Date.now()}@example.com` });
    const memberA = await createUser({ email: `a_${Date.now()}@example.com` });
    const memberB = await createUser({ email: `b_${Date.now()}@example.com` });
    const group = await createGroup(owner.id);

    await addMember(group.id, memberA.id);
    await addMember(group.id, memberB.id);

    return { owner, memberA, memberB, group };
  }

  it("create expense keeps group balance sum equal to zero", async () => {
    const { owner, memberA, memberB, group } = await createThreeMemberGroup();

    await expenseService.createExpense(group.id, owner.id, {
      description: "Dinner",
      amount: 90000,
      paidByUserId: owner.id,
      splitMode: "amount",
      participants: [
        { userId: owner.id, value: 30000 },
        { userId: memberA.id, value: 30000 },
        { userId: memberB.id, value: 30000 },
      ],
    });

    expect(await getBalanceSum(group.id)).toBe(0);
    expect(await getBalanceCount(group.id)).toBe(3);
  });

  it("update expense keeps group balance sum equal to zero", async () => {
    const { owner, memberA, memberB, group } = await createThreeMemberGroup();

    const expense = await expenseService.createExpense(group.id, owner.id, {
      description: "Dinner",
      amount: 90000,
      paidByUserId: owner.id,
      splitMode: "amount",
      participants: [
        { userId: owner.id, value: 30000 },
        { userId: memberA.id, value: 30000 },
        { userId: memberB.id, value: 30000 },
      ],
    });

    await expenseService.updateExpense(group.id, expense.id, owner.id, {
      amount: 120000,
      participants: [
        { userId: owner.id, value: 40000 },
        { userId: memberA.id, value: 40000 },
        { userId: memberB.id, value: 40000 },
      ],
    });

    expect(await getBalanceSum(group.id)).toBe(0);
    expect(await getBalanceCount(group.id)).toBe(3);
  });

  it("description-only update preserves participants", async () => {
    const { owner, memberA, memberB, group } = await createThreeMemberGroup();

    const expense = await expenseService.createExpense(group.id, owner.id, {
      description: "Dinner",
      amount: 90000,
      paidByUserId: owner.id,
      splitMode: "amount",
      participants: [
        { userId: owner.id, value: 30000 },
        { userId: memberA.id, value: 30000 },
        { userId: memberB.id, value: 30000 },
      ],
    });
    const beforeParticipants = await getExpenseParticipants(expense.id);

    await expenseService.updateExpense(group.id, expense.id, owner.id, {
      description: "Dinner with coffee",
    });

    const afterParticipants = await getExpenseParticipants(expense.id);
    expect(afterParticipants).toEqual(beforeParticipants);
    expect(await getBalanceSum(group.id)).toBe(0);
  });

  it("rejects amount update without participants when existing amount split no longer sums to amount", async () => {
    const { owner, memberA, memberB, group } = await createThreeMemberGroup();

    const expense = await expenseService.createExpense(group.id, owner.id, {
      description: "Dinner",
      amount: 90000,
      paidByUserId: owner.id,
      splitMode: "amount",
      participants: [
        { userId: owner.id, value: 30000 },
        { userId: memberA.id, value: 30000 },
        { userId: memberB.id, value: 30000 },
      ],
    });

    await expect(
      expenseService.updateExpense(group.id, expense.id, owner.id, {
        amount: 120000,
      }),
    ).rejects.toThrow("must equal total amount");

    const unchanged = await prisma.expense.findUniqueOrThrow({
      where: { id: expense.id },
      include: { participants: true },
    });
    expect(unchanged.amount).toBe(90000);
    expect(unchanged.participants).toHaveLength(3);
    expect(await getBalanceSum(group.id)).toBe(0);
  });

  it("rejects splitMode update without participants when existing participant data is invalid for the new mode", async () => {
    const { owner, memberA, memberB, group } = await createThreeMemberGroup();

    const expense = await expenseService.createExpense(group.id, owner.id, {
      description: "Dinner",
      amount: 90000,
      paidByUserId: owner.id,
      splitMode: "equal",
      participants: [
        { userId: owner.id, value: 0 },
        { userId: memberA.id, value: 0 },
        { userId: memberB.id, value: 0 },
      ],
    });

    await expect(
      expenseService.updateExpense(group.id, expense.id, owner.id, {
        splitMode: "amount",
      }),
    ).rejects.toThrow("must equal total amount");

    const unchanged = await prisma.expense.findUniqueOrThrow({
      where: { id: expense.id },
      include: { participants: true },
    });
    expect(unchanged.splitMode).toBe("equal");
    expect(unchanged.participants).toHaveLength(3);
    expect(await getBalanceSum(group.id)).toBe(0);
  });

  it("delete expense keeps group balance sum equal to zero and resets active members", async () => {
    const { owner, memberA, memberB, group } = await createThreeMemberGroup();

    const expense = await expenseService.createExpense(group.id, owner.id, {
      description: "Dinner",
      amount: 90000,
      paidByUserId: owner.id,
      splitMode: "amount",
      participants: [
        { userId: owner.id, value: 30000 },
        { userId: memberA.id, value: 30000 },
        { userId: memberB.id, value: 30000 },
      ],
    });

    await expenseService.deleteExpense(group.id, expense.id, owner.id);

    const balances = await prisma.balance.findMany({
      where: { groupId: group.id },
      select: { balance: true },
    });

    expect(balances).toHaveLength(3);
    expect(balances.every((balance) => balance.balance === 0)).toBe(true);
    expect(await getBalanceSum(group.id)).toBe(0);
  });

  it("rolls back expense creation when balance recalculation fails", async () => {
    const { owner, memberA, memberB, group } = await createThreeMemberGroup();

    await prisma.expense.create({
      data: {
        groupId: group.id,
        description: "Corrupt existing expense",
        amount: 10000,
        currency: "VND",
        paidByUserId: owner.id,
        splitMode: "amount",
        createdBy: owner.id,
        participants: {
          create: [
            { userId: owner.id, value: 1000 },
            { userId: memberA.id, value: 1000 },
          ],
        },
      },
    });

    await expect(
      expenseService.createExpense(group.id, owner.id, {
        description: "Should rollback",
        amount: 90000,
        paidByUserId: owner.id,
        splitMode: "amount",
        participants: [
          { userId: owner.id, value: 30000 },
          { userId: memberA.id, value: 30000 },
          { userId: memberB.id, value: 30000 },
        ],
      }),
    ).rejects.toThrow("Sum of participant amounts");

    await expect(
      prisma.expense.findFirst({
        where: { groupId: group.id, description: "Should rollback" },
      }),
    ).resolves.toBeNull();

    expect(
      await prisma.auditLog.count({
        where: { entityId: group.id, action: "expense_created" },
      }),
    ).toBe(0);
  });
});
