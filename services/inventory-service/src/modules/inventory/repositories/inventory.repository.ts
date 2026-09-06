import { PoolClient } from "pg";
import { pool } from "../../../db.js";
import {
  InventoryItem,
  InventoryRow,
  InventoryReservation,
  InventoryReservationRow,
  ReservationStatus,
  OutboxEvent,
  OutboxEventRow,
  ListInventoryFilter,
  PaginatedInventory,
} from "../types/inventory.types.js";

function mapInventory(row: InventoryRow): InventoryItem {
  const available = Number(row.available_quantity);
  const reserved = Number(row.reserved_quantity);
  return {
    id: row.id,
    productId: row.product_id,
    availableQuantity: available,
    reservedQuantity: reserved,
    totalQuantity: available + reserved,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapReservation(row: InventoryReservationRow): InventoryReservation {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    quantity: Number(row.quantity),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

export class InventoryRepository {
  async findByProductId(
    productId: string,
    forUpdate = false,
    client?: PoolClient,
  ): Promise<InventoryItem | null> {
    const executor = client ?? pool;
    const lockClause = forUpdate ? " FOR UPDATE" : "";
    const result = await executor.query(
      `SELECT * FROM inventory WHERE product_id = $1${lockClause}`,
      [productId],
    );
    if (result.rowCount === 0) return null;
    return mapInventory(result.rows[0]);
  }

  async upsertInventory(
    productId: string,
    availableQuantity: number,
    client?: PoolClient,
  ): Promise<InventoryItem> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      INSERT INTO inventory (product_id, available_quantity, reserved_quantity)
      VALUES ($1, $2, 0)
      ON CONFLICT (product_id)
      DO UPDATE SET
        available_quantity = EXCLUDED.available_quantity,
        updated_at = NOW()
      RETURNING *
      `,
      [productId, availableQuantity],
    );
    return mapInventory(result.rows[0]);
  }

  async adjustQuantities(
    productId: string,
    availableDelta: number,
    reservedDelta: number,
    client?: PoolClient,
  ): Promise<InventoryItem> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      UPDATE inventory
      SET
        available_quantity = available_quantity + $2,
        reserved_quantity = reserved_quantity + $3,
        updated_at = NOW()
      WHERE product_id = $1
      RETURNING *
      `,
      [productId, availableDelta, reservedDelta],
    );
    return mapInventory(result.rows[0]);
  }

  async list(filter: ListInventoryFilter = {}, client?: PoolClient): Promise<PaginatedInventory> {
    const executor = client ?? pool;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (filter.lowStockThreshold !== undefined) {
      conditions.push(`available_quantity <= $${paramIdx++}`);
      values.push(filter.lowStockThreshold);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await executor.query(
      `SELECT COUNT(*) AS total FROM inventory ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    const dataValues = [...values, limit, offset];

    const dataResult = await executor.query(
      `
      SELECT * FROM inventory
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `,
      dataValues,
    );

    return {
      items: dataResult.rows.map(mapInventory),
      limit,
      offset,
      total,
    };
  }

  async createReservation(
    orderId: string,
    productId: string,
    quantity: number,
    client?: PoolClient,
  ): Promise<InventoryReservation> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      INSERT INTO inventory_reservations (order_id, product_id, quantity, status)
      VALUES ($1, $2, $3, 'RESERVED')
      ON CONFLICT (order_id, product_id)
      DO UPDATE SET
        quantity = EXCLUDED.quantity,
        status = 'RESERVED',
        updated_at = NOW()
      RETURNING *
      `,
      [orderId, productId, quantity],
    );
    return mapReservation(result.rows[0]);
  }

  async findReservation(
    orderId: string,
    productId: string,
    forUpdate = false,
    client?: PoolClient,
  ): Promise<InventoryReservation | null> {
    const executor = client ?? pool;
    const lockClause = forUpdate ? " FOR UPDATE" : "";
    const result = await executor.query(
      `SELECT * FROM inventory_reservations WHERE order_id = $1 AND product_id = $2${lockClause}`,
      [orderId, productId],
    );
    if (result.rowCount === 0) return null;
    return mapReservation(result.rows[0]);
  }

  async listReservationsByOrderId(
    orderId: string,
    client?: PoolClient,
  ): Promise<InventoryReservation[]> {
    const executor = client ?? pool;
    const result = await executor.query(
      `SELECT * FROM inventory_reservations WHERE order_id = $1 ORDER BY created_at ASC`,
      [orderId],
    );
    return result.rows.map(mapReservation);
  }

  async updateReservationStatus(
    orderId: string,
    productId: string,
    status: ReservationStatus,
    client?: PoolClient,
  ): Promise<InventoryReservation | null> {
    const executor = client ?? pool;
    const result = await executor.query(
      `
      UPDATE inventory_reservations
      SET status = $3, updated_at = NOW()
      WHERE order_id = $1 AND product_id = $2
      RETURNING *
      `,
      [orderId, productId, status],
    );
    if (result.rowCount === 0) return null;
    return mapReservation(result.rows[0]);
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

  async isEventProcessed(eventId: string, client?: PoolClient): Promise<boolean> {
    const executor = client ?? pool;
    const result = await executor.query(`SELECT 1 FROM inbox_events WHERE event_id = $1 LIMIT 1`, [
      eventId,
    ]);
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
