import { z } from "zod";

export const processPaymentSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  amountCents: z.coerce
    .number()
    .int("Amount must be an integer in cents")
    .nonnegative("Amount must be greater than or equal to 0"),
  currency: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter ISO code")
    .toUpperCase()
    .default("USD"),
  paymentMethodId: z.string().trim().optional(),
  idempotencyKey: z
    .string()
    .trim()
    .min(1, "Idempotency key must not be empty")
    .max(255, "Idempotency key max length is 255")
    .optional(),
  provider: z.enum(["STRIPE", "MOCK_GATEWAY"]).optional(),
});

export const refundPaymentSchema = z.object({
  amountCents: z.coerce
    .number()
    .int("Refund amount must be an integer in cents")
    .positive("Refund amount must be greater than 0")
    .optional(),
  reason: z.string().trim().max(500).optional(),
});

export const paymentIdParamSchema = z.object({
  id: z.string().uuid("Invalid payment ID format"),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
});

export const listPaymentsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  status: z
    .enum(["PENDING", "COMPLETED", "FAILED", "REFUNDED", "ALL"])
    .optional(),
  customerId: z.string().uuid("Invalid customer ID format").optional(),
  orderId: z.string().uuid("Invalid order ID format").optional(),
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema>;
