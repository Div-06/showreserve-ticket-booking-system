import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingStatus, HoldStatus, WaitlistStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPlatformStats() {
    const [
      totalUsers,
      totalVenues,
      totalSeats,
      totalEvents,
      totalShows,
      totalBookings,
      activeHolds,
      waitingWaitlists,
      revenueResult,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.venue.count(),
      this.prisma.seat.count(),
      this.prisma.event.count(),
      this.prisma.show.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
      this.prisma.hold.count({ where: { status: HoldStatus.ACTIVE, expiresAt: { gt: new Date() } } }),
      this.prisma.waitlistEntry.count({ where: { status: WaitlistStatus.WAITING } }),
      this.prisma.booking.aggregate({
        _sum: { totalAmount: true },
        where: { status: BookingStatus.CONFIRMED },
      }),
    ]);

    const usersByRole = await this.prisma.user.groupBy({
      by: ['role'],
      _count: { _all: true },
    });

    return {
      totalUsers,
      totalVenues,
      totalSeats,
      totalEvents,
      totalShows,
      totalBookings,
      activeHolds,
      waitingWaitlists,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      usersByRole: usersByRole.reduce((acc, curr) => {
        acc[curr.role] = curr._count._all;
        return acc;
      }, {}),
    };
  }
}
