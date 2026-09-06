import crypto from "node:crypto";
import {
  NotificationRepository,
  NotificationFilters,
} from "../repositories/notification.repository.js";
import { NotificationProviderFactory } from "../../../providers/provider.factory.js";
import { NotificationResponseDto } from "../types/notification.types.js";
import { SendNotificationInput } from "../schemas/notification.schemas.js";
import { NotFoundError } from "../../../shared/errors/app.error.js";
import { withTransaction } from "../../../db.js";
import { logger } from "../../../logger/logger.js";

export class NotificationService {
  constructor(private readonly repository: NotificationRepository) {}

  async dispatchNotification(
    input: SendNotificationInput,
    eventId?: string,
    eventType = "notification.manual",
  ): Promise<NotificationResponseDto> {
    const provider = NotificationProviderFactory.getProvider(input.channel);

    const deliveryResult = await provider.send({
      recipient: input.recipient,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      metadata: input.metadata,
    });

    const status = deliveryResult.success ? "DELIVERED" : "FAILED";
    const combinedMetadata = {
      ...(input.metadata || {}),
      ...(deliveryResult.deliveryMetadata || {}),
      deliveryId: deliveryResult.deliveryId,
    };

    const notification = await this.repository.create({
      eventId: eventId || crypto.randomUUID(),
      eventType,
      userId: input.userId,
      recipient: input.recipient,
      channel: input.channel,
      templateType: input.templateType || "MANUAL_DISPATCH",
      subject: input.subject,
      body: input.body,
      status,
      metadata: combinedMetadata,
      errorMessage: deliveryResult.error || null,
      deliveredAt: deliveryResult.deliveredAt || new Date(),
    });

    logger.info(`Notification dispatched: ${notification.id}`, {
      id: notification.id,
      channel: notification.channel,
      recipient: notification.recipient,
      status: notification.status,
    });

    return notification;
  }

