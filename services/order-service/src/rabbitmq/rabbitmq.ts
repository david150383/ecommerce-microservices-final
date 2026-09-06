import amqplib from "amqplib";
import { config } from "../config.js";
import { logger } from "../logger/logger.js";

let connection: amqplib.ChannelModel | null = null;
let publishChannel: amqplib.Channel | null = null;

export async function getRabbitConnection(): Promise<amqplib.ChannelModel> {
  if (connection) return connection;

  try {
    connection = await amqplib.connect(config.rabbitmq.url);
    logger.info("Connected to RabbitMQ successfully", {
      url: config.rabbitmq.url.replace(/\/\/.*@/, "//***@"),
    });

    connection.on("error", (err) => {
      logger.error("RabbitMQ connection error", err);
    });

    connection.on("close", () => {
      logger.warn("RabbitMQ connection closed");
      connection = null;
      publishChannel = null;
    });

    return connection;
  } catch (error) {
    logger.error("Failed to connect to RabbitMQ", error);
    throw error;
  }
}

export async function getPublishChannel(): Promise<amqplib.Channel> {
  if (publishChannel) return publishChannel;

  const conn = await getRabbitConnection();
  const channel = await conn.createChannel();

  // Assert standard durable topic exchange
  await channel.assertExchange(config.rabbitmq.exchange, "topic", {
    durable: true,
  });

  publishChannel = channel;
  return publishChannel;
}

export async function publishEvent(
  routingKey: string,
  payload: unknown,
  headers: Record<string, unknown> = {},
): Promise<boolean> {
  try {
    const channel = await getPublishChannel();
    const content = Buffer.from(JSON.stringify(payload));

    const published = channel.publish(config.rabbitmq.exchange, routingKey, content, {
      persistent: true,
      contentType: "application/json",
      timestamp: Date.now(),
      headers,
    });

    return published;
  } catch (error) {
    logger.error("Failed to publish message to RabbitMQ", error, { routingKey });
    throw error;
  }
}

export async function checkRabbitHealth(): Promise<boolean> {
  try {
    const conn = await getRabbitConnection();
    const testChannel = await conn.createChannel();
    await testChannel.close();
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
