import { Router } from "express";
import { OrderController } from "../controllers/order.controller.js";
import { OrderService } from "../services/order.service.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { authenticate } from "../../../middleware/authenticate.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";
import {
  createOrderSchema,
  cancelOrderSchema,
  orderIdParamSchema,
  listOrdersQuerySchema,
} from "../schemas/order.schema.js";

const router = Router();

const repository = new OrderRepository();
const service = new OrderService(repository);
const controller = new OrderController(service);

// Create order
router.post(
  "/",
  authenticate,
  validate(createOrderSchema, "body"),
  controller.create,
);

// List orders
router.get(
  "/",
  authenticate,
  validate(listOrdersQuerySchema, "query"),
  controller.list,
);

// Get order by ID
router.get(
  "/:id",
  authenticate,
  validate(orderIdParamSchema, "params"),
  controller.getById,
);

// Cancel order
router.post(
  "/:id/cancel",
  authenticate,
  validate(orderIdParamSchema, "params"),
  validate(cancelOrderSchema, "body"),
  controller.cancel,
);

export default router;
export { service as orderService, repository as orderRepository };
