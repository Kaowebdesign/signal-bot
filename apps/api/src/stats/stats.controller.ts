import { Controller, Delete, Get, Query, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('api/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats(@CurrentUser('id') userId: string) {
    return this.statsService.getStats(userId);
  }

  @Get('history')
  getHistory(@CurrentUser('id') userId: string) {
    return this.statsService.getHistory(userId);
  }

  @Delete()
  deleteStats(
    @CurrentUser('id') userId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.statsService.deleteStats(userId, from, to);
  }
}
