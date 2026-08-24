import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, SeatCategory } from '@prisma/client';

@Injectable()
export class OrganiserService {
  private readonly logger = new Logger(OrganiserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates comprehensive event, booking, and revenue analytics for an organiser
   */
  async getDashboardSummary(organiserId: string) {
    // 1. Get all events created by this organiser
    const events = await this.prisma.event.findMany({
      where: { organiserId },
      include: {
        shows: {
          include: {
            venue: true,
            bookings: {
              include: {
                seats: true,
              },
            },
            showSeats: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let totalRevenue = 0;
    let totalConfirmedBookings = 0;
    let totalCancelledBookings = 0;
    let totalTicketsSold = 0;

    const ticketsByCategory: Record<SeatCategory, number> = {
      [SeatCategory.VIP]: 0,
      [SeatCategory.PREMIUM]: 0,
      [SeatCategory.STANDARD]: 0,
    };

    const eventBreakdown = events.map((event) => {
      let eventRevenue = 0;
      let eventTicketsSold = 0;
      let eventConfirmedBookings = 0;
      let eventCancelledBookings = 0;

      const eventTicketsByCategory: Record<SeatCategory, number> = {
        [SeatCategory.VIP]: 0,
        [SeatCategory.PREMIUM]: 0,
        [SeatCategory.STANDARD]: 0,
      };

      for (const show of event.shows) {
        for (const booking of show.bookings) {
          if (booking.status === BookingStatus.CONFIRMED) {
            totalRevenue += booking.totalAmount;
            eventRevenue += booking.totalAmount;
            totalConfirmedBookings++;
            eventConfirmedBookings++;

            for (const seat of booking.seats) {
              totalTicketsSold++;
              eventTicketsSold++;
              ticketsByCategory[seat.category] = (ticketsByCategory[seat.category] || 0) + 1;
              eventTicketsByCategory[seat.category] = (eventTicketsByCategory[seat.category] || 0) + 1;
            }
          } else if (booking.status === BookingStatus.CANCELLED) {
            totalCancelledBookings++;
            eventCancelledBookings++;
          }
        }
      }

      return {
        id: event.id,
        title: event.title,
        category: event.category,
        bannerUrl: event.bannerUrl,
        showsCount: event.shows.length,
        revenue: eventRevenue,
        ticketsSold: eventTicketsSold,
        confirmedBookings: eventConfirmedBookings,
        cancelledBookings: eventCancelledBookings,
        ticketsByCategory: eventTicketsByCategory,
      };
    });

    return {
      metrics: {
        totalEvents: events.length,
        totalRevenue,
        totalTicketsSold,
        totalConfirmedBookings,
        totalCancelledBookings,
        ticketsByCategory,
      },
      events: eventBreakdown,
    };
  }
}
