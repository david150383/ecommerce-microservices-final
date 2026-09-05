import crypto from "crypto";
import { PaymentRepository } from "../repositories/payment.repository.js";
import {
  Payment,
  PaginatedPayments,
  ListPaymentFilter,
} from "../types/payment.types.js";
import {
  ProcessPaymentInput,
  RefundPaymentInput,
} from "../schemas/payment.schema.js";
import { getPaymentProvider } from "../../../providers/provider.factory.js";
import { withTransaction } from "../../../db.js";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../../../shared/errors/app.error.js";
import { logger } from "../../../logger/logger.js";

export class PaymentService {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  /**
   * Process payment for an order idempotently:
   * 1. Checks existing idempotency key or completed payment for order
   * 2. Executes transaction via provider (Stripe or Mock)
   * 3. Atomically records payment record & transactional outbox event
   */
  async processPayment(
    customerId: string,
    input: ProcessPaymentInput,
    headerIdempotencyKey?: string,
  ): Promise<{ payment: Payment; isDuplicate: boolean }> {
    const idempotencyKey =
      input.idempotencyKey ||
      headerIdempotencyKey ||
      crypto.randomUUID();

    // 1. Check idempotency key first
    const existingByIdempotency =
      await this.paymentRepository.findByIdempotencyKey(idempotencyKey);
    if (existingByIdempotency) {
      logger.info(`Idempotent payment hit for key ${idempotencyKey}`);
      return { payment: existingByIdempotency, isDuplicate: true };
    }

    // 2. Check if payment already exists for this order
    const existingByOrder = await this.paymentRepository.findByOrderId(
      input.orderId,
    );
    if (existingByOrder && existingByOrder.status === "COMPLETED") {
      logger.info(`Order ${input.orderId} already completed payment`);
      return { payment: existingByOrder, isDuplicate: true };
    }

    const provider = getPaymentProvider(input.provider);

    // 3. Process with payment provider
    const providerResult = await provider.processPayment({
      orderId: input.orderId,
      customerId,
      amountCents: input.amountCents,
      currency: input.currency,
      idempotencyKey,
      paymentMethodId: input.paymentMethodId,
    });

    const isSuccess = providerResult.success;
    const finalStatus = isSuccess ? "COMPLETED" : "FAILED";

    // 4. Atomically persist payment and outbox event
    return withTransaction(async (client) => {
      let payment: Payment;

      if (existingByOrder) {
        // If an existing pending/failed payment existed for the order, update it
        const updated = await this.paymentRepository.updateStatus(
          existingByOrder.id,
          finalStatus,
          {
            transactionId: providerResult.transactionId,
            failureReason: providerResult.failureReason,
          },
          client,
        );
        payment = updated || existingByOrder;
      } else {
        payment = await this.paymentRepository.create(
          {
            orderId: input.orderId,
            customerId,
            amountCents: input.amountCents,
            currency: input.currency,
            status: finalStatus,
            provider: provider.name,
            transactionId: providerResult.transactionId,
            failureReason: providerResult.failureReason,
            idempotencyKey,
          },
          client,
        );
      }

      const eventId = crypto.randomUUID();

      if (isSuccess) {
        await this.paymentRepository.insertOutboxEvent(
          {
            eventId,
            eventType: "payment.completed",
            aggregateId: payment.id,
            aggregateType: "payment",
            routingKey: "payment.completed",
            payload: {
              eventId,
              paymentId: payment.id,
              orderId: payment.orderId,
              customerId: payment.customerId,
              amountCents: payment.amountCents,
              currency: payment.currency,
              transactionId: payment.transactionId,
              provider: payment.provider,
              timestamp: new Date().toISOString(),
            },
          },
          client,
        );
        logger.info(`Payment completed for order ${payment.orderId}`, {
          paymentId: payment.id,
          transactionId: payment.transactionId,
        });
      } else {
        await this.paymentRepository.insertOutboxEvent(
          {
            eventId,
            eventType: "payment.failed",
            aggregateId: payment.id,
            aggregateType: "payment",
            routingKey: "payment.failed",
            payload: {
              eventId,
              paymentId: payment.id,
              orderId: payment.orderId,
              customerId: payment.customerId,
              amountCents: payment.amountCents,
              reason: payment.failureReason || "Payment failed",
              provider: payment.provider,
              timestamp: new Date().toISOString(),
            },
          },
          client,
        );
        logger.warn(`Payment failed for order ${payment.orderId}`, {
          paymentId: payment.id,
          reason: payment.failureReason,
        });
      }

      return { payment, isDuplicate: false };
    });
  }

