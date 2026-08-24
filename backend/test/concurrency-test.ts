import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const API_BASE = process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : 'http://localhost:3000/api';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres@127.0.0.1:5433/ticket_booking?schema=public',
    },
  },
});

async function runConcurrencyTest() {
  console.log('=====================================================');
  console.log('🚀 STARTING HIGH-CONCURRENCY SEAT HOLD TEST');
  console.log('=====================================================');

  // 1. Authenticate 20 distinct customer test sessions
  console.log('🔑 Preparing 20 distinct customer test sessions...');
  const userTokens: string[] = [];

  for (let i = 1; i <= 20; i++) {
    const email = `racer_${Date.now()}_${i}@example.com`;
    const password = 'RacerPassword@123';
    const name = `Racer Customer ${i}`;

    try {
      const res = await axios.post(`${API_BASE}/auth/register`, {
        email,
        password,
        name,
      });
      userTokens.push(res.data.accessToken);
    } catch (e: any) {
      console.error(`Failed to register test user ${i}:`, e.response?.data || e.message);
    }
  }

  console.log(`✅ Authenticated ${userTokens.length} test customers.`);

  // 2. Fetch available show and available seat
  const eventsRes = await axios.get(`${API_BASE}/events`);
  const firstEvent = eventsRes.data[0];
  if (!firstEvent || !firstEvent.shows || firstEvent.shows.length === 0) {
    throw new Error('No shows available for concurrency test. Please seed database first.');
  }

  const showId = firstEvent.shows[0].id;
  const seatsRes = await axios.get(`${API_BASE}/shows/${showId}/seats`);
  const availableSeat = seatsRes.data.seats.find((s: any) => s.status === 'AVAILABLE');

  if (!availableSeat) {
    throw new Error('No available seat found in show for test.');
  }

  console.log(`🎯 Target Show: "${firstEvent.title}" (${showId})`);
  console.log(`🎯 Target Seat: ${availableSeat.seatNumber} (ID: ${availableSeat.id})`);
  console.log(`💥 Firing 20 SIMULTANEOUS hold requests for Seat ${availableSeat.seatNumber}...`);

  // 3. Fire 20 SIMULTANEOUS HTTP requests via Promise.all
  const startTime = Date.now();
  const promises = userTokens.map((token, index) => {
    return axios
      .post(
        `${API_BASE}/holds`,
        {
          showId,
          showSeatIds: [availableSeat.id],
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      .then((res) => {
        return { index: index + 1, success: true, status: res.status, data: res.data };
      })
      .catch((err) => {
        return {
          index: index + 1,
          success: false,
          status: err.response?.status || 500,
          error: err.response?.data?.message || err.message,
        };
      });
  });

  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;

  // 4. Analyze Results
  const successfulHolds = results.filter((r) => r.success);
  const conflictFailures = results.filter((r) => !r.success && r.status === 409);
  const otherFailures = results.filter((r) => !r.success && r.status !== 409);

  console.log('\n-----------------------------------------------------');
  console.log(`⏱️ Total Time Elapsed: ${duration}ms`);
  console.log(`📊 Successful Holds (HTTP 201): ${successfulHolds.length}`);
  console.log(`🛡️ Blocked Conflicts (HTTP 409): ${conflictFailures.length}`);
  console.log(`❌ Other Failures: ${otherFailures.length}`);
  console.log('-----------------------------------------------------');

  // 5. Database Authoritative Verification
  const dbSeat = await prisma.showSeat.findUnique({
    where: { id: availableSeat.id },
    include: { hold: true },
  });

  console.log(`🔍 Database verification for Seat ${availableSeat.seatNumber}:`);
  console.log(`   - Status in PostgreSQL: ${dbSeat?.status}`);
  console.log(`   - Associated Hold ID: ${dbSeat?.holdId}`);
  console.log(`   - Hold Status: ${dbSeat?.hold?.status}`);
  console.log(`   - Owner Customer ID: ${dbSeat?.hold?.customerId}`);

  // 6. Assertions
  if (successfulHolds.length === 1 && conflictFailures.length === 19 && dbSeat?.status === 'HELD') {
    console.log('\n=====================================================');
    console.log('🎉 TEST PASSED! Concurrency isolation is 100% correct.');
    console.log('   Exactly 1 hold succeeded and 19 simultaneous race');
    console.log('   requests were cleanly rejected by distributed locks');
    console.log('   and PostgreSQL transactional row-level isolation.');
    console.log('=====================================================\n');
    process.exit(0);
  } else {
    console.error('\n❌ CONCURRENCY TEST FAILED!');
    console.error(`Expected 1 success and 19 conflicts, got ${successfulHolds.length} successes and ${conflictFailures.length} conflicts.`);
    process.exit(1);
  }
}

runConcurrencyTest()
  .catch((e) => {
    console.error('Fatal error in concurrency test:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
