import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../socket/events.gateway';
import { MailService } from '../mail/mail.service';
import { RedisService } from '../redis/redis.service';
import { Queue, Worker } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { SeatStatus, HoldStatus, OfferStatus, WaitlistStatus } from '@prisma/client';

export interface HoldExpiryPayload {
  holdId: string;
  showId: string;
}

export interface WaitlistExpiryPayload {
  offerId: string;
  showId: string;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private holdQueue: Queue;
  private holdWorker: Worker;
  private waitlistQueue: Queue;
  private waitlistWorker: Worker;

  // In-memory fallback timer registry for zero-dependency test runs
  private readonly inMemoryTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly mailService: MailService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    const isMock = this.redisService.getIsMock();
    const redisUrl = this.configService.get<string>('redis.url') || 'redis://localhost:6379';

    if (!isMock) {
      try {
        const connection = { url: redisUrl };

        // 1. Hold Expiry Queue & Worker
        this.holdQueue = new Queue('hold-expiry-queue', { connection });
        this.holdWorker = new Worker(
          'hold-expiry-queue',
          async (job) => {
            await this.processHoldExpiry(job.data as HoldExpiryPayload);
          },
          { connection },
        );

        // 2. Waitlist Expiry Queue & Worker
        this.waitlistQueue = new Queue('waitlist-expiry-queue', { connection });
        this.waitlistWorker = new Worker(
          'waitlist-expiry-queue',
          async (job) => {
            await this.processWaitlistExpiry(job.data as WaitlistExpiryPayload);
          },
          { connection },
        );

        this.logger.log('BullMQ Queues and Workers initialized successfully with Redis');
      } catch (err) {
        this.logger.warn(`BullMQ initialization error: ${err.message}. Using built-in timer scheduler.`);
      }
    } else {
      this.logger.log('Running in-memory timer scheduler for hold and waitlist TTL expiry');
    }
  }

  /**
   * Schedule a delayed job to expire a hold
   */
  async scheduleHoldExpiry(holdId: string, showId: string, delayMs: number): Promise<void> {
    if (this.holdQueue) {
      try {
        await this.holdQueue.add(
          'expire-hold',
          { holdId, showId },
          { delay: delayMs, jobId: `hold-${holdId}`, removeOnComplete: true, removeOnFail: true },
        );
        this.logger.log(`Scheduled BullMQ hold expiry job for hold: ${holdId} in ${delayMs}ms`);
        return;
      } catch (err) {
        this.logger.warn(`BullMQ add failed: ${err.message}. Falling back to in-memory timer.`);
      }
    }

    // In-memory fallback
    const timer = setTimeout(() => {
      this.processHoldExpiry({ holdId, showId }).catch((e) =>
        this.logger.error('Error in in-memory hold expiry', e),
      );
      this.inMemoryTimers.delete(`hold-${holdId}`);
    }, delayMs);

    this.inMemoryTimers.set(`hold-${holdId}`, timer);
    this.logger.log(`Scheduled in-memory hold expiry for hold: ${holdId} in ${delayMs}ms`);
  }

  /**
   * Schedule a delayed job to expire a waitlist offer
   */
  async scheduleWaitlistExpiry(offerId: string, showId: string, delayMs: number): Promise<void> {
    if (this.waitlistQueue) {
      try {
        await this.waitlistQueue.add(
          'expire-waitlist-offer',
          { offerId, showId },
          { delay: delayMs, jobId: `offer-${offerId}`, removeOnComplete: true, removeOnFail: true },
        );
        this.logger.log(`Scheduled BullMQ waitlist expiry job for offer: ${offerId} in ${delayMs}ms`);
        return;
      } catch (err) {
        this.logger.warn(`BullMQ add failed: ${err.message}. Falling back to in-memory timer.`);
      }
    }

    const timer = setTimeout(() => {
      this.processWaitlistExpiry({ offerId, showId }).catch((e) =>
        this.logger.error('Error in in-memory waitlist expiry', e),
      );
      this.inMemoryTimers.delete(`offer-${offerId}`);
    }, delayMs);

    this.inMemoryTimers.set(`offer-${offerId}`, timer);
  }

  /**
   * Idempotent processor for hold expiration
   */
  async processHoldExpiry(payload: HoldExpiryPayload): Promise<void> {
    const { holdId, showId } = payload;
    this.logger.log(`Processing hold expiry for holdId: ${holdId}, showId: ${showId}`);

    await this.prisma.$transaction(async (tx) => {
      const hold = await tx.hold.findUnique({
        where: { id: holdId },
        include: { showSeats: true },
      });

      if (!hold) {
        this.logger.warn(`Hold ${holdId} not found during expiry check`);
        return;
      }

      // If hold is no longer ACTIVE (e.g. already CONVERTED into booking or manually RELEASED), no-op
      if (hold.status !== HoldStatus.ACTIVE) {
        this.logger.log(`Hold ${holdId} is already ${hold.status}, ignoring expiry`);
        return;
      }

      // Mark hold as EXPIRED
      await tx.hold.update({
        where: { id: holdId },
        data: { status: HoldStatus.EXPIRED },
      });

      // Find seats that were held by this hold and haven't been booked
      const heldSeats = await tx.showSeat.findMany({
        where: {
          holdId: hold.id,
          status: SeatStatus.HELD,
        },
      });

      if (heldSeats.length > 0) {
        const seatIds = heldSeats.map((s) => s.id);

        await tx.showSeat.updateMany({
          where: { id: { in: seatIds } },
          data: {
            status: SeatStatus.AVAILABLE,
            holdId: null,
            holdExpiresAt: null,
          },
        });

        this.logger.log(`Released ${heldSeats.length} seat(s) back to AVAILABLE for show ${showId}`);

        // Broadcast real-time seat update to all connected clients
        this.eventsGateway.broadcastSeatUpdate({
          showId,
          seatIds,
          status: 'AVAILABLE',
          holdExpiresAt: null,
          heldByUserId: null,
        });
      }
    });
  }

  /**
   * Idempotent processor for waitlist offer expiration & automatic FIFO reallocation
   */
  async processWaitlistExpiry(payload: WaitlistExpiryPayload): Promise<void> {
    const { offerId, showId } = payload;
    this.logger.log(`Processing waitlist offer expiry for offerId: ${offerId}, showId: ${showId}`);

    await this.prisma.$transaction(async (tx) => {
      const offer = await tx.waitlistOffer.findUnique({
        where: { id: offerId },
        include: {
          waitlistEntry: {
            include: { customer: true },
          },
          showSeat: {
            include: { seat: true },
          },
        },
      });

      if (!offer || offer.status !== OfferStatus.PENDING) {
        this.logger.log(`Offer ${offerId} is not PENDING (status: ${offer?.status}), ignoring expiry`);
        return;
      }

      // Mark current offer as EXPIRED
      await tx.waitlistOffer.update({
        where: { id: offerId },
        data: { status: OfferStatus.EXPIRED },
      });

      // Mark current waitlist entry as EXPIRED
      await tx.waitlistEntry.update({
        where: { id: offer.waitlistEntryId },
        data: { status: WaitlistStatus.EXPIRED },
      });

      const category = offer.waitlistEntry.category;
      const showSeatId = offer.showSeatId;

      // Look for the NEXT eligible customer in the FIFO waitlist queue for this category
      const nextEntry = await tx.waitlistEntry.findFirst({
        where: {
          showId,
          category,
          status: WaitlistStatus.WAITING,
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        include: { customer: true, show: { include: { event: true } } },
      });

      if (nextEntry) {
        // Next customer in FIFO queue receives the offer!
        const offerTtlSec = this.configService.get<number>('waitlist.offerTtlSeconds') || 900;
        const expiresAt = new Date(Date.now() + offerTtlSec * 1000);
        const token = uuidv4();

        const newOffer = await tx.waitlistOffer.create({
          data: {
            waitlistEntryId: nextEntry.id,
            showSeatId,
            token,
            status: OfferStatus.PENDING,
            expiresAt,
          },
        });

        await tx.waitlistEntry.update({
          where: { id: nextEntry.id },
          data: { status: WaitlistStatus.OFFERED },
        });

        await tx.showSeat.update({
          where: { id: showSeatId },
          data: {
            status: SeatStatus.HELD,
            holdExpiresAt: expiresAt,
          },
        });

        // Schedule expiration for new offer
        await this.scheduleWaitlistExpiry(newOffer.id, showId, offerTtlSec * 1000);

        // Notify next waitlist customer via email
        this.mailService.sendWaitlistOffer(
          nextEntry.customer.email,
          nextEntry.customer.name,
          nextEntry.show.event.title,
          offer.showSeat.seat.seatNumber,
          category,
          expiresAt,
          token,
        );

        this.logger.log(`Assigned seat ${offer.showSeat.seat.seatNumber} to next FIFO waitlisted user: ${nextEntry.customer.email}`);
      } else {
        // No more waitlisted users, release seat to public AVAILABLE
        await tx.showSeat.update({
          where: { id: showSeatId },
          data: {
            status: SeatStatus.AVAILABLE,
            holdId: null,
            bookingId: null,
            holdExpiresAt: null,
          },
        });

        this.eventsGateway.broadcastSeatUpdate({
          showId,
          seatIds: [showSeatId],
          status: 'AVAILABLE',
          holdExpiresAt: null,
          heldByUserId: null,
        });

        this.logger.log(`No remaining waitlist entries for ${category}. Seat released to public AVAILABLE.`);
      }
    });
  }

  async onModuleDestroy() {
    for (const timer of this.inMemoryTimers.values()) {
      clearTimeout(timer);
    }
    this.inMemoryTimers.clear();

    if (this.holdWorker) await this.holdWorker.close();
    if (this.waitlistWorker) await this.waitlistWorker.close();
    if (this.holdQueue) await this.holdQueue.close();
    if (this.waitlistQueue) await this.waitlistQueue.close();
  }
}
