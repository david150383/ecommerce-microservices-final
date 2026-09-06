import { z } from "zod";

export const orderItemInputSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
  quantity: z.coerce
    .number()
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than 0"),
  unitPriceCents: z.coerce
    .number()
    .int("Unit price must be an integer")
    .nonnegative("Unit price must be greater than or equal to 0"),
});

export const createOrderSchema = z.object({
  items: z.array(orderItemInputSchema).min(1, "Order must contain at least one item"),
  currency: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter ISO code")
    .toUpperCase()
    .default("USD"),
  correlationId: z.string().uuid("Invalid correlation ID format").optional(),
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid("Invalid order ID format"),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

export const listOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "ALL"]).optional(),
  customerId: z.string().uuid("Invalid customer ID format").optional(),
});

export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
