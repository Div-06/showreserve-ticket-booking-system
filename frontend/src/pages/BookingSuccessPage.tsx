import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { BookingItem } from '../types';
import api from '../api/client';
import confetti from 'canvas-confetti';
import { CheckCircle2, Download, Ticket, Calendar, MapPin, Mail, ArrowRight, ShieldCheck } from 'lucide-react';

export const BookingSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState<BookingItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Launch celebratory confetti burst!
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
    });

    if (bookingId) {
      api
        .get<BookingItem>(`/bookings/${bookingId}`)
        .then((res) => setBooking(res.data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [bookingId]);

  const handleDownload = () => {
    if (!booking) return;
    const link = document.createElement('a');
    link.href = booking.qrCodeData;
    link.download = `ticket-${booking.bookingReference}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-16 w-16 bg-slate-800 rounded-full mx-auto mb-6" />
        <div className="h-8 bg-slate-800 rounded w-1/2 mx-auto" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white">Booking Not Found</h2>
        <Link to="/events" className="mt-4 inline-block text-brand-400 hover:underline">
          Return to Events
        </Link>
      </div>
    );
  }

  const showTime = new Date(booking.show.startTime).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const seatLabels = booking.seats.map((s) => s.seatNumber).join(', ');

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-navy-950 shadow-2xl shadow-brand-500/30 mb-6">
          <CheckCircle2 className="h-10 w-10 stroke-[2.5]" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Booking Confirmed! 🎉
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Your reservation is complete and your tickets have been generated.
        </p>

        <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 font-mono font-bold text-sm tracking-wider">
          REFERENCE: {booking.bookingReference}
        </div>

        {/* Digital Ticket Card with QR Code */}
        <div className="mt-8 bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-left relative overflow-hidden">
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            {/* QR Code */}
            <div className="p-3 bg-white rounded-2xl shadow-xl shrink-0">
              <img src={booking.qrCodeData} alt="Ticket QR" className="w-44 h-44 object-contain" />
            </div>

            {/* Event Summary */}
            <div className="flex-1 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                  {booking.show.event?.category}
                </span>
                <h3 className="text-xl font-bold text-white leading-tight">
                  {booking.show.event?.title}
                </h3>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{showTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{booking.show.venue?.name}, {booking.show.venue?.city}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-brand-400 font-bold">
                  <Ticket className="h-4 w-4 shrink-0" />
                  <span>Seats: {seatLabels}</span>
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-400">
                Total Paid: <strong className="text-white font-mono">${booking.totalAmount.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs transition-all shadow-lg shadow-brand-500/20"
            >
              <Download className="h-4 w-4" /> Download QR Pass (.PNG)
            </button>

            <Link
              to="/bookings"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
            >
              View in My Bookings <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Email Notice */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
          <Mail className="h-4 w-4 text-brand-400" />
          <span>A copy of your booking and QR ticket has been sent to your email.</span>
        </div>
      </div>
    </div>
  );
};
