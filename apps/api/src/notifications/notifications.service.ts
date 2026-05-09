import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { PushService } from './push.service';
import { Notification } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly pushService: PushService,
  ) {}

  async getNotifications(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        include: {
          message: true,
          route: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { updated: count };
  }

  async deleteOne(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.notification.delete({ where: { id } });
    return { deleted: 1 };
  }

  async deleteAll(userId: string) {
    const { count } = await this.prisma.notification.deleteMany({
      where: { userId },
    });
    return { deleted: count };
  }

  async createAndNotify(data: {
    userId: string;
    routeId: string;
    messageId: string;
    locationMatch: string;
    issueType?: string;
    severity?: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        routeId: data.routeId,
        messageId: data.messageId,
        locationMatch: data.locationMatch,
        issueType: data.issueType as any,
        severity: data.severity as any,
      },
      include: {
        message: true,
        route: true,
      },
    });

    this.gateway.sendToUser(data.userId, notification);

    const messageText = notification.message?.text ?? '';
    const pushBody = `Внимание на ${notification.locationMatch}. ${messageText}`.trim();

    this.pushService
      .sendPush(data.userId, {
        title: 'SignalBot',
        body: pushBody,
        data: { notificationId: notification.id },
      })
      .catch((err) =>
        this.logger.error(`Push send failed: ${err.message}`),
      );

    return notification;
  }

  @OnEvent('notification.created')
  async handleNotificationCreated(notification: Notification) {
    const full = await this.prisma.notification.findUnique({
      where: { id: notification.id },
      include: { message: true, route: true },
    });

    if (!full) {
      return;
    }

    this.gateway.sendToUser(full.userId, full);

    const messageText = full.message?.text ?? '';
    const pushBody = `Внимание на ${full.locationMatch}. ${messageText}`.trim();

    this.pushService
      .sendPush(full.userId, {
        title: 'SignalBot',
        body: pushBody,
        data: { notificationId: full.id },
      })
      .catch((err) =>
        this.logger.error(`Push send failed: ${err.message}`),
      );
  }
}
