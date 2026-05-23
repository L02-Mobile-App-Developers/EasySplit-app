import request from "supertest";
import { cleanDatabase, closeConnection, prisma } from "../helpers/setup";
import { addMember, createGroup, createUser } from "../helpers/factory";

const { app } = require("../../src/app");

function idempotencyKey(label: string): string {
  return `${label}-${Date.now()}-${Math.random()}`;
}

async function createGroupFixture() {
  const owner = await createUser({ email: `owner_${Date.now()}_${Math.random()}@example.com` });
  const memberA = await createUser({ email: `a_${Date.now()}_${Math.random()}@example.com` });
  const memberB = await createUser({ email: `b_${Date.now()}_${Math.random()}@example.com` });
  const group = await createGroup(owner.id);

  await addMember(group.id, memberA.id);
  await addMember(group.id, memberB.id);

  return { owner, memberA, memberB, group };
}

function expenseBody(ownerId: string, memberAId: string, memberBId: string, description = "Dinner") {
  return {
    description,
    amount: 90000,
    paidByUserId: ownerId,
    splitMode: "amount",
    participants: [
      { userId: ownerId, value: 30000 },
      { userId: memberAId, value: 30000 },
      { userId: memberBId, value: 30000 },
    ],
  };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function requestHash(method: string, path: string, body: unknown): string {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto
    .createHash("sha256")
    .update(stableStringify({ method, path, body }))
    .digest("hex");
}

describe("financial endpoint idempotency", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it("rejects missing Idempotency-Key for expense creation", async () => {
    const { owner, memberA, memberB, group } = await createGroupFixture();

    const response = await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set("X-User-Id", owner.id)
      .send(expenseBody(owner.id, memberA.id, memberB.id));

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(await prisma.expense.count({ where: { groupId: group.id } })).toBe(0);
  });

  it("same key and same body returns the stored response", async () => {
    const { owner, memberA, memberB, group } = await createGroupFixture();
    const key = idempotencyKey("same-body");
    const body = expenseBody(owner.id, memberA.id, memberB.id);

    const first = await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set("X-User-Id", owner.id)
      .set("Idempotency-Key", key)
      .send(body);
    const second = await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set("X-User-Id", owner.id)
      .set("Idempotency-Key", key)
      .send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    expect(await prisma.expense.count({ where: { groupId: group.id } })).toBe(1);
  });

  it("completed response is persisted before replay", async () => {
    const { owner, memberA, memberB, group } = await createGroupFixture();
    const key = idempotencyKey("persisted");
    const body = expenseBody(owner.id, memberA.id, memberB.id);

    const first = await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set("X-User-Id", owner.id)
      .set("Idempotency-Key", key)
      .send(body);

    expect(first.status).toBe(201);

    const row = await prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId: owner.id, key } },
    });

    expect(row).toMatchObject({
      state: "completed",
      statusCode: 201,
    });
    expect(row?.responseBody).toEqual(first.body);
  });

  it("same key and different body returns IDEMPOTENCY_CONFLICT", async () => {
    const { owner, memberA, memberB, group } = await createGroupFixture();
    const key = idempotencyKey("conflict");

    const first = await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set("X-User-Id", owner.id)
      .set("Idempotency-Key", key)
      .send(expenseBody(owner.id, memberA.id, memberB.id));
    const second = await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set("X-User-Id", owner.id)
      .set("Idempotency-Key", key)
      .send(expenseBody(owner.id, memberA.id, memberB.id, "Different dinner"));

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
    expect(await prisma.expense.count({ where: { groupId: group.id } })).toBe(1);
  });

  it("stale processing row is marked failed and does not duplicate mutation", async () => {
    const { owner, memberA, memberB, group } = await createGroupFixture();
    const key = idempotencyKey("stale");
    const path = `/api/v1/groups/${group.id}/expenses`;
    const body = expenseBody(owner.id, memberA.id, memberB.id);

    await prisma.idempotencyKey.create({
      data: {
        userId: owner.id,
        key,
        method: "POST",
        path,
        requestHash: requestHash("POST", path, body),
        state: "processing",
        createdAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await request(app)
      .post(path)
      .set("X-User-Id", owner.id)
      .set("Idempotency-Key", key)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toContainEqual({
      field: "Idempotency-Key",
      issue: "stale_processing",
    });

    const row = await prisma.idempotencyKey.findUnique({
      where: { userId_key: { userId: owner.id, key } },
    });
    expect(row?.state).toBe("failed");
    expect(await prisma.expense.count({ where: { groupId: group.id } })).toBe(0);
  });

  it("replay preserves original status code", async () => {
    const { owner, memberA, memberB, group } = await createGroupFixture();
    const key = idempotencyKey("status");
    const body = expenseBody(owner.id, memberA.id, memberB.id);

    await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set("X-User-Id", owner.id)
      .set("Idempotency-Key", key)
      .send(body)
      .expect(201);

    await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set("X-User-Id", owner.id)
      .set("Idempotency-Key", key)
      .send(body)
      .expect(201);
  });

  it("expired key can be reused after the window", async () => {
    const { owner, memberA, memberB, group } = await createGroupFixture();
    const key = idempotencyKey("expired");

    await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set("X-User-Id", owner.id)
      .set("Idempotency-Key", key)
      .send(expenseBody(owner.id, memberA.id, memberB.id))
      .expect(201);

    await prisma.idempotencyKey.updateMany({
      where: { userId: owner.id, key },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await request(app)
      .post(`/api/v1/groups/${group.id}/expenses`)
      .set("X-User-Id", owner.id)
      .set("Idempotency-Key", key)
      .send(expenseBody(owner.id, memberA.id, memberB.id, "Reused key"))
      .expect(201);

    expect(await prisma.expense.count({ where: { groupId: group.id } })).toBe(2);
  });

  it("concurrent same-key requests do not duplicate financial mutation", async () => {
    const { owner, memberA, memberB, group } = await createGroupFixture();
    const key = idempotencyKey("concurrent");
    const body = expenseBody(owner.id, memberA.id, memberB.id);

    const [first, second] = await Promise.all([
      request(app)
        .post(`/api/v1/groups/${group.id}/expenses`)
        .set("X-User-Id", owner.id)
        .set("Idempotency-Key", key)
        .send(body),
      request(app)
        .post(`/api/v1/groups/${group.id}/expenses`)
        .set("X-User-Id", owner.id)
        .set("Idempotency-Key", key)
        .send(body),
    ]);

    expect([first.status, second.status].sort()).toEqual([201, 201]);
    expect(first.body).toEqual(second.body);
    expect(await prisma.expense.count({ where: { groupId: group.id } })).toBe(1);
  });
});
