import "./instrumentation.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { pool, closeDbPool } from "./db.js";
import { closeRedis } from "./redis.js";
import { logger } from "./shared/logger/logger.js";
import type { Server } from "node:http";

const app = createApp();

let server: Server | null = null;
let isShuttingDown = false;

async function start() {
  try {
    // 1. Verify Database Connectivity
    await pool.query("SELECT 1");
    logger.info("Connected to PostgreSQL successfully", {
      host: config.db.host,
      database: config.db.database,
    });

    // 2. Start HTTP Server
    server = app.listen(config.port, () => {
      logger.info(`Auth service running on port ${config.port}`, {
        port: config.port,
        nodeEnv: config.nodeEnv,
      });
    });

    // Keep-alive timeout for connection reuse behind load balancers/gateways
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
  } catch (error) {
    logger.error("Failed to start Auth service", error);
    process.exit(1);
  }
}

// Graceful Shutdown Coordinator
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  const shutdownTimeout = setTimeout(() => {
    logger.error("Graceful shutdown timed out. Forcing termination.");
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
      logger.info("HTTP server closed to new connections");
    }

    await closeDbPool();
    await closeRedis();

    clearTimeout(shutdownTimeout);
    logger.info("Auth service shut down cleanly");
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
