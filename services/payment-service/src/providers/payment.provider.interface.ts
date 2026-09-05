export interface ProcessPaymentParams {
  orderId: string;
  customerId: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  paymentMethodId?: string | undefined;
}

export interface ProcessPaymentResult {
  success: boolean;
  transactionId: string;
  failureReason?: string | undefined;
  rawResponse?: Record<string, unknown> | undefined;
}

export interface RefundPaymentParams {
  transactionId: string;
  amountCents?: number | undefined;
  reason?: string | undefined;
}

export interface RefundPaymentResult {
  success: boolean;
  refundId: string;
  failureReason?: string | undefined;
}

export interface PaymentProvider {
  readonly name: string;
  processPayment(params: ProcessPaymentParams): Promise<ProcessPaymentResult>;
  refundPayment(params: RefundPaymentParams): Promise<RefundPaymentResult>;
}
