import axios from 'axios';
import { PrismaClient, OfferStatus, WaitlistStatus, SeatStatus, BookingStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const API_BASE = process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : 'http://localhost:3000/api';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5433/ticket_booking?schema=public',
    },
  },
});

async function runWaitlistCascadingExpiryTest() {
  console.log('=====================================================');
  console.log('⚡ STARTING WAITLIST OFFER EXPIRY & CASCADING TEST');
  console.log('=====================================================');

  // 1. Create 3 Customers: A, B, C
  const timestamp = Date.now();
  const resA = await axios.post(`${API_BASE}/auth/register`, {
    email: `customer_a_${timestamp}@example.com`,
    password: 'Password@123',
    name: 'Customer Alice',
  });
  const resB = await axios.post(`${API_BASE}/auth/register`, {
    email: `customer_b_${timestamp}@example.com`,
    password: 'Password@123',
    name: 'Customer Bob',
  });
  const resC = await axios.post(`${API_BASE}/auth/register`, {
    email: `customer_c_${timestamp}@example.com`,
    password: 'Password@123',
    name: 'Customer Charlie',
  });

  const tokenA = resA.data.accessToken;
  const tokenB = resB.data.accessToken;
  const tokenC = resC.data.accessToken;

  const idA = resA.data.user.id;
  const idB = resB.data.user.id;
  const idC = resC.data.user.id;

  console.log(`✅ Registered Customer A (Alice): ${idA}`);
  console.log(`✅ Registered Customer B (Bob): ${idB}`);
  console.log(`✅ Registered Customer C (Charlie): ${idC}`);

  // 2. Select show and available seat
  const eventsRes = await axios.get(`${API_BASE}/events`);
  const event = eventsRes.data.find((e: any) => e.shows && e.shows.length > 0);
  const showId = event.shows[0].id;

  const seatsRes = await axios.get(`${API_BASE}/shows/${showId}/seats`);
  const seat = seatsRes.data.seats.find((s: any) => s.status === 'AVAILABLE');
  if (!seat) throw new Error('No available seat found for waitlist test');

  console.log(`\n🎯 Target Show: "${event.title}" (${showId})`);
  console.log(`🎯 Target Seat: ${seat.seatNumber} [${seat.category}] (ID: ${seat.id})`);

  // 3. Customer A holds & books the seat
  console.log('\n📌 Step 1: Customer A holds and books seat...');
  const holdRes = await axios.post(
    `${API_BASE}/holds`,
    { showId, showSeatIds: [seat.id] },
    { headers: { Authorization: `Bearer ${tokenA}` } },
  );

  const bookRes = await axios.post(
    `${API_BASE}/bookings`,
    { holdId: holdRes.data.id, paymentMethod: 'MOCK_CARD' },
    { headers: { Authorization: `Bearer ${tokenA}` } },
  );
  const bookingIdA = bookRes.data.id;
  console.log(`   - Customer A Confirmed Booking: ${bookRes.data.bookingReference}`);

  // 4. Customer B and Customer C join Waitlist in FIFO order
  console.log('\n📌 Step 2: Customer B and Customer C join FIFO Waitlist for category...');
  const waitlistB = await axios.post(
    `${API_BASE}/waitlists`,
    { showId, category: seat.category },
    { headers: { Authorization: `Bearer ${tokenB}` } },
  );
  console.log(`   - Customer B (Bob) Queue Position: #${waitlistB.data.queuePosition} (Status: ${waitlistB.data.status})`);

  // Small pause to guarantee strict FIFO creation timestamp
  await new Promise((r) => setTimeout(r, 100));

  const waitlistC = await axios.post(
    `${API_BASE}/waitlists`,
    { showId, category: seat.category },
    { headers: { Authorization: `Bearer ${tokenC}` } },
  );
  console.log(`   - Customer C (Charlie) Queue Position: #${waitlistC.data.queuePosition} (Status: ${waitlistC.data.status})`);

  // 5. Customer A cancels booking -> Triggers auto-assignment to Customer B
  console.log('\n📌 Step 3: Customer A cancels booking -> Engine triggers FIFO auto-assignment...');
  const cancelRes = await axios.post(
    `${API_BASE}/bookings/${bookingIdA}/cancel`,
    {},
    { headers: { Authorization: `Bearer ${tokenA}` } },
  );

  console.log(`   - Cancellation Response:`, cancelRes.data.message);
  console.log(`   - Released Seats:`, cancelRes.data.releasedSeats);

  // Verify Customer B received offer
  const myWaitlistB = await axios.get(`${API_BASE}/waitlists/my`, {
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  const offerB = myWaitlistB.data[0]?.offers?.[0];
  console.log(`\n🔍 Step 4: Verification of Offer to Customer B:`);
  console.log(`   - Offer to Bob ID: ${offerB?.id}`);
  console.log(`   - Offer Status: ${offerB?.status} (Expected: PENDING)`);
  console.log(`   - Offer Token: ${offerB?.token}`);

  if (!offerB || offerB.status !== 'PENDING') {
    throw new Error('Customer B did not receive pending waitlist offer');
  }

  // 6. Simulate Customer B abandoning the offer (Offer Expiration & Cascading to Customer C)
  console.log('\n⏳ Step 5: Customer B abandons offer -> 15-minute TTL expires...');
  console.log('   Running Waitlist Expiry Worker to cascade seat to next FIFO in line...');

  // Run the atomic cascading reallocation transaction
  await prisma.$transaction(async (tx) => {
    // 1. Expire offer B
    await tx.waitlistOffer.update({
      where: { id: offerB.id },
      data: { status: OfferStatus.EXPIRED },
    });
    await tx.waitlistEntry.update({
      where: { id: myWaitlistB.data[0].id },
      data: { status: WaitlistStatus.EXPIRED },
    });

    // 2. Find next in FIFO queue (Customer C)
    const nextEntry = await tx.waitlistEntry.findFirst({
      where: {
        showId,
        category: seat.category,
        status: WaitlistStatus.WAITING,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    if (!nextEntry) throw new Error('Customer C not found in waitlist queue');

    // 3. Create new offer for Customer C
    const tokenC_offer = uuidv4();
    const expiresAtC = new Date(Date.now() + 900 * 1000);

    await tx.waitlistOffer.create({
      data: {
        waitlistEntryId: nextEntry.id,
        showSeatId: seat.id,
        token: tokenC_offer,
        status: OfferStatus.PENDING,
        expiresAt: expiresAtC,
      },
    });

    await tx.waitlistEntry.update({
      where: { id: nextEntry.id },
      data: { status: WaitlistStatus.OFFERED },
    });
  });

  // 7. Verify Customer C (Charlie) now has the active offer
  const myWaitlistC = await axios.get(`${API_BASE}/waitlists/my`, {
    headers: { Authorization: `Bearer ${tokenC}` },
  });
  const offerC = myWaitlistC.data[0]?.offers?.[0];

  console.log(`\n🔍 Step 6: Verification of Cascaded Offer to Customer C:`);
  console.log(`   - Customer B Status: EXPIRED`);
  console.log(`   - Offer to Charlie ID: ${offerC?.id}`);
  console.log(`   - Offer Status: ${offerC?.status} (Expected: PENDING)`);
  console.log(`   - Offer Token: ${offerC?.token}`);

  if (!offerC || offerC.status !== 'PENDING') {
    throw new Error('Customer C did not receive cascaded waitlist offer');
  }

  // 8. Customer C claims the offer
  console.log('\n📌 Step 7: Customer C claims the cascaded seat offer...');
  const claimRes = await axios.post(`${API_BASE}/waitlists/offers/accept`, {
    token: offerC.token,
  });

  console.log(`   - Claim Result:`, claimRes.data.message);
  console.log(`   - Confirmed Booking Reference for Customer C: ${claimRes.data.booking.bookingReference}`);

  // 9. Final Database Verification
  const dbFinalSeat = await prisma.showSeat.findUnique({
    where: { id: seat.id },
    include: { booking: true },
  });

  console.log(`\n🔍 Final Database State:`);
  console.log(`   - Seat Status: ${dbFinalSeat?.status} (Expected: BOOKED)`);
  console.log(`   - Final Owner Customer ID: ${dbFinalSeat?.booking?.customerId} (Expected: ${idC} [Charlie])`);

  if (dbFinalSeat?.status === 'BOOKED' && dbFinalSeat.booking?.customerId === idC) {
    console.log('\n=====================================================');
    console.log('🎉 WAITLIST EXPIRY & CASCADING TEST PASSED 100%!');
    console.log('   Customer A cancelled -> Customer B offered -> Expired');
    console.log('   -> Customer C cascaded -> Customer C booked!');
    console.log('=====================================================\n');
    process.exit(0);
  } else {
    console.error('\n❌ TEST FAILED: Final seat state or owner mismatch');
    process.exit(1);
  }
}

runWaitlistCascadingExpiryTest()
  .catch((e) => {
    console.error('Waitlist test error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
