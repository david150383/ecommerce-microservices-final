import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import { config } from "./config.js";
import { requestId } from "./middleware/requestId.js";
import { requestLogger } from "./middleware/logger.js";
import { authenticate } from "./middleware/authenticate.js";
import { createServiceProxy } from "./proxy/createServiceProxy.js";
import { logger } from "./logger/logger.js";
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

  // 3. Global Rate Limiter (100 requests per minute per IP)
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
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

  app.get("/health/ready", (_req, res) => {
    return sendSuccess(res, {
      service: "api-gateway",
      status: "ready",
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

  // Protected product routes
  app.use(
    "/products",
    authenticate,
    createServiceProxy(config.productServiceUrl, "products"),
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
