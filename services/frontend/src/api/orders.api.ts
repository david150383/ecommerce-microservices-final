import { apiClient } from './client.ts';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  id: string;
  order_id: string;
  orderId: string;
  product_id: string;
  productId: string;
  quantity: number;
  unit_price_cents: number;
  unitPriceCents: number;
  total_price_cents?: number;
  totalPriceCents?: number;
  created_at: string;
  createdAt: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customerId: string;
  status: OrderStatus;
  total_amount_cents: number;
  totalAmountCents: number;
  currency: string;
  cancellation_reason: string | null;
  cancellationReason?: string | null;
  correlation_id: string;
  correlationId: string;
  created_at: string;
  createdAt: string;
  updated_at: string;
  updatedAt: string;
  items: OrderItem[];
}

export interface CreateOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
    unitPriceCents: number;
  }>;
  currency?: string;
  correlationId?: string;
}

export function mapOrderItem(item: any): OrderItem {
  const created = item?.createdAt || item?.created_at || new Date().toISOString();
  const unitPrice = Number(item?.unitPriceCents ?? item?.unit_price_cents ?? 0);
  const totalPrice = Number(item?.totalPriceCents ?? item?.total_price_cents ?? unitPrice * Number(item?.quantity || 1));
  const orderId = item?.orderId || item?.order_id || '';
  const productId = item?.productId || item?.product_id || '';

  return {
    id: item?.id || '',
    order_id: orderId,
    orderId,
    product_id: productId,
    productId,
    quantity: Number(item?.quantity || 1),
    unit_price_cents: unitPrice,
    unitPriceCents: unitPrice,
    total_price_cents: totalPrice,
    totalPriceCents: totalPrice,
    created_at: typeof created === 'string' ? created : new Date(created).toISOString(),
    createdAt: typeof created === 'string' ? created : new Date(created).toISOString(),
  };
}

export function mapOrder(o: any): Order {
  const total = Number(o?.totalAmountCents ?? o?.total_amount_cents ?? 0);
  const created = o?.createdAt || o?.created_at || new Date().toISOString();
  const updated = o?.updatedAt || o?.updated_at || new Date().toISOString();
  const customerId = o?.customerId || o?.customer_id || '';
  const correlationId = o?.correlationId || o?.correlation_id || '';
  const cancellationReason = o?.cancellationReason ?? o?.cancellation_reason ?? null;

  return {
    id: o?.id || '',
    customer_id: customerId,
    customerId,
    status: o?.status || 'PENDING',
    total_amount_cents: total,
    totalAmountCents: total,
    currency: o?.currency || 'USD',
    cancellation_reason: cancellationReason,
    cancellationReason,
    correlation_id: correlationId,
    correlationId,
    created_at: typeof created === 'string' ? created : new Date(created).toISOString(),
    createdAt: typeof created === 'string' ? created : new Date(created).toISOString(),
    updated_at: typeof updated === 'string' ? updated : new Date(updated).toISOString(),
    updatedAt: typeof updated === 'string' ? updated : new Date(updated).toISOString(),
    items: Array.isArray(o?.items) ? o.items.map(mapOrderItem) : [],
  };
}

export const ordersApi = {
  async createOrder(data: CreateOrderRequest, customCorrelationId?: string): Promise<{ message: string; data: Order }> {
    const headers: Record<string, string> = {};
    const correlationId = customCorrelationId || data.correlationId;
    if (correlationId) {
      headers['x-correlation-id'] = correlationId;
    }

    const payload = {
      items: data.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPriceCents: i.unitPriceCents,
      })),
      currency: data.currency || 'USD',
      correlationId,
    };

    const res = await apiClient<any>('/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const rawOrder = res.data?.order || res.data;
    return {
      message: res.message || 'Order placed successfully',
      data: mapOrder(rawOrder),
    };
  },

  async getOrder(id: string): Promise<{ data: Order }> {
    const res = await apiClient<any>(`/orders/${id}`);
    const rawOrder = res.data?.order || res.data;
    return { data: mapOrder(rawOrder) };
  },

  async listCustomerOrders(): Promise<{ data: Order[] }> {
    const res = await apiClient<any>('/orders');
    const rawOrders = res.data?.orders || (Array.isArray(res.data) ? res.data : []);
    return { data: rawOrders.map(mapOrder) };
  },

  async cancelOrder(id: string, reason?: string): Promise<{ data: Order }> {
    const res = await apiClient<any>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    const rawOrder = res.data?.order || res.data;
    return { data: mapOrder(rawOrder) };
  },
};
