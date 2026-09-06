import request from "supertest";
import { createApp } from "../../src/app.js";
import { closeRedis } from "../../src/redis.js";

describe("API Gateway Health Integration Tests", () => {
  const app = createApp();

  afterAll(async () => {
    await closeRedis();
  });

  it("GET /health should return 200 ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBe("api-gateway");
  });

  it("GET /health/live should return 200 alive", async () => {
    const res = await request(app).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("alive");
  });
});
