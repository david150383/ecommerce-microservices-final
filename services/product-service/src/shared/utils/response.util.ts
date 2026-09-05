import { Response } from "express";
import {
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiErrorDetail,
} from "../types/api.types.js";

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200,
  meta?: Record<string, unknown>,
): Response<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(body);
}

export function sendCreated<T>(
  res: Response,
  data: T,
  message?: string,
): Response<ApiSuccessResponse<T>> {
  return sendSuccess(res, data, message, 201);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  details?: ApiErrorDetail[] | unknown,
): Response<ApiErrorResponse> {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      requestId,
    },
  };
  return res.status(statusCode).json(body);
}
