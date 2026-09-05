import { z } from "zod";

export const productIdParamSchema = z.object({
  productId: z.string().uuid("Invalid product ID format"),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
});

export const updateStockSchema = z.object({
  availableQuantity: z.coerce
    .number()
    .int("Quantity must be an integer")
    .nonnegative("Available quantity must be greater than or equal to 0"),
});

export const adjustStockSchema = z.object({
  delta: z.coerce
    .number()
    .int("Delta must be an integer")
    .refine((val) => val !== 0, "Delta cannot be zero"),
});

export const reserveStockSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  productId: z.string().uuid("Invalid product ID format"),
  quantity: z.coerce
    .number()
    .int("Quantity must be an integer")
    .positive("Quantity must be greater than 0"),
});

export const releaseStockSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  productId: z.string().uuid("Invalid product ID format"),
});

export const fulfillStockSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  productId: z.string().uuid("Invalid product ID format"),
});

export const listInventoryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  lowStockThreshold: z.coerce.number().int().nonnegative().optional(),
});

export type UpdateStockInput = z.infer<typeof updateStockSchema>;
export type AdjustStockInput = z.infer<typeof adjustStockSchema>;
export type ReserveStockInput = z.infer<typeof reserveStockSchema>;
export type ReleaseStockInput = z.infer<typeof releaseStockSchema>;
export type FulfillStockInput = z.infer<typeof fulfillStockSchema>;
export type ListInventoryQuery = z.infer<typeof listInventoryQuerySchema>;
