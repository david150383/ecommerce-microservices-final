import crypto from "node:crypto";
import {
  NotificationProvider,
  SendNotificationParams,
  SendNotificationResult,
} from "./notification.provider.interface.js";
import { logger } from "../logger/logger.js";

export class EmailProvider implements NotificationProvider {
  public readonly name = "SMTP_MOCK_ENGINE";
  public readonly channel = "EMAIL" as const;

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    const deliveryId = `msg_email_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    // Basic email validation check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(params.recipient) && !params.recipient.includes("@")) {
      logger.warn(`Invalid email address recipient: ${params.recipient}`);
      return {
        success: false,
        deliveryId,
        error: `Invalid email recipient format: ${params.recipient}`,
      };
    }

    logger.info("Email dispatched successfully", {
      deliveryId,
      recipient: params.recipient,
      subject: params.subject,
    });

    return {
      success: true,
      deliveredAt: new Date(),
      deliveryId,
      deliveryMetadata: {
        provider: this.name,
        channel: this.channel,
        gatewayLatencyMs: Math.floor(Math.random() * 30) + 15,
        smtpResponse: "250 2.0.0 OK: Message accepted for delivery",
      },
    };
  }
}
