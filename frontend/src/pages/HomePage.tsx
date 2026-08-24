import React, { useState, useEffect } from 'react';
import { EventItem, EventCategory } from '../types';
import { EventCard } from '../components/EventCard';
import api from '../api/client';
import { Search, Sparkles, Filter, Ticket, Film, Music, ShieldCheck, Zap } from 'lucide-react';

import { FALLBACK_EVENTS } from '../data/fallbackData';

export const HomePage: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | 'ALL'>('ALL');

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (search) params.search = search;

      const res = await api.get<EventItem[]>('/events', { params });
      if (res.data && res.data.length > 0) {
        setEvents(res.data);
      } else {
        const filtered = selectedCategory === 'ALL'
          ? FALLBACK_EVENTS
          : FALLBACK_EVENTS.filter((e) => e.category === selectedCategory);
        setEvents(filtered);
      }
    } catch (err) {
      console.warn('Backend API unreachable, using showcase events dataset for Vercel preview:', err);
      const filtered = selectedCategory === 'ALL'
        ? FALLBACK_EVENTS
        : FALLBACK_EVENTS.filter((e) => e.category === selectedCategory);
      setEvents(filtered);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-navy-900 via-navy-950 to-navy-950 py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Zap className="h-3.5 w-3.5" /> High-Demand Ticket Booking Platform
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
            Experience Live Shows with{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-emerald-300">
              Zero Race Conditions
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Real-time interactive seat maps, race-condition-safe distributed locks, automatic 10-minute hold TTL releases, and automatic FIFO waitlist reallocation.
          </p>

          {/* Quick Filter Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-8 max-w-2xl mx-auto flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search movies, concerts, artists, or venues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-brand-500 transition-colors shadow-xl"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-sm transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2 shrink-0"
            >
              Search
            </button>
          </form>

          {/* Category Quick Chips */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-brand-500 text-black'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setSelectedCategory('MOVIE')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedCategory === 'MOVIE'
                  ? 'bg-brand-500 text-black'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Film className="h-3.5 w-3.5" /> Movies & IMAX
            </button>
            <button
              onClick={() => setSelectedCategory('CONCERT')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                selectedCategory === 'CONCERT'
                  ? 'bg-brand-500 text-black'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Music className="h-3.5 w-3.5" /> Live Concerts
            </button>
          </div>
        </div>
      </div>

      {/* Feature Highlights Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 p-2">
            <div className="h-10 w-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center font-bold shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Redis Distributed Locking</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Atomic isolation prevents duplicate holds across concurrent users.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 border-t md:border-t-0 md:border-l border-slate-800">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Postgres Row Locking (FOR UPDATE)</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Authoritative source of truth guaranteeing strict serializable state.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2 border-t md:border-t-0 md:border-l border-slate-800">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Automated FIFO Waitlists</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Immediate seat reallocation and time-limited claims on cancellation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-14">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Featured Showtimes</h2>
            <p className="text-xs text-slate-400 mt-1">
              Select an event to view structured seat maps and real-time availability.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {events.length} {events.length === 1 ? 'event' : 'events'} available
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-96 rounded-2xl bg-slate-900 border border-slate-800" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
            <Ticket className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No Events Found</h3>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
