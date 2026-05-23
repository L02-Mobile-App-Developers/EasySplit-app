import request from "supertest";
import { app } from "../../src/app";
import { cleanDatabase, closeConnection, prisma } from "../helpers/setup";
import { addMember, createGroup, createUser } from "../helpers/factory";
import * as expenseService from "../../src/modules/expense/expense.service";

function auth(userId: string) {
  return { "X-User-Id": userId };
}

function idem(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()}`;
}

async function makeFixture(options: { premiumOwner?: boolean } = {}) {
  const owner = await createUser({ email: `owner_${Date.now()}_${Math.random()}@example.com` });
  const admin = await createUser({ email: `admin_${Date.now()}_${Math.random()}@example.com` });
  const member = await createUser({ email: `member_${Date.now()}_${Math.random()}@example.com` });
  const otherMember = await createUser({ email: `other_${Date.now()}_${Math.random()}@example.com` });
  const nonMember = await createUser({ email: `outsider_${Date.now()}_${Math.random()}@example.com` });
  const group = await createGroup(owner.id);

  if (options.premiumOwner) {
    await prisma.subscription.update({
      where: { userId: owner.id },
      data: { plan: "premium", status: "active" },
    });
  }

  await addMember(group.id, admin.id, "admin");
  await addMember(group.id, member.id);
  await addMember(group.id, otherMember.id);

  const expense = await expenseService.createExpense(group.id, owner.id, {
    description: "Shared dinner",
    amount: 90000,
    paidByUserId: owner.id,
    splitMode: "amount",
    participants: [
      { userId: owner.id, value: 30000 },
      { userId: member.id, value: 30000 },
      { userId: otherMember.id, value: 30000 },
    ],
  });

  return { owner, admin, member, otherMember, nonMember, group, expense };
}

describe("authorization integration", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe("non-member access", () => {
    it("non-member cannot view group, expenses, balances, settlement, or history", async () => {
      const { owner, member, nonMember, group } = await makeFixture();

      const createExpenseBody = {
        description: "Blocked",
        amount: 30000,
        paidByUserId: owner.id,
        splitMode: "amount",
        participants: [{ userId: owner.id, value: 30000 }],
      };

      const requests = [
        request(app).get(`/api/v1/groups/${group.id}`),
        request(app).get(`/api/v1/groups/${group.id}/expenses`),
        request(app)
          .post(`/api/v1/groups/${group.id}/expenses`)
          .set("Idempotency-Key", idem("non-member-expense"))
          .send(createExpenseBody),
        request(app).get(`/api/v1/groups/${group.id}/balances`),
        request(app)
          .post(`/api/v1/groups/${group.id}/settlements`)
          .set("Idempotency-Key", idem("non-member-settlement"))
          .send({
            fromUserId: member.id,
            toUserId: owner.id,
            amount: 10000,
          }),
        request(app).get(`/api/v1/groups/${group.id}/history`),
      ];

      for (const req of requests) {
        const response = await req.set(auth(nonMember.id));
        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("inactive member access", () => {
    it("inactive member cannot create expense, create settlement, or access financial data", async () => {
      const { owner, member, otherMember, group } = await makeFixture();

      await prisma.groupMember.update({
        where: { groupId_userId: { groupId: group.id, userId: member.id } },
        data: { isActive: false },
      });

      const requests = [
        request(app)
          .post(`/api/v1/groups/${group.id}/expenses`)
          .set("Idempotency-Key", idem("inactive-expense"))
          .send({
            description: "Blocked",
            amount: 30000,
            paidByUserId: owner.id,
            splitMode: "amount",
            participants: [{ userId: owner.id, value: 30000 }],
          }),
        request(app)
          .post(`/api/v1/groups/${group.id}/settlements`)
          .set("Idempotency-Key", idem("inactive-settlement"))
          .send({
            fromUserId: otherMember.id,
            toUserId: owner.id,
            amount: 10000,
          }),
        request(app).get(`/api/v1/groups/${group.id}/expenses`),
        request(app).get(`/api/v1/groups/${group.id}/balances`),
        request(app).get(`/api/v1/groups/${group.id}/settlements`),
        request(app).get(`/api/v1/groups/${group.id}/history`),
      ];

      for (const req of requests) {
        const response = await req.set(auth(member.id));
        expect(response.status).toBe(404);
        expect(response.body.error.code).toBe("NOT_FOUND");
      }
    });
  });

  describe("owner permissions", () => {
    it("owner can update group, close group, remove member, and run premium group settlement", async () => {
      const { owner, member, group } = await makeFixture({ premiumOwner: true });

      const update = await request(app)
        .patch(`/api/v1/groups/${group.id}`)
        .set(auth(owner.id))
        .send({ name: "Updated group" });
      expect(update.status).toBe(200);

      const remove = await request(app)
        .delete(`/api/v1/groups/${group.id}/members/${member.id}`)
        .set(auth(owner.id));
      expect(remove.status).toBe(200);

      const close = await request(app)
        .post(`/api/v1/groups/${group.id}/close`)
        .set(auth(owner.id));
      expect(close.status).toBe(200);

      const settlement = await request(app)
        .post(`/api/v1/groups/${group.id}/group-settlement`)
        .set(auth(owner.id))
        .set("Idempotency-Key", idem("owner-group-settlement"))
        .send({ mode: "commit" });
      expect(settlement.status).toBe(200);
      expect(settlement.body.data.mode).toBe("commit");
    });
  });

  describe("admin permissions", () => {
    it("admin can manage members under current policy", async () => {
      const { admin, nonMember, group } = await makeFixture();

      const response = await request(app)
        .post(`/api/v1/groups/${group.id}/members`)
        .set(auth(admin.id))
        .send({ userId: nonMember.id, role: "member" });

      expect(response.status).toBe(201);
      expect(response.body.data.userId).toBe(nonMember.id);
    });

    it("admin cannot remove owner", async () => {
      const { owner, admin, group } = await makeFixture();

      const response = await request(app)
        .delete(`/api/v1/groups/${group.id}/members/${owner.id}`)
        .set(auth(admin.id));

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe("FORBIDDEN");
    });

    it("admin can close group under current owner-or-admin close policy", async () => {
      const { admin, group } = await makeFixture();

      const response = await request(app)
        .post(`/api/v1/groups/${group.id}/close`)
        .set(auth(admin.id));

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe("closed");
    });
  });

  describe("expense permissions", () => {
    it("creator can update and delete own expense", async () => {
      const { owner, group, expense } = await makeFixture();

      const update = await request(app)
        .patch(`/api/v1/groups/${group.id}/expenses/${expense.id}`)
        .set(auth(owner.id))
        .send({ description: "Creator update" });
      expect(update.status).toBe(200);
      expect(update.body.data.description).toBe("Creator update");

      const del = await request(app)
        .delete(`/api/v1/groups/${group.id}/expenses/${expense.id}`)
        .set(auth(owner.id));
      expect(del.status).toBe(200);
    });

    it("non-creator member cannot update or delete another user's expense", async () => {
      const { member, group, expense } = await makeFixture();

      const update = await request(app)
        .patch(`/api/v1/groups/${group.id}/expenses/${expense.id}`)
        .set(auth(member.id))
        .send({ description: "Blocked update" });
      expect(update.status).toBe(403);
      expect(update.body.error.code).toBe("FORBIDDEN");

      const del = await request(app)
        .delete(`/api/v1/groups/${group.id}/expenses/${expense.id}`)
        .set(auth(member.id));
      expect(del.status).toBe(403);
      expect(del.body.error.code).toBe("FORBIDDEN");
    });

    it("owner and admin can update or delete expenses under current policy", async () => {
      const { owner, admin, group, expense } = await makeFixture();

      const adminUpdate = await request(app)
        .patch(`/api/v1/groups/${group.id}/expenses/${expense.id}`)
        .set(auth(admin.id))
        .send({ description: "Admin update" });
      expect(adminUpdate.status).toBe(200);

      const ownerDelete = await request(app)
        .delete(`/api/v1/groups/${group.id}/expenses/${expense.id}`)
        .set(auth(owner.id));
      expect(ownerDelete.status).toBe(200);
    });
  });

  describe("premium permissions", () => {
    it("free group cannot use group settlement or create reminder", async () => {
      const { owner, member, group } = await makeFixture();

      const settlement = await request(app)
        .post(`/api/v1/groups/${group.id}/group-settlement`)
        .set(auth(owner.id))
        .set("Idempotency-Key", idem("free-group-settlement"))
        .send({ mode: "commit" });
      expect(settlement.status).toBe(403);
      expect(settlement.body.error.code).toBe("PREMIUM_REQUIRED");

      const reminder = await request(app)
        .post(`/api/v1/groups/${group.id}/reminders`)
        .set(auth(owner.id))
        .send({ targetUserIds: [member.id] });
      expect(reminder.status).toBe(403);
      expect(reminder.body.error.code).toBe("PREMIUM_REQUIRED");
    });

    it("premium owner unlocks premium group settlement and reminders for members", async () => {
      const { member, group } = await makeFixture({ premiumOwner: true });

      const reminder = await request(app)
        .post(`/api/v1/groups/${group.id}/reminders`)
        .set(auth(member.id))
        .send({ targetUserIds: [member.id] });
      expect(reminder.status).toBe(201);

      const settlement = await request(app)
        .post(`/api/v1/groups/${group.id}/group-settlement`)
        .set(auth(member.id))
        .set("Idempotency-Key", idem("premium-group-settlement"))
        .send({ mode: "commit" });
      expect(settlement.status).toBe(200);
    });
  });
});
