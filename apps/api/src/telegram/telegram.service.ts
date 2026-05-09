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
import { NewMessage, NewMessageEvent } from 'telegram/events';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private client: TelegramClient;
  private connected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  // chatId (string) → DB channel id
  private chatIdToChannelId = new Map<string, string>();
  // username → chatId (for status display)
  private usernameToChannelId = new Map<string, string>();

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
      this.setupMessageHandler();
      await this.subscribeToChannels();
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
      await this.subscribeToChannel(channel.channelUsername, channel.id);
    }

    this.logger.log(
      `Subscribed to ${this.chatIdToChannelId.size} channel(s)`,
    );
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

    try {
      await this.client.invoke(
        new (await import('telegram/tl')).Api.channels.JoinChannel({
          channel: username,
        }),
      );
      this.logger.log(`Joined channel @${username}`);
    } catch (error) {
      this.logger.warn(
        `Could not join @${username} (may already be a member): ${error}`,
      );
    }

    const channel = await this.prisma.telegramChannel.findUnique({
      where: { channelUsername: username },
    });

    if (channel) {
      await this.subscribeToChannel(username, channel.id);
    }
  }

  async removeChannel(username: string) {
    const chatId = this.usernameToChannelId.get(username);
    if (chatId) {
      this.chatIdToChannelId.delete(chatId);
    }
    this.usernameToChannelId.delete(username);
    this.logger.log(`Unsubscribed from @${username}`);
  }

  private setupMessageHandler() {
    this.client.addEventHandler(
      async (event: NewMessageEvent) => {
        await this.handleNewMessage(event);
      },
      new NewMessage({}),
    );
  }

  private async handleNewMessage(event: NewMessageEvent) {
    try {
      const message = event.message;
      const text = message.text;

      if (!text || text.trim().length === 0) {
        return;
      }

      const chat = await message.getChat();
      if (!chat) {
        return;
      }

      const chatId = chat.id.toString();
      const dbChannelId = this.chatIdToChannelId.get(chatId);

      this.logger.debug(
        `Message from chatId=${chatId} (${'username' in chat ? '@' + (chat as any).username : 'no username'}): "${text.slice(0, 60)}..."`,
      );

      if (!dbChannelId) {
        this.logger.debug(`chatId=${chatId} not in subscribed list, skipping`);
        return;
      }

      const channel = await this.prisma.telegramChannel.findUnique({
        where: { id: dbChannelId },
      });

      if (!channel || !channel.isActive) {
        return;
      }

      this.logger.log(
        `Processing message from @${channel.channelUsername}: "${text.slice(0, 80)}"`,
      );

      await this.analysisService.analyzeMessage(
        text,
        channel.id,
        BigInt(message.id),
      );
    } catch (error) {
      this.logger.error('Error handling new message', error);
    }
  }

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
