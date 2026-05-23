import { cleanDatabase, closeConnection, prisma } from "../helpers/setup";
import { addMember, createGroup, createUser } from "../helpers/factory";

const expenseService = require("../../src/modules/expense/expense.service") as typeof import("../../src/modules/expense/expense.service");
const settlementService = require("../../src/modules/settlement/settlement.service") as typeof import("../../src/modules/settlement/settlement.service");

async function getBalanceSum(groupId: string): Promise<number> {
  const balances = await prisma.balance.findMany({
    where: { groupId },
    select: { balance: true },
  });
  return balances.reduce((sum, balance) => sum + balance.balance, 0);
}

async function getUserBalance(groupId: string, userId: string): Promise<number> {
  const balance = await prisma.balance.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId } },
  });
  return balance.balance;
}

describe("settlement concurrency safety", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeConnection();
  });

  async function createDebtFixture() {
    const owner = await createUser({ email: `owner_${Date.now()}_${Math.random()}@example.com` });
    const memberA = await createUser({ email: `a_${Date.now()}_${Math.random()}@example.com` });
    const memberB = await createUser({ email: `b_${Date.now()}_${Math.random()}@example.com` });
    const group = await createGroup(owner.id);

    await addMember(group.id, memberA.id);
    await addMember(group.id, memberB.id);

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

    return { owner, memberA, memberB, group };
  }

  it("valid settlement succeeds", async () => {
    const { owner, memberA, group } = await createDebtFixture();

    const settlement = await settlementService.createSettlement(group.id, owner.id, {
      fromUserId: memberA.id,
      toUserId: owner.id,
      amount: 10000,
    });

    expect(settlement.amount).toBe(10000);
    expect(await getUserBalance(group.id, memberA.id)).toBe(-20000);
    expect(await getBalanceSum(group.id)).toBe(0);
  });

  it("over-settlement is rejected", async () => {
    const { owner, memberA, group } = await createDebtFixture();

    await expect(
      settlementService.createSettlement(group.id, owner.id, {
        fromUserId: memberA.id,
        toUserId: owner.id,
        amount: 40000,
      }),
    ).rejects.toThrow("exceeds the maximum allowed settlement");

    expect(await prisma.settlement.count({ where: { groupId: group.id } })).toBe(0);
    expect(await getUserBalance(group.id, memberA.id)).toBe(-30000);
    expect(await getBalanceSum(group.id)).toBe(0);
  });

  it("concurrent settlement attempts cannot over-settle", async () => {
    const { owner, memberA, group } = await createDebtFixture();

    const attempts = await Promise.allSettled([
      settlementService.createSettlement(group.id, owner.id, {
        fromUserId: memberA.id,
        toUserId: owner.id,
        amount: 30000,
      }),
      settlementService.createSettlement(group.id, owner.id, {
        fromUserId: memberA.id,
        toUserId: owner.id,
        amount: 30000,
      }),
    ]);

    const fulfilled = attempts.filter((attempt) => attempt.status === "fulfilled");
    const rejected = attempts.filter((attempt) => attempt.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(await prisma.settlement.count({ where: { groupId: group.id } })).toBe(1);
    expect(await getUserBalance(group.id, memberA.id)).toBe(0);
    expect(await getBalanceSum(group.id)).toBe(0);
  });

  it("zero-sum invariant is preserved after multiple settlements", async () => {
    const { owner, memberA, memberB, group } = await createDebtFixture();

    await settlementService.createSettlement(group.id, owner.id, {
      fromUserId: memberA.id,
      toUserId: owner.id,
      amount: 15000,
    });
    await settlementService.createSettlement(group.id, owner.id, {
      fromUserId: memberB.id,
      toUserId: owner.id,
      amount: 20000,
    });

    expect(await getBalanceSum(group.id)).toBe(0);
  });
});
