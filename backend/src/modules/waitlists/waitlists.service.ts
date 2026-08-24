import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../socket/events.gateway';
import { MailService } from '../../mail/mail.service';
import { QrService } from '../../qr/qr.service';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';
import { AcceptOfferDto } from './dto/accept-offer.dto';
import {
  WaitlistStatus,
  OfferStatus,
  SeatStatus,
  BookingStatus,
  Prisma,
} from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class WaitlistsService {
  private readonly logger = new Logger(WaitlistsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly mailService: MailService,
    private readonly qrService: QrService,
  ) {}

  /**
   * Join a category-specific FIFO waitlist for a show
   */
  async joinWaitlist(dto: JoinWaitlistDto, customerId: string) {
    const { showId, category } = dto;

    const show = await this.prisma.show.findUnique({
      where: { id: showId },
      include: { event: true },
    });

    if (!show) {
      throw new NotFoundException(`Show with ID "${showId}" not found`);
    }

    // Check if customer already has an active waitlist entry for this show & category
    const existing = await this.prisma.waitlistEntry.findFirst({
      where: {
        showId,
        customerId,
        category,
        status: { in: [WaitlistStatus.WAITING, WaitlistStatus.OFFERED] },
      },
    });

    if (existing) {
      throw new ConflictException(`You are already on the waitlist for ${category} seats for this show`);
    }

    // Monotonic timestamp priority for strict FIFO ordering
    const priority = BigInt(Date.now());

    const entry = await this.prisma.waitlistEntry.create({
      data: {
        showId,
        customerId,
        category,
        status: WaitlistStatus.WAITING,
        priority,
      },
      include: {
        show: {
          include: { event: true, venue: true },
        },
      },
    });

    // Calculate current queue position
    const aheadCount = await this.prisma.waitlistEntry.count({
      where: {
        showId,
        category,
        status: WaitlistStatus.WAITING,
        priority: { lt: priority },
      },
    });

    this.logger.log(`Customer ${customerId} joined waitlist for ${category} on show ${showId}. Position: ${aheadCount + 1}`);

    return {
      ...entry,
      priority: entry.priority.toString(),
      queuePosition: aheadCount + 1,
    };
  }

  /**
   * Get all active waitlist entries for a customer
   */
  async getCustomerWaitlists(customerId: string) {
    const entries = await this.prisma.waitlistEntry.findMany({
      where: { customerId },
      include: {
        show: {
          include: { event: true, venue: true },
        },
        offers: {
          where: { status: OfferStatus.PENDING },
          include: {
            showSeat: {
              include: { seat: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return entries.map((e) => ({
      ...e,
      priority: e.priority.toString(),
    }));
  }

  /**
   * Get offer details by secure token
   */
  async getOfferByToken(token: string) {
    const offer = await this.prisma.waitlistOffer.findUnique({
      where: { token },
      include: {
        waitlistEntry: {
          include: {
            customer: { select: { id: true, name: true, email: true } },
            show: {
              include: { event: true, venue: true },
            },
          },
        },
        showSeat: {
          include: { seat: true },
        },
      },
    });

    if (!offer) {
      throw new NotFoundException('Invalid or unknown waitlist offer token');
    }

    const isExpired = offer.status === OfferStatus.EXPIRED || new Date(offer.expiresAt) <= new Date();

    const pricing = (offer.waitlistEntry.show.pricing as Record<string, number>) || {};
    const price = pricing[offer.showSeat.seat.category] || 20;

    return {
      offer: {
        id: offer.id,
        status: isExpired ? OfferStatus.EXPIRED : offer.status,
        expiresAt: offer.expiresAt,
        token: offer.token,
      },
      customer: offer.waitlistEntry.customer,
      show: offer.waitlistEntry.show,
      seat: {
        id: offer.showSeat.id,
        seatNumber: offer.showSeat.seat.seatNumber,
        category: offer.showSeat.seat.category,
        price,
      },
    };
  }

  /**
   * Accept a time-limited waitlist offer and complete booking
   */
  async acceptOffer(dto: AcceptOfferDto, currentUserId?: string) {
    const { token, paymentMethod = 'MOCK_CARD' } = dto;

    const result = await this.prisma.$transaction(
      async (tx) => {
        const offer = await tx.waitlistOffer.findUnique({
          where: { token },
          include: {
            waitlistEntry: {
              include: {
                customer: true,
                show: {
                  include: { event: true, venue: true },
                },
              },
            },
            showSeat: {
              include: { seat: true },
            },
          },
        });

        if (!offer) {
          throw new NotFoundException('Invalid waitlist offer token');
        }

        if (currentUserId && offer.waitlistEntry.customerId !== currentUserId) {
          throw new ForbiddenException('This offer belongs to a different customer account');
        }

        if (offer.status !== OfferStatus.PENDING) {
          throw new ConflictException(`Offer is no longer pending (status: ${offer.status})`);
        }

        if (new Date(offer.expiresAt) <= new Date()) {
          await tx.waitlistOffer.update({
            where: { id: offer.id },
            data: { status: OfferStatus.EXPIRED },
          });
          throw new ConflictException('This waitlist offer has expired and has been offered to the next person.');
        }

        const showSeat = offer.showSeat;
        const customer = offer.waitlistEntry.customer;
        const show = offer.waitlistEntry.show;

        const pricing = (show.pricing as Record<string, number>) || {};
        const price = pricing[showSeat.seat.category] || 20;

        const bookingReference = `TKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const paymentRef = `PAY-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

        // Generate QR code ticket
        const qrCodeData = await this.qrService.generateTicketQR(
          bookingReference,
          show.id,
          show.event.title,
          [showSeat.seat.seatNumber],
        );

        // Create Booking
        const booking = await tx.booking.create({
          data: {
            bookingReference,
            showId: show.id,
            customerId: customer.id,
            totalAmount: price,
            status: BookingStatus.CONFIRMED,
            qrCodeData,
            paymentRef,
            seats: {
              create: [
                {
                  showSeatId: showSeat.id,
                  seatNumber: showSeat.seat.seatNumber,
                  category: showSeat.seat.category,
                  price,
                },
              ],
            },
          },
        });

        // Update ShowSeat to BOOKED
        await tx.showSeat.update({
          where: { id: showSeat.id },
          data: {
            status: SeatStatus.BOOKED,
            bookingId: booking.id,
            holdId: null,
            holdExpiresAt: null,
          },
        });

        // Mark Offer as ACCEPTED
        await tx.waitlistOffer.update({
          where: { id: offer.id },
          data: { status: OfferStatus.ACCEPTED },
        });

        // Mark WaitlistEntry as FULFILLED
        await tx.waitlistEntry.update({
          where: { id: offer.waitlistEntryId },
          data: { status: WaitlistStatus.FULFILLED },
        });

        return {
          booking,
          customer,
          show,
          seatNumber: showSeat.seat.seatNumber,
          price,
          qrCodeData,
          showSeatId: showSeat.id,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    // Broadcast WebSocket update
    this.eventsGateway.broadcastSeatUpdate({
      showId: result.show.id,
      seatIds: [result.showSeatId],
      status: 'BOOKED',
      holdExpiresAt: null,
      heldByUserId: null,
    });

    // Send confirmation email
    const showTimeFormatted = new Date(result.show.startTime).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    this.mailService
      .sendBookingConfirmation(
        result.customer.email,
        result.customer.name,
        result.booking.bookingReference,
        result.show.event.title,
        result.show.venue.name,
        showTimeFormatted,
        [result.seatNumber],
        result.price,
        result.qrCodeData,
      )
      .catch((e) => this.logger.error('Failed to send confirmation email on offer acceptance', e));

    return {
      message: 'Waitlist offer accepted and booking confirmed!',
      booking: result.booking,
    };
  }
}
