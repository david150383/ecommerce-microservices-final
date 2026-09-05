import { ErrorRequestHandler } from "express";
import { AppError } from "../shared/errors/app.error.js";
import { config } from "../config.js";
import { logger } from "../shared/logger/logger.js";
import { ApiErrorResponse } from "../shared/types/api.types.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = (req.headers["x-request-id"] as string) || "unknown";

  // 1. Handled Domain & Application Errors
  if (err instanceof AppError) {
    const errorBody: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
        requestId,
      },
    };
    res.status(err.statusCode).json(errorBody);
    return;
  }

  // 2. JSON Body Parsing Syntax Errors
  interface BodySyntaxError extends SyntaxError {
    status?: number;
    body?: unknown;
  }
  const syntaxError = err as BodySyntaxError;
  if (err instanceof SyntaxError && "body" in syntaxError && syntaxError.status === 400) {
    const errorBody: ApiErrorResponse = {
      success: false,
      error: {
        code: "INVALID_JSON_PAYLOAD",
        message: "Malformed JSON payload in request body.",
        requestId,
      },
    };
    res.status(400).json(errorBody);
    return;
  }

  // 3. PostgreSQL Common Errors
  interface DatabaseError extends Error {
    code?: string;
    detail?: string;
  }
  const pgError = err as DatabaseError;
  if (pgError && typeof pgError.code === "string") {
    if (pgError.code === "23505") {
      const errorBody: ApiErrorResponse = {
        success: false,
        error: {
          code: "RESOURCE_CONFLICT",
          message: "A resource with duplicate unique attributes already exists.",
          details: pgError.detail ? [{ detail: pgError.detail }] : undefined,
          requestId,
        },
      };
      res.status(409).json(errorBody);
      return;
    }

    if (pgError.code === "23503") {
      const errorBody: ApiErrorResponse = {
        success: false,
        error: {
          code: "FOREIGN_KEY_VIOLATION",
          message: "Referenced entity does not exist.",
          details: pgError.detail ? [{ detail: pgError.detail }] : undefined,
          requestId,
        },
      };
      res.status(400).json(errorBody);
      return;
    }

    if (pgError.code === "22P02") {
      const errorBody: ApiErrorResponse = {
        success: false,
        error: {
          code: "INVALID_INPUT_SYNTAX",
          message: "Input syntax is invalid for required database types (e.g. malformed UUID).",
          requestId,
        },
      };
      res.status(400).json(errorBody);
      return;
    }
  }

  // 4. Unhandled Internal Server Errors
  logger.error("Unhandled Application Error", err, {
    requestId,
    url: req.originalUrl || req.url,
    method: req.method,
  });

  const errorBody: ApiErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message:
        config.nodeEnv === "production"
          ? "An unexpected error occurred while processing your request."
          : err.message || "An unexpected error occurred.",
      requestId,
    },
  };

  res.status(500).json(errorBody);
};
