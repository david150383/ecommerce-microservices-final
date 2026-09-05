import amqplib from "amqplib";
import { config } from "../config.js";
import { logger } from "../logger/logger.js";

let connection: amqplib.ChannelModel | null = null;
let publishChannel: amqplib.Channel | null = null;

export async function getRabbitConnection(): Promise<amqplib.ChannelModel> {
  if (connection) {
    return connection;
  }

  try {
    connection = await amqplib.connect(config.rabbitmq.url);

    connection.on("error", (err) => {
      logger.error("RabbitMQ connection error", err);
    });

    connection.on("close", () => {
      logger.warn("RabbitMQ connection closed");
      connection = null;
      publishChannel = null;
    });

    logger.info("Connected to RabbitMQ", { url: config.rabbitmq.url });
    return connection;
  } catch (error) {
    logger.error("Failed to connect to RabbitMQ", error);
    throw error;
  }
}

export async function getPublishChannel(): Promise<amqplib.Channel> {
  if (publishChannel) {
    return publishChannel;
  }

  const conn = await getRabbitConnection();
  publishChannel = await conn.createChannel();

  // Assert common topic exchange
  await publishChannel.assertExchange(config.rabbitmq.exchange, "topic", {
    durable: true,
  });

  return publishChannel;
}

export async function publishEvent(
  routingKey: string,
  payload: Record<string, unknown>,
  headers: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    const channel = await getPublishChannel();
    const content = Buffer.from(JSON.stringify(payload));

    const published = channel.publish(
      config.rabbitmq.exchange,
      routingKey,
      content,
      {
        persistent: true,
        contentType: "application/json",
        headers,
        timestamp: Date.now(),
      },
    );

    logger.info(`Event published: ${routingKey}`, {
      exchange: config.rabbitmq.exchange,
      routingKey,
      headers,
    });

    return published;
  } catch (error) {
    logger.error(`Failed to publish event: ${routingKey}`, error);
    throw error;
  }
}

export async function checkRabbitHealth(): Promise<boolean> {
  try {
    const conn = await getRabbitConnection();
    const tempChannel = await conn.createChannel();
    await tempChannel.close();
    return true;
  } catch (error) {
    logger.error("RabbitMQ health check failed", error);
    return false;
  }
}

export async function closeRabbitmq(): Promise<void> {
  try {
    if (publishChannel) {
      await publishChannel.close();
      publishChannel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    logger.info("RabbitMQ connection and channels closed");
  } catch (error) {
    logger.error("Error closing RabbitMQ connection", error);
  }
}
