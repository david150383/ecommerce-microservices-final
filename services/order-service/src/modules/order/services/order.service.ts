import crypto from "crypto";
import { OrderRepository } from "../repositories/order.repository.js";
import {
  OrderWithItems,
  PaginatedOrders,
  ListOrderFilter,
} from "../types/order.types.js";
import { CreateOrderInput } from "../schemas/order.schema.js";
import { withTransaction } from "../../../db.js";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../../../shared/errors/app.error.js";
import { logger } from "../../../logger/logger.js";

export class OrderService {
  constructor(private readonly orderRepository: OrderRepository) {}

  /**
   * Place an order atomically:
   * 1. Calculates total amount
   * 2. Inserts order and line items
   * 3. Inserts outbox event "order.created"
   */
  async createOrder(
    customerId: string,
    input: CreateOrderInput,
    providedCorrelationId?: string,
  ): Promise<OrderWithItems> {
    const correlationId =
      input.correlationId ||
      providedCorrelationId ||
      crypto.randomUUID();

    const totalAmountCents = input.items.reduce((sum, item) => {
      return sum + item.quantity * item.unitPriceCents;
    }, 0);

    return withTransaction(async (client) => {
      const order = await this.orderRepository.create(
        {
          customerId,
          totalAmountCents,
          currency: input.currency || "USD",
          correlationId,
          items: input.items,
        },
        client,
      );

      // Insert transactional outbox event
      const eventId = crypto.randomUUID();
      await this.orderRepository.insertOutboxEvent(
        {
          eventId,
          eventType: "order.created",
          aggregateId: order.id,
          aggregateType: "order",
          routingKey: "order.created",
          payload: {
            eventId,
            orderId: order.id,
            customerId: order.customerId,
            totalAmountCents: order.totalAmountCents,
            currency: order.currency,
            correlationId: order.correlationId,
            items: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
              totalPriceCents: item.totalPriceCents,
            })),
            timestamp: new Date().toISOString(),
          },
        },
        client,
      );

      logger.info(`Order placed: ${order.id} for customer ${customerId}`, {
        orderId: order.id,
        customerId,
        totalAmountCents,
        correlationId,
      });

