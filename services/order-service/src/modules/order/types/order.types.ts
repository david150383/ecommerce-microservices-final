export type OrderStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmountCents: number;
  currency: string;
  cancellationReason?: string | null | undefined;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRow {
  id: string;
  customer_id: string;
  status: OrderStatus;
  total_amount_cents: string | number;
  currency: string;
  cancellation_reason: string | null;
  correlation_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  createdAt: Date;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: string | number;
  created_at: Date;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export type OutboxStatus = "PENDING" | "PUBLISHED" | "FAILED";

export interface OutboxEvent {
  id: string;
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  routingKey: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retryCount: number;
  errorMessage?: string | null | undefined;
  createdAt: Date;
  publishedAt?: Date | null | undefined;
}

export interface OutboxEventRow {
  id: string;
  event_id: string;
  event_type: string;
  aggregate_id: string;
  aggregate_type: string;
  routing_key: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  retry_count: number;
  error_message: string | null;
  created_at: Date;
  published_at: Date | null;
}

export interface InboxEvent {
  eventId: string;
  eventType: string;
  routingKey: string;
  processedAt: Date;
}

export interface ListOrderFilter {
  customerId?: string | undefined;
  status?: OrderStatus | "ALL" | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface PaginatedOrders {
  orders: OrderWithItems[];
  limit: number;
  offset: number;
  total: number;
}
