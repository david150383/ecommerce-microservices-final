import { PoolClient } from "pg";
import { pool } from "../../../db.js";
import {
  Payment,
  PaymentRow,
  PaymentStatus,
  OutboxEvent,
  OutboxEventRow,
  ListPaymentFilter,
  PaginatedPayments,
} from "../types/payment.types.js";

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    transactionId: row.transaction_id,
    failureReason: row.failure_reason,
    idempotencyKey: row.idempotency_key,
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

export class PaymentRepository {
  async create(
    data: {
      orderId: string;
      customerId: string;
      amountCents: number;
      currency: string;
      status?: PaymentStatus;
      provider?: string;
      transactionId?: string | null | undefined;
      failureReason?: string | null | undefined;
      idempotencyKey: string;
    },
    client?: PoolClient,
  ): Promise<Payment> {
    const executor = client ?? pool;
    const result = await executor.query<PaymentRow>(
      `
      INSERT INTO payments (
        order_id, customer_id, amount_cents, currency, status, provider,
        transaction_id, failure_reason, idempotency_key
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
      `,
      [
        data.orderId,
        data.customerId,
        data.amountCents,
        data.currency,
        data.status ?? "PENDING",
        data.provider ?? "MOCK_GATEWAY",
        data.transactionId ?? null,
        data.failureReason ?? null,
        data.idempotencyKey,
      ],
    );
    return mapPayment(result.rows[0]!);
  }

  async findById(
    id: string,
    forUpdate = false,
    client?: PoolClient,
  ): Promise<Payment | null> {
    const executor = client ?? pool;
    const lockClause = forUpdate ? " FOR UPDATE" : "";
    const result = await executor.query<PaymentRow>(
      `SELECT * FROM payments WHERE id = $1${lockClause}`,
      [id],
    );
    if (result.rowCount === 0 || !result.rows[0]) return null;
    return mapPayment(result.rows[0]);
  }

  async findByOrderId(
    orderId: string,
    forUpdate = false,
    client?: PoolClient,
  ): Promise<Payment | null> {
    const executor = client ?? pool;
    const lockClause = forUpdate ? " FOR UPDATE" : "";
    const result = await executor.query<PaymentRow>(
      `SELECT * FROM payments WHERE order_id = $1${lockClause}`,
      [orderId],
    );
    if (result.rowCount === 0 || !result.rows[0]) return null;
    return mapPayment(result.rows[0]);
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    client?: PoolClient,
  ): Promise<Payment | null> {
    const executor = client ?? pool;
    const result = await executor.query<PaymentRow>(
      `SELECT * FROM payments WHERE idempotency_key = $1`,
      [idempotencyKey],
    );
    if (result.rowCount === 0 || !result.rows[0]) return null;
    return mapPayment(result.rows[0]);
  }

  async updateStatus(
    id: string,
    status: PaymentStatus,
    updateData: {
      transactionId?: string | null | undefined;
      failureReason?: string | null | undefined;
    } = {},
    client?: PoolClient,
  ): Promise<Payment | null> {
    const executor = client ?? pool;
    const result = await executor.query<PaymentRow>(
      `
      UPDATE payments
      SET
        status = $2,
        transaction_id = COALESCE($3, transaction_id),
        failure_reason = COALESCE($4, failure_reason),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        id,
        status,
        updateData.transactionId ?? null,
        updateData.failureReason ?? null,
      ],
    );
    if (result.rowCount === 0 || !result.rows[0]) return null;
    return mapPayment(result.rows[0]);
  }

  async list(
    filter: ListPaymentFilter = {},
    client?: PoolClient,
  ): Promise<PaginatedPayments> {
    const executor = client ?? pool;
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (filter.customerId) {
      conditions.push(`customer_id = $${paramIdx++}`);
      values.push(filter.customerId);
    }

    if (filter.orderId) {
      conditions.push(`order_id = $${paramIdx++}`);
      values.push(filter.orderId);
    }

    if (filter.status && filter.status !== "ALL") {
      conditions.push(`status = $${paramIdx++}`);
      values.push(filter.status);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await executor.query(
      `SELECT COUNT(*) AS total FROM payments ${whereClause}`,
      values,
    );
    const total = parseInt(countResult.rows[0]?.total || "0", 10);

    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;
    const dataValues = [...values, limit, offset];

    const dataResult = await executor.query<PaymentRow>(
      `
      SELECT * FROM payments
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `,
      dataValues,
    );

    return {
      payments: dataResult.rows.map(mapPayment),
      limit,
      offset,
      total,
    };
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
    const result = await executor.query<OutboxEventRow>(
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
    if (result.rowCount === 0 || !result.rows[0]) return null;
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
