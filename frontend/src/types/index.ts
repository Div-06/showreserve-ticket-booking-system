export type Role = 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
export type SeatCategory = 'VIP' | 'PREMIUM' | 'STANDARD';
export type EventCategory = 'MOVIE' | 'CONCERT';
export type SeatStatus = 'AVAILABLE' | 'HELD' | 'BOOKED';
export type HoldStatus = 'ACTIVE' | 'EXPIRED' | 'CONVERTED' | 'RELEASED';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED';
export type WaitlistStatus = 'WAITING' | 'OFFERED' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
}

export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  totalRows: number;
  totalCols: number;
  aisles: number[];
  seats?: Seat[];
  _count?: { seats: number; shows: number };
}

export interface Seat {
  id: string;
  venueId: string;
  rowLabel: string;
  colNumber: number;
  seatNumber: string;
  category: SeatCategory;
  isActive: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  bannerUrl: string | null;
  durationMinutes: number;
  organiserId: string;
  organiser?: { id: string; name: string; email: string };
  shows?: ShowItem[];
  createdAt: string;
}

export interface ShowItem {
  id: string;
  eventId: string;
  venueId: string;
  startTime: string;
  endTime: string;
  pricing: Record<SeatCategory, number>;
  status: string;
  event?: EventItem;
  venue?: Venue;
  _count?: { showSeats: number; bookings: number };
}

export interface SeatMapItem {
  id: string; // showSeatId
  seatId: string;
  rowLabel: string;
  colNumber: number;
  seatNumber: string;
  category: SeatCategory;
  price: number;
  status: SeatStatus;
  isHeldByMe: boolean;
  holdId?: string | null;
  holdExpiresAt?: string | null;
}

export interface HoldItem {
  id: string;
  showId: string;
  customerId: string;
  status: HoldStatus;
  expiresAt: string;
  ttlSeconds?: number;
  showSeats: Array<{
    id: string;
    seat: Seat;
  }>;
  show?: ShowItem;
}

export interface BookingSeatItem {
  id: string;
  bookingId: string;
  showSeatId: string;
  seatNumber: string;
  category: SeatCategory;
  price: number;
}

export interface BookingItem {
  id: string;
  bookingReference: string;
  showId: string;
  customerId: string;
  totalAmount: number;
  status: BookingStatus;
  qrCodeData: string;
  paymentRef: string;
  createdAt: string;
  show: ShowItem;
  seats: BookingSeatItem[];
}

export interface WaitlistEntryItem {
  id: string;
  showId: string;
  customerId: string;
  category: SeatCategory;
  status: WaitlistStatus;
  priority: string;
  queuePosition?: number;
  createdAt: string;
  show: ShowItem;
  offers?: Array<{
    id: string;
    token: string;
    status: OfferStatus;
    expiresAt: string;
    showSeat: {
      seat: Seat;
    };
  }>;
}

export interface OrganiserSummary {
  metrics: {
    totalEvents: number;
    totalRevenue: number;
    totalTicketsSold: number;
    totalConfirmedBookings: number;
    totalCancelledBookings: number;
    ticketsByCategory: Record<SeatCategory, number>;
  };
  events: Array<{
    id: string;
    title: string;
    category: EventCategory;
    bannerUrl: string | null;
    showsCount: number;
    revenue: number;
    ticketsSold: number;
    confirmedBookings: number;
    cancelledBookings: number;
    ticketsByCategory: Record<SeatCategory, number>;
  }>;
}
