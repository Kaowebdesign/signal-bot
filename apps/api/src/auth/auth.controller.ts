import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { BotService } from '../bot/bot.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
    private readonly bot: BotService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    if (this.config.get('REGISTRATION_DISABLED') === 'true') {
      throw new ForbiddenException('Registration is closed');
    }
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('telegram-link')
  getTelegramLink(@CurrentUser('id') userId: string) {
    const token = this.bot.generateLinkToken(userId);
    const username = this.bot.getBotUsername();
    const url = username
      ? `https://t.me/${username}?start=${token}`
      : null;
    return { url, token };
  }
}
