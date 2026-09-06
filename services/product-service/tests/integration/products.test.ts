import request from "supertest";
import { createApp } from "../../src/app.js";
import { closeDbPool } from "../../src/db.js";
import { closeRedis } from "../../src/redis.js";

describe("Products API Integration Tests", () => {
  const app = createApp();

  afterAll(async () => {
    await Promise.all([closeDbPool(), closeRedis()]);
  });

  describe("GET /products", () => {
    it("should return list of products with pagination", async () => {
      const res = await request(app).get("/products?limit=5");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.data.products.length).toBeLessThanOrEqual(5);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.limit).toBe(5);
    });

    it("should filter products by category", async () => {
      const res = await request(app).get("/products?category=Computers&limit=5");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = res.body.data.products;
      items.forEach((item: any) => {
        expect(item.category).toBe("Computers");
      });
    });

    it("should return 404 for non-existent product ID", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app).get(`/products/${nonExistentId}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("RESOURCE_NOT_FOUND");
    });
  });
});
