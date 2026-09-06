import { z } from "zod";

export const createProductSchema = z.object({
  sku: z.string().trim().min(1, "SKU is required").max(64, "SKU cannot exceed 64 characters"),
  name: z.string().trim().min(1, "Name is required").max(255, "Name cannot exceed 255 characters"),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric and single hyphens")
    .optional(),
  description: z.string().trim().default(""),
  priceCents: z.coerce
    .number()
    .int("Price in cents must be an integer")
    .nonnegative("Price in cents must be greater than or equal to 0"),
  currency: z
    .string()
    .trim()
    .length(3, "Currency must be a 3-letter ISO code")
    .toUpperCase()
    .default("USD"),
  category: z
    .string()
    .trim()
    .min(1, "Category is required")
    .max(100, "Category cannot exceed 100 characters"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export const updateProductSchema = z.object({
  sku: z.string().trim().min(1).max(64).optional(),
  name: z.string().trim().min(1).max(255).optional(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric and single hyphens")
    .optional(),
  description: z.string().trim().optional(),
  priceCents: z.coerce
    .number()
    .int()
    .nonnegative("Price in cents must be greater than or equal to 0")
    .optional(),
  currency: z.string().trim().length(3).toUpperCase().optional(),
  category: z.string().trim().min(1).max(100).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
});

export const productIdParamSchema = z.object({
  id: z.string().uuid("Invalid product ID format"),
});

export const productSlugParamSchema = z.object({
  slug: z.string().trim().min(1, "Slug is required"),
});

export const listProductsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().optional(),
  cursor: z.string().trim().optional(),
  category: z.string().trim().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED", "ALL"]).optional(),
  search: z.string().trim().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
