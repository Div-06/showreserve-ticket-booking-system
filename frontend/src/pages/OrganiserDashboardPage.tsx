import React, { useState, useEffect } from 'react';
import { OrganiserSummary, EventCategory, Venue } from '../types';
import api from '../api/client';
import {
  DollarSign,
  Ticket,
  CheckCircle2,
  XCircle,
  Plus,
  Calendar,
  Film,
  Music,
  BarChart3,
  Layers,
  Crown,
  Sparkles,
  Armchair,
} from 'lucide-react';

export const OrganiserDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<OrganiserSummary | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // New Event Modal State
  const [showEventModal, setShowEventModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<EventCategory>('MOVIE');
  const [newDuration, setNewDuration] = useState(120);
  const [newBanner, setNewBanner] = useState('');

  // New Show Modal State
  const [showShowModal, setShowShowModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [showStartTime, setShowStartTime] = useState('');
  const [showEndTime, setShowEndTime] = useState('');
  const [vipPrice, setVipPrice] = useState(50);
  const [premiumPrice, setPremiumPrice] = useState(30);
  const [standardPrice, setStandardPrice] = useState(15);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, venuesRes] = await Promise.all([
        api.get<OrganiserSummary>('/organiser/dashboard'),
        api.get<Venue[]>('/venues'),
      ]);
      setSummary(summaryRes.data);
      setVenues(venuesRes.data);
      if (summaryRes.data.events.length > 0) {
        setSelectedEventId(summaryRes.data.events[0].id);
      }
      if (venuesRes.data.length > 0) {
        setSelectedVenueId(venuesRes.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load organiser dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/events', {
        title: newTitle,
        description: newDescription,
        category: newCategory,
        durationMinutes: Number(newDuration),
        bannerUrl: newBanner || undefined,
      });
      setShowEventModal(false);
      setNewTitle('');
      setNewDescription('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create event');
    }
  };

  const handleCreateShow = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/shows', {
        eventId: selectedEventId,
        venueId: selectedVenueId,
        startTime: new Date(showStartTime).toISOString(),
        endTime: new Date(showEndTime).toISOString(),
        pricing: {
          VIP: Number(vipPrice),
          PREMIUM: Number(premiumPrice),
          STANDARD: Number(standardPrice),
        },
      });
      setShowShowModal(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create show');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 animate-pulse text-center">
        <div className="h-8 bg-slate-800 rounded w-1/3 mx-auto mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-32 bg-slate-900 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const metrics = summary?.metrics || {
    totalEvents: 0,
    totalRevenue: 0,
    totalTicketsSold: 0,
    totalConfirmedBookings: 0,
    totalCancelledBookings: 0,
    ticketsByCategory: { VIP: 0, PREMIUM: 0, STANDARD: 0 },
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Organiser Analytics Portal</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time revenue monitoring, ticket sales by tier, and show schedule management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowEventModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs transition-all shadow-md shadow-brand-500/10"
          >
            <Plus className="h-4 w-4" /> New Event
          </button>
          <button
            onClick={() => setShowShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            <Calendar className="h-4 w-4 text-brand-400" /> Schedule Showtime
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Revenue</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3 font-mono">
            ${metrics.totalRevenue.toFixed(2)}
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">Live Settlement</span>
        </div>

        <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tickets Sold</span>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Ticket className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3 font-mono">
            {metrics.totalTicketsSold}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Across all shows</span>
        </div>

        <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Confirmed Bookings</span>
            <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3 font-mono">
            {metrics.totalConfirmedBookings}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Completed checkouts</span>
        </div>

        <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Cancellations</span>
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-3 font-mono">
            {metrics.totalCancelledBookings}
          </div>
          <span className="text-[11px] text-rose-400 font-semibold mt-1 block">Auto-reallocated to FIFO waitlist</span>
        </div>
      </div>

      {/* Category Distribution Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-navy-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold">VIP Tickets Sold</div>
            <div className="text-xl font-extrabold text-white font-mono mt-0.5">
              {metrics.ticketsByCategory.VIP}
            </div>
          </div>
        </div>

        <div className="bg-navy-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold">Premium Tickets Sold</div>
            <div className="text-xl font-extrabold text-white font-mono mt-0.5">
              {metrics.ticketsByCategory.PREMIUM}
            </div>
          </div>
        </div>

        <div className="bg-navy-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-700/30 text-slate-300 flex items-center justify-center shrink-0">
            <Armchair className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold">Standard Tickets Sold</div>
            <div className="text-xl font-extrabold text-white font-mono mt-0.5">
              {metrics.ticketsByCategory.STANDARD}
            </div>
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-navy-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <h2 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand-400" /> Event Performance Breakdown
        </h2>

        {!summary?.events || summary.events.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No events created yet. Click "New Event" above to create your first listing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                <tr>
                  <th className="pb-3 font-semibold">Event</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Showtimes</th>
                  <th className="pb-3 font-semibold">Tickets Sold</th>
                  <th className="pb-3 font-semibold">Bookings</th>
                  <th className="pb-3 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {summary.events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 font-bold text-white max-w-xs truncate">{event.title}</td>
                    <td className="py-4">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
                        {event.category}
                      </span>
                    </td>
                    <td className="py-4 text-slate-300">{event.showsCount} scheduled</td>
                    <td className="py-4 font-mono font-bold text-white">{event.ticketsSold}</td>
                    <td className="py-4 text-slate-300 font-mono">
                      {event.confirmedBookings} <span className="text-slate-500">({event.cancelledBookings} cancelled)</span>
                    </td>
                    <td className="py-4 font-mono font-extrabold text-brand-400 text-right text-sm">
                      ${event.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Event */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-navy-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Create New Event Listing</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Inception: Live Orchestra"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Event synopsis..."
                  className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as EventCategory)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  >
                    <option value="MOVIE">Movie</option>
                    <option value="CONCERT">Concert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Duration (Mins)</label>
                  <input
                    type="number"
                    min={1}
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Banner Image URL</label>
                <input
                  type="url"
                  value={newBanner}
                  onChange={(e) => setNewBanner(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Schedule Show */}
      {showShowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-navy-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Schedule Event Showtime</h2>
            <form onSubmit={handleCreateShow} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Event</label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                >
                  {summary?.events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Venue</label>
                <select
                  value={selectedVenueId}
                  onChange={(e) => setSelectedVenueId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
                >
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={showStartTime}
                    onChange={(e) => setShowStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={showEndTime}
                    onChange={(e) => setShowEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-semibold text-slate-300">Category Pricing ($ USD)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-amber-400 font-bold block mb-1">VIP</span>
                    <input
                      type="number"
                      min={1}
                      value={vipPrice}
                      onChange={(e) => setVipPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-purple-400 font-bold block mb-1">Premium</span>
                    <input
                      type="number"
                      min={1}
                      value={premiumPrice}
                      onChange={(e) => setPremiumPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">Standard</span>
                    <input
                      type="number"
                      min={1}
                      value={standardPrice}
                      onChange={(e) => setStandardPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-xs"
                >
                  Schedule Show
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
