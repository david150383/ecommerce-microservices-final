import { ErrorRequestHandler } from "express";
import { AppError } from "../shared/errors/app.error.js";
import { config } from "../config.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = req.headers["x-request-id"] || "unknown";
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  const pgError = err as any;
  if (pgError && pgError.code === "23505") {
    res.status(409).json({
      error: {
        code: "UNIQUE_CONSTRAINT_VIOLATION",
        message: "A resource with duplicate unique attributes already exists.",
        details: [{ detail: pgError.detail }],
        requestId,
      },
    });
    return;
  }

  console.error(`[Unhandled Auth Error] RequestID: ${requestId} -`, err);

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        config.nodeEnv === "production"
          ? "An unexpected error occurred while processing authentication."
          : err.message,
      requestId,
    },
  });
};
