import { Response, NextFunction } from "express";
import { PaymentService } from "../services/payment.service.js";
import { AuthenticatedRequest } from "../../../middleware/authenticate.middleware.js";
import {
  sendSuccess,
  sendCreated,
} from "../../../shared/utils/response.util.js";
import { Payment } from "../types/payment.types.js";
import { ApiResponse } from "../../../shared/types/api.types.js";
import {
  ProcessPaymentInput,
  RefundPaymentInput,
  ListPaymentsQuery,
} from "../schemas/payment.schema.js";
import { UnauthorizedError } from "../../../shared/errors/app.error.js";

export class PaymentController {
  constructor(private readonly service: PaymentService) {}

  public process = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ payment: Payment }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("User identity required to process payment");
      }

      const idempotencyKey =
        (req.headers["idempotency-key"] as string) ||
        (req.headers["x-idempotency-key"] as string);

      const body = req.body as ProcessPaymentInput;
      const { payment, isDuplicate } = await this.service.processPayment(
        req.user.id,
        body,
        idempotencyKey,
      );

      if (isDuplicate) {
        return sendSuccess(
          res,
          { payment },
          "Payment already processed (idempotent response)",
          200,
        );
      }

      return sendCreated(
        res,
        { payment },
        payment.status === "COMPLETED"
          ? "Payment processed successfully"
          : "Payment failed to process",
      );
    } catch (error) {
      return next(error);
    }
  };

  public getById = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ payment: Payment }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("User identity required");
      }

      const isAdmin = req.user.role === "ADMIN";
      const payment = await this.service.getPayment(
        req.params.id as string,
        req.user.id,
        isAdmin,
      );

      return sendSuccess(res, { payment });
    } catch (error) {
      return next(error);
    }
  };

  public getByOrderId = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ payment: Payment }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("User identity required");
      }

      const isAdmin = req.user.role === "ADMIN";
      const payment = await this.service.getPaymentByOrderId(
        req.params.orderId as string,
        req.user.id,
        isAdmin,
      );

      return sendSuccess(res, { payment });
    } catch (error) {
      return next(error);
    }
  };

  public list = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ payments: Payment[] }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("User identity required");
      }

      const isAdmin = req.user.role === "ADMIN";
      const query = req.query as unknown as ListPaymentsQuery;

      const result = await this.service.listPayments(
        query,
        req.user.id,
        isAdmin,
      );

      return sendSuccess(
        res,
        { payments: result.payments },
        undefined,
        200,
        {
          limit: result.limit,
          offset: result.offset,
          total: result.total,
        },
      );
    } catch (error) {
      return next(error);
    }
  };

  public refund = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ payment: Payment }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("User identity required");
      }

      const isAdmin = req.user.role === "ADMIN";
      const body = req.body as RefundPaymentInput;

      const payment = await this.service.refundPayment(
        req.params.id as string,
        body,
        req.user.id,
        isAdmin,
      );

      return sendSuccess(res, { payment }, "Payment refunded successfully");
    } catch (error) {
      return next(error);
    }
  };
}
