import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AnalysisService } from '../analysis/analysis.service';
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private client!: TelegramClient;
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  // chatId (string) → DB channel id
  private chatIdToChannelId = new Map<string, string>();
  // username → chatId (for status display)
  private usernameToChannelId = new Map<string, string>();
  // dbChannelId → last processed message id (for deduplication)
  private lastMessageIds = new Map<string, number>();
  // dbChannelIds that completed their first poll (to skip replay on startup)
  private initializedChannels = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly analysisService: AnalysisService,
  ) {}

  async onModuleInit() {
    const apiId = Number(this.configService.get<string>('TELEGRAM_API_ID'));
    const apiHash = this.configService.get<string>('TELEGRAM_API_HASH');
    const sessionString =
      this.configService.get<string>('TELEGRAM_SESSION') || '';

    if (!apiId || !apiHash) {
      this.logger.warn(
        'TELEGRAM_API_ID or TELEGRAM_API_HASH not configured. Telegram client will not start.',
      );
      return;
    }

    const session = new StringSession(sessionString);

    this.client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      retryDelay: 1000,
      useWSS: true,
    });

    await this.connect();
  }

  async onModuleDestroy() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client && this.connected) {
      await this.client.disconnect();
      this.connected = false;
      this.logger.log('Telegram client disconnected');
    }
  }

  private async connect() {
    try {
      await this.client.connect();
      this.connected = true;
      this.logger.log('Telegram client connected');
      await this.subscribeToChannels();
      this.startPolling();
    } catch (error) {
      this.logger.error('Failed to connect Telegram client', error);
      this.connected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    const delay = 30_000;
    this.logger.log(`Scheduling reconnect in ${delay / 1000}s`);
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.logger.log('Attempting reconnect...');
      await this.connect();
    }, delay);
  }

  async subscribeToChannels() {
    const channels = await this.prisma.telegramChannel.findMany({
      where: { isActive: true },
    });

    for (const channel of channels) {
      await this.joinAndSubscribe(channel.channelUsername, channel.id);
    }

    this.logger.log(
      `Subscribed to ${this.chatIdToChannelId.size} channel(s)`,
    );
  }

  private async joinAndSubscribe(username: string, dbChannelId: string) {
    try {
      const { Api } = await import('telegram/tl');
      await this.client.invoke(
        new Api.channels.JoinChannel({ channel: username }),
      );
      this.logger.log(`Joined @${username}`);
    } catch (error: any) {
      if (!String(error).includes('USER_ALREADY_PARTICIPANT')) {
        this.logger.warn(`Could not join @${username}: ${error}`);
      }
    }

    await this.subscribeToChannel(username, dbChannelId);
  }

  private async subscribeToChannel(username: string, dbChannelId: string) {
    if (this.usernameToChannelId.has(username)) {
      return;
    }

    try {
      const entity = await this.client.getEntity(username);
      const chatId = entity.id.toString();
      this.chatIdToChannelId.set(chatId, dbChannelId);
      this.usernameToChannelId.set(username, chatId);
      this.logger.log(
        `Subscribed: @${username} → chatId=${chatId} → dbId=${dbChannelId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to resolve entity for @${username}`, error);
    }
  }

  async addChannel(username: string) {
    if (!this.client || !this.connected) {
      this.logger.warn('Telegram client not connected, cannot add channel');
      return;
    }

    const channel = await this.prisma.telegramChannel.findUnique({
      where: { channelUsername: username },
    });

    if (channel) {
      await this.joinAndSubscribe(username, channel.id);
    }
  }

  async removeChannel(username: string) {
    const chatId = this.usernameToChannelId.get(username);
    if (chatId) {
      const dbId = this.chatIdToChannelId.get(chatId);
      if (dbId) {
        this.lastMessageIds.delete(dbId);
        this.initializedChannels.delete(dbId);
      }
      this.chatIdToChannelId.delete(chatId);
    }
    this.usernameToChannelId.delete(username);
    this.logger.log(`Unsubscribed from @${username}`);
  }

  // ── Polling ────────────────────────────────────────────────────────────────

  private startPolling() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    // First pass initializes lastMessageIds without processing (avoids replaying old messages)
    this.pollChannels().catch((e) => this.logger.error('Initial poll error', e));
    this.pollTimer = setInterval(() => {
      this.pollChannels().catch((e) => this.logger.error('Poll error', e));
    }, 30_000);
    this.logger.log('Channel polling started (30s interval)');
  }

  private async pollChannels() {
    for (const [username, chatId] of this.usernameToChannelId.entries()) {
      const dbChannelId = this.chatIdToChannelId.get(chatId);
      if (!dbChannelId) continue;
      await this.pollChannel(username, dbChannelId);
    }
  }

  private async pollChannel(username: string, dbChannelId: string) {
    try {
      const firstPoll = !this.initializedChannels.has(dbChannelId);
      const messages = await this.client.getMessages(username, {
        limit: firstPoll ? 1 : 10,
      });

      if (!messages.length) {
        this.initializedChannels.add(dbChannelId);
        return;
      }

      const maxId = Math.max(...messages.map((m) => m.id));
      const lastKnown = this.lastMessageIds.get(dbChannelId) ?? 0;

      if (firstPoll) {
        this.lastMessageIds.set(dbChannelId, maxId);
        this.initializedChannels.add(dbChannelId);
        this.logger.log(`[POLL] @${username} initialized at msg#${maxId}`);
        return;
      }

      const newMessages = messages
        .filter((m) => m.id > lastKnown && (m as any).message?.trim())
        .reverse(); // oldest first

      for (const msg of newMessages) {
        const text = (msg as any).message as string;
        this.logger.log(
          `[POLL] @${username} msg#${msg.id}: "${text.slice(0, 80)}"`,
        );
        const channel = await this.prisma.telegramChannel.findUnique({
          where: { id: dbChannelId },
        });
        if (channel?.isActive) {
          await this.analysisService.analyzeMessage(
            text,
            dbChannelId,
            BigInt(msg.id),
          );
        }
      }

      if (maxId > lastKnown) {
        this.lastMessageIds.set(dbChannelId, maxId);
      }
    } catch (error) {
      this.logger.error(`[POLL] Failed for @${username}: ${error}`);
    }
  }

  // ── Status ─────────────────────────────────────────────────────────────────

  getStatus(): {
    connected: boolean;
    subscribedChannels: Array<{ username: string; chatId: string }>;
  } {
    return {
      connected: this.connected,
      subscribedChannels: Array.from(this.usernameToChannelId.entries()).map(
        ([username, chatId]) => ({ username, chatId }),
      ),
    };
  }
}
