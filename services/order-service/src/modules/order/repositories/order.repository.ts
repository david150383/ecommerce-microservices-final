import { PoolClient } from "pg";
import { pool } from "../../../db.js";
import {
  Order,
  OrderRow,
  OrderItem,
  OrderItemRow,
  OrderStatus,
  OrderWithItems,
  OutboxEvent,
  OutboxEventRow,
  ListOrderFilter,
  PaginatedOrders,
} from "../types/order.types.js";
import { OrderItemInput } from "../schemas/order.schema.js";

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    status: row.status,
    totalAmountCents: Number(row.total_amount_cents),
    currency: row.currency,
    cancellationReason: row.cancellation_reason,
    correlationId: row.correlation_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrderItem(row: OrderItemRow): OrderItem {
  const qty = Number(row.quantity);
  const unitPrice = Number(row.unit_price_cents);
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    quantity: qty,
    unitPriceCents: unitPrice,
    totalPriceCents: qty * unitPrice,
    createdAt: row.created_at,
  };
}

function mapOutbox(row: OutboxEventRow): OutboxEvent {
  return {
    id: row.id,
    eventId: row.event_id,
    eventType: row.event_type,
    aggregateId: row.aggregate_id,
    aggregateType: row.aggregate_type,
    routingKey: row.routing_key,
    payload: row.payload,
    status: row.status,
    retryCount: row.retry_count,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    publishedAt: row.published_at,
  };
}

export class OrderRepository {
  async create(
    orderData: {
      customerId: string;
      totalAmountCents: number;
      currency: string;
      correlationId: string;
      items: OrderItemInput[];
    },
    client?: PoolClient,
  ): Promise<OrderWithItems> {
    const executor = client ?? pool;

    // 1. Insert order record
    const orderResult = await executor.query(
      `
      INSERT INTO orders (customer_id, status, total_amount_cents, currency, correlation_id)
      VALUES ($1, 'PENDING', $2, $3, $4)
      RETURNING *
      `,
      [
        orderData.customerId,
        orderData.totalAmountCents,
        orderData.currency,
        orderData.correlationId,
      ],
    );
    const order = mapOrder(orderResult.rows[0]);

    // 2. Insert order items
    const items: OrderItem[] = [];
    for (const item of orderData.items) {
      const itemResult = await executor.query(
        `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        `,
        [order.id, item.productId, item.quantity, item.unitPriceCents],
      );
      items.push(mapOrderItem(itemResult.rows[0]));
    }

    return {
      ...order,
      items,
    };
  }

  async findById(
    id: string,
    forUpdate = false,
    client?: PoolClient,
  ): Promise<OrderWithItems | null> {
    const executor = client ?? pool;
    const lockClause = forUpdate ? " FOR UPDATE" : "";

    const orderResult = await executor.query(
      `SELECT * FROM orders WHERE id = $1${lockClause}`,
      [id],
    );
    if (orderResult.rowCount === 0) return null;
    const order = mapOrder(orderResult.rows[0]);

    const itemsResult = await executor.query(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC`,
      [id],
    );
    const items = itemsResult.rows.map(mapOrderItem);

    return {
      ...order,
      items,
    };
  }

  async list(
    filter: ListOrderFilter = {},
    client?: PoolClient,
  ): Promise<PaginatedOrders> {
    const executor = client ?? pool;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (filter.customerId) {
      conditions.push(`customer_id = $${paramIdx++}`);
      values.push(filter.customerId);
    }

    if (filter.status && filter.status !== "ALL") {
      conditions.push(`status = $${paramIdx++}`);
      values.push(filter.status);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await executor.query(
      `SELECT COUNT(*) AS total FROM orders ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    const dataValues = [...values, limit, offset];

    const dataResult = await executor.query(
      `
      SELECT * FROM orders
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `,
      dataValues,
    );

    const orders = dataResult.rows.map(mapOrder);

    // Fetch items for found orders
    const orderIds = orders.map((o) => o.id);
    let itemsMap: Record<string, OrderItem[]> = {};

    if (orderIds.length > 0) {
      const itemsResult = await executor.query(
        `SELECT * FROM order_items WHERE order_id = ANY($1::uuid[]) ORDER BY created_at ASC`,
        [orderIds],
      );
      itemsMap = itemsResult.rows
        .map(mapOrderItem)
        .reduce((acc, item) => {
          const list = acc[item.orderId] ?? [];
          list.push(item);
          acc[item.orderId] = list;
          return acc;
        }, {} as Record<string, OrderItem[]>);
    }

    return {
      orders: orders.map((o) => ({
        ...o,
        items: itemsMap[o.id] || [],
      })),
      limit,
      offset,
      total,
    };
  }

  async updateStatus(
    id: string,
    status: OrderStatus,
    cancellationReason?: string | null,
    client?: PoolClient,
  ): Promise<Order | null> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      UPDATE orders
      SET
        status = $2,
        cancellation_reason = COALESCE($3, cancellation_reason),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [id, status, cancellationReason ?? null],
    );
    if (result.rowCount === 0) return null;
    return mapOrder(result.rows[0]);
  }

  async insertOutboxEvent(
    event: {
      eventId: string;
      eventType: string;
      aggregateId: string;
      aggregateType: string;
      routingKey: string;
      payload: Record<string, unknown>;
      status?: string;
    },
    client?: PoolClient,
  ): Promise<OutboxEvent | null> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      INSERT INTO outbox_events (
        event_id, event_type, aggregate_id, aggregate_type, routing_key, payload, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (event_id) DO NOTHING
      RETURNING *
      `,
      [
        event.eventId,
        event.eventType,
        event.aggregateId,
        event.aggregateType,
        event.routingKey,
        JSON.stringify(event.payload),
        event.status ?? "PENDING",
      ],
    );
    if (result.rowCount === 0) return null;
    return mapOutbox(result.rows[0]);
  }

  async isEventProcessed(
    eventId: string,
    client?: PoolClient,
  ): Promise<boolean> {
    const executor = client ?? pool;
    const result = await executor.query(
      `SELECT 1 FROM inbox_events WHERE event_id = $1 LIMIT 1`,
      [eventId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async insertInboxEvent(
    eventId: string,
    eventType: string,
    routingKey: string,
    client?: PoolClient,
  ): Promise<void> {
    const executor = client ?? pool;
    await executor.query(
      `
      INSERT INTO inbox_events (event_id, event_type, routing_key)
      VALUES ($1, $2, $3)
      ON CONFLICT (event_id) DO NOTHING
      `,
      [eventId, eventType, routingKey],
    );
  }
}
