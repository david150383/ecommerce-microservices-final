export type NotificationChannel = "EMAIL" | "SMS" | "WEBHOOK";
export type NotificationStatus = "DELIVERED" | "FAILED" | "PENDING";

export interface NotificationRow {
  id: string;
  event_id: string | null;
  event_type: string;
  user_id: string | null;
  recipient: string;
  channel: NotificationChannel;
  template_type: string;
  subject: string;
  body: string;
  status: NotificationStatus;
  metadata: Record<string, unknown>;
  error_message: string | null;
  created_at: Date | string;
  delivered_at: Date | string | null;
}

export interface Notification {
  id: string;
  eventId: string;
  eventType: string;
  userId: string | null;
  recipient: string;
  channel: NotificationChannel;
  templateType: string;
  subject: string;
  body: string;
  status: NotificationStatus;
  metadata: Record<string, unknown>;
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

export interface NotificationResponseDto {
  id: string;
  eventId: string;
  eventType: string;
  userId: string | null;
  recipient: string;
  channel: NotificationChannel;
  templateType: string;
  template_type: string; // Compatibility alias for frontend NotificationRecord
  subject: string;
  body: string;
  status: NotificationStatus;
  metadata: Record<string, unknown>;
  deliveryMetadata: Record<string, unknown>; // Compatibility alias for frontend AdminNotification
  error: string | null;
  createdAt: string;
  created_at: string; // Compatibility alias for frontend NotificationRecord
  deliveredAt: string | null;
}

export interface InboxEventRow {
  event_id: string;
  event_type: string;
  routing_key: string;
  processed_at: Date | string;
}
