import { apiClient } from './client.ts';

export interface NotificationRecord {
  id: string;
  recipient: string;
  channel: 'EMAIL' | 'SMS' | 'WEBHOOK';
  template_type: string;
  subject: string;
  status: 'DELIVERED' | 'FAILED';
  metadata: Record<string, unknown>;
  created_at: string;
}

export const notificationsApi = {
  async getNotifications(): Promise<{ data: NotificationRecord[] }> {
    return apiClient<{ data: NotificationRecord[] }>('/api/v1/notifications');
  },
};
