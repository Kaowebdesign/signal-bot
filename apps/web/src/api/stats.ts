import client from './client';
import type { DailyStat } from '../types';

export interface RouteStat {
  id: string;
  name: string;
  total: number;
  last7d: number;
  last30d: number;
  lastAt: string | null;
}

export interface LocationStat {
  location: string;
  count: number;
}

export interface DayStat {
  date: string;
  count: number;
}

export interface HourStat {
  hour: number;
  count: number;
}

export interface StatsResponse {
  total: number;
  routeStats: RouteStat[];
  locationStats: LocationStat[];
  dailyTimeline: DayStat[];
  hourlyDistribution: HourStat[];
}

export interface DeleteStatsResult {
  deletedNotifications: number;
  deletedSnapshots: number;
}

export function getStats(): Promise<StatsResponse> {
  return client.get('/api/stats').then((r) => r.data);
}

export function getStatsHistory(): Promise<DailyStat[]> {
  return client.get('/api/stats/history').then((r) => r.data);
}

export function deleteStats(from?: string, to?: string): Promise<DeleteStatsResult> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return client.delete('/api/stats', { params }).then((r) => r.data);
}
