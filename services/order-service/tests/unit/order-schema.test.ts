import {
  orderItemInputSchema,
  createOrderSchema,
  orderIdParamSchema,
  cancelOrderSchema,
  listOrdersQuerySchema,
} from "../../src/modules/order/schemas/order.schema.js";

describe("Order Schemas (Unit)", () => {
  const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  describe("orderItemInputSchema", () => {
    it("should accept valid item", () => {
      const item = {
        productId: validUuid,
        quantity: 2,
        unitPriceCents: 1999,
      };
      const parsed = orderItemInputSchema.parse(item);
      expect(parsed.quantity).toBe(2);
      expect(parsed.unitPriceCents).toBe(1999);
    });

    it("should reject non-positive quantity", () => {
      expect(() =>
        orderItemInputSchema.parse({
          productId: validUuid,
          quantity: 0,
          unitPriceCents: 1000,
        }),
      ).toThrow(/greater than 0/);
    });

    it("should reject negative unit price", () => {
      expect(() =>
        orderItemInputSchema.parse({
          productId: validUuid,
          quantity: 1,
          unitPriceCents: -50,
        }),
      ).toThrow();
    });
  });

  describe("createOrderSchema", () => {
    it("should accept valid order payload", () => {
      const payload = {
        items: [
          {
            productId: validUuid,
            quantity: 1,
            unitPriceCents: 5000,
          },
        ],
      };
      const parsed = createOrderSchema.parse(payload);
      expect(parsed.currency).toBe("USD");
      expect(parsed.items.length).toBe(1);
    });

    it("should reject order with empty items array", () => {
      expect(() =>
        createOrderSchema.parse({
          items: [],
        }),
      ).toThrow(/at least one item/);
    });

    it("should normalize currency to uppercase", () => {
      const parsed = createOrderSchema.parse({
        items: [{ productId: validUuid, quantity: 1, unitPriceCents: 100 }],
        currency: "eur",
      });
      expect(parsed.currency).toBe("EUR");
    });
  });

  describe("orderIdParamSchema", () => {
    it("should accept valid UUID", () => {
      expect(orderIdParamSchema.parse({ id: validUuid }).id).toBe(validUuid);
    });

    it("should reject invalid UUID", () => {
      expect(() => orderIdParamSchema.parse({ id: "abc" })).toThrow(/Invalid order ID format/);
    });
  });

  describe("cancelOrderSchema", () => {
    it("should accept valid cancellation reason", () => {
      const result = cancelOrderSchema.parse({ reason: "Customer changed mind" });
      expect(result.reason).toBe("Customer changed mind");
    });

    it("should accept empty body", () => {
      const result = cancelOrderSchema.parse({});
      expect(result.reason).toBeUndefined();
    });
  });

  describe("listOrdersQuerySchema", () => {
    it("should use default limit and offset", () => {
      const result = listOrdersQuerySchema.parse({});
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it("should accept valid status filter", () => {
      const result = listOrdersQuerySchema.parse({ status: "CONFIRMED" });
      expect(result.status).toBe("CONFIRMED");
    });
  });
});