      return order;
    });
  }

  /**
   * Fetch an order by ID, enforcing customer ownership unless admin
   */
  async getOrder(
    id: string,
    customerId: string,
    isAdmin = false,
  ): Promise<OrderWithItems> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new NotFoundError("Order", id);
    }

    if (!isAdmin && order.customerId !== customerId) {
      throw new ForbiddenError("You do not have access to this order.");
    }

    return order;
  }

  /**
   * List orders with optional filters and pagination
   */
  async listOrders(
    filter: ListOrderFilter,
    customerId: string,
    isAdmin = false,
  ): Promise<PaginatedOrders> {
    const effectiveFilter: ListOrderFilter = { ...filter };
    if (!isAdmin) {
      effectiveFilter.customerId = customerId;
    }

    return this.orderRepository.list(effectiveFilter);
  }

  /**
   * Cancel an order:
   * 1. Validates cancellation is allowed (PENDING or CONFIRMED)
   * 2. Updates order status to CANCELLED
   * 3. Emits outbox event "order.cancelled" so inventory reservations can be released
   */
  async cancelOrder(
    id: string,
    customerId: string,
    reason?: string,
    isAdmin = false,
  ): Promise<OrderWithItems> {
    return withTransaction(async (client) => {
      const order = await this.orderRepository.findById(id, true, client);
      if (!order) {
        throw new NotFoundError("Order", id);
      }

      if (!isAdmin && order.customerId !== customerId) {
        throw new ForbiddenError("You do not have permission to cancel this order.");
      }

      if (order.status === "CANCELLED") {
        return order;
      }

      if (order.status === "COMPLETED") {
        throw new BadRequestError("Cannot cancel an order that has already been completed.");
      }

      const cancellationReason = reason || "Order cancelled by user";

      await this.orderRepository.updateStatus(
        id,
        "CANCELLED",
        cancellationReason,
        client,
      );

      // Emit outbox event for Saga compensation
      const eventId = crypto.randomUUID();
      await this.orderRepository.insertOutboxEvent(
        {
          eventId,
          eventType: "order.cancelled",
          aggregateId: order.id,
          aggregateType: "order",
          routingKey: "order.cancelled",
          payload: {
            eventId,
            orderId: order.id,
            customerId: order.customerId,
            reason: cancellationReason,
            items: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            timestamp: new Date().toISOString(),
          },
        },
        client,
      );

      logger.info(`Order cancelled: ${order.id}`, {
        orderId: order.id,
        reason: cancellationReason,
      });

      return {
        ...order,
        status: "CANCELLED",
        cancellationReason,
        updatedAt: new Date(),
      };
    });
  }

  /**
   * Saga: Handle inventory reserved event
   * Transitions PENDING -> CONFIRMED
   */
  async handleInventoryReserved(orderId: string, eventId: string): Promise<void> {
    await withTransaction(async (client) => {
      const processed = await this.orderRepository.isEventProcessed(eventId, client);
      if (processed) {
        logger.debug(`Event ${eventId} already processed, skipping`);
        return;
      }

      const order = await this.orderRepository.findById(orderId, true, client);
      if (!order) {
        logger.warn(`Order ${orderId} not found for inventory.reserved event`);
        await this.orderRepository.insertInboxEvent(
          eventId,
          "inventory.reserved",
          "inventory.reserved",
          client,
        );
        return;
      }

      if (order.status === "PENDING") {
        await this.orderRepository.updateStatus(orderId, "CONFIRMED", null, client);
        logger.info(`Order ${orderId} confirmed after inventory reservation`);
      }

      await this.orderRepository.insertInboxEvent(
        eventId,
        "inventory.reserved",
        "inventory.reserved",
        client,
      );
    });
  }

  /**
   * Saga: Handle inventory reservation failure event
   * Transitions PENDING -> CANCELLED and emits order.cancelled
   */
  async handleInventoryReservationFailed(
    orderId: string,
    reason: string,
    eventId: string,
  ): Promise<void> {
    await withTransaction(async (client) => {
      const processed = await this.orderRepository.isEventProcessed(eventId, client);
      if (processed) {
        logger.debug(`Event ${eventId} already processed, skipping`);
        return;
      }

      const order = await this.orderRepository.findById(orderId, true, client);
      if (!order) {
        logger.warn(`Order ${orderId} not found for inventory.reservation_failed`);
        await this.orderRepository.insertInboxEvent(
          eventId,
          "inventory.reservation_failed",
          "inventory.reservation_failed",
          client,
        );
        return;
      }

      if (order.status !== "CANCELLED") {
        const cancellationReason = reason || "Inventory reservation failed";
        await this.orderRepository.updateStatus(
          orderId,
          "CANCELLED",
          cancellationReason,
          client,
        );

        const cancelEventId = crypto.randomUUID();
        await this.orderRepository.insertOutboxEvent(
          {
            eventId: cancelEventId,
            eventType: "order.cancelled",
            aggregateId: order.id,
            aggregateType: "order",
            routingKey: "order.cancelled",
            payload: {
              eventId: cancelEventId,
              orderId: order.id,
              customerId: order.customerId,
              reason: cancellationReason,
              items: order.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
              timestamp: new Date().toISOString(),
            },
          },
          client,
        );

        logger.info(`Order ${orderId} cancelled due to inventory failure: ${reason}`);
      }

      await this.orderRepository.insertInboxEvent(
        eventId,
        "inventory.reservation_failed",
        "inventory.reservation_failed",
        client,
      );
    });
  }

  /**
   * Saga: Handle payment completed event
   * Transitions CONFIRMED/PENDING -> COMPLETED
   */
  async handlePaymentCompleted(orderId: string, eventId: string): Promise<void> {
    await withTransaction(async (client) => {
      const processed = await this.orderRepository.isEventProcessed(eventId, client);
      if (processed) {
        logger.debug(`Event ${eventId} already processed, skipping`);
        return;
      }

      const order = await this.orderRepository.findById(orderId, true, client);
      if (!order) {
        logger.warn(`Order ${orderId} not found for payment.completed`);
        await this.orderRepository.insertInboxEvent(
          eventId,
          "payment.completed",
          "payment.completed",
          client,
        );
        return;
      }

      if (order.status !== "CANCELLED") {
        await this.orderRepository.updateStatus(orderId, "COMPLETED", null, client);
        logger.info(`Order ${orderId} completed after successful payment`);
      }

      await this.orderRepository.insertInboxEvent(
        eventId,
        "payment.completed",
        "payment.completed",
        client,
      );
    });
  }

  /**
   * Saga: Handle payment failed event
   * Transitions -> CANCELLED and emits order.cancelled so inventory releases reserved items
   */
  async handlePaymentFailed(
    orderId: string,
    reason: string,
    eventId: string,
  ): Promise<void> {
    await withTransaction(async (client) => {
      const processed = await this.orderRepository.isEventProcessed(eventId, client);
      if (processed) {
        logger.debug(`Event ${eventId} already processed, skipping`);
        return;
      }

      const order = await this.orderRepository.findById(orderId, true, client);
      if (!order) {
        logger.warn(`Order ${orderId} not found for payment.failed`);
        await this.orderRepository.insertInboxEvent(
          eventId,
          "payment.failed",
          "payment.failed",
          client,
        );
        return;
      }

      if (order.status !== "CANCELLED" && order.status !== "COMPLETED") {
        const cancellationReason = reason || "Payment failed";
        await this.orderRepository.updateStatus(
          orderId,
          "CANCELLED",
          cancellationReason,
          client,
        );

        const cancelEventId = crypto.randomUUID();
        await this.orderRepository.insertOutboxEvent(
          {
            eventId: cancelEventId,
            eventType: "order.cancelled",
            aggregateId: order.id,
            aggregateType: "order",
            routingKey: "order.cancelled",
            payload: {
              eventId: cancelEventId,
              orderId: order.id,
              customerId: order.customerId,
              reason: cancellationReason,
              items: order.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
              })),
              timestamp: new Date().toISOString(),
            },
          },
          client,
        );

        logger.info(`Order ${orderId} cancelled due to payment failure: ${reason}`);
      }

      await this.orderRepository.insertInboxEvent(
        eventId,
        "payment.failed",
        "payment.failed",
        client,
      );
    });
  }
}
