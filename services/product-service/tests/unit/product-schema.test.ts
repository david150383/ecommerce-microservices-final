import {
  createProductSchema,
  listProductsQuerySchema,
  updateProductSchema,
} from "../../src/modules/product/schemas/product.schema.js";

describe("Product Schemas Unit Tests", () => {
  describe("createProductSchema", () => {
    it("should validate a correct product payload", () => {
      const validPayload = {
        sku: "TEST-SKU-001",
        name: "Test Laptop Pro",
        slug: "test-laptop-pro",
        description: "A high-performance test laptop.",
        priceCents: 99900,
        currency: "USD",
        category: "Computers",
        status: "ACTIVE",
      };

      const result = createProductSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should reject product with negative price", () => {
      const invalidPayload = {
        sku: "TEST-SKU-002",
        name: "Invalid Price Product",
        priceCents: -500,
        category: "Audio",
      };

      const result = createProductSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("should reject product without sku or name", () => {
      const invalidPayload = {
        priceCents: 1000,
      };

      const result = createProductSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("listProductsQuerySchema", () => {
    it("should coerce limit and offset properly", () => {
      const query = {
        limit: "15",
        offset: "30",
        category: "Audio",
        search: "Speaker",
      };

      const result = listProductsQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(15);
        expect(result.data.offset).toBe(30);
        expect(result.data.category).toBe("Audio");
        expect(result.data.search).toBe("Speaker");
      }
    });

    it("should reject negative or zero limit", () => {
      const query = { limit: "0" };
      const result = listProductsQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });

  describe("updateProductSchema", () => {
    it("should allow partial updates", () => {
      const partial = { priceCents: 12900 };
      const result = updateProductSchema.safeParse(partial);
      expect(result.success).toBe(true);
    });
  });
});
