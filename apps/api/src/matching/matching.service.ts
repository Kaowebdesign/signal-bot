import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AnalyzedMessage } from '../analysis/analysis.service';

interface IndexEntry {
  routeId: string;
  userId: string;
}

@Injectable()
export class MatchingService implements OnModuleInit {
  private readonly logger = new Logger(MatchingService.name);
  private locationIndex = new Map<string, IndexEntry[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    await this.rebuildIndex();
  }

  private normalizeLocationName(name: string): string {
    return name
      .toLowerCase()
      .replace(/ї/g, 'и')
      .replace(/і/g, 'и')
      .replace(/є/g, 'е')
      .replace(/ґ/g, 'г')
      .replace(/'/g, '')
      .replace(/'/g, '')
      .trim();
  }

  async rebuildIndex() {
    const routeLocations = await this.prisma.routeLocation.findMany({
      where: {
        route: {
          isActive: true,
        },
      },
      select: {
        nameNorm: true,
        routeId: true,
        route: {
          select: {
            userId: true,
          },
        },
      },
    });

    const newIndex = new Map<string, IndexEntry[]>();

    for (const rl of routeLocations) {
      const key = this.normalizeLocationName(rl.nameNorm);
      const entry: IndexEntry = {
        routeId: rl.routeId,
        userId: rl.route.userId,
      };

      const existing = newIndex.get(key);
      if (existing) {
        existing.push(entry);
      } else {
        newIndex.set(key, [entry]);
      }
    }

    this.locationIndex = newIndex;
    this.logger.log(
      `Location index rebuilt: ${this.locationIndex.size} unique locations from ${routeLocations.length} route-locations`,
    );
  }

  private getStem(keyword: string): string {
    // Strip last 1-2 chars to handle Ukrainian/Russian declensions
    // "тополь" → "топол", "оболонь" → "оболон", "київ" → "київ"
    if (keyword.length <= 4) return keyword;
    if (keyword.length <= 6) return keyword.slice(0, -1);
    return keyword.slice(0, -2);
  }

  @OnEvent('routes.changed')
  async onRoutesChanged() {
    await this.rebuildIndex();
  }

  @OnEvent('message.analyzed')
  async matchMessage(message: AnalyzedMessage) {
    const { id: messageId, issueType, severity, isClear, text } = message;

    const normalizedText = this.normalizeLocationName(text);
    const matched = new Set<string>();

    const indexKeys = Array.from(this.locationIndex.keys());
    this.logger.debug(
      `Matching "${text.slice(0, 60)}" against ${indexKeys.length} keywords: [${indexKeys.join(', ')}]`,
    );

    for (const [indexKey, entries] of this.locationIndex.entries()) {
      if (indexKey.length < 3) {
        continue;
      }

      const stem = this.getStem(indexKey);
      if (!normalizedText.includes(stem)) {
        continue;
      }

      for (const entry of entries) {
        const dedupKey = `${entry.userId}:${entry.routeId}:${messageId}:${indexKey}`;

        if (matched.has(dedupKey)) {
          continue;
        }
        matched.add(dedupKey);

        try {
          // Skip clear-status notifications if user has disabled them
          if (isClear) {
            const user = await this.prisma.user.findUnique({
              where: { id: entry.userId },
              select: { showClearAlerts: true },
            });
            if (!user?.showClearAlerts) {
              this.logger.debug(
                `Skipping clear notification for user=${entry.userId} (showClearAlerts=false)`,
              );
              continue;
            }
          }

          const notification = await this.prisma.notification.create({
            data: {
              userId: entry.userId,
              routeId: entry.routeId,
              messageId,
              locationMatch: indexKey,
              issueType,
              severity,
              isClear,
            },
          });

          this.eventEmitter.emit('notification.created', notification);

          this.logger.log(
            `Notification created: user=${entry.userId}, route=${entry.routeId}, location=${indexKey}, isClear=${isClear}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to create notification for user=${entry.userId}, route=${entry.routeId}`,
            error,
          );
        }
      }
    }
  }
}
