import React, { useState } from 'react';
import { X, Clock, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { SeatCategory } from '../types';
import api from '../api/client';

interface WaitlistModalProps {
  showId: string;
  showTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onJoined?: () => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  showId,
  showTitle,
  isOpen,
  onClose,
  onJoined,
}) => {
  const [category, setCategory] = useState<SeatCategory>('PREMIUM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ queuePosition: number } | null>(null);

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/waitlists', {
        showId,
        category,
      });

      setSuccessData({ queuePosition: res.data.queuePosition || 1 });
      if (onJoined) onJoined();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-navy-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {successData ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-white">You're on the Waitlist!</h2>
            <p className="text-sm text-slate-300">
              You are currently <strong className="text-brand-400">#{successData.queuePosition}</strong> in line for a{' '}
              <strong>{category}</strong> seat on <em>{showTitle}</em>.
            </p>
            <div className="p-3 bg-slate-800/60 rounded-xl text-xs text-slate-400 border border-slate-700/50">
              ⚡ If any booking is cancelled, our FIFO engine will automatically send you an email with a 15-minute booking offer link!
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-sm transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Clock className="h-3.5 w-3.5" /> FIFO Priority Waitlist
              </div>
              <h2 className="text-xl font-extrabold text-white">Join Waitlist</h2>
              <p className="text-xs text-slate-400 mt-1">
                Seats sold out or reserved? Get first in line for cancellations.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Choose Desired Seat Category</label>
              <div className="grid grid-cols-3 gap-2">
                {(['VIP', 'PREMIUM', 'STANDARD'] as SeatCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      category === cat
                        ? 'bg-brand-500/20 border-brand-500 text-brand-300 shadow-md shadow-brand-500/10'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl text-[11px] text-slate-400 space-y-1">
              <p>• Waitlist order is strict First-In, First-Out (FIFO).</p>
              <p>• You will be notified via email when a seat frees up.</p>
              <p>• You will have a limited time window to claim the seat.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Joining Queue...' : 'Join Waitlist Priority ⚡'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
