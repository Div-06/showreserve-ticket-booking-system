import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateShowDto } from './dto/create-show.dto';
import { SeatStatus } from '@prisma/client';

@Injectable()
export class ShowsService {
  private readonly logger = new Logger(ShowsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShowDto) {
    return this.prisma.$transaction(async (tx) => {
      const show = await tx.show.create({
        data: {
          eventId: dto.eventId,
          venueId: dto.venueId,
          startTime: new Date(dto.startTime),
          endTime: new Date(dto.endTime),
          pricing: dto.pricing,
        },
      });

      // Find all physical seats in this venue
      const physicalSeats = await tx.seat.findMany({
        where: { venueId: dto.venueId, isActive: true },
      });

      // Create ShowSeat records
      const showSeatsData = physicalSeats.map((seat) => ({
        showId: show.id,
        seatId: seat.id,
        status: SeatStatus.AVAILABLE,
      }));

      await tx.showSeat.createMany({ data: showSeatsData });

      this.logger.log(`Created Show ${show.id} with ${showSeatsData.length} show seats.`);

      return tx.show.findUnique({
        where: { id: show.id },
        include: {
          event: true,
          venue: true,
          _count: { select: { showSeats: true } },
        },
      });
    });
  }

  async findOne(id: string) {
    const show = await this.prisma.show.findUnique({
      where: { id },
      include: {
        event: true,
        venue: true,
        _count: { select: { showSeats: true, bookings: true } },
      },
    });

    if (!show) {
      throw new NotFoundException(`Show with ID "${id}" not found`);
    }

    return show;
  }

  /**
   * Retrieves full visual seat map for a show with current live seat statuses
   */
  async getShowSeats(showId: string, currentUserId?: string) {
    const show = await this.prisma.show.findUnique({
      where: { id: showId },
      include: {
        venue: true,
        event: true,
      },
    });

    if (!show) {
      throw new NotFoundException(`Show with ID "${showId}" not found`);
    }

    const showSeats = await this.prisma.showSeat.findMany({
      where: { showId },
      include: {
        seat: true,
        hold: {
          select: {
            id: true,
            customerId: true,
            expiresAt: true,
            status: true,
          },
        },
      },
      orderBy: [{ seat: { rowLabel: 'asc' } }, { seat: { colNumber: 'asc' } }],
    });

    const pricing = show.pricing as Record<string, number>;

    const mappedSeats = showSeats.map((ss) => {
      let isHeldByMe = false;
      let effectiveStatus = ss.status;

      // Check if hold has expired in real-time
      if (ss.status === SeatStatus.HELD) {
        if (ss.holdExpiresAt && new Date(ss.holdExpiresAt) <= new Date()) {
          effectiveStatus = SeatStatus.AVAILABLE;
        } else if (currentUserId && ss.hold && ss.hold.customerId === currentUserId) {
          isHeldByMe = true;
        }
      }

      const price = pricing?.[ss.seat.category] || 20;

      return {
        id: ss.id,
        seatId: ss.seatId,
        rowLabel: ss.seat.rowLabel,
        colNumber: ss.seat.colNumber,
        seatNumber: ss.seat.seatNumber,
        category: ss.seat.category,
        price,
        status: effectiveStatus,
        isHeldByMe,
        holdId: ss.holdId,
        holdExpiresAt: ss.holdExpiresAt,
      };
    });

    return {
      show: {
        id: show.id,
        startTime: show.startTime,
        endTime: show.endTime,
        pricing: show.pricing,
        event: show.event,
        venue: {
          id: show.venue.id,
          name: show.venue.name,
          city: show.venue.city,
          address: show.venue.address,
          totalRows: show.venue.totalRows,
          totalCols: show.venue.totalCols,
          aisles: show.venue.aisles,
        },
      },
      seats: mappedSeats,
    };
  }
}
