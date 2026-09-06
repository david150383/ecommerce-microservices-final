import request from "supertest";
import { createApp } from "../../src/app.js";
import { closeDbPool } from "../../src/db.js";
import { closeRedis } from "../../src/redis.js";

describe("Auth Flow Integration Tests", () => {
  const app = createApp();

  afterAll(async () => {
    await Promise.all([closeDbPool(), closeRedis()]);
  });

  const testEmail = `integration.test.${Date.now()}@example.com`;
  const testPassword = "ValidPassword123!";

  it("POST /auth/register should fail with 400 when payload is invalid", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "invalid-email",
      password: "short",
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /auth/register should succeed with 201 for valid new user", async () => {
    const res = await request(app).post("/auth/register").send({
      email: testEmail,
      password: testPassword,
      first_name: "Integration",
      last_name: "Tester",
      role: "CUSTOMER",
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.user.firstName).toBe("Integration");
    expect(res.body.data.user.lastName).toBe("Tester");
    expect(res.body.data.user.passwordHash).toBeUndefined(); // ensure password is not exposed
  });

  it("POST /auth/register should fail with 409 when email already exists", async () => {
    const res = await request(app).post("/auth/register").send({
      email: testEmail,
      password: testPassword,
      first_name: "Duplicate",
      last_name: "Tester",
      role: "CUSTOMER",
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("POST /auth/login should fail with 401 for incorrect password", async () => {
    const res = await request(app).post("/auth/login").send({
      email: testEmail,
      password: "WrongPassword123!",
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("POST /auth/login should succeed with 200 and return access token", async () => {
    const res = await request(app).post("/auth/login").send({
      email: testEmail,
      password: testPassword,
      client_type: "WEB",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);
  });
});
