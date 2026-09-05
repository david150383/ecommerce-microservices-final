import Stripe from "stripe";
import {
  PaymentProvider,
  ProcessPaymentParams,
  ProcessPaymentResult,
  RefundPaymentParams,
  RefundPaymentResult,
} from "./payment.provider.interface.js";
import { logger } from "../logger/logger.js";

export class StripePaymentProvider implements PaymentProvider {
  public readonly name = "STRIPE";
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: "2024-06-20",
    });
  }

  async processPayment(
    params: ProcessPaymentParams,
  ): Promise<ProcessPaymentResult> {
    try {
      logger.info("Initiating Stripe payment", {
        orderId: params.orderId,
        amountCents: params.amountCents,
        currency: params.currency,
      });

      // Confirm payment intent with payment method (defaulting to Stripe test card if omitted)
      const paymentIntent = await this.stripe.paymentIntents.create(
        {
          amount: params.amountCents,
          currency: params.currency.toLowerCase(),
          payment_method: params.paymentMethodId || "pm_card_visa",
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: "never",
          },
          metadata: {
            orderId: params.orderId,
            customerId: params.customerId,
          },
        },
        {
          idempotencyKey: params.idempotencyKey,
        },
      );

      if (paymentIntent.status === "succeeded") {
        return {
          success: true,
          transactionId: paymentIntent.id,
          rawResponse: paymentIntent as unknown as Record<string, unknown>,
        };
      }

      return {
        success: false,
        transactionId: paymentIntent.id,
        failureReason: `Stripe payment requires further action or is in status: ${paymentIntent.status}`,
      };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown Stripe payment error";

      logger.error("Stripe payment processing failed", err, {
        orderId: params.orderId,
      });

      const stripeErr = err as { payment_intent?: { id: string } };
      return {
        success: false,
        transactionId: stripeErr.payment_intent?.id || "failed",
        failureReason: errorMessage,
      };
    }
  }

  async refundPayment(
    params: RefundPaymentParams,
  ): Promise<RefundPaymentResult> {
    try {
      logger.info("Initiating Stripe refund", {
        transactionId: params.transactionId,
        amountCents: params.amountCents,
      });

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: params.transactionId,
      };

      if (params.amountCents !== undefined) {
        refundParams.amount = params.amountCents;
      }

      const refund = await this.stripe.refunds.create(refundParams);

      return {
        success: refund.status === "succeeded" || refund.status === "pending",
        refundId: refund.id,
      };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown Stripe refund error";

      logger.error("Stripe refund failed", err, {
        transactionId: params.transactionId,
      });

      return {
        success: false,
        refundId: "failed",
        failureReason: errorMessage,
      };
    }
  }
}
