import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { PaymentService } from "../services/payment.service.js";
import { PaymentRepository } from "../repositories/payment.repository.js";
import { authenticate } from "../../../middleware/authenticate.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";
import {
  processPaymentSchema,
  refundPaymentSchema,
  paymentIdParamSchema,
  orderIdParamSchema,
  listPaymentsQuerySchema,
} from "../schemas/payment.schema.js";

const router = Router();

const repository = new PaymentRepository();
const service = new PaymentService(repository);
const controller = new PaymentController(service);

// Process payment
router.post("/", authenticate, validate(processPaymentSchema, "body"), controller.process);

// List payments
router.get("/", authenticate, validate(listPaymentsQuerySchema, "query"), controller.list);

// Get payment by order ID
router.get(
  "/order/:orderId",
  authenticate,
  validate(orderIdParamSchema, "params"),
  controller.getByOrderId,
);

// Get payment by ID
router.get("/:id", authenticate, validate(paymentIdParamSchema, "params"), controller.getById);

// Refund payment
router.post(
  "/:id/refund",
  authenticate,
  validate(paymentIdParamSchema, "params"),
  validate(refundPaymentSchema, "body"),
  controller.refund,
);

export default router;
export { service as paymentService, repository as paymentRepository };
