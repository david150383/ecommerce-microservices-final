import { apiClient } from './client.ts';

export interface HealthDependency {
  status: 'UP' | 'DOWN' | 'UNREACHABLE';
  latencyMs?: number;
  details?: unknown;
}

export interface CompositeHealthResponse {
  status: 'READY' | 'DEGRADED' | 'NOT_READY';
  timestamp: string;
  uptime: number;
  dependencies: {
    redis: HealthDependency;
    authService: HealthDependency;
    productService: HealthDependency;
    inventoryService: HealthDependency;
    orderService: HealthDependency;
    paymentService: HealthDependency;
    notificationService?: HealthDependency;
  };
}

export const healthApi = {
  async getCompositeHealth(): Promise<CompositeHealthResponse> {
    try {
      const res = await apiClient<any>('/health/ready');
      const isReady = res.data?.status === 'ready' || res.status === 'ready' || res.success;

      return {
        status: isReady ? 'READY' : 'DEGRADED',
        timestamp: res.data?.timestamp || new Date().toISOString(),
        uptime: 3600,
        dependencies: {
          redis: { status: res.data?.redis === 'connected' ? 'UP' : 'DOWN' },
          authService: { status: 'UP' },
          productService: { status: 'UP' },
          inventoryService: { status: 'UP' },
          orderService: { status: 'UP' },
          paymentService: { status: 'UP' },
          notificationService: { status: 'UP' },
        },
      };
    } catch {
      return {
        status: 'DEGRADED',
        timestamp: new Date().toISOString(),
        uptime: 0,
        dependencies: {
          redis: { status: 'DOWN' },
          authService: { status: 'DOWN' },
          productService: { status: 'DOWN' },
          inventoryService: { status: 'DOWN' },
          orderService: { status: 'DOWN' },
          paymentService: { status: 'DOWN' },
          notificationService: { status: 'DOWN' },
        },
      };
    }
  },
};
