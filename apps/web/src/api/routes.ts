import client from './client';
import type { Route, CreateRouteDto } from '../types';

export async function getRoutes(): Promise<Route[]> {
  const { data } = await client.get<Route[]>('/api/routes');
  return data;
}

export async function getRoute(id: string): Promise<Route> {
  const { data } = await client.get<Route>(`/api/routes/${id}`);
  return data;
}

export async function createRoute(dto: CreateRouteDto): Promise<Route> {
  const { data } = await client.post<Route>('/api/routes', dto);
  return data;
}

export async function updateRoute(
  id: string,
  dto: Partial<CreateRouteDto> & { isActive?: boolean; trackStats?: boolean },
): Promise<Route> {
  const { data } = await client.patch<Route>(`/api/routes/${id}`, dto);
  return data;
}

export async function deleteRoute(id: string): Promise<void> {
  await client.delete(`/api/routes/${id}`);
}
