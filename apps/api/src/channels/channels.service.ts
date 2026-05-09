import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateChannelDto) {
    return this.prisma.telegramChannel.create({
      data: {
        channelUsername: dto.channelUsername,
        name: dto.name,
      },
    });
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

    return this.prisma.telegramChannel.update({
      where: { id },
      data: { isActive: dto.isActive },
    });
  }

  async remove(id: string) {
    const channel = await this.prisma.telegramChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return this.prisma.telegramChannel.delete({ where: { id } });
  }
}
