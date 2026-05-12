import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BotModule } from './bot/bot.module';
import { TelegramModule } from './telegram/telegram.module';
import { AnalysisModule } from './analysis/analysis.module';
import { RoutesModule } from './routes/routes.module';
import { ChannelsModule } from './channels/channels.module';
import { MatchingModule } from './matching/matching.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    PrismaModule,
    BotModule,
    AuthModule,
    TelegramModule,
    AnalysisModule,
    RoutesModule,
    ChannelsModule,
    MatchingModule,
    NotificationsModule,
    StatsModule,
  ],
})
export class AppModule {}
