export type NotificationChannel = "EMAIL" | "SMS" | "WEBHOOK";

export interface SendNotificationParams {
  recipient: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  metadata?: Record<string, unknown> | undefined;
}

export interface SendNotificationResult {
  success: boolean;
  deliveredAt?: Date | undefined;
  deliveryId?: string | undefined;
  deliveryMetadata?: Record<string, unknown> | undefined;
  error?: string | undefined;
}

export interface NotificationProvider {
  readonly name: string;
  readonly channel: NotificationChannel;
  send(params: SendNotificationParams): Promise<SendNotificationResult>;
}
