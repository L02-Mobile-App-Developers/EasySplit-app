import request from "supertest";
import { closeConnection } from "../helpers/setup";

const { app } = require("../../src/app");

describe("public health endpoints", () => {
  afterAll(async () => {
    await closeConnection();
  });

  it("/api/v1/health is public and returns a simple status", async () => {
    const response = await request(app).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.body.database).toBeUndefined();
    expect(response.body.config).toBeUndefined();
  });

  it("/api/v1/ready is public and returns a simple readiness status", async () => {
    const response = await request(app).get("/api/v1/ready");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.timestamp).toEqual(expect.any(String));
    expect(response.body.database).toBeUndefined();
    expect(response.body.config).toBeUndefined();
  });
});
