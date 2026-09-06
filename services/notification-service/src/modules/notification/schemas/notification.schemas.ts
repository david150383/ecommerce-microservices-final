import { z } from "zod";

export const sendNotificationSchema = z.object({
  channel: z.enum(["EMAIL", "SMS", "WEBHOOK"]),
  recipient: z.string().min(1, "Recipient is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body message is required"),
  userId: z.string().uuid("Invalid user ID").optional().nullable(),
  templateType: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const listNotificationsQuerySchema = z.object({
  channel: z.enum(["ALL", "EMAIL", "SMS", "WEBHOOK"]).optional(),
  status: z.enum(["ALL", "DELIVERED", "FAILED", "PENDING"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
  userId: z.string().uuid().optional().nullable(),
});

export const notificationIdParamSchema = z.object({
  id: z.string().uuid("Invalid notification ID"),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
