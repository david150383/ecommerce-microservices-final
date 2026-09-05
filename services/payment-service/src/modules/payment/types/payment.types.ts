export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";

export interface Payment {
  id: string;
  orderId: string;
  customerId: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  transactionId?: string | null | undefined;
  failureReason?: string | null | undefined;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentRow {
  id: string;
  order_id: string;
  customer_id: string;
  amount_cents: string | number;
  currency: string;
  status: PaymentStatus;
  provider: string;
  transaction_id: string | null;
  failure_reason: string | null;
  idempotency_key: string;
  created_at: Date;
  updated_at: Date;
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

export interface ListPaymentFilter {
  customerId?: string | undefined;
  orderId?: string | undefined;
  status?: PaymentStatus | "ALL" | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface PaginatedPayments {
  payments: Payment[];
  limit: number;
  offset: number;
  total: number;
}
