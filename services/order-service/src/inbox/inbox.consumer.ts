import amqplib from "amqplib";
import { getRabbitConnection } from "../rabbitmq/rabbitmq.js";
import { config } from "../config.js";
import { logger } from "../logger/logger.js";
import { OrderService } from "../modules/order/services/order.service.js";

export class InboxConsumer {
  private channel: amqplib.Channel | null = null;
  private consumerTag: string | null = null;

  constructor(private readonly orderService: OrderService) {}

  public async start(): Promise<void> {
    try {
      const conn = await getRabbitConnection();
      this.channel = await conn.createChannel();

      // Set prefetch for fair dispatch
      await this.channel.prefetch(10);

      const queueName = "order.saga.inbox";
      await this.channel.assertQueue(queueName, { durable: true });

      // Bind saga event patterns
      await this.channel.bindQueue(
        queueName,
        config.rabbitmq.exchange,
        "inventory.reserved",
      );
      await this.channel.bindQueue(
        queueName,
        config.rabbitmq.exchange,
        "inventory.reservation_failed",
      );
      await this.channel.bindQueue(
        queueName,
        config.rabbitmq.exchange,
        "payment.completed",
      );
      await this.channel.bindQueue(
        queueName,
        config.rabbitmq.exchange,
        "payment.failed",
      );

      logger.info(`Order inbox consumer listening on queue '${queueName}'`);

      const consumeResult = await this.channel.consume(
        queueName,
        async (msg) => {
          if (!msg) return;

          try {
            await this.handleMessage(msg);
            this.channel?.ack(msg);
          } catch (error) {
            logger.error("Error processing incoming saga message in order inbox", error, {
              routingKey: msg.fields.routingKey,
            });
            // Nack with requeue: false to prevent poison pill loops
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.consumerTag = consumeResult.consumerTag;
    } catch (error) {
      logger.error("Failed to start Order inbox consumer", error);
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
      logger.info("Order inbox consumer stopped cleanly");
    } catch (error) {
      logger.error("Error stopping Order inbox consumer", error);
    }
  }

  private async handleMessage(msg: amqplib.ConsumeMessage): Promise<void> {
    const routingKey = msg.fields.routingKey;
    const rawContent = msg.content.toString("utf8");
    const payload = JSON.parse(rawContent);

    const eventId =
      (msg.properties.headers?.["eventId"] as string) ||
      payload.eventId ||
      payload.id;

    logger.info(`Order inbox received event: ${routingKey}`, {
      eventId,
      routingKey,
      orderId: payload.orderId,
    });

    switch (routingKey) {
      case "inventory.reserved": {
        const { orderId } = payload;
        if (orderId) {
          await this.orderService.handleInventoryReserved(orderId, eventId);
        }
        break;
      }

      case "inventory.reservation_failed": {
        const { orderId, reason } = payload;
        if (orderId) {
          await this.orderService.handleInventoryReservationFailed(
            orderId,
            reason || "Insufficient inventory",
            eventId,
          );
        }
        break;
      }

      case "payment.completed": {
        const { orderId } = payload;
        if (orderId) {
          await this.orderService.handlePaymentCompleted(orderId, eventId);
        }
        break;
      }

      case "payment.failed": {
        const { orderId, reason } = payload;
        if (orderId) {
          await this.orderService.handlePaymentFailed(
            orderId,
            reason || "Payment failed",
            eventId,
          );
        }
        break;
      }

      default:
        logger.warn(`Order inbox consumer unhandled routing key: ${routingKey}`);
        break;
    }
  }
}
