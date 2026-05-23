import request from "supertest";
import { app } from "../../src/app";
import { cleanDatabase, closeConnection, prisma } from "../helpers/setup";
import { createUser } from "../helpers/factory";
import { verifyFirebaseIdToken } from "../../src/lib/firebase-admin";

jest.mock("../../src/lib/firebase-admin", () => ({
  verifyFirebaseIdToken: jest.fn(),
}));

const mockedVerifyFirebaseIdToken = verifyFirebaseIdToken as jest.MockedFunction<
  typeof verifyFirebaseIdToken
>;

describe("Firebase production auth", () => {
  beforeEach(async () => {
    mockedVerifyFirebaseIdToken.mockReset();
    await cleanDatabase();
  });

  afterAll(async () => {
    await closeConnection();
  });

  it("missing Authorization returns UNAUTHORIZED", async () => {
    const response = await request(app).get("/api/v1/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("invalid Firebase token returns UNAUTHORIZED", async () => {
    mockedVerifyFirebaseIdToken.mockRejectedValueOnce(new Error("bad token"));

    const response = await request(app)
      .post("/api/v1/auth/sync")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("valid Firebase token creates and syncs user", async () => {
    mockedVerifyFirebaseIdToken.mockResolvedValueOnce({
      uid: "firebase-user-1",
      email: "firebase-user-1@example.com",
      name: "Firebase One",
      picture: "https://example.com/avatar.png",
    } as unknown as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);

    const response = await request(app)
      .post("/api/v1/auth/sync")
      .set("Authorization", "Bearer firebase-token");

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      email: "firebase-user-1@example.com",
      displayName: "Firebase One",
      avatarUrl: "https://example.com/avatar.png",
    });

    const user = await prisma.user.findUnique({
      where: { firebaseUid: "firebase-user-1" },
      include: { subscription: true },
    });
    expect(user).toMatchObject({
      email: "firebase-user-1@example.com",
      displayName: "Firebase One",
      avatarUrl: "https://example.com/avatar.png",
    });
    expect(user?.subscription?.plan).toBe("free");
  });

  it("existing firebaseUid maps to existing user", async () => {
    const existing = await prisma.user.create({
      data: {
        firebaseUid: "firebase-existing",
        email: "old@example.com",
        displayName: "Old Name",
        subscription: { create: { plan: "free", status: "active" } },
      },
    });

    mockedVerifyFirebaseIdToken.mockResolvedValueOnce({
      uid: "firebase-existing",
      email: "new@example.com",
      name: "New Name",
      picture: null,
    } as unknown as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);

    const response = await request(app)
      .post("/api/v1/auth/sync")
      .set("Authorization", "Bearer firebase-token");

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(existing.id);
    expect(response.body.data).toMatchObject({
      email: "new@example.com",
      displayName: "New Name",
    });
    expect(await prisma.user.count()).toBe(1);
  });

  it("X-User-Id works only when dev auth is enabled outside production", async () => {
    const user = await createUser({ email: "dev-user@example.com" });

    const response = await request(app)
      .get("/api/v1/me")
      .set("X-User-Id", user.id);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(user.id);
  });

  it("X-User-Id is ignored in production when dev auth is disabled", async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousDevAuth = process.env.DEV_AUTH_ENABLED;

    jest.resetModules();
    process.env.NODE_ENV = "production";
    process.env.DEV_AUTH_ENABLED = "false";

    const { authenticate } = require("../../src/middleware/auth");
    const req = { headers: { "x-user-id": "dev-user" } };
    const next = jest.fn();

    authenticate(req, {}, next);
    await new Promise((resolve) => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: "UNAUTHORIZED" }),
    );

    process.env.NODE_ENV = previousNodeEnv;
    process.env.DEV_AUTH_ENABLED = previousDevAuth;
  });

  it("DEV_AUTH_ENABLED=true fails in production", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousDevAuth = process.env.DEV_AUTH_ENABLED;

    jest.resetModules();
    process.env.NODE_ENV = "production";
    process.env.DEV_AUTH_ENABLED = "true";

    expect(() => require("../../src/config")).toThrow(
      "DEV_AUTH_ENABLED must be false in production",
    );

    process.env.NODE_ENV = previousNodeEnv;
    process.env.DEV_AUTH_ENABLED = previousDevAuth;
  });
});
