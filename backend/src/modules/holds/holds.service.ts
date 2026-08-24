import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LockService } from '../../redis/lock.service';
import { QueueService } from '../../queues/queue.service';
import { EventsGateway } from '../../socket/events.gateway';
import { CreateHoldDto } from './dto/create-hold.dto';
import { HoldStatus, SeatStatus, Prisma } from '@prisma/client';

@Injectable()
export class HoldsService {
  private readonly logger = new Logger(HoldsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lockService: LockService,
    private readonly queueService: QueueService,
    private readonly eventsGateway: EventsGateway,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Concurrency-safe seat holding with Redis distributed locking and PostgreSQL row-level locks
   */
  async createHold(dto: CreateHoldDto, customerId: string) {
    const { showId, showSeatIds } = dto;
    const holdTtlSeconds = this.configService.get<number>('hold.ttlSeconds') || 600;

    // Verify show exists
    const show = await this.prisma.show.findUnique({
      where: { id: showId },
      include: { event: true },
    });

    if (!show) {
      throw new NotFoundException(`Show with ID "${showId}" not found`);
    }

    // 1. Step 1: Redis Distributed Lock across all requested seat IDs
    const lockKeys = showSeatIds.map((seatId) => `seat-lock:${showId}:${seatId}`);
    const acquiredLocks = await this.lockService.acquireMultipleLocks(lockKeys, 5000);

    if (!acquiredLocks) {
      this.logger.warn(`Redis lock acquisition failed for seats in show ${showId}`);
      throw new ConflictException('One or more selected seats are currently being selected by another user. Please try again.');
    }

    try {
      // 2. Step 2: PostgreSQL Transaction with Row-Level Locking (SELECT ... FOR UPDATE)
      const hold = await this.prisma.$transaction(
        async (tx) => {
          // Lock rows in PostgreSQL explicitly
          // Using Prisma raw query for strict SELECT ... FOR UPDATE isolation
          const lockedSeats = await tx.$queryRaw<
            Array<{
              id: string;
              showId: string;
              seatId: string;
              status: string;
              holdId: string | null;
              bookingId: string | null;
              holdExpiresAt: Date | null;
            }>
          >`
            SELECT "id", "showId", "seatId", "status", "holdId", "bookingId", "holdExpiresAt"
            FROM "ShowSeat"
            WHERE "id" = ANY(${showSeatIds}::text[])
            FOR UPDATE
          `;

          if (lockedSeats.length !== showSeatIds.length) {
            throw new NotFoundException('One or more selected seats do not exist for this show.');
          }

          const now = new Date();

          // Validate that every seat is genuinely AVAILABLE
          for (const seat of lockedSeats) {
            if (seat.showId !== showId) {
              throw new ConflictException(`Seat ${seat.id} does not belong to show ${showId}`);
            }

            if (seat.status === SeatStatus.BOOKED) {
              throw new ConflictException(`Seat has already been booked.`);
            }

            if (seat.status === SeatStatus.HELD) {
              // If held, verify if the hold is still active
              if (seat.holdExpiresAt && seat.holdExpiresAt > now) {
                throw new ConflictException(`Seat is currently held by another customer.`);
              }
            }
          }

          // Calculate hold expiration
          const expiresAt = new Date(Date.now() + holdTtlSeconds * 1000);

          // Create the Hold record
          const newHold = await tx.hold.create({
            data: {
              showId,
              customerId,
              status: HoldStatus.ACTIVE,
              expiresAt,
            },
          });

          // Atomically update the ShowSeat records
          await tx.showSeat.updateMany({
            where: { id: { in: showSeatIds } },
            data: {
              status: SeatStatus.HELD,
              holdId: newHold.id,
              holdExpiresAt: expiresAt,
            },
          });

          return newHold;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 10000,
        },
      );

      // 3. Step 3: Schedule background delayed job for Hold Expiry (BullMQ / Scheduler)
      await this.queueService.scheduleHoldExpiry(hold.id, showId, holdTtlSeconds * 1000);

      // 4. Step 4: Broadcast real-time WebSocket seat update to all connected clients
      this.eventsGateway.broadcastSeatUpdate({
        showId,
        seatIds: showSeatIds,
        status: 'HELD',
        holdExpiresAt: hold.expiresAt.toISOString(),
        heldByUserId: customerId,
      });

      this.logger.log(`Created Hold ${hold.id} for user ${customerId} on ${showSeatIds.length} seat(s). Expires at ${hold.expiresAt.toISOString()}`);

      // Retrieve full details of the created hold with seats
      const fullHold = await this.prisma.hold.findUnique({
        where: { id: hold.id },
        include: {
          show: {
            include: { event: true, venue: true },
          },
          showSeats: {
            include: { seat: true },
          },
        },
      });

      return {
        ...fullHold,
        ttlSeconds: holdTtlSeconds,
      };
    } finally {
      // 5. Step 5: Safely release Redis distributed locks
      await this.lockService.releaseMultipleLocks(acquiredLocks);
    }
  }

  /**
   * Get details of an active hold
   */
  async findOne(id: string, customerId?: string) {
    const hold = await this.prisma.hold.findUnique({
      where: { id },
      include: {
        show: {
          include: { event: true, venue: true },
        },
        showSeats: {
          include: { seat: true },
        },
      },
    });

    if (!hold) {
      throw new NotFoundException(`Hold with ID "${id}" not found`);
    }

    if (customerId && hold.customerId !== customerId) {
      throw new ForbiddenException('You do not have access to this hold');
    }

    return hold;
  }

  /**
   * Customer releases hold manually (e.g. cancels seat selection)
   */
  async releaseHold(id: string, customerId: string) {
    const hold = await this.findOne(id, customerId);

    if (hold.status !== HoldStatus.ACTIVE) {
      return { message: `Hold is already ${hold.status}` };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.hold.update({
        where: { id },
        data: { status: HoldStatus.RELEASED },
      });

      const seatIds = hold.showSeats.map((s) => s.id);

      await tx.showSeat.updateMany({
        where: { id: { in: seatIds } },
        data: {
          status: SeatStatus.AVAILABLE,
          holdId: null,
          holdExpiresAt: null,
        },
      });

      this.eventsGateway.broadcastSeatUpdate({
        showId: hold.showId,
        seatIds,
        status: 'AVAILABLE',
        holdExpiresAt: null,
        heldByUserId: null,
      });
    });

    return { message: 'Hold released successfully' };
  }
}
