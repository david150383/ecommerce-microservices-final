import "./instrumentation.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool, closeDbPool } from "./db.js";
import { closeRedis } from "./redis.js";
import { closeRabbitmq } from "./rabbitmq/rabbitmq.js";
import { InboxConsumer } from "./inbox/inbox.consumer.js";
import { NotificationRepository } from "./modules/notification/repositories/notification.repository.js";
import { NotificationService } from "./modules/notification/services/notification.service.js";
import { logger } from "./logger/logger.js";
import type { Server } from "node:http";

const app = createApp();

let server: Server | null = null;
let inboxConsumer: InboxConsumer | null = null;
let isShuttingDown = false;

async function start() {
  try {
    // 1. Verify Database
    await pool.query("SELECT 1");
    logger.info("Database connected successfully", {
      host: config.db.host,
      database: config.db.database,
    });

    // 2. Start RabbitMQ Inbox Consumer for Event-driven Saga Notifications
    const notificationRepository = new NotificationRepository();
    const notificationService = new NotificationService(notificationRepository);
    inboxConsumer = new InboxConsumer(notificationService);

    try {
      await inboxConsumer.start();
      logger.info("Notification inbox consumer started successfully");
    } catch (rabbitErr) {
      logger.warn(
        "RabbitMQ inbox consumer could not start immediately; will be available once broker is active",
        { error: (rabbitErr as Error).message },
      );
    }

    // 3. Start HTTP Server
    server = app.listen(config.port, () => {
      logger.info(`Notification Service running on port ${config.port}`, {
        port: config.port,
        nodeEnv: config.nodeEnv,
      });
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error("Failed to start Notification Service", error);
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

    if (inboxConsumer) {
      await inboxConsumer.stop();
    }

    await closeRabbitmq();
    await closeDbPool();
    await closeRedis();

    clearTimeout(timeout);
    logger.info("Notification Service shut down cleanly");
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
