import { PrismaClient, Role, SeatCategory, EventCategory, ShowStatus, SeatStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clean existing tables in reverse dependency order
  await prisma.waitlistOffer.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.bookingSeat.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.showSeat.deleteMany();
  await prisma.hold.deleteMany();
  await prisma.show.deleteMany();
  await prisma.event.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const saltRounds = 10;
  const adminPassword = await bcrypt.hash('Admin@123', saltRounds);
  const organiserPassword = await bcrypt.hash('Organiser@123', saltRounds);
  const customerPassword = await bcrypt.hash('Customer@123', saltRounds);

  // 1. Seed Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'System Administrator',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });

  const organiser = await prisma.user.create({
    data: {
      email: 'organiser@example.com',
      name: 'LiveNation & PVR Events',
      passwordHash: organiserPassword,
      role: Role.ORGANISER,
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      name: 'John Doe',
      passwordHash: customerPassword,
      role: Role.CUSTOMER,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'sarah@example.com',
      name: 'Sarah Connor',
      passwordHash: customerPassword,
      role: Role.CUSTOMER,
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      email: 'alex@example.com',
      name: 'Alex Vance',
      passwordHash: customerPassword,
      role: Role.CUSTOMER,
    },
  });

  console.log('✅ Created Demo Users (Admin, Organiser, Customers)');

  // 2. Seed Venues & Physical Seats
  const venue1 = await prisma.venue.create({
    data: {
      name: 'Grand PVR IMAX - Screen 1',
      city: 'San Francisco',
      address: '100 Metreon Promenade, SF, CA',
      totalRows: 6,
      totalCols: 10,
      aisles: [3, 7], // aisles after column 3 and 7
    },
  });

  const rows1 = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seatData1: Array<{ venueId: string; rowLabel: string; colNumber: number; seatNumber: string; category: SeatCategory }> = [];

  for (let r = 0; r < rows1.length; r++) {
    const row = rows1[r];
    // Rows A-B = STANDARD, C-D = PREMIUM, E-F = VIP
    let category: SeatCategory = SeatCategory.STANDARD;
    if (r >= 2 && r <= 3) category = SeatCategory.PREMIUM;
    if (r >= 4) category = SeatCategory.VIP;

    for (let col = 1; col <= 10; col++) {
      seatData1.push({
        venueId: venue1.id,
        rowLabel: row,
        colNumber: col,
        seatNumber: `${row}${col}`,
        category,
      });
    }
  }

  await prisma.seat.createMany({
    data: seatData1,
  });

  const venue2 = await prisma.venue.create({
    data: {
      name: 'Royal Symphony Arena',
      city: 'San Francisco',
      address: '201 Van Ness Ave, SF, CA',
      totalRows: 5,
      totalCols: 8,
      aisles: [4],
    },
  });

  const rows2 = ['A', 'B', 'C', 'D', 'E'];
  const seatData2: Array<{ venueId: string; rowLabel: string; colNumber: number; seatNumber: string; category: SeatCategory }> = [];

  for (let r = 0; r < rows2.length; r++) {
    const row = rows2[r];
    let category: SeatCategory = SeatCategory.STANDARD;
    if (r === 2 || r === 3) category = SeatCategory.PREMIUM;
    if (r >= 4) category = SeatCategory.VIP;

    for (let col = 1; col <= 8; col++) {
      seatData2.push({
        venueId: venue2.id,
        rowLabel: row,
        colNumber: col,
        seatNumber: `${row}${col}`,
        category,
      });
    }
  }

  await prisma.seat.createMany({
    data: seatData2,
  });

  console.log('✅ Created Venues and Physical Seat Layouts');

  // 3. Seed Events
  const event1 = await prisma.event.create({
    data: {
      title: 'Interstellar: 10th Anniversary IMAX Experience',
      description: 'Christopher Nolan\'s sci-fi epic masterpiece remastered for IMAX 70mm. Mankind was born on Earth. It was never meant to die here.',
      category: EventCategory.MOVIE,
      bannerUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop',
      durationMinutes: 169,
      organiserId: organiser.id,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'Hans Zimmer Live: World Tour Symphonic Suite',
      description: 'A multi-award-winning composer Hans Zimmer performs his iconic film scores live featuring a full 60-piece orchestra and choir.',
      category: EventCategory.CONCERT,
      bannerUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=1200&auto=format&fit=crop',
      durationMinutes: 150,
      organiserId: organiser.id,
    },
  });

  const event3 = await prisma.event.create({
    data: {
      title: 'Dune: Part Two (Special 70mm Edition)',
      description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
      category: EventCategory.MOVIE,
      bannerUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop',
      durationMinutes: 166,
      organiserId: organiser.id,
    },
  });

  console.log('✅ Created Movies and Concert Listings');

  // 4. Seed Shows
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(18, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(tomorrow.getHours() + 3);

  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(20, 30, 0, 0);

  const dayAfterEnd = new Date(dayAfter);
  dayAfterEnd.setHours(dayAfter.getHours() + 3);

  const show1 = await prisma.show.create({
    data: {
      eventId: event1.id,
      venueId: venue1.id,
      startTime: tomorrow,
      endTime: tomorrowEnd,
      pricing: {
        VIP: 45,
        PREMIUM: 28,
        STANDARD: 16,
      },
      status: ShowStatus.PUBLISHED,
    },
  });

  const show2 = await prisma.show.create({
    data: {
      eventId: event2.id,
      venueId: venue2.id,
      startTime: dayAfter,
      endTime: dayAfterEnd,
      pricing: {
        VIP: 95,
        PREMIUM: 60,
        STANDARD: 35,
      },
      status: ShowStatus.PUBLISHED,
    },
  });

  const show3 = await prisma.show.create({
    data: {
      eventId: event3.id,
      venueId: venue1.id,
      startTime: dayAfter,
      endTime: dayAfterEnd,
      pricing: {
        VIP: 42,
        PREMIUM: 26,
        STANDARD: 15,
      },
      status: ShowStatus.PUBLISHED,
    },
  });

  // 5. Populate ShowSeats for each show
  const v1Seats = await prisma.seat.findMany({ where: { venueId: venue1.id } });
  const v2Seats = await prisma.seat.findMany({ where: { venueId: venue2.id } });

  const show1SeatsData = v1Seats.map((s) => ({
    showId: show1.id,
    seatId: s.id,
    status: SeatStatus.AVAILABLE,
  }));

  const show2SeatsData = v2Seats.map((s) => ({
    showId: show2.id,
    seatId: s.id,
    status: SeatStatus.AVAILABLE,
  }));

  const show3SeatsData = v1Seats.map((s) => ({
    showId: show3.id,
    seatId: s.id,
    status: SeatStatus.AVAILABLE,
  }));

  await prisma.showSeat.createMany({ data: show1SeatsData });
  await prisma.showSeat.createMany({ data: show2SeatsData });
  await prisma.showSeat.createMany({ data: show3SeatsData });

  console.log(`✅ Populated ShowSeats: Show 1 (${show1SeatsData.length} seats), Show 2 (${show2SeatsData.length} seats), Show 3 (${show3SeatsData.length} seats)`);
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
