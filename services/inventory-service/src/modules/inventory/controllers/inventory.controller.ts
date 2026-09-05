import { Response, NextFunction } from "express";
import { InventoryService } from "../services/inventory.service.js";
import { AuthenticatedRequest } from "../../../middleware/authenticate.middleware.js";
import {
  sendSuccess,
  sendCreated,
  sendError,
} from "../../../shared/utils/response.util.js";
import {
  InventoryItem,
  InventoryReservation,
} from "../types/inventory.types.js";
import { ApiResponse } from "../../../shared/types/api.types.js";
import {
  UpdateStockInput,
  AdjustStockInput,
  ReserveStockInput,
  ReleaseStockInput,
  FulfillStockInput,
  ListInventoryQuery,
} from "../schemas/inventory.schema.js";

export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  public getByProductId = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ inventory: InventoryItem }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const inventory = await this.service.getInventory(
        req.params.productId as string,
      );
      return sendSuccess(res, { inventory });
    } catch (error) {
      return next(error);
    }
  };

  public list = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ items: InventoryItem[] }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const query = req.query as unknown as ListInventoryQuery;
      const result = await this.service.listInventory(query);
      return sendSuccess(
        res,
        { items: result.items },
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

  public setStock = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ inventory: InventoryItem }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const { availableQuantity } = req.body as UpdateStockInput;
      const inventory = await this.service.setStock(
        req.params.productId as string,
        availableQuantity,
      );
      return sendSuccess(res, { inventory }, "Stock updated successfully");
    } catch (error) {
      return next(error);
    }
  };

  public adjustStock = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ inventory: InventoryItem }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const { delta } = req.body as AdjustStockInput;
      const inventory = await this.service.adjustStock(
        req.params.productId as string,
        delta,
      );
      return sendSuccess(res, { inventory }, "Stock adjusted successfully");
    } catch (error) {
      return next(error);
    }
  };

  public reserve = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ reservation?: InventoryReservation }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const { orderId, productId, quantity } = req.body as ReserveStockInput;
      const result = await this.service.reserveInventory(
        orderId,
        productId,
        quantity,
      );

      if (!result.success) {
        const requestId = (req.headers["x-request-id"] as string) || "unknown";
        return sendError(
          res,
          409,
          "INSUFFICIENT_STOCK",
          result.reason === "PRODUCT_NOT_FOUND"
            ? "Product inventory not found."
            : "Insufficient stock to fulfill reservation.",
          requestId,
        );
      }

      return sendCreated(
        res,
        { reservation: result.reservation },
        "Inventory reserved successfully",
      );
    } catch (error) {
      return next(error);
    }
  };

  public release = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ reservation?: InventoryReservation }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const { orderId, productId } = req.body as ReleaseStockInput;
      const result = await this.service.releaseReservation(orderId, productId);

      if (!result.success) {
        const requestId = (req.headers["x-request-id"] as string) || "unknown";
        return sendError(
          res,
          400,
          "RESERVATION_NOT_FOUND",
          "Active reservation not found or already closed.",
          requestId,
        );
      }

      return sendSuccess(
        res,
        { reservation: result.reservation },
        "Reservation released successfully",
      );
    } catch (error) {
      return next(error);
    }
  };

  public fulfill = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ reservation?: InventoryReservation }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const { orderId, productId } = req.body as FulfillStockInput;
      const result = await this.service.fulfillReservation(orderId, productId);

      if (!result.success) {
        const requestId = (req.headers["x-request-id"] as string) || "unknown";
        return sendError(
          res,
          400,
          "RESERVATION_NOT_FOUND",
          "Active reservation not found or already closed.",
          requestId,
        );
      }

      return sendSuccess(
        res,
        { reservation: result.reservation },
        "Reservation fulfilled successfully",
      );
    } catch (error) {
      return next(error);
    }
  };

  public listReservations = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ reservations: InventoryReservation[] }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const reservations = await this.service.listReservations(
        req.params.orderId as string,
      );
      return sendSuccess(res, { reservations });
    } catch (error) {
      return next(error);
    }
  };
}
