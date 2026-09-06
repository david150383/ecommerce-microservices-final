import { Router } from "express";
import { ProductController } from "../controllers/product.controller.js";
import { ProductService } from "../services/product.service.js";
import { ProductRepository } from "../repositories/product.repository.js";
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
} from "../../../middleware/authenticate.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";
import {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  productSlugParamSchema,
  listProductsQuerySchema,
} from "../schemas/product.schema.js";

const router = Router();

const repository = new ProductRepository();
const service = new ProductService(repository);
const controller = new ProductController(service);

// Public Catalog Queries
router.get("/", optionalAuthenticate, validate(listProductsQuerySchema, "query"), controller.list);

router.get("/slug/:slug", validate(productSlugParamSchema, "params"), controller.getBySlug);

router.get("/:id", validate(productIdParamSchema, "params"), controller.getById);

// Protected Admin Management Endpoints
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  validate(createProductSchema, "body"),
  controller.create,
);

router.patch(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema, "body"),
  controller.update,
);

router.delete(
  "/:id",
  authenticate,
  requireRole(["ADMIN"]),
  validate(productIdParamSchema, "params"),
  controller.delete,
);

export default router;
