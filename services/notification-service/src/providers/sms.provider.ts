import crypto from "node:crypto";
import {
  NotificationProvider,
  SendNotificationParams,
  SendNotificationResult,
} from "./notification.provider.interface.js";
import { logger } from "../logger/logger.js";

export class SmsProvider implements NotificationProvider {
  public readonly name = "TELEPHONY_SMS_GATEWAY";
  public readonly channel = "SMS" as const;

  async send(params: SendNotificationParams): Promise<SendNotificationResult> {
    const deliveryId = `msg_sms_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    logger.info("SMS message queued and dispatched", {
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
        carrierNetwork: "VIRTUAL_CARRIER_LINK",
        segmentCount: Math.ceil(params.body.length / 160) || 1,
        gatewayStatus: "DELIVERED_TO_CARRIER",
      },
    };
  }
}
