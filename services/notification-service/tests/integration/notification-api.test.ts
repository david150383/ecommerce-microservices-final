import request from "supertest";
import { createApp } from "../../src/app.js";
import { closeDbPool } from "../../src/db.js";
import { closeRedis } from "../../src/redis.js";
import { closeRabbitmq } from "../../src/rabbitmq/rabbitmq.js";

describe("Notification API Integration Tests", () => {
  const app = createApp();

  afterAll(async () => {
    await Promise.all([closeDbPool(), closeRedis(), closeRabbitmq()]);
  });

  const customerId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const adminId = "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

  it("GET /notifications should reject unauthenticated requests with 401", async () => {
    const res = await request(app).get("/notifications");
    expect(res.status).toBe(401);
  });

  it("GET /notifications should return user notifications when authenticated", async () => {
    const res = await request(app)
      .get("/notifications")
      .set("x-user-id", customerId)
      .set("x-user-role", "CUSTOMER");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /notifications should reject non-admin callers with 403", async () => {
    const res = await request(app)
      .post("/notifications")
      .set("x-user-id", customerId)
      .set("x-user-role", "CUSTOMER")
      .send({
        channel: "EMAIL",
        recipient: "test@example.com",
        subject: "Forbidden",
        body: "Attempt",
      });

    expect(res.status).toBe(403);
  });

  it("GET /notifications/admin should return notifications stream for admin", async () => {
    const res = await request(app)
      .get("/notifications/admin?limit=5")
      .set("x-user-id", adminId)
      .set("x-user-role", "ADMIN");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /notifications/:id should reject invalid UUID with 400", async () => {
    const res = await request(app)
      .get("/notifications/not-a-valid-uuid")
      .set("x-user-id", customerId)
      .set("x-user-role", "CUSTOMER");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
