import { config } from "../config.js";
import { PaymentProvider } from "./payment.provider.interface.js";
import { StripePaymentProvider } from "./stripe.provider.js";
import { MockPaymentProvider } from "./mock.provider.js";
import { logger } from "../logger/logger.js";

export function getPaymentProvider(providerOverride?: string): PaymentProvider {
  const chosenProvider = providerOverride || config.payment.provider;

  if (chosenProvider === "STRIPE" && config.payment.stripeSecretKey) {
    logger.info("Using Stripe Payment Provider");
    return new StripePaymentProvider(config.payment.stripeSecretKey);
  }

  logger.info("Using Mock Payment Provider (MOCK_GATEWAY)");
  return new MockPaymentProvider();
}
