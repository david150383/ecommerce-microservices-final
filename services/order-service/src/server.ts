import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool, closeDbPool } from "./db.js";
import { closeRedis } from "./redis.js";
import { getPublishChannel, closeRabbitmq } from "./rabbitmq/rabbitmq.js";
import { OutboxWorker } from "./outbox/outbox.worker.js";
import { InboxConsumer } from "./inbox/inbox.consumer.js";
import { orderService } from "./modules/order/routes/order.routes.js";
import { logger } from "./logger/logger.js";
import type { Server } from "node:http";

const app = createApp();

let server: Server | null = null;
let isShuttingDown = false;

const outboxWorker = new OutboxWorker(1000);
const inboxConsumer = new InboxConsumer(orderService);

async function start() {
  try {
    // 1. Verify Database
    await pool.query("SELECT 1");
    logger.info("Database connected successfully", {
      host: config.db.host,
      database: config.db.database,
    });

    // 2. Initialize RabbitMQ topology & channel
    await getPublishChannel();
    logger.info("RabbitMQ exchange initialized", {
      exchange: config.rabbitmq.exchange,
    });

    // 3. Start Background Workers
    outboxWorker.start();
    await inboxConsumer.start();

    // 4. Start HTTP Server
    server = app.listen(config.port, () => {
      logger.info(`Order service running on port ${config.port}`, {
        port: config.port,
        nodeEnv: config.nodeEnv,
      });
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error("Failed to start order service", error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Shutting down gracefully...`);

  const timeout = setTimeout(() => {
    logger.error("Shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10000);

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      logger.info("HTTP server closed");
    }

    // Stop background workers
    outboxWorker.stop();
    await inboxConsumer.stop();

    // Close connections
    await closeRabbitmq();
    await closeDbPool();
    await closeRedis();

    clearTimeout(timeout);
    logger.info("Order service shut down cleanly");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", error);
  shutdown("uncaughtException");
});

start();
