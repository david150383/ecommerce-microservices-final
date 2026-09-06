import { Response, NextFunction } from "express";
import { NotificationService } from "../services/notification.service.js";
import { AuthenticatedRequest } from "../../../middleware/authenticate.middleware.js";
import { sendSuccess, sendCreated } from "../../../shared/utils/response.util.js";
import { UnauthorizedError, ForbiddenError } from "../../../shared/errors/app.error.js";
import { NotificationResponseDto } from "../types/notification.types.js";
import { ApiResponse } from "../../../shared/types/api.types.js";

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  public getUserNotifications = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<NotificationResponseDto[]>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required to view notifications");
      }

      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;

      // If admin and requested all or specific userId
      if (req.user.role === "ADMIN" && req.query.all === "true") {
        const { data, total } = await this.service.listNotifications({}, limit, offset);
        return sendSuccess(res, data, undefined, 200, { total, limit, offset });
      }

      // Customer notifications matching current user ID
      const notifications = await this.service.getUserNotifications(
        req.user.id,
        limit,
        offset,
      );

      return sendSuccess(res, notifications, undefined, 200, {
        count: notifications.length,
        limit,
        offset,
      });
    } catch (error) {
      return next(error);
    }
  };

  public getAdminNotifications = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<NotificationResponseDto[]>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      if (req.user.role !== "ADMIN") {
        throw new ForbiddenError("Only administrators can access the notification audit stream");
      }

      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const channel = req.query.channel as any;
      const status = req.query.status as any;
      const userId = req.query.userId as string | undefined;

      const { data, total } = await this.service.listNotifications(
        { channel, status, userId },
        limit,
        offset,
      );

      return sendSuccess(res, data, undefined, 200, {
        total,
        limit,
        offset,
      });
    } catch (error) {
      return next(error);
    }
  };

  public dispatchManualNotification = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<NotificationResponseDto>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      if (req.user.role !== "ADMIN") {
        throw new ForbiddenError("Only administrators can dispatch manual notifications");
      }

      const notification = await this.service.dispatchNotification(req.body);
      return sendCreated(res, notification, "Notification queued and dispatched successfully");
    } catch (error) {
      return next(error);
    }
  };

  public getById = async (
    req: AuthenticatedRequest,
    res: Response<ApiResponse<NotificationResponseDto>>,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }

      const notification = await this.service.getNotificationById(
        req.params.id as string,
      );

      // Enforce ownership unless admin
      if (req.user.role !== "ADMIN" && notification.userId !== req.user.id) {
        throw new ForbiddenError("You are not authorized to view this notification");
      }

      return sendSuccess(res, notification);
    } catch (error) {
      return next(error);
    }
  };
}
