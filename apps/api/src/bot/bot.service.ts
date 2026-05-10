import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Telegraf } from 'telegraf';
import { randomBytes } from 'crypto';

@Injectable()
export class BotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private bot: Telegraf | null = null;
  // token → userId, expires at
  private readonly linkTokens = new Map<string, { userId: string; expiresAt: number }>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — bot disabled');
      return;
    }

    this.bot = new Telegraf(token);

    this.bot.start(async (ctx) => {
      const linkToken = ctx.startPayload;

      if (!linkToken) {
        return ctx.reply('👋 Привіт! Щоб отримувати сповіщення, відкрий налаштування у веб-додатку та натисни "Підключити Telegram".');
      }

      const entry = this.linkTokens.get(linkToken);
      if (!entry || Date.now() > entry.expiresAt) {
        this.linkTokens.delete(linkToken);
        return ctx.reply('❌ Посилання застаріло. Згенеруй нове в налаштуваннях додатку.');
      }

      await this.prisma.user.update({
        where: { id: entry.userId },
        data: { telegramChatId: ctx.chat.id.toString() },
      });

      this.linkTokens.delete(linkToken);

      this.logger.log(`User ${entry.userId} linked Telegram chat ${ctx.chat.id}`);
      await ctx.reply('✅ Telegram успішно підключено! Тепер сповіщення будуть надходити сюди.');
    });

    this.bot.launch().catch((err) => {
      this.logger.error('Bot launch failed', err);
    });

    this.logger.log('Telegram bot started');
  }

  async onModuleDestroy() {
    this.bot?.stop('SIGTERM');
  }

  generateLinkToken(userId: string): string {
    const token = randomBytes(16).toString('hex');
    this.linkTokens.set(token, {
      userId,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });
    return token;
  }

  getBotUsername(): string | null {
    return this.bot ? (this.bot.botInfo?.username ?? null) : null;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.bot) return;
    try {
      await this.bot.telegram.sendMessage(chatId, text, { parse_mode: 'HTML' });
    } catch (error: any) {
      // 403 = user blocked the bot, 400 = chat not found — remove the link
      if (error.code === 403 || error.response?.error_code === 403) {
        this.logger.warn(`Chat ${chatId} blocked bot, removing telegramChatId`);
        await this.prisma.user.updateMany({
          where: { telegramChatId: chatId },
          data: { telegramChatId: null },
        });
      } else {
        this.logger.error(`Failed to send Telegram message to ${chatId}: ${error.message}`);
      }
    }
  }
}
