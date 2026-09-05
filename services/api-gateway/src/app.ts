import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import type { RedisReply } from "rate-limit-redis";

import { config } from "./config.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/logger.js";
import { authenticate, optionalAuthenticate } from "./middleware/authenticate.js";
import { createServiceProxy } from "./proxy/createServiceProxy.js";
import { logger } from "./logger/logger.js";
import { redis, checkRedisHealth } from "./redis.js";
import { sendSuccess, sendError } from "./shared/utils/response.util.js";

export function createApp() {
  const app = express();

  // 1. Security Headers & CORS
  app.use(helmet());
  app.use(
    cors({
      origin: config.nodeEnv === "production" ? false : true,
      credentials: true,
    }),
  );

  // 2. Request Correlation & Structured Logging
  app.use(requestId);
  app.use(requestLogger);

  // 3. Distributed Redis Rate Limiter (100 requests per minute per IP)
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true, // Fail-open resilience: allow traffic if Redis blips
    store: new RedisStore({
      sendCommand: (...args: string[]) =>
        redis.call(args[0]!, ...args.slice(1)) as Promise<RedisReply>,
      prefix: "rl:gateway:",
    }),
    handler: (req, res) => {
      const reqId = (req.headers["x-request-id"] as string) || "unknown";
      sendError(
        res,
        429,
        "TOO_MANY_REQUESTS",
        "Rate limit exceeded. Please try again later.",
        reqId,
      );
    },
  });
  app.use(globalLimiter);

  // 4. Health Checks
  app.get("/health/live", (_req, res) => {
    return sendSuccess(res, {
      service: "api-gateway",
      status: "alive",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/health/ready", async (req, res) => {
    const isRedisConnected = await checkRedisHealth();

    if (!isRedisConnected) {
      const reqId = (req.headers["x-request-id"] as string) || "unknown";
      return sendError(
        res,
        503,
        "SERVICE_UNAVAILABLE",
        "Redis rate limiting store unavailable",
        reqId,
      );
    }

    return sendSuccess(res, {
      service: "api-gateway",
      status: "ready",
      redis: "connected",
      timestamp: new Date().toISOString(),
    });
  });

  // Backward compatible /health
  app.get("/health", (_req, res) => {
    return sendSuccess(res, {
      service: "api-gateway",
      status: "ok",
    });
  });

  // 5. Downstream Microservice Proxies
  // Public auth routes
  app.use(
    "/auth",
    createServiceProxy(config.authServiceUrl, "auth"),
  );

  // Product catalog routes (optional auth at gateway to allow public browsing, with downstream role enforcement for mutations)
  app.use(
    "/products",
    optionalAuthenticate,
    createServiceProxy(config.productServiceUrl, "products"),
  );

  // Inventory routes (optional auth at gateway for stock queries, downstream RBAC for reservations and adjustments)
  app.use(
    "/inventory",
    optionalAuthenticate,
    createServiceProxy(config.inventoryServiceUrl, "inventory"),
  );

  // Order routes (authenticated at gateway, downstream customer/admin enforcement)
  app.use(
    "/orders",
    authenticate,
    createServiceProxy(config.orderServiceUrl, "orders"),
  );

  // 6. 404 Route Handler
  app.use((req, res) => {
    const reqId = (req.headers["x-request-id"] as string) || "unknown";
    sendError(
      res,
      404,
      "ROUTE_NOT_FOUND",
      `Endpoint not found: ${req.method} ${req.originalUrl}`,
      reqId,
    );
  });

  // 7. Error Handling Middleware
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const reqId = (req.headers["x-request-id"] as string) || "unknown";
    logger.error("Gateway Unhandled Error", err, { requestId: reqId });

    sendError(
      res,
      500,
      "INTERNAL_SERVER_ERROR",
      "An internal gateway error occurred.",
      reqId,
    );
  });

  return app;
}
