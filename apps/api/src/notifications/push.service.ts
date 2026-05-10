import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BotService } from '../bot/bot.service';
import { Prisma } from '@prisma/client';
import * as webPush from 'web-push';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private readonly expo = new Expo();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly bot: BotService,
  ) {}

  onModuleInit() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT');

    if (publicKey && privateKey && subject) {
      webPush.setVapidDetails(subject, publicKey, privateKey);
      this.logger.log('VAPID details configured');
    } else {
      this.logger.warn(
        'VAPID keys not configured — push notifications disabled',
      );
    }
  }

  async sendPush(userId: string, payload: Record<string, unknown>) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushSubscription: true, expoPushToken: true, telegramChatId: true },
    });

    if (!user) return;

    // Web push (browser)
    if (user.pushSubscription) {
      const subscription = user.pushSubscription as unknown as webPush.PushSubscription;
      try {
        await webPush.sendNotification(subscription, JSON.stringify(payload));
        this.logger.debug(`Web push sent to user ${userId}`);
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          this.logger.warn(`Web push subscription expired for user ${userId}, removing`);
          await this.prisma.user.update({
            where: { id: userId },
            data: { pushSubscription: Prisma.JsonNull },
          });
        } else {
          this.logger.error(`Web push failed for user ${userId}: ${error.message}`);
        }
      }
    }

    // Telegram bot
    if (user.telegramChatId) {
      const title = payload.title as string | undefined;
      const body = payload.body as string | undefined;
      const text = [title ? `<b>${title}</b>` : '', body ?? ''].filter(Boolean).join('\n');
      await this.bot.sendMessage(user.telegramChatId, text);
      this.logger.debug(`Telegram message sent to user ${userId}`);
    }

    // Expo push (mobile / Apple Watch)
    if (user.expoPushToken && Expo.isExpoPushToken(user.expoPushToken)) {
      try {
        const messages: ExpoPushMessage[] = [{
          to: user.expoPushToken,
          title: payload.title as string,
          body: payload.body as string,
          data: (payload.data ?? {}) as Record<string, unknown>,
          sound: 'default',
        }];
        const tickets = await this.expo.sendPushNotificationsAsync(messages);
        this.logger.debug(`Expo push sent to user ${userId}: ${JSON.stringify(tickets)}`);
      } catch (error: any) {
        this.logger.error(`Expo push failed for user ${userId}: ${error.message}`);
      }
    }
  }
}
