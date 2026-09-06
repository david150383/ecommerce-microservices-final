import request from "supertest";
import { createApp } from "../../src/app.js";
import { closeDbPool } from "../../src/db.js";
import { closeRedis } from "../../src/redis.js";
import { closeRabbitmq } from "../../src/rabbitmq/rabbitmq.js";

describe("Payment API Integration Tests", () => {
  const app = createApp();

  afterAll(async () => {
    await Promise.all([closeDbPool(), closeRedis(), closeRabbitmq()]);
  });

  const testUserId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  it("GET /payments should reject unauthenticated requests with 401", async () => {
    const res = await request(app).get("/payments");
    expect(res.status).toBe(401);
  });

  it("GET /payments should return payments array when authenticated", async () => {
    const res = await request(app)
      .get("/payments?limit=5")
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.payments)).toBe(true);
  });

  it("POST /payments should reject unauthenticated requests with 401", async () => {
    const res = await request(app).post("/payments").send({});
    expect(res.status).toBe(401);
  });

  it("POST /payments should return 400 for invalid payload", async () => {
    const res = await request(app)
      .post("/payments")
      .set("x-user-id", testUserId)
      .set("x-user-role", "CUSTOMER")
      .send({
        orderId: "not-a-uuid",
        amountCents: -10,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("GET /payments/:id should reject invalid UUID with 400", async () => {
    const res = await request(app)
      .get("/payments/not-a-uuid")
      .set("x-user-id", testUserId)
      .set("x-user-role", "CUSTOMER");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
