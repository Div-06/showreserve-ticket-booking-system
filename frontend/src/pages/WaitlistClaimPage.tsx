import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { HoldTimer } from '../components/HoldTimer';
import api from '../api/client';
import {
  Sparkles,
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  MapPin,
  CreditCard,
  Lock,
} from 'lucide-react';

export const WaitlistClaimPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [offerData, setOfferData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No waitlist offer token provided');
      setLoading(false);
      return;
    }

    api
      .get(`/waitlists/offers/${token}`)
      .then((res) => {
        setOfferData(res.data);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'Invalid or expired waitlist offer token');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleAcceptOffer = async () => {
    if (!token) return;
    setAccepting(true);
    setError(null);

    try {
      const res = await api.post('/waitlists/offers/accept', {
        token,
        paymentMethod: 'MOCK_WAITLIST_PAYMENT',
      });

      navigate(`/booking-success?bookingId=${res.data.booking.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to claim waitlist seat.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center animate-pulse">
        <div className="h-10 bg-slate-800 rounded w-1/2 mx-auto mb-6" />
        <div className="h-64 bg-slate-900 rounded-3xl" />
      </div>
    );
  }

  if (error || !offerData) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Waitlist Offer Unavailable</h2>
        <p className="text-sm text-slate-400 mt-2">{error || 'This offer may have expired or been fulfilled.'}</p>
        <Link
          to="/events"
          className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-brand-500 text-black font-bold text-xs"
        >
          Browse All Events
        </Link>
      </div>
    );
  }

  const isExpired = offerData.offer.status === 'EXPIRED';

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-xl mx-auto">
      <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center pb-6 border-b border-slate-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="h-3.5 w-3.5" /> Exclusive Waitlist Claim
          </div>
          <h1 className="text-2xl font-extrabold text-white">A Seat Opened Up For You!</h1>
          <p className="text-xs text-slate-400 mt-1">
            Hi {offerData.customer.name}, you are next in line. Complete your claim before the timer expires.
          </p>
        </div>

        {/* Offer Timer Banner */}
        <div className="flex items-center justify-between p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60">
          <div className="text-xs text-slate-300">
            <span className="font-bold text-white block">Offer Expiration</span>
            <span className="text-[11px] text-slate-400">Claim expires automatically</span>
          </div>
          <HoldTimer expiresAt={offerData.offer.expiresAt} />
        </div>

        {/* Seat Offer Details */}
        <div className="bg-slate-800/40 rounded-2xl p-5 border border-slate-700/50 space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-400">
              {offerData.show.event?.category}
            </span>
            <h3 className="text-lg font-bold text-white">{offerData.show.event?.title}</h3>
          </div>

          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span>
                {new Date(offerData.show.startTime).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>{offerData.show.venue?.name}, {offerData.show.venue?.city}</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Offered Seat:</div>
              <div className="text-base font-extrabold text-white font-mono">
                Seat {offerData.seat.seatNumber} ({offerData.seat.category})
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Price:</div>
              <div className="text-xl font-extrabold text-brand-400 font-mono">
                ${offerData.seat.price.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleAcceptOffer}
          disabled={accepting || isExpired}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-extrabold text-sm transition-all shadow-xl shadow-brand-500/20 disabled:opacity-50"
        >
          {accepting
            ? 'Issuing Tickets...'
            : isExpired
              ? 'Offer Expired'
              : `Claim & Book Seat ($${offerData.seat.price.toFixed(2)}) ⚡`}
        </button>
      </div>
    </div>
  );
};
