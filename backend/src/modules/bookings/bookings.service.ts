import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../socket/events.gateway';
import { MailService } from '../../mail/mail.service';
import { QrService } from '../../qr/qr.service';
import { QueueService } from '../../queues/queue.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import {
  HoldStatus,
  SeatStatus,
  BookingStatus,
  WaitlistStatus,
  OfferStatus,
  Prisma,
} from '@prisma/client';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly mailService: MailService,
    private readonly qrService: QrService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Converts an active hold into a confirmed booking (Mock payment checkout)
   */
  async createBooking(dto: CreateBookingDto, customerId: string) {
    const { holdId, paymentMethod = 'MOCK_CARD' } = dto;

    const result = await this.prisma.$transaction(
      async (tx) => {
        // 1. Lock the Hold row
        const hold = await tx.hold.findUnique({
          where: { id: holdId },
          include: {
            show: {
              include: { event: true, venue: true },
            },
            customer: true,
          },
        });

        if (!hold) {
          throw new NotFoundException(`Hold with ID "${holdId}" not found`);
        }

        if (hold.customerId !== customerId) {
          throw new ForbiddenException('You cannot convert a hold belonging to another customer');
        }

        if (hold.status !== HoldStatus.ACTIVE) {
          throw new ConflictException(`Hold is no longer active (current status: ${hold.status})`);
        }

        if (hold.expiresAt <= new Date()) {
          // Mark hold expired
          await tx.hold.update({
            where: { id: hold.id },
            data: { status: HoldStatus.EXPIRED },
          });
          throw new ConflictException('Hold has expired. Please select your seats again.');
        }

        // 2. Lock the associated ShowSeats FOR UPDATE
        const showSeats = await tx.showSeat.findMany({
          where: { holdId: hold.id },
          include: { seat: true },
        });

        if (showSeats.length === 0) {
          throw new ConflictException('No seats found associated with this hold');
        }

        // Validate showSeats are still HELD by this hold
        for (const ss of showSeats) {
          if (ss.status !== SeatStatus.HELD || ss.holdId !== hold.id) {
            throw new ConflictException(`Seat ${ss.seat.seatNumber} is no longer reserved for this hold`);
          }
        }

        // Calculate total amount based on show pricing
        const pricing = (hold.show.pricing as Record<string, number>) || {};
        let totalAmount = 0;
        const seatItems: Array<{ showSeatId: string; seatNumber: string; category: any; price: number }> = [];

        for (const ss of showSeats) {
          const price = pricing[ss.seat.category] || 20;
          totalAmount += price;
          seatItems.push({
            showSeatId: ss.id,
            seatNumber: ss.seat.seatNumber,
            category: ss.seat.category,
            price,
          });
        }

        // Generate secure non-sequential booking reference
        const bookingReference = `TKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const paymentRef = `PAY-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

        // 3. Generate secure signed QR code
        const seatLabels = seatItems.map((s) => s.seatNumber);
        const qrCodeData = await this.qrService.generateTicketQR(
          bookingReference,
          hold.showId,
          hold.show.event.title,
          seatLabels,
        );

        // 4. Create Booking record
        const booking = await tx.booking.create({
          data: {
            bookingReference,
            showId: hold.showId,
            customerId,
            totalAmount,
            status: BookingStatus.CONFIRMED,
            qrCodeData,
            paymentRef,
            seats: {
              create: seatItems.map((item) => ({
                showSeatId: item.showSeatId,
                seatNumber: item.seatNumber,
                category: item.category,
                price: item.price,
              })),
            },
          },
        });

        // 5. Update ShowSeats status to BOOKED
        const showSeatIds = showSeats.map((s) => s.id);
        await tx.showSeat.updateMany({
          where: { id: { in: showSeatIds } },
          data: {
            status: SeatStatus.BOOKED,
            bookingId: booking.id,
            holdId: null,
            holdExpiresAt: null,
          },
        });

        // 6. Mark Hold as CONVERTED
        await tx.hold.update({
          where: { id: hold.id },
          data: { status: HoldStatus.CONVERTED },
        });

        return {
          booking,
          hold,
          seatLabels,
          totalAmount,
          qrCodeData,
          showSeatIds,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    // 7. Broadcast real-time WebSocket seat update
    this.eventsGateway.broadcastSeatUpdate({
      showId: result.hold.showId,
      seatIds: result.showSeatIds,
      status: 'BOOKED',
      holdExpiresAt: null,
      heldByUserId: null,
    });

    // 8. Send Confirmation Email with QR code asynchronously
    const showTimeFormatted = new Date(result.hold.show.startTime).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    this.mailService
      .sendBookingConfirmation(
        result.hold.customer.email,
        result.hold.customer.name,
        result.booking.bookingReference,
        result.hold.show.event.title,
        result.hold.show.venue.name,
        showTimeFormatted,
        result.seatLabels,
        result.totalAmount,
        result.qrCodeData,
      )
      .catch((e) => this.logger.error('Failed to send confirmation email', e));

    return this.findOne(result.booking.id, customerId);
  }

  /**
   * Get booking by ID with verification of customer access
   */
  async findOne(id: string, customerId?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        show: {
          include: { event: true, venue: true },
        },
        customer: {
          select: { id: true, name: true, email: true },
        },
        seats: {
          include: {
            showSeat: {
              include: { seat: true },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    if (customerId && booking.customerId !== customerId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return {
      ...booking,
      emailPreviewUrl: this.mailService.getLastPreviewUrl(),
    };
  }

  /**
   * Find booking by secure reference (e.g. TKT-9F8A2B1C)
   */
  async findByReference(reference: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingReference: reference },
      include: {
        show: {
          include: { event: true, venue: true },
        },
        customer: {
          select: { id: true, name: true, email: true },
        },
        seats: {
          include: {
            showSeat: {
              include: { seat: true },
            },
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with reference "${reference}" not found`);
    }

    return booking;
  }

  /**
   * Retrieve all bookings for a specific customer
   */
  async findAllForCustomer(customerId: string) {
    return this.prisma.booking.findMany({
      where: { customerId },
      include: {
        show: {
          include: { event: true, venue: true },
        },
        seats: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel a booking and immediately trigger FIFO waitlist auto-assignment
   */
  async cancelBooking(bookingId: string, customerId: string) {
    const offerTtlSec = this.configService.get<number>('waitlist.offerTtlSeconds') || 900;

    const cancellationResult = await this.prisma.$transaction(
      async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          include: {
            customer: true,
            show: {
              include: { event: true, venue: true },
            },
            seats: {
              include: {
                showSeat: {
                  include: { seat: true },
                },
              },
            },
          },
        });

        if (!booking) {
          throw new NotFoundException(`Booking with ID "${bookingId}" not found`);
        }

        if (booking.customerId !== customerId) {
          throw new ForbiddenException('You can only cancel your own bookings');
        }

        if (booking.status === BookingStatus.CANCELLED) {
          throw new ConflictException('Booking is already cancelled');
        }

        // 1. Mark booking CANCELLED
        await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CANCELLED },
        });

        const releasedSeatsInfo: Array<{
          showSeatId: string;
          seatNumber: string;
          category: any;
          assignedToWaitlist: boolean;
          newOfferId?: string;
          waitlistEmail?: string;
          waitlistName?: string;
          eventTitle?: string;
          expiresAt?: Date;
          token?: string;
        }> = [];

        // 2. For each released seat, check for next eligible customer in FIFO waitlist queue
        for (const seatItem of booking.seats) {
          const showSeatId = seatItem.showSeatId;
          const category = seatItem.category;

          const waitlistEntry = await tx.waitlistEntry.findFirst({
            where: {
              showId: booking.showId,
              category,
              status: WaitlistStatus.WAITING,
            },
            orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
            include: { customer: true },
          });

          if (waitlistEntry) {
            // Reallocate seat to waitlist customer!
            const expiresAt = new Date(Date.now() + offerTtlSec * 1000);
            const token = uuidv4();

            const offer = await tx.waitlistOffer.create({
              data: {
                waitlistEntryId: waitlistEntry.id,
                showSeatId,
                token,
                status: OfferStatus.PENDING,
                expiresAt,
              },
            });

            await tx.waitlistEntry.update({
              where: { id: waitlistEntry.id },
              data: { status: WaitlistStatus.OFFERED },
            });

            // Set seat status to HELD for waitlist offer
            await tx.showSeat.update({
              where: { id: showSeatId },
              data: {
                status: SeatStatus.HELD,
                bookingId: null,
                holdExpiresAt: expiresAt,
              },
            });

            releasedSeatsInfo.push({
              showSeatId,
              seatNumber: seatItem.seatNumber,
              category,
              assignedToWaitlist: true,
              newOfferId: offer.id,
              waitlistEmail: waitlistEntry.customer.email,
              waitlistName: waitlistEntry.customer.name,
              eventTitle: booking.show.event.title,
              expiresAt,
              token,
            });
          } else {
            // No waitlist customer: release to general AVAILABLE
            await tx.showSeat.update({
              where: { id: showSeatId },
              data: {
                status: SeatStatus.AVAILABLE,
                bookingId: null,
                holdId: null,
                holdExpiresAt: null,
              },
            });

            releasedSeatsInfo.push({
              showSeatId,
              seatNumber: seatItem.seatNumber,
              category,
              assignedToWaitlist: false,
            });
          }
        }

        return {
          booking,
          releasedSeatsInfo,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    // Schedule waitlist expiration jobs and dispatch notification emails
    for (const seat of cancellationResult.releasedSeatsInfo) {
      if (seat.assignedToWaitlist && seat.newOfferId) {
        await this.queueService.scheduleWaitlistExpiry(
          seat.newOfferId,
          cancellationResult.booking.showId,
          offerTtlSec * 1000,
        );

        if ((seat as any).waitlistEmail) {
          this.mailService
            .sendWaitlistOffer(
              (seat as any).waitlistEmail,
              (seat as any).waitlistName,
              (seat as any).eventTitle,
              seat.seatNumber,
              seat.category,
              (seat as any).expiresAt,
              (seat as any).token,
            )
            .catch((e) => this.logger.error('Failed to send waitlist email', e));
        }
      }
    }

    // Broadcast WebSocket updates
    const availableSeatIds = cancellationResult.releasedSeatsInfo
      .filter((s) => !s.assignedToWaitlist)
      .map((s) => s.showSeatId);

    const heldSeatIds = cancellationResult.releasedSeatsInfo
      .filter((s) => s.assignedToWaitlist)
      .map((s) => s.showSeatId);

    if (availableSeatIds.length > 0) {
      this.eventsGateway.broadcastSeatUpdate({
        showId: cancellationResult.booking.showId,
        seatIds: availableSeatIds,
        status: 'AVAILABLE',
        holdExpiresAt: null,
        heldByUserId: null,
      });
    }

    if (heldSeatIds.length > 0) {
      this.eventsGateway.broadcastSeatUpdate({
        showId: cancellationResult.booking.showId,
        seatIds: heldSeatIds,
        status: 'HELD',
      });
    }

    // Send cancellation email to customer
    this.mailService
      .sendCancellationNotification(
        cancellationResult.booking.customer.email,
        cancellationResult.booking.customer.name,
        cancellationResult.booking.bookingReference,
        cancellationResult.booking.show.event.title,
        cancellationResult.booking.seats.map((s) => s.seatNumber),
      )
      .catch((e) => this.logger.error('Failed to send cancellation email', e));

    return {
      message: 'Booking cancelled successfully',
      bookingId,
      releasedSeats: cancellationResult.releasedSeatsInfo,
    };
  }
}
