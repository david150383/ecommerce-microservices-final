import request from "supertest";
import { createApp } from "../../src/app.js";
import { closeDbPool } from "../../src/db.js";
import { closeRedis } from "../../src/redis.js";
import { closeRabbitmq } from "../../src/rabbitmq/rabbitmq.js";

describe("Inventory API Integration Tests", () => {
  const app = createApp();

  afterAll(async () => {
    await Promise.all([closeDbPool(), closeRedis(), closeRabbitmq()]);
  });

  it("GET /inventory should return inventory list with items array", async () => {
    const res = await request(app).get("/inventory?limit=5");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("GET /inventory/:productId should reject invalid UUID with 400", async () => {
    const res = await request(app).get("/inventory/not-a-valid-uuid");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("GET /inventory/:productId should return 404 for non-existent product", async () => {
    const nonexistentUuid = "00000000-0000-0000-0000-000000000000";
    const res = await request(app).get(`/inventory/${nonexistentUuid}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("POST /inventory/:productId/stock should reject unauthenticated requests with 401", async () => {
    const testUuid = "00000000-0000-0000-0000-000000000000";
    const res = await request(app)
      .post(`/inventory/${testUuid}/stock`)
      .send({ availableQuantity: 50 });
    expect(res.status).toBe(401);
  });
});
