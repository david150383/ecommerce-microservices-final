import express from "express";
import helmet from "helmet";
import cors from "cors";

import { config } from "./config.js";
import { checkDbHealth } from "./db.js";
import { checkRedisHealth } from "./redis.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";
import { errorHandler } from "./middleware/error-handler.middleware.js";
import itemRoutes from "./modules/item/routes/item.routes.js";
import { sendSuccess, sendError } from "./shared/utils/response.util.js";

export function createApp() {
  const app = express();

  // 1. Security & CORS
  app.use(helmet());
  app.use(
    cors({
      origin: config.nodeEnv === "production" ? false : true,
      credentials: true,
    }),
  );

  // 2. Correlation & Observability
  app.use(requestIdMiddleware);
  app.use(requestLogger);

  // 3. Parsers
  app.use(express.json({ limit: "1mb" }));

  // 4. Liveness & Readiness Probes
  app.get("/health/live", (_req, res) => {
    return sendSuccess(res, {
      service: "service-template",
      status: "alive",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health/ready", async (req, res) => {
    const [isDbConnected, isRedisConnected] = await Promise.all([
      checkDbHealth(),
      checkRedisHealth(),
    ]);

    if (!isDbConnected || !isRedisConnected) {
      const requestId = (req.headers["x-request-id"] as string) || "unknown";
      return sendError(
        res,
        503,
        "SERVICE_UNAVAILABLE",
        `Service dependencies unavailable: DB ${isDbConnected ? "connected" : "disconnected"}, Redis ${isRedisConnected ? "connected" : "disconnected"}`,
        requestId,
      );
    }

    return sendSuccess(res, {
      service: "service-template",
      status: "ready",
      database: "connected",
      redis: "connected",
      timestamp: new Date().toISOString(),
    });
  });

  // 5. Domain Routes
  app.use("/items", itemRoutes);

  // 6. Catch-all 404 Handler
  app.use((req, res) => {
    const requestId = (req.headers["x-request-id"] as string) || "unknown";
    sendError(
      res,
      404,
      "ROUTE_NOT_FOUND",
      `Cannot ${req.method} ${req.originalUrl}`,
      requestId,
    );
  });

  // 7. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
