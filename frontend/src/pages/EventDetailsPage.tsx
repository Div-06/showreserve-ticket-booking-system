import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { EventItem, ShowItem } from '../types';
import api from '../api/client';
import { Calendar, Clock, Film, Music, MapPin, Ticket, ShieldCheck, ChevronRight } from 'lucide-react';

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      api
        .get<EventItem>(`/events/${id}`)
        .then((res) => setEvent(res.data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 animate-pulse text-center">
        <div className="h-64 bg-slate-900 rounded-2xl max-w-4xl mx-auto mb-6" />
        <div className="h-8 bg-slate-800 rounded w-1/3 mx-auto" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white">Event Not Found</h2>
        <Link to="/events" className="mt-4 inline-block text-brand-400 hover:underline">
          Return to Events
        </Link>
      </div>
    );
  }

  const isConcert = event.category === 'CONCERT';

  return (
    <div className="min-h-screen pb-24">
      {/* Event Header Banner */}
      <div className="relative border-b border-slate-800 bg-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Poster */}
            <div className="w-full md:w-72 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl bg-slate-800 border border-slate-700/80 shrink-0">
              <img
                src={event.bannerUrl || 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86'}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Details */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    isConcert ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isConcert ? <Music className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
                  {event.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" /> {event.durationMinutes} Minutes
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                {event.title}
              </h1>

              <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
                {event.description}
              </p>

              {event.organiser && (
                <div className="pt-2 text-xs text-slate-400">
                  Presented by <strong className="text-slate-200">{event.organiser.name}</strong>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Showtimes & Booking Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <h2 className="text-2xl font-extrabold text-white mb-6 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-brand-400" /> Available Showtimes
        </h2>

        {!event.shows || event.shows.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400">
            No scheduled shows at this moment. Please check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {event.shows.map((show) => {
              const dateObj = new Date(show.startTime);
              const dateStr = dateObj.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              });
              const timeStr = dateObj.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              const pricing = (show.pricing as Record<string, number>) || {};

              return (
                <div
                  key={show.id}
                  className="bg-navy-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-brand-500/50 transition-all shadow-xl"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-brand-500/10 text-brand-400 font-bold text-xs">
                        {dateStr}
                      </span>
                      <span className="text-sm font-extrabold text-white font-mono">{timeStr}</span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-brand-400 shrink-0" />
                        {show.venue?.name}
                      </h4>
                      <p className="text-xs text-slate-400 ml-5">{show.venue?.address}, {show.venue?.city}</p>
                    </div>

                    {/* Pricing Tiers Preview */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Tickets starting from:</span>
                      <span className="text-sm font-extrabold text-brand-400">
                        ${pricing.STANDARD || 15}
                      </span>
                    </div>
                  </div>

                  <Link
                    to={`/shows/${show.id}/seats`}
                    className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-sm transition-all shadow-lg shadow-brand-500/20"
                  >
                    <Ticket className="h-4 w-4" /> Select Seats <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
