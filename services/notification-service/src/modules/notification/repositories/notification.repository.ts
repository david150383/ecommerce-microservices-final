import { PoolClient } from "pg";
import { pool } from "../../../db.js";
import {
  NotificationRow,
  NotificationResponseDto,
  NotificationChannel,
  NotificationStatus,
} from "../types/notification.types.js";

export function mapNotification(row: NotificationRow): NotificationResponseDto {
  const createdAtIso =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : new Date(row.created_at).toISOString();

  const deliveredAtIso = row.delivered_at
    ? row.delivered_at instanceof Date
      ? row.delivered_at.toISOString()
      : new Date(row.delivered_at).toISOString()
    : null;

  const metadata = row.metadata || {};

  return {
    id: row.id,
    eventId: row.event_id || "",
    eventType: row.event_type || "notification.manual",
    userId: row.user_id,
    recipient: row.recipient,
    channel: row.channel,
    templateType: row.template_type,
    template_type: row.template_type,
    subject: row.subject,
    body: row.body,
    status: row.status,
    metadata,
    deliveryMetadata: metadata,
    error: row.error_message,
    createdAt: createdAtIso,
    created_at: createdAtIso,
    deliveredAt: deliveredAtIso,
  };
}

export interface CreateNotificationRecord {
  eventId?: string | null | undefined;
  eventType?: string | undefined;
  userId?: string | null | undefined;
  recipient: string;
  channel: NotificationChannel;
  templateType: string;
  subject: string;
  body: string;
  status: NotificationStatus;
  metadata?: Record<string, unknown> | undefined;
  errorMessage?: string | null | undefined;
  deliveredAt?: Date | null | undefined;
}

export interface NotificationFilters {
  channel?: NotificationChannel | "ALL" | undefined;
  status?: NotificationStatus | "ALL" | undefined;
  userId?: string | undefined;
}

export class NotificationRepository {
  async create(
    data: CreateNotificationRecord,
    client?: PoolClient,
  ): Promise<NotificationResponseDto> {
    const executor = client ?? pool;
    const query = `
      INSERT INTO notifications (
        event_id,
        event_type,
        user_id,
        recipient,
        channel,
        template_type,
        subject,
        body,
        status,
        metadata,
        error_message,
        delivered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;

    const values = [
      data.eventId ?? null,
      data.eventType || "notification.manual",
      data.userId ?? null,
      data.recipient,
      data.channel,
      data.templateType,
      data.subject,
      data.body,
      data.status,
      JSON.stringify(data.metadata || {}),
      data.errorMessage ?? null,
      data.deliveredAt || new Date(),
    ];

    const result = await executor.query<NotificationRow>(query, values);
    return mapNotification(result.rows[0]!);
  }

  async findById(
    id: string,
    client?: PoolClient,
  ): Promise<NotificationResponseDto | null> {
    const executor = client ?? pool;
    const result = await executor.query<NotificationRow>(
      `SELECT * FROM notifications WHERE id = $1 LIMIT 1`,
      [id],
    );

    if (result.rowCount === 0) return null;
    return mapNotification(result.rows[0]!);
  }

  async list(
    filters: NotificationFilters = {},
    limit = 50,
    offset = 0,
    client?: PoolClient,
  ): Promise<NotificationResponseDto[]> {
    const executor = client ?? pool;
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.channel && filters.channel !== "ALL") {
      conditions.push(`channel = $${idx++}`);
      values.push(filters.channel);
    }

    if (filters.status && filters.status !== "ALL") {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.userId) {
      conditions.push(`user_id = $${idx++}`);
      values.push(filters.userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `
      SELECT * FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const result = await executor.query<NotificationRow>(query, values);
    return result.rows.map(mapNotification);
  }

  async count(
    filters: NotificationFilters = {},
    client?: PoolClient,
  ): Promise<number> {
    const executor = client ?? pool;
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filters.channel && filters.channel !== "ALL") {
      conditions.push(`channel = $${idx++}`);
      values.push(filters.channel);
    }

    if (filters.status && filters.status !== "ALL") {
      conditions.push(`status = $${idx++}`);
      values.push(filters.status);
    }

    if (filters.userId) {
      conditions.push(`user_id = $${idx++}`);
      values.push(filters.userId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const query = `SELECT COUNT(*) AS total FROM notifications ${whereClause}`;

    const result = await executor.query<{ total: string }>(query, values);
    return Number(result.rows[0]?.total ?? 0);
  }

  async findByUserId(
    userId: string,
    limit = 50,
    offset = 0,
    client?: PoolClient,
  ): Promise<NotificationResponseDto[]> {
    const executor = client ?? pool;
    const query = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await executor.query<NotificationRow>(query, [userId, limit, offset]);
    return result.rows.map(mapNotification);
  }

  async isEventProcessed(eventId: string, client?: PoolClient): Promise<boolean> {
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
