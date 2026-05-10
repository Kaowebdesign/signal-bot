import {
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit ?? '20', 10) || 20));
    return this.notificationsService.getNotifications(userId, p, l);
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Delete('all')
  deleteAll(@CurrentUser('id') userId: string) {
    return this.notificationsService.deleteAll(userId);
  }

  @Delete(':id')
  deleteOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteOne(id, userId);
  }

  @Post('subscribe')
  async subscribe(
    @CurrentUser('id') userId: string,
    @Body() subscription: Record<string, unknown>,
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushSubscription: subscription as any },
    });
    return { success: true };
  }

  @Post('expo-push-token')
  async saveExpoPushToken(
    @CurrentUser('id') userId: string,
    @Body('token') token: string,
  ) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token },
    });
    return { success: true };
  }
}
