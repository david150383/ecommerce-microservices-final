import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller.js";
import { NotificationService } from "../services/notification.service.js";
import { NotificationRepository } from "../repositories/notification.repository.js";
import { authenticate, requireRole } from "../../../middleware/authenticate.middleware.js";
import { validate } from "../../../middleware/validate.middleware.js";
import {
  sendNotificationSchema,
  listNotificationsQuerySchema,
  notificationIdParamSchema,
} from "../schemas/notification.schema.js";

const router = Router();

const repository = new NotificationRepository();
const service = new NotificationService(repository);
const controller = new NotificationController(service);

// 1. Admin Audit Stream
router.get(
  "/admin",
  authenticate,
  requireRole(["ADMIN"]),
  validate(listNotificationsQuerySchema, "query"),
  controller.getAdminNotifications,
);

// 2. Admin Manual Dispatch
router.post(
  "/admin/dispatch",
  authenticate,
  requireRole(["ADMIN"]),
  validate(sendNotificationSchema, "body"),
  controller.dispatchManualNotification,
);

// 3. Customer Notifications (and admin fallback list)
router.get("/", authenticate, controller.getUserNotifications);

// 4. Direct POST / (dispatches notification if admin)
router.post(
  "/",
  authenticate,
  requireRole(["ADMIN"]),
  validate(sendNotificationSchema, "body"),
  controller.dispatchManualNotification,
);

// 5. Single Notification Lookup
router.get("/:id", authenticate, validate(notificationIdParamSchema, "params"), controller.getById);

export { repository, service, controller };
export default router;
