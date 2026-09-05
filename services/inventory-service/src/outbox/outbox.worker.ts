import { pool } from "../db.js";
import { publishEvent } from "../rabbitmq/rabbitmq.js";
import { logger } from "../logger/logger.js";
import { OutboxEventRow } from "../modules/inventory/types/inventory.types.js";

export class OutboxWorker {
  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs: number;
  private readonly maxRetries: number;

  constructor(pollIntervalMs = 1000, maxRetries = 5) {
    this.pollIntervalMs = pollIntervalMs;
    this.maxRetries = maxRetries;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info("Outbox worker started");
    this.scheduleNext();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info("Outbox worker stopped");
  }

  private scheduleNext(): void {
    if (!this.isRunning) return;
    this.timer = setTimeout(async () => {
      try {
        await this.processBatch();
      } catch (error) {
        logger.error("Error processing outbox events", error);
      } finally {
        this.scheduleNext();
      }
    }, this.pollIntervalMs);
  }

  public async processBatch(): Promise<number> {
    const client = await pool.connect();
    let processedCount = 0;

    try {
      await client.query("BEGIN");

      // Concurrent safe polling with FOR UPDATE SKIP LOCKED
      const res = await client.query<OutboxEventRow>(
        `
        SELECT * FROM outbox_events
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 50
        FOR UPDATE SKIP LOCKED
        `,
      );

      if (res.rowCount === 0) {
        await client.query("COMMIT");
        return 0;
      }

      for (const event of res.rows) {
        try {
          await publishEvent(event.routing_key, event.payload, {
            eventId: event.event_id,
            eventType: event.event_type,
            aggregateId: event.aggregate_id,
            aggregateType: event.aggregate_type,
          });

          await client.query(
            `
            UPDATE outbox_events
            SET
              status = 'PUBLISHED',
              published_at = NOW(),
              error_message = NULL
            WHERE id = $1
            `,
            [event.id],
          );

          processedCount++;
        } catch (publishErr) {
          const errMessage =
            publishErr instanceof Error
              ? publishErr.message
              : String(publishErr);
          const nextRetry = event.retry_count + 1;
          const status = nextRetry >= this.maxRetries ? "FAILED" : "PENDING";

          logger.error(
            `Failed to publish outbox event ${event.event_id}. Retry ${nextRetry}/${this.maxRetries}`,
            publishErr,
          );

          await client.query(
            `
            UPDATE outbox_events
            SET
              retry_count = $2,
              status = $3,
              error_message = $4
            WHERE id = $1
            `,
            [event.id, nextRetry, status, errMessage],
          );
        }
      }

      await client.query("COMMIT");
      if (processedCount > 0) {
        logger.info(`Outbox worker published ${processedCount} event(s)`);
      }
      return processedCount;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}
