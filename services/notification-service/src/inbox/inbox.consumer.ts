import crypto from "node:crypto";
import amqplib from "amqplib";
import { getRabbitConnection } from "../rabbitmq/rabbitmq.js";
import { config } from "../config.js";
import { logger } from "../logger/logger.js";
import { NotificationService } from "../modules/notification/services/notification.service.js";

export class InboxConsumer {
  private channel: amqplib.Channel | null = null;
  private consumerTag: string | null = null;

  constructor(private readonly notificationService: NotificationService) {}

  public async start(): Promise<void> {
    try {
      const conn = await getRabbitConnection();
      this.channel = await conn.createChannel();

      // Prefetch for fair dispatch
      await this.channel.prefetch(10);

      const queueName = "notification.saga.inbox";
      await this.channel.assertQueue(queueName, { durable: true });

      // Bind all platform events of interest
      const eventBindings = [
        "order.created",
        "order.cancelled",
        "payment.completed",
        "payment.failed",
        "inventory.reservation_failed",
        "inventory.stock_updated",
      ];

      for (const routingKey of eventBindings) {
        await this.channel.bindQueue(
          queueName,
          config.rabbitmq.exchange,
          routingKey,
        );
      }

      logger.info(`Notification inbox consumer listening on queue '${queueName}'`, {
        bindings: eventBindings,
      });

      const consumeResult = await this.channel.consume(
        queueName,
        async (msg) => {
          if (!msg) return;

          try {
            await this.handleMessage(msg);
            this.channel?.ack(msg);
          } catch (error) {
            logger.error(
              "Error processing event in notification inbox",
              error,
              { routingKey: msg.fields.routingKey },
            );
            // Nack without requeue to prevent toxic loops
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.consumerTag = consumeResult.consumerTag;
    } catch (error) {
      logger.error("Failed to start Notification inbox consumer", error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      if (this.channel && this.consumerTag) {
        await this.channel.cancel(this.consumerTag);
        await this.channel.close();
        this.channel = null;
        this.consumerTag = null;
      }
      logger.info("Notification inbox consumer stopped cleanly");
    } catch (error) {
      logger.error("Error stopping Notification inbox consumer", error);
    }
  }

  private async handleMessage(msg: amqplib.ConsumeMessage): Promise<void> {
    const routingKey = msg.fields.routingKey;
    const rawContent = msg.content.toString("utf8");
    const payload = JSON.parse(rawContent);

    const rawEventId =
      (msg.properties.headers?.["eventId"] as string) ||
      payload.eventId ||
      payload.id ||
      payload.orderId;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const eventId =
      typeof rawEventId === "string" && uuidRegex.test(rawEventId)
        ? rawEventId
        : crypto.randomUUID();

    logger.info(`Notification inbox received event: ${routingKey}`, {
      eventId,
      routingKey,
    });

    switch (routingKey) {
      case "order.created":
        await this.notificationService.handleOrderCreated(payload, eventId);
        break;

      case "order.cancelled":
        await this.notificationService.handleOrderCancelled(payload, eventId);
        break;

      case "payment.completed":
        await this.notificationService.handlePaymentCompleted(payload, eventId);
        break;

      case "payment.failed":
        await this.notificationService.handlePaymentFailed(payload, eventId);
        break;

      case "inventory.reservation_failed":
        await this.notificationService.handleInventoryReservationFailed(
          payload,
          eventId,
        );
        break;

      case "inventory.stock_updated":
        await this.notificationService.handleInventoryStockUpdated(
          payload,
          eventId,
        );
        break;

      default:
        logger.warn(
          `Notification inbox received unhandled routing key: ${routingKey}`,
        );
        break;
    }
  }
}
