import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  async create(dto: CreateChannelDto) {
    const channel = await this.prisma.telegramChannel.create({
      data: {
        channelUsername: dto.channelUsername,
        name: dto.name,
      },
    });
    await this.telegram.addChannel(dto.channelUsername);
    return channel;
  }

  async findAll() {
    return this.prisma.telegramChannel.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateChannelDto) {
    const channel = await this.prisma.telegramChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const updated = await this.prisma.telegramChannel.update({
      where: { id },
      data: { isActive: dto.isActive },
    });

    if (dto.isActive === true) {
      await this.telegram.addChannel(channel.channelUsername);
    } else if (dto.isActive === false) {
      await this.telegram.removeChannel(channel.channelUsername);
    }

    return updated;
  }

  async remove(id: string) {
    const channel = await this.prisma.telegramChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    await this.telegram.removeChannel(channel.channelUsername);
    return this.prisma.telegramChannel.delete({ where: { id } });
  }
}
