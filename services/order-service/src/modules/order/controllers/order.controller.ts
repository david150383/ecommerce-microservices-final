import { Response, NextFunction } from "express";
import { OrderService } from "../services/order.service.js";
import { AuthenticatedRequest } from "../../../middleware/authenticate.middleware.js";
import {
  sendSuccess,
  sendCreated,
} from "../../../shared/utils/response.util.js";
import { OrderWithItems } from "../types/order.types.js";
import { ApiResponse } from "../../../shared/types/api.types.js";
import {
  CreateOrderInput,
  CancelOrderInput,
  ListOrdersQuery,
} from "../schemas/order.schema.js";
import { UnauthorizedError } from "../../../shared/errors/app.error.js";

export class OrderController {
  constructor(private readonly service: OrderService) {}

  public create = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ order: OrderWithItems }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("User identity required to place an order");
      }

      const correlationId =
        (req.headers["x-correlation-id"] as string) ||
        (req.headers["x-request-id"] as string);

      const body = req.body as CreateOrderInput;
      const order = await this.service.createOrder(
        req.user.id,
        body,
        correlationId,
      );

      return sendCreated(res, { order }, "Order placed successfully");
    } catch (error) {
      return next(error);
    }
  };

  public getById = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ order: OrderWithItems }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("User identity required");
      }

      const isAdmin = req.user.role === "ADMIN";
      const order = await this.service.getOrder(
        req.params.id as string,
        req.user.id,
        isAdmin,
      );

      return sendSuccess(res, { order });
    } catch (error) {
      return next(error);
    }
  };

  public list = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ orders: OrderWithItems[] }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("User identity required");
      }

      const isAdmin = req.user.role === "ADMIN";
      const query = req.query as unknown as ListOrdersQuery;

      const result = await this.service.listOrders(
        query,
        req.user.id,
        isAdmin,
      );

      return sendSuccess(
        res,
        { orders: result.orders },
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

  public cancel = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ order: OrderWithItems }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError("User identity required");
      }

      const isAdmin = req.user.role === "ADMIN";
      const body = req.body as CancelOrderInput;

      const order = await this.service.cancelOrder(
        req.params.id as string,
        req.user.id,
        body?.reason,
        isAdmin,
      );

      return sendSuccess(res, { order }, "Order cancelled successfully");
    } catch (error) {
      return next(error);
    }
  };
}
