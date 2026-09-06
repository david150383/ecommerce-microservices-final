import request from "supertest";
import { createApp } from "../../src/app.js";
import { closeDbPool } from "../../src/db.js";
import { closeRedis } from "../../src/redis.js";
import { closeRabbitmq } from "../../src/rabbitmq/rabbitmq.js";

describe("Order API Integration Tests", () => {
  const app = createApp();

  afterAll(async () => {
    await Promise.all([closeDbPool(), closeRedis(), closeRabbitmq()]);
  });

  const testUserId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  it("GET /orders should reject unauthenticated requests with 401", async () => {
    const res = await request(app).get("/orders");
    expect(res.status).toBe(401);
  });

  it("GET /orders should return orders array when authenticated", async () => {
    const res = await request(app)
      .get("/orders?limit=5")
      .set("x-user-id", testUserId)
      .set("x-user-role", "CUSTOMER");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.orders)).toBe(true);
  });

  it("POST /orders should reject unauthenticated requests with 401", async () => {
    const res = await request(app).post("/orders").send({
      items: [],
    });
    expect(res.status).toBe(401);
  });

  it("POST /orders should return 400 for invalid items list", async () => {
    const res = await request(app)
      .post("/orders")
      .set("x-user-id", testUserId)
      .set("x-user-role", "CUSTOMER")
      .send({
        items: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("GET /orders/:id should reject invalid UUID with 400", async () => {
    const res = await request(app)
      .get("/orders/not-a-uuid")
      .set("x-user-id", testUserId)
      .set("x-user-role", "CUSTOMER");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
