import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto, organiserId: string) {
    return this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        bannerUrl: dto.bannerUrl,
        durationMinutes: dto.durationMinutes,
        organiserId,
      },
      include: {
        organiser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findAll(query: QueryEventsDto) {
    const where: Prisma.EventWhereInput = {};

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.venueId || query.city || query.date) {
      const showWhere: Prisma.ShowWhereInput = {};
      if (query.venueId) showWhere.venueId = query.venueId;
      if (query.city) showWhere.venue = { city: { contains: query.city, mode: 'insensitive' } };
      if (query.date) {
        const start = new Date(query.date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(query.date);
        end.setHours(23, 59, 59, 999);
        showWhere.startTime = { gte: start, lte: end };
      }
      where.shows = { some: showWhere };
    }

    return this.prisma.event.findMany({
      where,
      include: {
        organiser: {
          select: { id: true, name: true, email: true },
        },
        shows: {
          include: {
            venue: true,
          },
          orderBy: { startTime: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        organiser: {
          select: { id: true, name: true, email: true },
        },
        shows: {
          include: {
            venue: {
              include: {
                _count: { select: { seats: true } },
              },
            },
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID "${id}" not found`);
    }

    return event;
  }

  async update(id: string, dto: UpdateEventDto, userId: string, userRole: Role) {
    const event = await this.findOne(id);
    if (userRole !== Role.ADMIN && event.organiserId !== userId) {
      throw new ForbiddenException('You can only update events you created');
    }

    return this.prisma.event.update({
      where: { id },
      data: dto,
      include: {
        organiser: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async remove(id: string, userId: string, userRole: Role) {
    const event = await this.findOne(id);
    if (userRole !== Role.ADMIN && event.organiserId !== userId) {
      throw new ForbiddenException('You can only delete events you created');
    }

    await this.prisma.event.delete({ where: { id } });
    return { message: `Event ${id} deleted successfully` };
  }
}
