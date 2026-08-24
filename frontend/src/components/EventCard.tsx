import React from 'react';
import { Link } from 'react-router-dom';
import { EventItem } from '../types';
import { Calendar, Clock, Film, Music, MapPin, Ticket } from 'lucide-react';

interface EventCardProps {
  event: EventItem;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const isConcert = event.category === 'CONCERT';
  const showCount = event.shows?.length || 0;
  const nextShow = event.shows?.[0];

  const defaultBanner = isConcert
    ? 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=1200&auto=format&fit=crop'
    : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1200&auto=format&fit=crop';

  return (
    <div className="group rounded-2xl bg-navy-900 border border-slate-800/80 hover:border-brand-500/50 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-brand-500/10 transition-all duration-300 flex flex-col">
      {/* Banner Image */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-800">
        <img
          src={event.bannerUrl || defaultBanner}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/20 to-transparent" />

        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
              isConcert
                ? 'bg-purple-500/90 text-white shadow-lg shadow-purple-500/30'
                : 'bg-emerald-500/90 text-black shadow-lg shadow-emerald-500/30'
            }`}
          >
            {isConcert ? <Music className="h-3 w-3" /> : <Film className="h-3 w-3" />}
            {event.category}
          </span>
        </div>

        {/* Duration */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-slate-200">
            <Clock className="h-3 w-3 text-slate-400" />
            {event.durationMinutes}m
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-brand-400 transition-colors line-clamp-1">
            {event.title}
          </h3>
          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex flex-col text-xs text-slate-400">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <Calendar className="h-3.5 w-3.5 text-brand-400" />
              {showCount} {showCount === 1 ? 'Showtime' : 'Showtimes'}
            </span>
            {nextShow?.venue && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                <MapPin className="h-3 w-3 text-slate-400" />
                {nextShow.venue.city}
              </span>
            )}
          </div>

          <Link
            to={`/events/${event.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-black font-semibold text-xs transition-all"
          >
            <Ticket className="h-3.5 w-3.5" /> Book Now
          </Link>
        </div>
      </div>
    </div>
  );
};
