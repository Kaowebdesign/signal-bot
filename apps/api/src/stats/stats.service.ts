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

  private kyivDateStr(daysBack = 0): string {
    const ms = Date.now() - daysBack * 24 * 60 * 60 * 1000;
    const kyiv = new Date(ms + 3 * 60 * 60 * 1000);
    return kyiv.toISOString().slice(0, 10);
  }

  async getStats(userId: string) {
    // Run live queries in parallel with backfill
    const [routeStats, locationStats, hourlyDistribution, total] = await Promise.all([
      this.getRouteStats(userId),
      this.getLocationStats(userId),
      this.getHourlyDistribution(userId),
      this.prisma.notification.count({ where: { userId, isClear: false } }),
    ]);

    // Ensure DailyStat is populated for last 30 days before reading timeline.
    // Past days: created only once (never overwritten after saved).
    // Today: always updated with live data.
    await this.backfillSnapshots(userId);

    // Read timeline from DailyStat — not affected by notification deletions
    const dailyTimeline = await this.getDailyTimeline(userId);

    return { total, routeStats, locationStats, dailyTimeline, hourlyDistribution };
  }

  async getHistory(userId: string) {
    return this.prisma.dailyStat.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 90,
    });
  }

  async deleteStats(userId: string, from?: string, to?: string) {
    const notifWhere: Record<string, unknown> = { userId };
    const snapWhere: Record<string, unknown> = { userId };

    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) createdAt.gte = new Date(`${from}T00:00:00.000+03:00`);
      if (to) createdAt.lte = new Date(`${to}T23:59:59.999+03:00`);
      notifWhere.createdAt = createdAt;

      const dateFilter: Record<string, string> = {};
      if (from) dateFilter.gte = from;
      if (to) dateFilter.lte = to;
      snapWhere.date = dateFilter;
    }

    const [notifications, snapshots] = await Promise.all([
      this.prisma.notification.deleteMany({ where: notifWhere }),
      this.prisma.dailyStat.deleteMany({ where: snapWhere }),
    ]);

    return { deletedNotifications: notifications.count, deletedSnapshots: snapshots.count };
  }

  // Ensure snapshots exist for all 30 days.
  // Past days are created once and never overwritten.
  // Today is always refreshed.
  private async backfillSnapshots(userId: string): Promise<void> {
    const today = this.kyivDateStr(0);
    const pastDates = Array.from({ length: 29 }, (_, i) => this.kyivDateStr(i + 1));

    // Find which past dates already have a snapshot
    const existing = await this.prisma.dailyStat.findMany({
      where: { userId, date: { in: pastDates } },
      select: { date: true },
    });
    const existingSet = new Set(existing.map((s) => s.date));

    const missingPast = pastDates.filter((d) => !existingSet.has(d));

    await Promise.all([
      // Create missing past snapshots (fire once, never overwrite)
      ...missingPast.map((d) => this.upsertSnapshot(userId, d)),
      // Today is always refreshed
      this.upsertSnapshot(userId, today),
    ]);
  }

  private async upsertSnapshot(userId: string, date: string): Promise<void> {
    const [countRows, routeRows, locRows] = await Promise.all([
      this.prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(n.id)::integer AS count
        FROM "Notification" n
        JOIN "Route" r ON r.id = n."routeId"
        WHERE r."userId" = ${userId}
          AND n."isClear" = false
          AND r."trackStats" = true
          AND TO_CHAR(n."createdAt" + INTERVAL '3 hours', 'YYYY-MM-DD') = ${date}
      `,
      this.prisma.$queryRaw<{ name: string }[]>`
        SELECT r.name, COUNT(n.id)::integer AS cnt
        FROM "Notification" n
        JOIN "Route" r ON r.id = n."routeId"
        WHERE r."userId" = ${userId}
          AND n."isClear" = false
          AND r."trackStats" = true
          AND TO_CHAR(n."createdAt" + INTERVAL '3 hours', 'YYYY-MM-DD') = ${date}
        GROUP BY r.name
        ORDER BY cnt DESC
        LIMIT 1
      `,
      this.prisma.$queryRaw<{ location: string }[]>`
        SELECT n."locationMatch" AS location, COUNT(n.id)::integer AS cnt
        FROM "Notification" n
        JOIN "Route" r ON r.id = n."routeId"
        WHERE r."userId" = ${userId}
          AND n."isClear" = false
          AND r."trackStats" = true
          AND TO_CHAR(n."createdAt" + INTERVAL '3 hours', 'YYYY-MM-DD') = ${date}
        GROUP BY n."locationMatch"
        ORDER BY cnt DESC
        LIMIT 1
      `,
    ]);

    const data = {
      totalCount: Number(countRows[0]?.count ?? 0),
      topRouteName: routeRows[0]?.name ?? null,
      topLocation: locRows[0]?.location ?? null,
    };

    await this.prisma.dailyStat.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, ...data },
      update: data,
    });
  }

  // Reads from DailyStat — immune to notification deletions
  private async getDailyTimeline(userId: string): Promise<DayRow[]> {
    const oldest = this.kyivDateStr(29);
    const rows = await this.prisma.dailyStat.findMany({
      where: { userId, date: { gte: oldest } },
      select: { date: true, totalCount: true },
      orderBy: { date: 'asc' },
    });
    return rows.map((r) => ({ date: r.date, count: r.totalCount }));
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
        AND r."trackStats" = true
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
        AND r."trackStats" = true
      GROUP BY n."locationMatch"
      ORDER BY count DESC
      LIMIT 20
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
        AND r."trackStats" = true
      GROUP BY hour
      ORDER BY hour ASC
    `;
    return rows.map((r) => ({ ...r, hour: Number(r.hour), count: Number(r.count) }));
  }
}
