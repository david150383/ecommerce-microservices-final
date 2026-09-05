import { Router } from "express";
import { InventoryController } from "../controllers/inventory.controller.js";
import { InventoryService } from "../services/inventory.service.js";
import { InventoryRepository } from "../repositories/inventory.repository.js";
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
} from "../../../middleware/authenticate.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";
import {
  productIdParamSchema,
  orderIdParamSchema,
  updateStockSchema,
  adjustStockSchema,
  reserveStockSchema,
  releaseStockSchema,
  fulfillStockSchema,
  listInventoryQuerySchema,
} from "../schemas/inventory.schema.js";

const router = Router();

const repository = new InventoryRepository();
const service = new InventoryService(repository);
const controller = new InventoryController(service);

// Public / Service Queries
router.get(
  "/",
  optionalAuthenticate,
  validate(listInventoryQuerySchema, "query"),
  controller.list,
);

router.get(
  "/:productId",
  optionalAuthenticate,
  validate(productIdParamSchema, "params"),
  controller.getByProductId,
);

router.get(
  "/reservations/:orderId",
  authenticate,
  validate(orderIdParamSchema, "params"),
  controller.listReservations,
);

// Admin Stock Maintenance
router.post(
  "/:productId/stock",
  authenticate,
  requireRole(["ADMIN"]),
  validate(productIdParamSchema, "params"),
  validate(updateStockSchema, "body"),
  controller.setStock,
);

router.post(
  "/:productId/adjust",
  authenticate,
  requireRole(["ADMIN"]),
  validate(productIdParamSchema, "params"),
  validate(adjustStockSchema, "body"),
  controller.adjustStock,
);

// Order Saga Operations
router.post(
  "/reserve",
  authenticate,
  validate(reserveStockSchema, "body"),
  controller.reserve,
);

router.post(
  "/release",
  authenticate,
  validate(releaseStockSchema, "body"),
  controller.release,
);

router.post(
  "/fulfill",
  authenticate,
  validate(fulfillStockSchema, "body"),
  controller.fulfill,
);

export default router;
export { service as inventoryService, repository as inventoryRepository };
