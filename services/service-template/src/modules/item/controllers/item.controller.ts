import { Response, NextFunction } from "express";
import { ItemService } from "../services/item.service.js";
import { AuthenticatedRequest } from "../../../middleware/authenticate.middleware.js";
import { sendSuccess, sendCreated } from "../../../shared/utils/response.util.js";
import { UnauthorizedError } from "../../../shared/errors/app.error.js";
import { Item } from "../types/item.types.js";
import { ApiResponse, ApiErrorResponse } from "../../../shared/types/api.types.js";

export class ItemController {
  constructor(private readonly service: ItemService) {}

  public list = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ items: Item[]; count: number }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const items = await this.service.listItems(limit, offset);
      return sendSuccess(res, { items, count: items.length }, undefined, 200, {
        limit,
        offset,
      });
    } catch (error) {
      return next(error);
    }
  };

  public getById = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ item: Item | null }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const item = await this.service.getItem(req.params.id as string);
      return sendSuccess(res, { item });
    } catch (error) {
      return next(error);
    }
  };

  public create = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ item: Item }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const item = await this.service.createItem(req.body, req.user.id);
      return sendCreated(res, { item }, "Item created successfully");
    } catch (error) {
      return next(error);
    }
  };

  public update = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ item: Item }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const item = await this.service.updateItem(
        req.params.id as string,
        req.body,
        req.user.id,
        req.user.role,
      );
      return sendSuccess(res, { item }, "Item updated successfully");
    } catch (error) {
      return next(error);
    }
  };

  public delete = async (
    req: AuthenticatedRequest,
    res: Response<void | ApiErrorResponse>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user) throw new UnauthorizedError();
      await this.service.deleteItem(req.params.id as string, req.user.id, req.user.role);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
