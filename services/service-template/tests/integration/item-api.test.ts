import request from "supertest";
import { createApp } from "../../src/app.js";
import { closeDbPool } from "../../src/db.js";
import { closeRedis } from "../../src/redis.js";

describe("Item API Integration Tests", () => {
  const app = createApp();

  afterAll(async () => {
    await Promise.all([closeDbPool(), closeRedis()]);
  });

  it("GET /items should return items list", async () => {
    const res = await request(app).get("/items");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
  });

  it("POST /items should reject unauthenticated requests with 401", async () => {
    const res = await request(app).post("/items").send({
      name: "New Item",
      price: 19.99,
    });
    expect(res.status).toBe(401);
  });

  it("GET /items/:id should reject invalid UUID with 400", async () => {
    const res = await request(app).get("/items/not-a-uuid");
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