  /**
   * Refund a completed payment
   */
  async refundPayment(
    paymentId: string,
    input: RefundPaymentInput,
    customerId?: string,
    isAdmin = false,
  ): Promise<Payment> {
    return withTransaction(async (client) => {
      const payment = await this.paymentRepository.findById(
        paymentId,
        true,
        client,
      );
      if (!payment) {
        throw new NotFoundError("Payment", paymentId);
      }

      if (!isAdmin && customerId && payment.customerId !== customerId) {
        throw new ForbiddenError(
          "You do not have permission to refund this payment.",
        );
      }

      if (payment.status !== "COMPLETED") {
        throw new BadRequestError(
          `Cannot refund payment in status '${payment.status}'. Only COMPLETED payments can be refunded.`,
        );
      }

      if (!payment.transactionId) {
        throw new BadRequestError(
          "Missing transaction identifier for provider refund.",
        );
      }

      const provider = getPaymentProvider(payment.provider);
      const refundResult = await provider.refundPayment({
        transactionId: payment.transactionId,
        amountCents: input.amountCents,
        reason: input.reason,
      });

      if (!refundResult.success) {
        throw new BadRequestError(
          `Provider refund failed: ${refundResult.failureReason || "unknown error"}`,
        );
      }

      const updated = await this.paymentRepository.updateStatus(
        payment.id,
        "REFUNDED",
        { failureReason: null },
        client,
      );

      const eventId = crypto.randomUUID();
      await this.paymentRepository.insertOutboxEvent(
        {
          eventId,
          eventType: "payment.refunded",
          aggregateId: payment.id,
          aggregateType: "payment",
          routingKey: "payment.refunded",
          payload: {
            eventId,
            paymentId: payment.id,
            orderId: payment.orderId,
            customerId: payment.customerId,
            refundId: refundResult.refundId,
            amountCents: input.amountCents || payment.amountCents,
            timestamp: new Date().toISOString(),
          },
        },
        client,
      );

      logger.info(`Payment refunded: ${payment.id}`, {
        orderId: payment.orderId,
        refundId: refundResult.refundId,
      });

      return updated || payment;
    });
  }

  async getPayment(
    id: string,
    customerId: string,
    isAdmin = false,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findById(id);
    if (!payment) {
      throw new NotFoundError("Payment", id);
    }

    if (!isAdmin && payment.customerId !== customerId) {
      throw new ForbiddenError("You do not have access to this payment record.");
    }

    return payment;
  }

  async getPaymentByOrderId(
    orderId: string,
    customerId: string,
    isAdmin = false,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findByOrderId(orderId);
    if (!payment) {
      throw new NotFoundError("Payment for order", orderId);
    }

    if (!isAdmin && payment.customerId !== customerId) {
      throw new ForbiddenError("You do not have access to this payment record.");
    }

    return payment;
  }

  async listPayments(
    filter: ListPaymentFilter,
    customerId: string,
    isAdmin = false,
  ): Promise<PaginatedPayments> {
    const effectiveFilter: ListPaymentFilter = { ...filter };
    if (!isAdmin) {
      effectiveFilter.customerId = customerId;
    }

    return this.paymentRepository.list(effectiveFilter);
  }

  /**
   * Saga: Order cancelled compensation
   * If payment was completed, trigger refund. If pending, mark failed.
   */
  async handleOrderCancelled(
    orderId: string,
    reason: string,
    eventId: string,
  ): Promise<void> {
    await withTransaction(async (client) => {
      const processed = await this.paymentRepository.isEventProcessed(
        eventId,
        client,
      );
      if (processed) {
        logger.debug(`Event ${eventId} already processed, skipping`);
        return;
      }

      const payment = await this.paymentRepository.findByOrderId(
        orderId,
        true,
        client,
      );

      if (!payment) {
        logger.info(`No payment found for cancelled order ${orderId}`);
        await this.paymentRepository.insertInboxEvent(
          eventId,
          "order.cancelled",
          "order.cancelled",
          client,
        );
        return;
      }

      if (payment.status === "COMPLETED" && payment.transactionId) {
        const provider = getPaymentProvider(payment.provider);
        const refundResult = await provider.refundPayment({
          transactionId: payment.transactionId,
          reason: `Order cancelled: ${reason}`,
        });

        if (refundResult.success) {
          await this.paymentRepository.updateStatus(
            payment.id,
            "REFUNDED",
            {},
            client,
          );

          const outboxEventId = crypto.randomUUID();
          await this.paymentRepository.insertOutboxEvent(
            {
              eventId: outboxEventId,
              eventType: "payment.refunded",
              aggregateId: payment.id,
              aggregateType: "payment",
              routingKey: "payment.refunded",
              payload: {
                eventId: outboxEventId,
                paymentId: payment.id,
                orderId: payment.orderId,
                refundId: refundResult.refundId,
                reason,
                timestamp: new Date().toISOString(),
              },
            },
            client,
          );
          logger.info(`Auto-refunded payment for cancelled order ${orderId}`);
        }
      } else if (payment.status === "PENDING") {
        await this.paymentRepository.updateStatus(
          payment.id,
          "FAILED",
          { failureReason: `Order cancelled: ${reason}` },
          client,
        );
      }

      await this.paymentRepository.insertInboxEvent(
        eventId,
        "order.cancelled",
        "order.cancelled",
        client,
      );
    });
  }
}
