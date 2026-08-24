import React, { useState, useEffect } from 'react';
import { BookingItem } from '../types';
import { QRCodeModal } from '../components/QRCodeModal';
import api from '../api/client';
import {
  Ticket,
  Calendar,
  MapPin,
  QrCode,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export const BookingsHistoryPage: React.FC = () => {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBookingForQR, setSelectedBookingForQR] = useState<BookingItem | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancellationNotice, setCancellationNotice] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const res = await api.get<BookingItem[]>('/bookings');
      setBookings(res.data);
    } catch (err) {
      console.error('Failed to load bookings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking? Released seats will be automatically allocated to waiting customers on the FIFO waitlist.')) {
      return;
    }

    setCancellingId(bookingId);
    setCancellationNotice(null);

    try {
      const res = await api.post(`/bookings/${bookingId}/cancel`);
      setCancellationNotice(
        `Booking cancelled successfully. Seats were freed and automatically offered to the FIFO waitlist!`,
      );
      loadBookings();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Tickets & Bookings</h1>
          <p className="text-xs text-slate-400 mt-1">
            View your event passes, digital QR codes, and manage reservations.
          </p>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {bookings.length} {bookings.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {cancellationNotice && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-sm text-emerald-300">
          <Sparkles className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>{cancellationNotice}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map((n) => (
            <div key={n} className="h-40 rounded-2xl bg-slate-900 border border-slate-800" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800">
          <Ticket className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Bookings Yet</h3>
          <p className="text-xs text-slate-400 mt-1">Browse our events to book your first tickets!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const isCancelled = booking.status === 'CANCELLED';
            const showTime = new Date(booking.show.startTime).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });
            const seatLabels = booking.seats.map((s) => s.seatNumber).join(', ');

            return (
              <div
                key={booking.id}
                className={`bg-navy-900 border rounded-2xl p-6 transition-all shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                  isCancelled
                    ? 'border-slate-800/50 opacity-60'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Booking Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isCancelled
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isCancelled ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                      {booking.status}
                    </span>

                    <span className="font-mono text-xs font-bold text-brand-400">
                      {booking.bookingReference}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white">{booking.show.event?.title}</h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" /> {showTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" /> {booking.show.venue?.name}
                    </span>
                    <span className="flex items-center gap-1 text-brand-400 font-mono font-semibold">
                      <Ticket className="h-3.5 w-3.5" /> Seats: {seatLabels}
                    </span>
                  </div>
                </div>

                {/* Pricing & Actions */}
                <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Total Amount</div>
                    <div className="text-xl font-extrabold text-white font-mono">
                      ${booking.totalAmount.toFixed(2)}
                    </div>
                  </div>

                  {!isCancelled && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedBookingForQR(booking)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs transition-all shadow-md shadow-brand-500/10"
                      >
                        <QrCode className="h-4 w-4" /> View QR Pass
                      </button>

                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        <XCircle className="h-4 w-4" />
                        {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Ticket Viewer Modal */}
      <QRCodeModal
        booking={selectedBookingForQR}
        isOpen={!!selectedBookingForQR}
        onClose={() => setSelectedBookingForQR(null)}
      />
    </div>
  );
};
