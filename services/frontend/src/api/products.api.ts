import { apiClient } from './client.ts';

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  price_cents: number;
  priceCents: number;
  currency: string;
  category: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  created_at: string;
  createdAt: string;
  updated_at: string;
  updatedAt: string;
}

export interface ProductsPageResponse {
  data: Product[];
  pagination: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
    total?: number;
  };
}

export function mapProduct(p: any): Product {
  const price = Number(p?.priceCents ?? p?.price_cents ?? 0);
  const created = p?.createdAt ?? p?.created_at ?? new Date().toISOString();
  const updated = p?.updatedAt ?? p?.updated_at ?? new Date().toISOString();
  return {
    id: p?.id ?? '',
    sku: p?.sku ?? '',
    name: p?.name ?? '',
    slug: p?.slug ?? '',
    description: p?.description ?? '',
    price_cents: price,
    priceCents: price,
    currency: p?.currency ?? 'USD',
    category: p?.category ?? 'General',
    status: p?.status ?? 'ACTIVE',
    created_at: typeof created === 'string' ? created : new Date(created).toISOString(),
    createdAt: typeof created === 'string' ? created : new Date(created).toISOString(),
    updated_at: typeof updated === 'string' ? updated : new Date(updated).toISOString(),
    updatedAt: typeof updated === 'string' ? updated : new Date(updated).toISOString(),
  };
}

export const productsApi = {
  async getProducts(
    limit = 12,
    cursor?: string | null,
    category?: string,
    search?: string,
  ): Promise<ProductsPageResponse> {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    if (cursor) {
      params.set('cursor', cursor);
    }
    if (category && category !== 'ALL') {
      params.set('category', category);
    }
    if (search && search.trim()) {
      params.set('search', search.trim());
    }
    const res = await apiClient<any>(`/products?${params.toString()}`);
    const rawList = res.data?.products || (Array.isArray(res.data) ? res.data : []);
    const meta = res.meta || {};
    return {
      data: rawList.map(mapProduct),
      pagination: {
        limit: meta.limit ?? limit,
        has_more: Boolean(meta.hasNextPage ?? meta.has_more),
        next_cursor: meta.nextCursor ?? meta.next_cursor ?? null,
        total: meta.total,
      },
    };
  },

  async getProductById(id: string): Promise<{ data: Product }> {
    const res = await apiClient<any>(`/products/${id}`);
    const raw = res.data?.product || res.data;
    return { data: mapProduct(raw) };
  },
};

