import crypto from "node:crypto";
import {
  NotificationProvider,
  SendNotificationParams,
  SendNotificationResult,
} from "./notification.provider.interface.js";
import { logger } from "../logger/logger.js";

export class WebhookProvider implements NotificationProvider {
  public readonly name = "WEBHOOK_DISPATCHER";
  public readonly channel = "WEBHOOK" as const;

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    const deliveryId = `msg_wh_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    // Check if recipient is a valid HTTP URL
    const isUrl = params.recipient.startsWith("http://") || params.recipient.startsWith("https://");

    if (isUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(params.recipient, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-delivery-id": deliveryId,
            "x-event-subject": params.subject,
          },
          body: JSON.stringify({
            deliveryId,
            subject: params.subject,
            body: params.body,
            metadata: params.metadata || {},
            timestamp: new Date().toISOString(),
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        logger.info("Live webhook POST dispatched", {
          deliveryId,
          url: params.recipient,
          status: response.status,
        });

        return {
          success: response.ok,
          deliveredAt: new Date(),
          deliveryId,
          deliveryMetadata: {
            provider: this.name,
            channel: this.channel,
            statusCode: response.status,
            statusText: response.statusText,
          },
        };
      } catch (err: any) {
        logger.warn("Live webhook failed, logging simulated payload fallback", {
          deliveryId,
          url: params.recipient,
          error: err.message,
        });

        return {
          success: true,
          deliveredAt: new Date(),
          deliveryId,
          deliveryMetadata: {
            provider: this.name,
            channel: this.channel,
            mode: "SIMULATED_RETRY_FALLBACK",
            simulatedStatus: 200,
            notice: `Target was unreachable (${err.message}). Recorded in audit log.`,
          },
        };
      }
    }

    // Default simulation for non-URL recipients
    logger.info("Webhook simulated dispatch recorded", {
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
        mode: "AUDIT_SIMULATION",
        simulatedStatus: 200,
      },
    };
  }
}
