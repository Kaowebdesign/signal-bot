import client from './client';
import type { Notification, PaginatedResponse } from '../types';

export async function getNotifications(
  page = 1,
  limit = 20,
): Promise<PaginatedResponse<Notification>> {
  const { data } = await client.get<PaginatedResponse<Notification>>(
    '/api/notifications',
    { params: { page, limit } },
  );
  return data;
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await client.get<{ count: number }>(
    '/api/notifications/unread-count',
  );
  return data.count;
}

export async function markAsRead(id: string): Promise<void> {
  await client.patch(`/api/notifications/${id}/read`);
}

export async function markAllAsRead(): Promise<void> {
  await client.patch('/api/notifications/read-all');
}

export async function deleteNotification(id: string): Promise<void> {
  await client.delete(`/api/notifications/${id}`);
}

export async function deleteAllNotifications(): Promise<void> {
  await client.delete('/api/notifications/all');
}

export async function subscribePush(subscription: PushSubscription): Promise<void> {
  await client.post('/api/notifications/push-subscribe', subscription.toJSON());
}
