import { cleanDatabase, closeConnection, prisma } from "../helpers/setup";
import { addMember, createGroup, createUser } from "../helpers/factory";

const expenseService = require("../../src/modules/expense/expense.service") as typeof import("../../src/modules/expense/expense.service");
const settlementService = require("../../src/modules/settlement/settlement.service") as typeof import("../../src/modules/settlement/settlement.service");

async function getBalanceMap(groupId: string): Promise<Map<string, number>> {
  const balances = await prisma.balance.findMany({
    where: { groupId },
  });
  return new Map(balances.map((balance) => [balance.userId, balance.balance]));
}

async function getBalanceSum(groupId: string): Promise<number> {
  const balances = await prisma.balance.findMany({
    where: { groupId },
    select: { balance: true },
  });
  return balances.reduce((sum, balance) => sum + balance.balance, 0);
}

describe("group settlement commit safety", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeConnection();
  });

  async function createDebtFixture(premiumOwner = true) {
    const owner = await createUser({ email: `owner_${Date.now()}_${Math.random()}@example.com` });
    const memberA = await createUser({ email: `a_${Date.now()}_${Math.random()}@example.com` });
    const memberB = await createUser({ email: `b_${Date.now()}_${Math.random()}@example.com` });
    const group = await createGroup(owner.id);

    if (premiumOwner) {
      await prisma.subscription.update({
        where: { userId: owner.id },
        data: { plan: "premium", status: "active" },
      });
    }

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

  it("group settlement simulate does not mutate balances or settlements", async () => {
    const { owner, group } = await createDebtFixture();
    const beforeBalances = await getBalanceMap(group.id);

    const result = await settlementService.groupSettlement(group.id, owner.id, {
      mode: "simulate",
    });

    expect(result.mode).toBe("simulate");
    if (!("transfers" in result)) throw new Error("Expected simulate result");
    expect(result.totalTransfers).toBe(2);
    expect(await prisma.settlement.count({ where: { groupId: group.id } })).toBe(0);
    expect(await getBalanceMap(group.id)).toEqual(beforeBalances);
  });

  it("group settlement commit creates settlements and zeroes balances", async () => {
    const { owner, group } = await createDebtFixture();

    const result = await settlementService.groupSettlement(group.id, owner.id, {
      mode: "commit",
      note: "final close",
    });

    const balances = await getBalanceMap(group.id);

    expect(result.mode).toBe("commit");
    expect(result.totalSettlements).toBe(2);
    expect(await prisma.settlement.count({ where: { groupId: group.id } })).toBe(2);
    expect(Array.from(balances.values()).every((balance) => balance === 0)).toBe(true);
    expect(await getBalanceSum(group.id)).toBe(0);
  });

  it("manual balance change before commit does not allow stale preview transfers", async () => {
    const { owner, memberA, group } = await createDebtFixture();

    const preview = await settlementService.groupSettlement(group.id, owner.id, {
      mode: "simulate",
    });
    if (!("transfers" in preview)) throw new Error("Expected simulate result");
    expect(preview.transfers).toContainEqual({
      fromUserId: memberA.id,
      toUserId: owner.id,
      amount: 30000,
    });

    await settlementService.createSettlement(group.id, owner.id, {
      fromUserId: memberA.id,
      toUserId: owner.id,
      amount: 10000,
    });

    await settlementService.groupSettlement(group.id, owner.id, {
      mode: "commit",
      note: "commit after manual",
    });

    const commitSettlementFromMemberA = await prisma.settlement.findFirst({
      where: {
        groupId: group.id,
        fromUserId: memberA.id,
        note: "commit after manual",
      },
    });

    expect(commitSettlementFromMemberA?.amount).toBe(20000);
    expect((await getBalanceMap(group.id)).get(memberA.id)).toBe(0);
    expect(await getBalanceSum(group.id)).toBe(0);
  });

  it("group settlement commit uses locked current balances", async () => {
    const { owner, memberA, group } = await createDebtFixture();

    await settlementService.createSettlement(group.id, owner.id, {
      fromUserId: memberA.id,
      toUserId: owner.id,
      amount: 15000,
    });

    const result = await settlementService.groupSettlement(group.id, owner.id, {
      mode: "commit",
      note: "locked current balances",
    });

    if (!("settlements" in result)) throw new Error("Expected commit result");
    const settlements = result.settlements;
    if (!settlements) throw new Error("Expected commit settlements");
    const memberASettlement = settlements.find(
      (settlement) => settlement.fromUserId === memberA.id,
    );

    expect(memberASettlement?.amount).toBe(15000);
    expect((await getBalanceMap(group.id)).get(memberA.id)).toBe(0);
  });

  it("group settlement commit preserves zero-sum invariant", async () => {
    const { owner, group } = await createDebtFixture();

    await settlementService.groupSettlement(group.id, owner.id, {
      mode: "commit",
    });

    expect(await getBalanceSum(group.id)).toBe(0);
  });

  it("free group cannot commit group settlement", async () => {
    const { owner, group } = await createDebtFixture(false);

    await expect(
      settlementService.groupSettlement(group.id, owner.id, {
        mode: "commit",
      }),
    ).rejects.toMatchObject({ code: "PREMIUM_REQUIRED" });

    expect(await prisma.settlement.count({ where: { groupId: group.id } })).toBe(0);
  });
});
