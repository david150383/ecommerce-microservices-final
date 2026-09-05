import crypto from "node:crypto";
import { withTransaction } from "../../../db.js";
import { InventoryRepository } from "../repositories/inventory.repository.js";
import {
  InventoryItem,
  InventoryReservation,
  ListInventoryFilter,
  PaginatedInventory,
} from "../types/inventory.types.js";
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from "../../../shared/errors/app.error.js";
import { logger } from "../../../logger/logger.js";

export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  async getInventory(productId: string): Promise<InventoryItem> {
    const item = await this.repository.findByProductId(productId);
    if (!item) {
      throw new NotFoundError("Inventory for product", productId);
    }
    return item;
  }

  async listInventory(
    filter: ListInventoryFilter = {},
  ): Promise<PaginatedInventory> {
    return this.repository.list(filter);
  }

  async listReservations(orderId: string): Promise<InventoryReservation[]> {
    return this.repository.listReservationsByOrderId(orderId);
  }

  async setStock(
    productId: string,
    availableQuantity: number,
  ): Promise<InventoryItem> {
    return withTransaction(async (client) => {
      const item = await this.repository.upsertInventory(
        productId,
        availableQuantity,
        client,
      );

      await this.repository.insertOutboxEvent(
        {
          eventId: crypto.randomUUID(),
          eventType: "inventory.stock_updated",
          aggregateId: productId,
          aggregateType: "inventory",
          routingKey: "inventory.stock_updated",
          payload: {
            productId,
            availableQuantity: item.availableQuantity,
            reservedQuantity: item.reservedQuantity,
            timestamp: new Date().toISOString(),
          },
        },
        client,
      );

      return item;
    });
  }

  async adjustStock(productId: string, delta: number): Promise<InventoryItem> {
    return withTransaction(async (client) => {
      const existing = await this.repository.findByProductId(
        productId,
        true,
        client,
      );
      if (!existing) {
        throw new NotFoundError("Inventory for product", productId);
      }

      if (existing.availableQuantity + delta < 0) {
        throw new BadRequestError(
          `Cannot adjust stock by ${delta}. Current available stock is only ${existing.availableQuantity}.`,
        );
      }

      const updated = await this.repository.adjustQuantities(
        productId,
        delta,
        0,
        client,
      );

      await this.repository.insertOutboxEvent(
        {
          eventId: crypto.randomUUID(),
          eventType: "inventory.stock_updated",
          aggregateId: productId,
          aggregateType: "inventory",
          routingKey: "inventory.stock_updated",
          payload: {
            productId,
            delta,
            availableQuantity: updated.availableQuantity,
            reservedQuantity: updated.reservedQuantity,
            timestamp: new Date().toISOString(),
          },
        },
        client,
      );

      return updated;
    });
  }

  /**
   * Saga Step: Reserve stock for an order
   * Guarantees atomic row lock, inventory reduction, outbox event generation, and inbox deduplication.
   */
  async reserveInventory(
    orderId: string,
    productId: string,
    quantity: number,
    eventId?: string,
  ): Promise<{
    success: boolean;
    reservation?: InventoryReservation | undefined;
    reason?: string | undefined;
  }> {
    return withTransaction(async (client) => {
      if (eventId) {
        const isProcessed = await this.repository.isEventProcessed(
          eventId,
          client,
        );
        if (isProcessed) {
          logger.info(
            `Event ${eventId} already processed in inbox. Returning existing reservation.`,
          );
          const existingRes = await this.repository.findReservation(
            orderId,
            productId,
            false,
            client,
          );
          return { success: true, reservation: existingRes || undefined };
        }
      }

      // Check if order reservation already exists
      const existingRes = await this.repository.findReservation(
        orderId,
        productId,
        true,
        client,
      );
      if (existingRes && existingRes.status === "RESERVED") {
        return { success: true, reservation: existingRes };
      }

      // Pessimistic lock on product inventory
      const item = await this.repository.findByProductId(
        productId,
        true,
        client,
      );

      if (!item || item.availableQuantity < quantity) {
        const reason = !item ? "PRODUCT_NOT_FOUND" : "INSUFFICIENT_STOCK";
        logger.warn("Inventory reservation failed", {
          orderId,
          productId,
          requested: quantity,
          available: item?.availableQuantity ?? 0,
          reason,
        });

        await this.repository.insertOutboxEvent(
          {
            eventId: crypto.randomUUID(),
            eventType: "inventory.reservation_failed",
            aggregateId: orderId,
            aggregateType: "order",
            routingKey: "inventory.reservation_failed",
            payload: {
              orderId,
              productId,
              requestedQuantity: quantity,
              availableQuantity: item?.availableQuantity ?? 0,
              reason,
              timestamp: new Date().toISOString(),
            },
          },
          client,
        );

        if (eventId) {
          await this.repository.insertInboxEvent(
            eventId,
            "order.created",
            "order.created",
            client,
          );
        }

        return { success: false, reason };
      }

      // Decrement available, increment reserved
      await this.repository.adjustQuantities(
        productId,
        -quantity,
        quantity,
        client,
      );
      const reservation = await this.repository.createReservation(
        orderId,
        productId,
        quantity,
        client,
      );

      // Create outbox event in same transaction
      await this.repository.insertOutboxEvent(
        {
          eventId: crypto.randomUUID(),
          eventType: "inventory.reserved",
          aggregateId: orderId,
          aggregateType: "order",
          routingKey: "inventory.reserved",
          payload: {
            orderId,
            productId,
            quantity,
            reservationId: reservation.id,
            timestamp: new Date().toISOString(),
          },
        },
        client,
      );

      if (eventId) {
        await this.repository.insertInboxEvent(
          eventId,
          "order.created",
          "order.created",
          client,
        );
      }

      return { success: true, reservation };
    });
  }

  /**
   * Saga Compensating Step: Release previously reserved stock back to available pool
   */
  async releaseReservation(
    orderId: string,
    productId: string,
    eventId?: string,
  ): Promise<{ success: boolean; reservation?: InventoryReservation | undefined }> {
    return withTransaction(async (client) => {
      if (eventId) {
        const isProcessed = await this.repository.isEventProcessed(
          eventId,
          client,
        );
        if (isProcessed) {
          const existingRes = await this.repository.findReservation(
            orderId,
            productId,
            false,
            client,
          );
          return { success: true, reservation: existingRes || undefined };
        }
      }

      const res = await this.repository.findReservation(
        orderId,
        productId,
        true,
        client,
      );
      if (!res || res.status !== "RESERVED") {
        logger.warn("Reservation not found or already closed for release", {
          orderId,
          productId,
          status: res?.status,
        });
        return { success: false };
      }

      // Return reserved quantity back to available pool
      await this.repository.adjustQuantities(
        productId,
        res.quantity,
        -res.quantity,
        client,
      );
      const updated = await this.repository.updateReservationStatus(
        orderId,
        productId,
        "RELEASED",
        client,
      );

      await this.repository.insertOutboxEvent(
        {
          eventId: crypto.randomUUID(),
          eventType: "inventory.released",
          aggregateId: orderId,
          aggregateType: "order",
          routingKey: "inventory.released",
          payload: {
            orderId,
            productId,
            quantity: res.quantity,
            timestamp: new Date().toISOString(),
          },
        },
        client,
      );

      if (eventId) {
        await this.repository.insertInboxEvent(
          eventId,
          "order.cancelled",
          "order.cancelled",
          client,
        );
      }

      return { success: true, reservation: updated || undefined };
    });
  }

  /**
   * Saga Step: Fulfill reservation upon successful payment (stock permanently deducted)
   */
  async fulfillReservation(
    orderId: string,
    productId: string,
    eventId?: string,
  ): Promise<{ success: boolean; reservation?: InventoryReservation | undefined }> {
    return withTransaction(async (client) => {
      if (eventId) {
        const isProcessed = await this.repository.isEventProcessed(
          eventId,
          client,
        );
        if (isProcessed) {
          const existingRes = await this.repository.findReservation(
            orderId,
            productId,
            false,
            client,
          );
          return { success: true, reservation: existingRes || undefined };
        }
      }

      const res = await this.repository.findReservation(
        orderId,
        productId,
        true,
        client,
      );
      if (!res || res.status !== "RESERVED") {
        logger.warn("Reservation not found or not in RESERVED state", {
          orderId,
          productId,
          status: res?.status,
        });
        return { success: false };
      }

      // Deduct permanently from reserved quantity
      await this.repository.adjustQuantities(
        productId,
        0,
        -res.quantity,
        client,
      );
      const updated = await this.repository.updateReservationStatus(
        orderId,
        productId,
        "FULFILLED",
        client,
      );

      await this.repository.insertOutboxEvent(
        {
          eventId: crypto.randomUUID(),
          eventType: "inventory.fulfilled",
          aggregateId: orderId,
          aggregateType: "order",
          routingKey: "inventory.fulfilled",
          payload: {
            orderId,
            productId,
            quantity: res.quantity,
            timestamp: new Date().toISOString(),
          },
        },
        client,
      );

      if (eventId) {
        await this.repository.insertInboxEvent(
          eventId,
          "payment.completed",
          "payment.completed",
          client,
        );
      }

      return { success: true, reservation: updated || undefined };
    });
  }
}
