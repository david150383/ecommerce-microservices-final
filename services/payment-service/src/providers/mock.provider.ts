import crypto from "crypto";
import {
  PaymentProvider,
  ProcessPaymentParams,
  ProcessPaymentResult,
  RefundPaymentParams,
  RefundPaymentResult,
} from "./payment.provider.interface.js";
import { logger } from "../logger/logger.js";

export class MockPaymentProvider implements PaymentProvider {
  public readonly name = "MOCK_GATEWAY";

  async processPayment(
    params: ProcessPaymentParams,
  ): Promise<ProcessPaymentResult> {
    logger.info("Processing payment with MOCK_GATEWAY", {
      orderId: params.orderId,
      amountCents: params.amountCents,
      currency: params.currency,
    });

    // Simulate test failure scenarios
    if (
      params.paymentMethodId === "pm_card_chargeDeclined" ||
      params.paymentMethodId === "fail" ||
      params.amountCents === 99999
    ) {
      return {
        success: false,
        transactionId: `txn_mock_declined_${crypto.randomUUID().slice(0, 8)}`,
        failureReason: "Card was declined by issuing bank (insufficient funds)",
      };
    }

    const transactionId = `txn_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    return {
      success: true,
      transactionId,
      rawResponse: {
        provider: "MOCK_GATEWAY",
        processedAt: new Date().toISOString(),
        orderId: params.orderId,
      },
    };
  }

  async refundPayment(
    params: RefundPaymentParams,
  ): Promise<RefundPaymentResult> {
    logger.info("Processing refund with MOCK_GATEWAY", {
      transactionId: params.transactionId,
      amountCents: params.amountCents,
    });

    const refundId = `ref_mock_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    return {
      success: true,
      refundId,
    };
  }
}
