import client from './client';
import type { TelegramChannel } from '../types';

export async function getChannels(): Promise<TelegramChannel[]> {
  const { data } = await client.get<TelegramChannel[]>('/api/channels');
  return data;
}

export async function createChannel(
  dto: Pick<TelegramChannel, 'channelUsername' | 'name'>,
): Promise<TelegramChannel> {
  const { data } = await client.post<TelegramChannel>('/api/channels', dto);
  return data;
}

export async function updateChannel(
  id: string,
  dto: Partial<Pick<TelegramChannel, 'channelUsername' | 'name' | 'isActive'>>,
): Promise<TelegramChannel> {
  const { data } = await client.patch<TelegramChannel>(
    `/api/channels/${id}`,
    dto,
  );
  return data;
}

export async function deleteChannel(id: string): Promise<void> {
  await client.delete(`/api/channels/${id}`);
}
