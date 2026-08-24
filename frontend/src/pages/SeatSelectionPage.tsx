import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShowItem, SeatMapItem, HoldItem } from '../types';
import { SeatGrid } from '../components/SeatGrid';
import { HoldTimer } from '../components/HoldTimer';
import { WaitlistModal } from '../components/WaitlistModal';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/client';
import {
  Calendar,
  MapPin,
  Ticket,
  Clock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Users,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const SeatSelectionPage: React.FC = () => {
  const { id: showId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { joinShow, leaveShow, onSeatUpdate } = useSocket();

  const [show, setShow] = useState<ShowItem | null>(null);
  const [seats, setSeats] = useState<SeatMapItem[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [activeHold, setActiveHold] = useState<HoldItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  useEffect(() => {
    if (showId) {
      loadShowSeats();
      joinShow(showId);

      // Listen for live WebSocket updates
      const unsubscribe = onSeatUpdate((data) => {
        if (data.showId === showId) {
          setSeats((prevSeats) =>
            prevSeats.map((seat) => {
              if (data.seatIds.includes(seat.id)) {
                const isHeldByMe = data.heldByUserId ? data.heldByUserId === user?.id : false;
                return {
                  ...seat,
                  status: data.status,
                  isHeldByMe,
                  holdExpiresAt: data.holdExpiresAt || null,
                };
              }
              return seat;
            }),
          );
        }
      });

      return () => {
        leaveShow(showId);
        unsubscribe();
      };
    }
  }, [showId, user?.id]);

  const loadShowSeats = async () => {
    if (!showId) return;
    try {
      const res = await api.get(`/shows/${showId}/seats`);
      setShow(res.data.show);
      setSeats(res.data.seats);

      // Check if user already holds seats in this show
      const myHeldSeats = res.data.seats.filter((s: SeatMapItem) => s.isHeldByMe && s.holdId);
      if (myHeldSeats.length > 0) {
        const holdId = myHeldSeats[0].holdId;
        const expiresAt = myHeldSeats[0].holdExpiresAt;
        if (holdId && expiresAt) {
          setActiveHold({
            id: holdId,
            showId,
            customerId: user?.id || '',
            status: 'ACTIVE',
            expiresAt,
            showSeats: myHeldSeats,
          });
          setSelectedSeatIds(myHeldSeats.map((s: SeatMapItem) => s.id));
        }
      }
    } catch (err) {
      console.error('Failed to load seats', err);
      setError('Could not load seat map. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSeat = (seat: SeatMapItem) => {
    setError(null);
    if (activeHold) {
      setError('You currently have an active hold. Complete checkout or release your hold to select new seats.');
      return;
    }

    if (selectedSeatIds.includes(seat.id)) {
      setSelectedSeatIds(selectedSeatIds.filter((id) => id !== seat.id));
    } else {
      setSelectedSeatIds([...selectedSeatIds, seat.id]);
    }
  };

  const handleCreateHold = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { returnUrl: `/shows/${showId}/seats` } });
      return;
    }

    if (selectedSeatIds.length === 0) return;

    setHolding(true);
    setError(null);

    try {
      const res = await api.post<HoldItem>('/holds', {
        showId,
        showSeatIds: selectedSeatIds,
      });

      setActiveHold(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Failed to reserve seats. They may have been selected by another customer.',
      );
      // Reload seat state
      loadShowSeats();
    } finally {
      setHolding(false);
    }
  };

  const handleReleaseHold = async () => {
    if (!activeHold) return;
    try {
      await api.delete(`/holds/${activeHold.id}`);
      setActiveHold(null);
      setSelectedSeatIds([]);
      loadShowSeats();
    } catch (err) {
      console.error('Failed to release hold', err);
    }
  };

  const handleHoldExpired = () => {
    setActiveHold(null);
    setSelectedSeatIds([]);
    setError('Your seat hold has expired. The seats have been released back to the general pool.');
    loadShowSeats();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/3 mx-auto mb-8" />
        <div className="h-96 bg-slate-900 rounded-2xl max-w-4xl mx-auto" />
      </div>
    );
  }

  if (!show) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white">Show Not Found</h2>
      </div>
    );
  }

  const selectedSeatsList = seats.filter((s) => selectedSeatIds.includes(s.id));
  const totalPrice = selectedSeatsList.reduce((sum, s) => sum + s.price, 0);

  const availableSeatsCount = seats.filter((s) => s.status === 'AVAILABLE').length;
  const isSoldOut = availableSeatsCount === 0;

  return (
    <div className="min-h-screen pb-32">
      {/* Top Header Bar */}
      <div className="border-b border-slate-800 bg-navy-900/60 backdrop-blur-md sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-400 font-bold text-[10px] uppercase tracking-wider">
                {show.event?.category}
              </span>
              <h1 className="text-xl font-extrabold text-white">{show.event?.title}</h1>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-brand-400" />
                {show.venue?.name}, {show.venue?.city}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-brand-400" />
                {new Date(show.startTime).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          </div>

          {/* Real-time Status / Timer */}
          <div className="flex items-center gap-3">
            {activeHold ? (
              <div className="flex items-center gap-3">
                <HoldTimer expiresAt={activeHold.expiresAt} onExpire={handleHoldExpired} />
                <button
                  onClick={handleReleaseHold}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors"
                >
                  Release
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Map Connection
                </div>
                <button
                  onClick={loadShowSeats}
                  className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors"
                  title="Refresh seats"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {error && (
          <div className="mb-6 flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-sm text-rose-300 animate-shake">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs text-rose-400 hover:text-rose-200 underline font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {isSoldOut && (
          <div className="mb-8 p-6 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-brand-500/10 border border-amber-500/30 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-amber-300 flex items-center gap-2">
                <Sparkles className="h-5 w-5" /> This Show is Currently Sold Out!
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Don't worry! Join our First-In, First-Out (FIFO) waitlist. When any customer cancels a booking, seats are automatically reallocated to you!
              </p>
            </div>
            <button
              onClick={() => setIsWaitlistOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/20 shrink-0 flex items-center gap-2"
            >
              <Users className="h-4 w-4" /> Join Waitlist Priority
            </button>
          </div>
        )}

        {/* Visual Interactive Seat Map */}
        <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden">
          <SeatGrid
            seats={seats}
            selectedSeatIds={selectedSeatIds}
            totalRows={show.venue?.totalRows || 8}
            totalCols={show.venue?.totalCols || 12}
            aisles={show.venue?.aisles || []}
            onToggleSeat={handleToggleSeat}
            disabled={!!activeHold}
          />
        </div>
      </div>

      {/* Floating Bottom Checkout / Hold Drawer */}
      {selectedSeatIds.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-navy-900/95 backdrop-blur-xl border-t border-slate-800 p-4 sm:p-6 z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] animate-slide-up">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-500/10 text-brand-400 rounded-xl">
                <Ticket className="h-6 w-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400">
                  {selectedSeatIds.length} {selectedSeatIds.length === 1 ? 'Seat' : 'Seats'} Selected
                </div>
                <div className="text-sm font-extrabold text-white font-mono">
                  {selectedSeatsList.map((s) => s.seatNumber).join(', ')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
              <div className="text-right">
                <div className="text-xs text-slate-400">Total Price</div>
                <div className="text-xl font-extrabold text-brand-400 font-mono">
                  ${totalPrice.toFixed(2)}
                </div>
              </div>

              {activeHold ? (
                <Link
                  to={`/checkout?holdId=${activeHold.id}`}
                  className="px-8 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-extrabold text-sm transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2"
                >
                  Checkout Now <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  onClick={handleCreateHold}
                  disabled={holding}
                  className="px-8 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-extrabold text-sm transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {holding ? 'Holding Seats...' : 'Hold & Proceed ⚡'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Waitlist Modal */}
      {showId && show && (
        <WaitlistModal
          showId={showId}
          showTitle={show.event?.title || 'Show'}
          isOpen={isWaitlistOpen}
          onClose={() => setIsWaitlistOpen(false)}
        />
      )}
    </div>
  );
};
