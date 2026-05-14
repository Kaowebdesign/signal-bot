import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

function normalizeLocationName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ї/g, 'и')
    .replace(/і/g, 'и')
    .replace(/є/g, 'е')
    .replace(/ґ/g, 'г')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private readonly locationOrder = { locations: { orderBy: { orderIndex: 'asc' as const } } };

  async create(userId: string, dto: CreateRouteDto) {
    const route = await this.prisma.route.create({
      data: {
        userId,
        name: dto.name,
        locations: {
          create: dto.locations.map((loc) => ({
            name: loc.name,
            nameNorm: normalizeLocationName(loc.name),
            type: loc.type,
            orderIndex: loc.orderIndex,
          })),
        },
      },
      include: this.locationOrder,
    });
    this.eventEmitter.emit('routes.changed');
    return route;
  }

  async findAllByUser(userId: string) {
    return this.prisma.route.findMany({
      where: { userId },
      include: this.locationOrder,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: this.locationOrder,
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }
    if (route.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return route;
  }

  async update(userId: string, id: string, dto: UpdateRouteDto) {
    await this.findOne(userId, id);

    const data: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }
    if (dto.trackStats !== undefined) {
      data.trackStats = dto.trackStats;
    }

    if (dto.locations !== undefined) {
      // Replace all locations: delete existing, create new
      await this.prisma.routeLocation.deleteMany({ where: { routeId: id } });
      data.locations = {
        create: dto.locations.map((loc) => ({
          name: loc.name,
          nameNorm: normalizeLocationName(loc.name),
          type: loc.type,
          orderIndex: loc.orderIndex,
        })),
      };
    }

    const updated = await this.prisma.route.update({
      where: { id },
      data,
      include: this.locationOrder,
    });
    this.eventEmitter.emit('routes.changed');
    return updated;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    const deleted = await this.prisma.route.delete({
      where: { id },
      include: this.locationOrder,
    });
    this.eventEmitter.emit('routes.changed');
    return deleted;
  }
}
