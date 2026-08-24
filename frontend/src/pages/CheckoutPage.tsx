import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { HoldItem } from '../types';
import { HoldTimer } from '../components/HoldTimer';
import api from '../api/client';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  Ticket,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const holdId = searchParams.get('holdId');
  const navigate = useNavigate();

  const [hold, setHold] = useState<HoldItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock Payment Form States
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('987');
  const [cardHolder, setCardHolder] = useState('John Doe');

  useEffect(() => {
    if (!holdId) {
      navigate('/events');
      return;
    }

    api
      .get<HoldItem>(`/holds/${holdId}`)
      .then((res) => {
        setHold(res.data);
        if (res.data.status !== 'ACTIVE' || new Date(res.data.expiresAt) <= new Date()) {
          setError('This seat hold has already expired or been converted.');
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to retrieve hold details.');
      })
      .finally(() => setLoading(false));
  }, [holdId]);

  const handleHoldExpired = () => {
    setError('Your seat reservation has expired. Please return to the event page to select your seats again.');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holdId) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post('/bookings', {
        holdId,
        paymentMethod: 'MOCK_STRIPE_CARD',
      });

      navigate(`/booking-success?bookingId=${res.data.id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Payment confirmation failed. Your hold may have expired.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3 mx-auto mb-6" />
        <div className="h-64 bg-slate-900 rounded-2xl" />
      </div>
    );
  }

  if (!hold || !hold.show) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white">Hold Not Found</h2>
        <Link to="/events" className="mt-4 inline-block text-brand-400 hover:underline">
          Return to Events
        </Link>
      </div>
    );
  }

  const pricing = (hold.show.pricing as Record<string, number>) || {};
  let totalAmount = 0;
  const seatDetails = hold.showSeats.map((ss) => {
    const price = pricing[ss.seat.category] || 20;
    totalAmount += price;
    return {
      ...ss.seat,
      price,
    };
  });

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link
          to={`/shows/${hold.showId}/seats`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Seat Map
        </Link>

        {/* Hold Expiry Banner */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-navy-900 border border-slate-800 rounded-2xl mb-8 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold shrink-0">
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Temporary Seat Hold Active</h3>
              <p className="text-xs text-slate-400">
                Complete your checkout before the timer expires to secure your seats.
              </p>
            </div>
          </div>
          <HoldTimer expiresAt={hold.expiresAt} onExpire={handleHoldExpired} />
        </div>

        {error && (
          <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-sm text-rose-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Payment Form (Left 7 Cols) */}
          <div className="md:col-span-7 bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-6 border-b border-slate-800">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-brand-400" /> Payment Details
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Mock Gateway
              </span>
            </div>

            <form onSubmit={handleConfirmPayment} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cardholder Name</label>
                <input
                  type="text"
                  required
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-brand-500"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Expiry Date</label>
                  <input
                    type="text"
                    required
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">CVC / CVV</label>
                  <input
                    type="text"
                    required
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm font-mono focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 text-[11px] text-slate-400 leading-relaxed">
                ℹ️ This is a simulated instant payment sandbox. Clicking "Confirm & Pay" will atomically convert your hold to a confirmed booking, generate your cryptographic QR code ticket, and email your pass.
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-extrabold text-base transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50"
              >
                {submitting ? 'Processing Transaction...' : `Confirm & Pay $${totalAmount.toFixed(2)} 🚀`}
              </button>
            </form>
          </div>

          {/* Order Summary (Right 5 Cols) */}
          <div className="md:col-span-5 bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white pb-4 border-b border-slate-800">
                Order Summary
              </h2>

              <div className="mt-4 space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
                    {hold.show.event?.category}
                  </span>
                  <h3 className="text-lg font-bold text-white">{hold.show.event?.title}</h3>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{hold.show.venue?.name}, {hold.show.venue?.city}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>
                      {new Date(hold.show.startTime).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>

                {/* Seat Breakdown */}
                <div className="pt-4 border-t border-slate-800/80 space-y-2">
                  <div className="text-xs font-semibold text-slate-400">Reserved Seats:</div>
                  {seatDetails.map((seat) => (
                    <div key={seat.id} className="flex items-center justify-between text-xs">
                      <span className="font-mono text-white font-bold">
                        Seat {seat.seatNumber} ({seat.category})
                      </span>
                      <span className="font-mono text-brand-400 font-bold">${seat.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 mt-6">
              <div className="flex items-center justify-between text-base font-extrabold text-white">
                <span>Total Due:</span>
                <span className="text-2xl text-brand-400 font-mono">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
