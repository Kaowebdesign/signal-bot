import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RouteStatRow {
  id: string;
  name: string;
  total: number;
  last7d: number;
  last30d: number;
  lastAt: Date | null;
}

export interface LocationStatRow {
  location: string;
  count: number;
}

export interface DayRow {
  date: string;
  count: number;
}

export interface HourRow {
  hour: number;
  count: number;
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string) {
    const [routeStats, locationStats, dailyTimeline, hourlyDistribution, total] =
      await Promise.all([
        this.getRouteStats(userId),
        this.getLocationStats(userId),
        this.getDailyTimeline(userId),
        this.getHourlyDistribution(userId),
        this.prisma.notification.count({ where: { userId, isClear: false } }),
      ]);

    return {
      total,
      routeStats,
      locationStats,
      dailyTimeline,
      hourlyDistribution,
    };
  }

  private async getRouteStats(userId: string): Promise<RouteStatRow[]> {
    const rows = await this.prisma.$queryRaw<RouteStatRow[]>`
      SELECT
        r.id,
        r.name,
        COUNT(n.id)::integer          AS total,
        COUNT(CASE WHEN n."createdAt" >= NOW() - INTERVAL '7 days'  THEN 1 END)::integer AS last7d,
        COUNT(CASE WHEN n."createdAt" >= NOW() - INTERVAL '30 days' THEN 1 END)::integer AS last30d,
        MAX(n."createdAt")            AS "lastAt"
      FROM "Route" r
      LEFT JOIN "Notification" n ON n."routeId" = r.id AND n."isClear" = false
      WHERE r."userId" = ${userId}
      GROUP BY r.id, r.name
      ORDER BY total DESC
    `;
    return rows.map((r) => ({
      ...r,
      total: Number(r.total),
      last7d: Number(r.last7d),
      last30d: Number(r.last30d),
    }));
  }

  private async getLocationStats(userId: string): Promise<LocationStatRow[]> {
    const rows = await this.prisma.$queryRaw<LocationStatRow[]>`
      SELECT
        n."locationMatch" AS location,
        COUNT(n.id)::integer AS count
      FROM "Notification" n
      JOIN "Route" r ON r.id = n."routeId"
      WHERE r."userId" = ${userId}
        AND n."isClear" = false
      GROUP BY n."locationMatch"
      ORDER BY count DESC
      LIMIT 20
    `;
    return rows.map((r) => ({ ...r, count: Number(r.count) }));
  }

  private async getDailyTimeline(userId: string): Promise<DayRow[]> {
    const rows = await this.prisma.$queryRaw<DayRow[]>`
      SELECT
        TO_CHAR(
          n."createdAt" + INTERVAL '3 hours',
          'YYYY-MM-DD'
        ) AS date,
        COUNT(n.id)::integer AS count
      FROM "Notification" n
      JOIN "Route" r ON r.id = n."routeId"
      WHERE r."userId" = ${userId}
        AND n."isClear" = false
        AND n."createdAt" >= NOW() - INTERVAL '30 days'
      GROUP BY date
      ORDER BY date ASC
    `;
    return rows.map((r) => ({ ...r, count: Number(r.count) }));
  }

  private async getHourlyDistribution(userId: string): Promise<HourRow[]> {
    const rows = await this.prisma.$queryRaw<HourRow[]>`
      SELECT
        EXTRACT(HOUR FROM n."createdAt" + INTERVAL '3 hours')::integer AS hour,
        COUNT(n.id)::integer AS count
      FROM "Notification" n
      JOIN "Route" r ON r.id = n."routeId"
      WHERE r."userId" = ${userId}
        AND n."isClear" = false
      GROUP BY hour
      ORDER BY hour ASC
    `;
    return rows.map((r) => ({ ...r, hour: Number(r.hour), count: Number(r.count) }));
  }
}
