import {
  productIdParamSchema,
  orderIdParamSchema,
  updateStockSchema,
  adjustStockSchema,
  reserveStockSchema,
  listInventoryQuerySchema,
} from "../../src/modules/inventory/schemas/inventory.schema.js";

describe("Inventory Schemas (Unit)", () => {
  const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  describe("productIdParamSchema", () => {
    it("should accept valid UUIDs", () => {
      const result = productIdParamSchema.parse({ productId: validUuid });
      expect(result.productId).toBe(validUuid);
    });

    it("should reject invalid UUIDs", () => {
      expect(() => productIdParamSchema.parse({ productId: "not-a-uuid" })).toThrow(
        /Invalid product ID format/,
      );
    });
  });

  describe("orderIdParamSchema", () => {
    it("should accept valid UUIDs", () => {
      const result = orderIdParamSchema.parse({ orderId: validUuid });
      expect(result.orderId).toBe(validUuid);
    });

    it("should reject invalid UUIDs", () => {
      expect(() => orderIdParamSchema.parse({ orderId: "12345" })).toThrow(
        /Invalid order ID format/,
      );
    });
  });

  describe("updateStockSchema", () => {
    it("should accept valid non-negative quantities", () => {
      expect(updateStockSchema.parse({ availableQuantity: 50 }).availableQuantity).toBe(50);
      expect(updateStockSchema.parse({ availableQuantity: 0 }).availableQuantity).toBe(0);
      expect(updateStockSchema.parse({ availableQuantity: "25" }).availableQuantity).toBe(25);
    });

    it("should reject negative quantities", () => {
      expect(() => updateStockSchema.parse({ availableQuantity: -1 })).toThrow();
    });

    it("should reject non-integers", () => {
      expect(() => updateStockSchema.parse({ availableQuantity: 12.5 })).toThrow();
    });
  });

  describe("adjustStockSchema", () => {
    it("should accept non-zero positive or negative deltas", () => {
      expect(adjustStockSchema.parse({ delta: 10 }).delta).toBe(10);
      expect(adjustStockSchema.parse({ delta: -5 }).delta).toBe(-5);
    });

    it("should reject zero delta", () => {
      expect(() => adjustStockSchema.parse({ delta: 0 })).toThrow(/Delta cannot be zero/);
    });
  });

  describe("reserveStockSchema", () => {
    it("should accept valid reservation payload", () => {
      const result = reserveStockSchema.parse({
        orderId: validUuid,
        productId: validUuid,
        quantity: 3,
      });
      expect(result.quantity).toBe(3);
    });

    it("should reject zero or negative reservation quantity", () => {
      expect(() =>
        reserveStockSchema.parse({
          orderId: validUuid,
          productId: validUuid,
          quantity: 0,
        }),
      ).toThrow();
    });
  });

  describe("listInventoryQuerySchema", () => {
    it("should apply default limit and offset", () => {
      const result = listInventoryQuerySchema.parse({});
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("should coerce string values", () => {
      const result = listInventoryQuerySchema.parse({ limit: "20", offset: "10" });
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(10);
    });
  });
});
