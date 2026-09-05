import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./logger/logger.js";
import { closeRedis } from "./redis.js";
import type { Server } from "node:http";

const app = createApp();

let server: Server | null = null;
let isShuttingDown = false;

async function start() {
  try {
    server = app.listen(config.port, () => {
      logger.info(`API Gateway running on port ${config.port}`, {
        port: config.port,
        nodeEnv: config.nodeEnv,
      });
    });

    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error("Failed to start API Gateway", error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Shutting down API Gateway gracefully...`);

  const timeout = setTimeout(() => {
    logger.error("Graceful shutdown timeout exceeded. Forcing exit.");
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
      logger.info("API Gateway HTTP server closed");
    }

    await closeRedis();

    clearTimeout(timeout);
    logger.info("API Gateway shut down cleanly");
    process.exit(0);
  } catch (error) {
    logger.error("Error during API Gateway shutdown", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection in Gateway", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception in Gateway", error);
  shutdown("uncaughtException");
});

start();
