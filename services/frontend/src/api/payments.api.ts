import { apiClient } from './client.ts';

export interface StripeConfig {
  provider: string;
  publishableKey: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  publishableKey: string;
  amountCents: number;
  currency: string;
  orderId?: string;
}

export interface PaymentDetails {
  id: string;
  order_id: string;
  orderId: string;
  customer_id: string;
  customerId: string;
  amount_cents: number;
  amountCents: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  provider: string;
  transaction_id: string | null;
  transactionId: string | null;
  failure_reason: string | null;
  failureReason: string | null;
  idempotency_key: string;
  idempotencyKey: string;
  created_at: string;
  createdAt: string;
  updated_at: string;
  updatedAt: string;
}

export function mapPayment(p: any): PaymentDetails {
  const orderId = p?.orderId || p?.order_id || '';
  const customerId = p?.customerId || p?.customer_id || '';
  const amount = Number(p?.amountCents ?? p?.amount_cents ?? 0);
  const transactionId = p?.transactionId ?? p?.transaction_id ?? null;
  const failureReason = p?.failureReason ?? p?.failure_reason ?? null;
  const idempotencyKey = p?.idempotencyKey || p?.idempotency_key || '';
  const created = p?.createdAt || p?.created_at || new Date().toISOString();
  const updated = p?.updatedAt || p?.updated_at || new Date().toISOString();

  return {
    id: p?.id || '',
    order_id: orderId,
    orderId,
    customer_id: customerId,
    customerId,
    amount_cents: amount,
    amountCents: amount,
    currency: p?.currency || 'USD',
    status: p?.status || 'PENDING',
    provider: p?.provider || 'MOCK_GATEWAY',
    transaction_id: transactionId,
    transactionId,
    failure_reason: failureReason,
    failureReason,
    idempotency_key: idempotencyKey,
    idempotencyKey,
    created_at: typeof created === 'string' ? created : new Date(created).toISOString(),
    createdAt: typeof created === 'string' ? created : new Date(created).toISOString(),
    updated_at: typeof updated === 'string' ? updated : new Date(updated).toISOString(),
    updatedAt: typeof updated === 'string' ? updated : new Date(updated).toISOString(),
  };
}

export const paymentsApi = {
  async getConfig(): Promise<{ data: StripeConfig }> {
    return {
      data: {
        provider: 'STRIPE',
        publishableKey: 'pk_test_mock',
      },
    };
  },

  async processPayment(params: {
    orderId: string;
    amountCents: number;
    currency?: string;
    paymentMethodId?: string;
    idempotencyKey?: string;
  }): Promise<{ data: PaymentDetails }> {
    const res = await apiClient<any>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        orderId: params.orderId,
        amountCents: params.amountCents,
        currency: params.currency || 'USD',
        paymentMethodId: params.paymentMethodId,
        idempotencyKey: params.idempotencyKey,
      }),
    });
    const rawPayment = res.data?.payment || res.data;
    return { data: mapPayment(rawPayment) };
  },

  async createPaymentIntent(
    amountCents: number,
    currency: string = 'USD',
    orderId?: string
  ): Promise<{ data: PaymentIntentResponse }> {
    if (orderId) {
      try {
        await this.processPayment({ orderId, amountCents, currency });
      } catch (err) {
        console.warn('Payment pre-authorization status:', err);
      }
    }

    return {
      data: {
        clientSecret: 'mock_client_secret_' + Math.random().toString(36).substring(2),
        publishableKey: 'pk_test_mock',
        amountCents,
        currency,
        orderId,
      },
    };
  },

  async getPaymentByOrderId(orderId: string): Promise<{ data: PaymentDetails }> {
    const res = await apiClient<any>(`/payments/order/${orderId}`);
    const rawPayment = res.data?.payment || res.data;
    return { data: mapPayment(rawPayment) };
  },

  async refundPayment(paymentId: string, amountCents?: number, reason?: string): Promise<{ data: PaymentDetails }> {
    const res = await apiClient<any>(`/payments/${paymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amountCents, reason }),
    });
    const rawPayment = res.data?.payment || res.data;
    return { data: mapPayment(rawPayment) };
  },
};
