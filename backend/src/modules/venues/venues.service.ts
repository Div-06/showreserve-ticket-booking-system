import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { UpdateVenueDto } from './dto/update-venue.dto';
import { SeatCategory } from '@prisma/client';

@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateVenueDto) {
    return this.prisma.$transaction(async (tx) => {
      const venue = await tx.venue.create({
        data: {
          name: dto.name,
          city: dto.city,
          address: dto.address,
          totalRows: dto.totalRows,
          totalCols: dto.totalCols,
          aisles: dto.aisles || [],
        },
      });

      const seatRecords: Array<{
        venueId: string;
        rowLabel: string;
        colNumber: number;
        seatNumber: string;
        category: SeatCategory;
      }> = [];

      if (dto.seats && dto.seats.length > 0) {
        for (const seat of dto.seats) {
          seatRecords.push({
            venueId: venue.id,
            rowLabel: seat.rowLabel,
            colNumber: seat.colNumber,
            seatNumber: seat.seatNumber,
            category: seat.category,
          });
        }
      } else {
        // Auto-generate structured grid layout
        for (let r = 0; r < dto.totalRows; r++) {
          const rowLabel = String.fromCharCode(65 + r); // A, B, C...
          let category: SeatCategory = SeatCategory.STANDARD;
          if (r >= Math.floor(dto.totalRows * 0.4) && r < Math.floor(dto.totalRows * 0.75)) {
            category = SeatCategory.PREMIUM;
          } else if (r >= Math.floor(dto.totalRows * 0.75)) {
            category = SeatCategory.VIP;
          }

          for (let c = 1; c <= dto.totalCols; c++) {
            seatRecords.push({
              venueId: venue.id,
              rowLabel,
              colNumber: c,
              seatNumber: `${rowLabel}${c}`,
              category,
            });
          }
        }
      }

      await tx.seat.createMany({ data: seatRecords });

      this.logger.log(`Created venue "${venue.name}" with ${seatRecords.length} structured seats.`);

      return tx.venue.findUnique({
        where: { id: venue.id },
        include: {
          seats: {
            orderBy: [{ rowLabel: 'asc' }, { colNumber: 'asc' }],
          },
        },
      });
    });
  }

  async findAll() {
    return this.prisma.venue.findMany({
      include: {
        _count: {
          select: { seats: true, shows: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        seats: {
          orderBy: [{ rowLabel: 'asc' }, { colNumber: 'asc' }],
        },
        shows: {
          include: {
            event: true,
          },
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!venue) {
      throw new NotFoundException(`Venue with ID "${id}" not found`);
    }

    return venue;
  }

  async update(id: string, dto: UpdateVenueDto) {
    await this.findOne(id);
    return this.prisma.venue.update({
      where: { id },
      data: {
        name: dto.name,
        city: dto.city,
        address: dto.address,
        aisles: dto.aisles,
      },
      include: {
        seats: {
          orderBy: [{ rowLabel: 'asc' }, { colNumber: 'asc' }],
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.venue.delete({ where: { id } });
    return { message: `Venue ${id} deleted successfully` };
  }
}
