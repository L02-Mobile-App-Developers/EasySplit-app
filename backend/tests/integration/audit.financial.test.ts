import { randomUUID } from "crypto";
import { cleanDatabase, closeConnection, prisma } from "../helpers/setup";
import { addMember, createGroup, createUser } from "../helpers/factory";

const expenseService = require("../../src/modules/expense/expense.service") as typeof import("../../src/modules/expense/expense.service");
const settlementService = require("../../src/modules/settlement/settlement.service") as typeof import("../../src/modules/settlement/settlement.service");

async function createThreeMemberGroup() {
  const owner = await createUser({ email: `owner_${Date.now()}_${Math.random()}@example.com` });
  const memberA = await createUser({ email: `a_${Date.now()}_${Math.random()}@example.com` });
  const memberB = await createUser({ email: `b_${Date.now()}_${Math.random()}@example.com` });
  const group = await createGroup(owner.id);

  await addMember(group.id, memberA.id);
  await addMember(group.id, memberB.id);

  return { owner, memberA, memberB, group };
}

describe("financial audit logs", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it("create expense creates an audit log", async () => {
    const { owner, memberA, memberB, group } = await createThreeMemberGroup();
    const requestId = randomUUID();

    const expense = await expenseService.createExpense(
      group.id,
      owner.id,
      {
        description: "Dinner",
        amount: 90000,
        paidByUserId: owner.id,
        splitMode: "amount",
        participants: [
          { userId: owner.id, value: 30000 },
          { userId: memberA.id, value: 30000 },
          { userId: memberB.id, value: 30000 },
        ],
      },
      requestId,
    );

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: group.id, action: "expense_created" },
    });
    const after = audit.after as { id: string; amount: number };

    expect(audit.actorUserId).toBe(owner.id);
    expect(audit.entityType).toBe("group");
    expect(audit.before).toBeNull();
    expect(after.id).toBe(expense.id);
    expect(after.amount).toBe(90000);
    expect(audit.requestId).toBe(requestId);
  });

  it("update expense creates before/after audit log", async () => {
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
      description: "Dinner and coffee",
    });

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: group.id, action: "expense_updated" },
    });
    const before = audit.before as { description: string; participants: unknown[] };
    const after = audit.after as { description: string; participants: unknown[] };

    expect(before.description).toBe("Dinner");
    expect(after.description).toBe("Dinner and coffee");
    expect(before.participants).toHaveLength(3);
    expect(after.participants).toHaveLength(3);
  });

  it("settlement creates an audit log", async () => {
    const { owner, memberA, memberB, group } = await createThreeMemberGroup();
    const requestId = randomUUID();

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

    const settlement = await settlementService.createSettlement(
      group.id,
      owner.id,
      {
        fromUserId: memberA.id,
        toUserId: owner.id,
        amount: 10000,
      },
      requestId,
    );

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: group.id, action: "settlement_created" },
    });
    const after = audit.after as { id: string; amount: number };

    expect(audit.actorUserId).toBe(owner.id);
    expect(audit.before).toBeNull();
    expect(after.id).toBe(settlement.id);
    expect(after.amount).toBe(10000);
    expect(audit.requestId).toBe(requestId);
  });

  it("audit log rolls back if financial transaction fails", async () => {
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

    expect(
      await prisma.auditLog.count({
        where: { entityId: group.id, action: "expense_created" },
      }),
    ).toBe(0);
    expect(
      await prisma.expense.count({
        where: { groupId: group.id, description: "Should rollback" },
      }),
    ).toBe(0);
  });
});
