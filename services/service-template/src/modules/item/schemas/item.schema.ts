import { z } from "zod";

export const createItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(1000).default(""),
  price: z.coerce.number().positive("Price must be greater than 0"),
});

export const updateItemSchema = createItemSchema.partial();

export const itemIdParamSchema = z.object({
  id: z.string().uuid("Invalid item ID format"),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
