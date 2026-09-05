export interface InventoryItem {
  id: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  totalQuantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryRow {
  id: string;
  product_id: string;
  available_quantity: number;
  reserved_quantity: number;
  created_at: Date;
  updated_at: Date;
}

export type ReservationStatus = "RESERVED" | "RELEASED" | "FULFILLED";

export interface InventoryReservation {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryReservationRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  status: ReservationStatus;
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

export interface ListInventoryFilter {
  limit?: number | undefined;
  offset?: number | undefined;
  lowStockThreshold?: number | undefined;
}

export interface PaginatedInventory {
  items: InventoryItem[];
  limit: number;
  offset: number;
  total: number;
}
