import { Response, NextFunction } from "express";
import { ProductService } from "../services/product.service.js";
import { AuthenticatedRequest } from "../../../middleware/authenticate.middleware.js";
import { sendSuccess, sendCreated } from "../../../shared/utils/response.util.js";
import { Product } from "../types/product.types.js";
import { ApiResponse, ApiErrorResponse } from "../../../shared/types/api.types.js";
import { ListProductsQuery } from "../schemas/product.schema.js";

export class ProductController {
  constructor(private readonly service: ProductService) {}

  public list = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ products: Product[] }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const query = req.query as unknown as ListProductsQuery;
      const isAdmin = req.user?.role === "ADMIN";
      const result = await this.service.listProducts(query, isAdmin);

      return sendSuccess(res, { products: result.products }, undefined, 200, {
        limit: result.limit,
        ...(result.offset !== undefined ? { offset: result.offset } : {}),
        ...(result.total !== undefined ? { total: result.total } : {}),
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
      });
    } catch (error) {
      return next(error);
    }
  };

  public getById = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ product: Product }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const product = await this.service.getProductById(req.params.id as string);
      return sendSuccess(res, { product });
    } catch (error) {
      return next(error);
    }
  };

  public getBySlug = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ product: Product }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const product = await this.service.getProductBySlug(req.params.slug as string);
      return sendSuccess(res, { product });
    } catch (error) {
      return next(error);
    }
  };

  public create = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ product: Product }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const product = await this.service.createProduct(req.body);
      return sendCreated(res, { product }, "Product created successfully");
    } catch (error) {
      return next(error);
    }
  };

  public update = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<{ product: Product }>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const product = await this.service.updateProduct(req.params.id as string, req.body);
      return sendSuccess(res, { product }, "Product updated successfully");
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
      await this.service.deleteProduct(req.params.id as string);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };
}
