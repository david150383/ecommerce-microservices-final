import amqplib from "amqplib";
import { getRabbitConnection } from "../rabbitmq/rabbitmq.js";
import { config } from "../config.js";
import { logger } from "../logger/logger.js";
import { PaymentService } from "../modules/payment/services/payment.service.js";

export class InboxConsumer {
  private channel: amqplib.Channel | null = null;
  private consumerTag: string | null = null;

  constructor(private readonly paymentService: PaymentService) {}

  public async start(): Promise<void> {
    try {
      const conn = await getRabbitConnection();
      this.channel = await conn.createChannel();

      // Set prefetch for fair dispatch
      await this.channel.prefetch(10);

      const queueName = "payment.saga.inbox";
      await this.channel.assertQueue(queueName, { durable: true });

      // Bind saga event patterns
      await this.channel.bindQueue(
        queueName,
        config.rabbitmq.exchange,
        "order.cancelled",
      );

      logger.info(`Payment inbox consumer listening on queue '${queueName}'`);

      const consumeResult = await this.channel.consume(
        queueName,
        async (msg) => {
          if (!msg) return;

          try {
            await this.handleMessage(msg);
            this.channel?.ack(msg);
          } catch (error) {
            logger.error(
              "Error processing incoming saga message in payment inbox",
              error,
              { routingKey: msg.fields.routingKey },
            );
            // Nack without requeue to avoid poison pill loops
            this.channel?.nack(msg, false, false);
          }
        },
        { noAck: false },
      );

      this.consumerTag = consumeResult.consumerTag;
    } catch (error) {
      logger.error("Failed to start Payment inbox consumer", error);
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
      logger.info("Payment inbox consumer stopped cleanly");
    } catch (error) {
      logger.error("Error stopping Payment inbox consumer", error);
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

    logger.info(`Payment inbox received event: ${routingKey}`, {
      eventId,
      routingKey,
      orderId: payload.orderId,
    });

    switch (routingKey) {
      case "order.cancelled": {
        const { orderId, reason } = payload;
        if (orderId) {
          await this.paymentService.handleOrderCancelled(
            orderId,
            reason || "Order was cancelled",
            eventId,
          );
        }
        break;
      }

      default:
        logger.warn(`Payment inbox consumer unhandled routing key: ${routingKey}`);
        break;
    }
  }
}
