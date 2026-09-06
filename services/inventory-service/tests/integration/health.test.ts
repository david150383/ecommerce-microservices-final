import request from "supertest";
import { createApp } from "../../src/app.js";
import { closeDbPool } from "../../src/db.js";
import { closeRedis } from "../../src/redis.js";
import { closeRabbitmq } from "../../src/rabbitmq/rabbitmq.js";

describe("Inventory Service Health Integration Tests", () => {
  const app = createApp();

  afterAll(async () => {
    await Promise.all([closeDbPool(), closeRedis(), closeRabbitmq()]);
  });

  it("GET /health/live should return 200 alive", async () => {
    const res = await request(app).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("alive");
    expect(res.body.data.service).toBe("inventory-service");
  });

  it("GET /health should return 200 when db is healthy", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("ok");
  });
});
