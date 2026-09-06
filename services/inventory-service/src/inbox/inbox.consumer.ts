import amqplib from "amqplib";
import { getRabbitConnection } from "../rabbitmq/rabbitmq.js";
import { config } from "../config.js";
import { logger } from "../logger/logger.js";
import { InventoryService } from "../modules/inventory/services/inventory.service.js";

export class InboxConsumer {
  private channel: amqplib.Channel | null = null;
  private consumerTag: string | null = null;

  constructor(private readonly inventoryService: InventoryService) {}

  public async start(): Promise<void> {
    try {
      const conn = await getRabbitConnection();
      this.channel = await conn.createChannel();

      // Set prefetch for fair dispatch
      await this.channel.prefetch(10);

      const queueName = "inventory.saga.inbox";
      await this.channel.assertQueue(queueName, { durable: true });

      // Bind saga event patterns
      await this.channel.bindQueue(queueName, config.rabbitmq.exchange, "order.created");
      await this.channel.bindQueue(queueName, config.rabbitmq.exchange, "order.cancelled");
      await this.channel.bindQueue(queueName, config.rabbitmq.exchange, "payment.completed");

      logger.info(`Inbox consumer listening on queue '${queueName}'`);

      const consumeResult = await this.channel.consume(
        queueName,
        async (msg) => {
          if (!msg) return;

          try {
            await this.handleMessage(msg);
            this.channel?.ack(msg);
          } catch (error) {
            logger.error("Error processing incoming saga message", error, {
              routingKey: msg.fields.routingKey,
            });
            // Nack with requeue: false to prevent poison pill loops (can be directed to DLQ)
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.consumerTag = consumeResult.consumerTag;
    } catch (error) {
      logger.error("Failed to start Inbox consumer", error);
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
      logger.info("Inbox consumer stopped cleanly");
    } catch (error) {
      logger.error("Error stopping Inbox consumer", error);
    }
  }

  private async handleMessage(msg: amqplib.ConsumeMessage): Promise<void> {
    const routingKey = msg.fields.routingKey;
    const rawContent = msg.content.toString("utf8");
    const payload = JSON.parse(rawContent);

    const eventId =
      (msg.properties.headers?.["eventId"] as string) || payload.eventId || payload.id;

    logger.info(`Inbox received event: ${routingKey}`, {
      eventId,
      routingKey,
    });

    switch (routingKey) {
      case "order.created": {
        // Reserve inventory for order
        const { orderId, productId, quantity, items } = payload;
        if (Array.isArray(items)) {
          for (const item of items) {
            await this.inventoryService.reserveInventory(
              orderId,
              item.productId,
              item.quantity,
              eventId,
            );
          }
        } else if (orderId && productId && quantity) {
          await this.inventoryService.reserveInventory(orderId, productId, quantity, eventId);
        }
        break;
      }

      case "order.cancelled": {
        // Release reservation back to available
        const { orderId, productId, items } = payload;
        if (Array.isArray(items)) {
          for (const item of items) {
            await this.inventoryService.releaseReservation(orderId, item.productId, eventId);
          }
        } else if (orderId && productId) {
          await this.inventoryService.releaseReservation(orderId, productId, eventId);
        }
        break;
      }

      case "payment.completed": {
        // Fulfill reservation (permanently deduct reserved quantity)
        const { orderId, productId, items } = payload;
        if (Array.isArray(items)) {
          for (const item of items) {
            await this.inventoryService.fulfillReservation(orderId, item.productId, eventId);
          }
        } else if (orderId && productId) {
          await this.inventoryService.fulfillReservation(orderId, productId, eventId);
        }
        break;
      }

      default:
        logger.warn(`Inbox consumer unhandled routing key: ${routingKey}`);
        break;
    }
  }
}
