import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SocketModule } from './socket/socket.module';
import { MailModule } from './mail/mail.module';
import { QrModule } from './qr/qr.module';
import { QueueModule } from './queues/queue.module';
import { AuthModule } from './modules/auth/auth.module';
import { VenuesModule } from './modules/venues/venues.module';
import { EventsModule } from './modules/events/events.module';
import { ShowsModule } from './modules/shows/shows.module';
import { HoldsModule } from './modules/holds/holds.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { WaitlistsModule } from './modules/waitlists/waitlists.module';
import { OrganiserModule } from './modules/organiser/organiser.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    RedisModule,
    SocketModule,
    MailModule,
    QrModule,
    QueueModule,
    AuthModule,
    VenuesModule,
    EventsModule,
    ShowsModule,
    HoldsModule,
    BookingsModule,
    WaitlistsModule,
    OrganiserModule,
    AdminModule,
  ],
})
export class AppModule {}
