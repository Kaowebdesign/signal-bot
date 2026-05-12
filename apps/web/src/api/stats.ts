import client from './client';

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

export function getStats(): Promise<StatsResponse> {
  return client.get('/api/stats').then((r) => r.data);
}
