import {
  processPaymentSchema,
  refundPaymentSchema,
  paymentIdParamSchema,
  orderIdParamSchema,
  listPaymentsQuerySchema,
} from "../../src/modules/payment/schemas/payment.schema.js";

describe("Payment Schemas (Unit)", () => {
  const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

  describe("processPaymentSchema", () => {
    it("should accept valid payment payload", () => {
      const payload = {
        orderId: validUuid,
        amountCents: 2500,
        currency: "USD",
        provider: "STRIPE",
      };
      const parsed = processPaymentSchema.parse(payload);
      expect(parsed.amountCents).toBe(2500);
      expect(parsed.currency).toBe("USD");
      expect(parsed.provider).toBe("STRIPE");
    });

    it("should default currency to USD", () => {
      const parsed = processPaymentSchema.parse({
        orderId: validUuid,
        amountCents: 1000,
      });
      expect(parsed.currency).toBe("USD");
    });

    it("should reject negative amountCents", () => {
      expect(() =>
        processPaymentSchema.parse({
          orderId: validUuid,
          amountCents: -500,
        }),
      ).toThrow();
    });

    it("should reject invalid orderId UUID", () => {
      expect(() =>
        processPaymentSchema.parse({
          orderId: "not-a-valid-uuid",
          amountCents: 1000,
        }),
      ).toThrow(/Invalid order ID format/);
    });
  });

  describe("refundPaymentSchema", () => {
    it("should accept valid refund payload", () => {
      const parsed = refundPaymentSchema.parse({
        amountCents: 1500,
        reason: "Defective item",
      });
      expect(parsed.amountCents).toBe(1500);
      expect(parsed.reason).toBe("Defective item");
    });

    it("should accept empty body for full refund", () => {
      const parsed = refundPaymentSchema.parse({});
      expect(parsed.amountCents).toBeUndefined();
      expect(parsed.reason).toBeUndefined();
    });

    it("should reject non-positive refund amount", () => {
      expect(() => refundPaymentSchema.parse({ amountCents: 0 })).toThrow(/greater than 0/);
    });
  });

  describe("param schemas", () => {
    it("paymentIdParamSchema should validate UUID", () => {
      expect(paymentIdParamSchema.parse({ id: validUuid }).id).toBe(validUuid);
      expect(() => paymentIdParamSchema.parse({ id: "invalid" })).toThrow(
        /Invalid payment ID format/,
      );
    });

    it("orderIdParamSchema should validate UUID", () => {
      expect(orderIdParamSchema.parse({ orderId: validUuid }).orderId).toBe(validUuid);
      expect(() => orderIdParamSchema.parse({ orderId: "invalid" })).toThrow(
        /Invalid order ID format/,
      );
    });
  });

  describe("listPaymentsQuerySchema", () => {
    it("should apply default limit and offset", () => {
      const parsed = listPaymentsQuerySchema.parse({});
      expect(parsed.limit).toBe(50);
      expect(parsed.offset).toBe(0);
    });

    it("should accept valid status filter", () => {
      const parsed = listPaymentsQuerySchema.parse({ status: "COMPLETED" });
      expect(parsed.status).toBe("COMPLETED");
    });
  });
});
