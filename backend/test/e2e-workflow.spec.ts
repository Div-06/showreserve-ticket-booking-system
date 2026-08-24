import axios from 'axios';

const API_BASE = process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : 'http://localhost:3000/api';

describe('End-to-End Ticketing & Waitlist Workflow', () => {
  let customer1Token: string;
  let customer2Token: string;
  let showId: string;
  let availableSeatId: string;
  let holdId: string;
  let bookingId: string;

  beforeAll(async () => {
    // 1. Register Customer 1
    const res1 = await axios.post(`${API_BASE}/auth/register`, {
      email: `customer1_${Date.now()}@example.com`,
      password: 'Password@123',
      name: 'Customer One',
    });
    customer1Token = res1.data.accessToken;

    // 2. Register Customer 2
    const res2 = await axios.post(`${API_BASE}/auth/register`, {
      email: `customer2_${Date.now()}@example.com`,
      password: 'Password@123',
      name: 'Customer Two',
    });
    customer2Token = res2.data.accessToken;

    // 3. Get Show & Available Seat
    const eventsRes = await axios.get(`${API_BASE}/events`);
    const event = eventsRes.data.find((e: any) => e.shows && e.shows.length > 0);
    showId = event.shows[0].id;

    const seatsRes = await axios.get(`${API_BASE}/shows/${showId}/seats`);
    const availSeat = seatsRes.data.seats.find((s: any) => s.status === 'AVAILABLE');
    availableSeatId = availSeat.id;
  });

  it('Customer 1 should successfully hold an available seat', async () => {
    const res = await axios.post(
      `${API_BASE}/holds`,
      {
        showId,
        showSeatIds: [availableSeatId],
      },
      {
        headers: { Authorization: `Bearer ${customer1Token}` },
      },
    );

    expect(res.status).toBe(201);
    expect(res.data.status).toBe('ACTIVE');
    holdId = res.data.id;
  });

  it('Customer 2 should fail to hold the already-held seat with HTTP 409 Conflict', async () => {
    try {
      await axios.post(
        `${API_BASE}/holds`,
        {
          showId,
          showSeatIds: [availableSeatId],
        },
        {
          headers: { Authorization: `Bearer ${customer2Token}` },
        },
      );
      fail('Expected HTTP 409 Conflict');
    } catch (err: any) {
      expect(err.response.status).toBe(409);
    }
  });

  it('Customer 1 should successfully convert the hold into a confirmed booking with QR pass', async () => {
    const res = await axios.post(
      `${API_BASE}/bookings`,
      {
        holdId,
        paymentMethod: 'MOCK_CARD_TEST',
      },
      {
        headers: { Authorization: `Bearer ${customer1Token}` },
      },
    );

    expect(res.status).toBe(201);
    expect(res.data.status).toBe('CONFIRMED');
    expect(res.data.bookingReference).toMatch(/^TKT-/);
    expect(res.data.qrCodeData).toContain('data:image/png;base64');
    bookingId = res.data.id;
  });

  it('Customer 2 joins FIFO waitlist for the seat category', async () => {
    const seatsRes = await axios.get(`${API_BASE}/shows/${showId}/seats`);
    const bookedSeat = seatsRes.data.seats.find((s: any) => s.id === availableSeatId);

    const res = await axios.post(
      `${API_BASE}/waitlists`,
      {
        showId,
        category: bookedSeat.category,
      },
      {
        headers: { Authorization: `Bearer ${customer2Token}` },
      },
    );

    expect(res.status).toBe(201);
    expect(res.data.status).toBe('WAITING');
  });

  it('Customer 1 cancels booking -> Seat is automatically offered to Customer 2 on FIFO waitlist', async () => {
    const cancelRes = await axios.post(
      `${API_BASE}/bookings/${bookingId}/cancel`,
      {},
      {
        headers: { Authorization: `Bearer ${customer1Token}` },
      },
    );

    expect(cancelRes.status).toBe(201);
    expect(cancelRes.data.releasedSeats[0].assignedToWaitlist).toBe(true);

    // Customer 2 checks their active waitlist offers
    const myWaitlists = await axios.get(`${API_BASE}/waitlists/my`, {
      headers: { Authorization: `Bearer ${customer2Token}` },
    });

    const activeOffer = myWaitlists.data[0].offers[0];
    expect(activeOffer).toBeDefined();
    expect(activeOffer.status).toBe('PENDING');
    expect(activeOffer.token).toBeDefined();

    // Customer 2 accepts the time-limited waitlist offer
    const acceptRes = await axios.post(`${API_BASE}/waitlists/offers/accept`, {
      token: activeOffer.token,
    });

    expect(acceptRes.status).toBe(201);
    expect(acceptRes.data.booking.status).toBe('CONFIRMED');
    expect(acceptRes.data.booking.bookingReference).toMatch(/^TKT-/);
  });
});
