export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number;
  currency: string;
  category: string;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductRow {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price_cents: string | number;
  currency: string;
  category: string;
  status: ProductStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ListProductFilter {
  limit?: number | undefined;
  offset?: number | undefined;
  cursor?: string | undefined;
  category?: string | undefined;
  status?: ProductStatus | "ALL" | undefined;
  search?: string | undefined;
}

export interface PaginatedProducts {
  products: Product[];
  limit: number;
  offset?: number | undefined;
  total?: number | undefined;
  nextCursor?: string | null | undefined;
  hasNextPage: boolean;
}