  async getUserNotifications(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<NotificationResponseDto[]> {
    return this.repository.findByUserId(userId, limit, offset);
  }

  async listNotifications(
    filters: NotificationFilters = {},
    limit = 50,
    offset = 0,
  ): Promise<{ data: NotificationResponseDto[]; total: number }> {
    const [data, total] = await Promise.all([
      this.repository.list(filters, limit, offset),
      this.repository.count(filters),
    ]);

    return { data, total };
  }

  async getNotificationById(id: string): Promise<NotificationResponseDto> {
    const notification = await this.repository.findById(id);
    if (!notification) {
      throw new NotFoundError("Notification", id);
    }
    return notification;
  }

  // Saga Event Consumer Handlers
  async handleOrderCreated(payload: any, eventId: string): Promise<void> {
    await withTransaction(async (client) => {
      const alreadyProcessed = await this.repository.isEventProcessed(eventId, client);
      if (alreadyProcessed) {
        logger.debug(`Event ${eventId} already processed, skipping`);
        return;
      }

      const orderId = payload.orderId || "";
      const customerId = payload.customerId || "";
      const totalAmount =
        payload.totalAmount ||
        (typeof payload.totalAmountCents === "number"
          ? (payload.totalAmountCents / 100).toFixed(2)
          : "0.00");
      const itemsCount = Array.isArray(payload.items) ? payload.items.length : 1;
      const recipient =
        payload.customerEmail || payload.email || `customer-${customerId.slice(0, 8)}@example.com`;

      const subject = `Order Confirmation #${orderId.slice(0, 8)}`;
      const body = `Thank you for your order! Your order #${orderId.slice(0, 8)} with ${itemsCount} item(s) totalling $${totalAmount} has been received and is being prepared.`;

      const provider = NotificationProviderFactory.getProvider("EMAIL");
      const delivery = await provider.send({
        recipient,
        channel: "EMAIL",
        subject,
        body,
        metadata: { orderId, customerId, totalAmount },
      });

      await this.repository.create(
        {
          eventId,
          eventType: "order.created",
          userId: customerId || null,
          recipient,
          channel: "EMAIL",
          templateType: "ORDER_CONFIRMATION",
          subject,
          body,
          status: delivery.success ? "DELIVERED" : "FAILED",
          metadata: {
            orderId,
            customerId,
            totalAmount,
            deliveryMetadata: delivery.deliveryMetadata,
          },
          errorMessage: delivery.error || null,
          deliveredAt: delivery.deliveredAt || new Date(),
        },
        client,
      );

      await this.repository.insertInboxEvent(eventId, "order.created", "order.created", client);
    });
  }

  async handleOrderCancelled(payload: any, eventId: string): Promise<void> {
    await withTransaction(async (client) => {
      const alreadyProcessed = await this.repository.isEventProcessed(eventId, client);
      if (alreadyProcessed) return;

      const orderId = payload.orderId || "";
      const customerId = payload.customerId || "";
      const reason = payload.reason || "Order cancelled by customer or stock shortage";
      const recipient =
        payload.customerEmail || payload.email || `customer-${customerId.slice(0, 8)}@example.com`;

      const subject = `Order Cancellation Notice - #${orderId.slice(0, 8)}`;
      const body = `Your order #${orderId.slice(0, 8)} has been cancelled. Reason: ${reason}. Any pre-authorizations or payments have been released.`;

      const provider = NotificationProviderFactory.getProvider("EMAIL");
      const delivery = await provider.send({
        recipient,
        channel: "EMAIL",
        subject,
        body,
        metadata: { orderId, customerId, reason },
      });

      await this.repository.create(
        {
          eventId,
          eventType: "order.cancelled",
          userId: customerId || null,
          recipient,
          channel: "EMAIL",
          templateType: "ORDER_CANCELLED",
          subject,
          body,
          status: delivery.success ? "DELIVERED" : "FAILED",
          metadata: { orderId, customerId, reason, deliveryMetadata: delivery.deliveryMetadata },
          errorMessage: delivery.error || null,
          deliveredAt: delivery.deliveredAt || new Date(),
        },
        client,
      );

      await this.repository.insertInboxEvent(eventId, "order.cancelled", "order.cancelled", client);
    });
  }

  async handlePaymentCompleted(payload: any, eventId: string): Promise<void> {
    await withTransaction(async (client) => {
      const alreadyProcessed = await this.repository.isEventProcessed(eventId, client);
      if (alreadyProcessed) return;

      const orderId = payload.orderId || "";
      const customerId = payload.customerId || "";
      const amountCents = payload.amountCents || 0;
      const formattedAmount = (amountCents / 100).toFixed(2);
      const currency = payload.currency || "USD";
      const transactionId = payload.transactionId || "";
      const recipient =
        payload.customerEmail || payload.email || `customer-${customerId.slice(0, 8)}@example.com`;

      const subject = `Payment Successful for Order #${orderId.slice(0, 8)}`;
      const body = `We have received your payment of $${formattedAmount} ${currency}. Transaction ID: ${transactionId}. Your items are on the way!`;

      const provider = NotificationProviderFactory.getProvider("EMAIL");
      const delivery = await provider.send({
        recipient,
        channel: "EMAIL",
        subject,
        body,
        metadata: { orderId, customerId, amountCents, transactionId },
      });

      await this.repository.create(
        {
          eventId,
          eventType: "payment.completed",
          userId: customerId || null,
          recipient,
          channel: "EMAIL",
          templateType: "PAYMENT_SUCCESS",
          subject,
          body,
          status: delivery.success ? "DELIVERED" : "FAILED",
          metadata: {
            orderId,
            customerId,
            amountCents,
            currency,
            transactionId,
            deliveryMetadata: delivery.deliveryMetadata,
          },
          errorMessage: delivery.error || null,
          deliveredAt: delivery.deliveredAt || new Date(),
        },
        client,
      );

      await this.repository.insertInboxEvent(
        eventId,
        "payment.completed",
        "payment.completed",
        client,
      );
    });
  }

  async handlePaymentFailed(payload: any, eventId: string): Promise<void> {
    await withTransaction(async (client) => {
      const alreadyProcessed = await this.repository.isEventProcessed(eventId, client);
      if (alreadyProcessed) return;

      const orderId = payload.orderId || "";
      const customerId = payload.customerId || "";
      const reason = payload.reason || payload.failureReason || "Payment authorization declined";
      const recipient =
        payload.customerEmail || payload.email || `customer-${customerId.slice(0, 8)}@example.com`;

      const subject = `Action Required: Payment Failed for Order #${orderId.slice(0, 8)}`;
      const body = `Your payment could not be processed. Reason: ${reason}. Please update your payment method to complete the order.`;

      const provider = NotificationProviderFactory.getProvider("EMAIL");
      const delivery = await provider.send({
        recipient,
        channel: "EMAIL",
        subject,
        body,
        metadata: { orderId, customerId, reason },
      });

      await this.repository.create(
        {
          eventId,
          eventType: "payment.failed",
          userId: customerId || null,
          recipient,
          channel: "EMAIL",
          templateType: "PAYMENT_FAILED",
          subject,
          body,
          status: delivery.success ? "DELIVERED" : "FAILED",
          metadata: { orderId, customerId, reason, deliveryMetadata: delivery.deliveryMetadata },
          errorMessage: delivery.error || null,
          deliveredAt: delivery.deliveredAt || new Date(),
        },
        client,
      );

      await this.repository.insertInboxEvent(eventId, "payment.failed", "payment.failed", client);
    });
  }

  async handleInventoryReservationFailed(payload: any, eventId: string): Promise<void> {
    await withTransaction(async (client) => {
      const alreadyProcessed = await this.repository.isEventProcessed(eventId, client);
      if (alreadyProcessed) return;

      const orderId = payload.orderId || "";
      const customerId = payload.customerId || "";
      const reason = payload.reason || "Insufficient stock";
      const recipient =
        payload.phoneNumber || `+1555${Math.floor(1000000 + Math.random() * 9000000)}`;

      const subject = `Out of Stock Notice for Order #${orderId.slice(0, 8)}`;
      const body = `Urgent: Items in your order #${orderId.slice(0, 8)} are currently out of stock (${reason}). Your order has been cancelled and refunded.`;

      const provider = NotificationProviderFactory.getProvider("SMS");
      const delivery = await provider.send({
        recipient,
        channel: "SMS",
        subject,
        body,
        metadata: { orderId, customerId, reason },
      });

      await this.repository.create(
        {
          eventId,
          eventType: "inventory.reservation_failed",
          userId: customerId || null,
          recipient,
          channel: "SMS",
          templateType: "OUT_OF_STOCK",
          subject,
          body,
          status: delivery.success ? "DELIVERED" : "FAILED",
          metadata: { orderId, customerId, reason, deliveryMetadata: delivery.deliveryMetadata },
          errorMessage: delivery.error || null,
          deliveredAt: delivery.deliveredAt || new Date(),
        },
        client,
      );

      await this.repository.insertInboxEvent(
        eventId,
        "inventory.reservation_failed",
        "inventory.reservation_failed",
        client,
      );
    });
  }

  async handleInventoryStockUpdated(payload: any, eventId: string): Promise<void> {
    const available = Number(payload.availableQuantity ?? payload.available_quantity ?? 0);
    const productId = payload.productId || payload.product_id || "";

    // Trigger low stock webhook alert if quantity is 5 or below
    if (available <= 5 && available >= 0) {
      await withTransaction(async (client) => {
        const alreadyProcessed = await this.repository.isEventProcessed(eventId, client);
        if (alreadyProcessed) return;

        const recipient = "https://ops-webhook.internal/stock-alerts";
        const subject = `Low Stock Alert: Product ${productId.slice(0, 8)}`;
        const body = `Product ${productId} is running low: only ${available} unit(s) remaining in stock. Restock required immediately.`;

        const provider = NotificationProviderFactory.getProvider("WEBHOOK");
        const delivery = await provider.send({
          recipient,
          channel: "WEBHOOK",
          subject,
          body,
          metadata: { productId, availableQuantity: available },
        });

        await this.repository.create(
          {
            eventId,
            eventType: "inventory.stock_updated",
            userId: null,
            recipient,
            channel: "WEBHOOK",
            templateType: "LOW_STOCK_ALERT",
            subject,
            body,
            status: delivery.success ? "DELIVERED" : "FAILED",
            metadata: {
              productId,
              availableQuantity: available,
              deliveryMetadata: delivery.deliveryMetadata,
            },
            errorMessage: delivery.error || null,
            deliveredAt: delivery.deliveredAt || new Date(),
          },
          client,
        );

        await this.repository.insertInboxEvent(
          eventId,
          "inventory.stock_updated",
          "inventory.stock_updated",
          client,
        );
      });
    }
  }
}
