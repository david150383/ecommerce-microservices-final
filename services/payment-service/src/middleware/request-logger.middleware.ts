import { Request, Response, NextFunction } from "express";
import { logger } from "../logger/logger.js";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = req.headers["x-request-id"] as string;

  res.on("finish", () => {
    const durationMs = Date.now() - start;
    const context = {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress,
    };

    if (res.statusCode >= 500) {
      logger.error("HTTP Request Error", undefined, context);
    } else if (res.statusCode >= 400) {
      logger.warn("HTTP Client Request Error", context);
    } else {
      logger.info("HTTP Request Completed", context);
    }
  });

  next();
}
