import React from 'react';
import { X, Download, Ticket, Calendar, MapPin, CheckCircle2 } from 'lucide-react';
import { BookingItem } from '../types';

interface QRCodeModalProps {
  booking: BookingItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ booking, isOpen, onClose }) => {
  if (!isOpen || !booking) return null;

  const showTime = new Date(booking.show.startTime).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const seatLabels = booking.seats.map((s) => s.seatNumber).join(', ');

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = booking.qrCodeData;
    link.download = `ticket-${booking.bookingReference}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-navy-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Ticket Header */}
        <div className="text-center pb-5 border-b border-slate-800">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> Official Ticket Pass
          </div>
          <h2 className="text-xl font-extrabold text-white">{booking.show.event?.title || 'Event Pass'}</h2>
          <p className="text-xs text-brand-400 font-mono font-bold mt-1 tracking-wider">
            REF: {booking.bookingReference}
          </p>
        </div>

        {/* QR Code Presentation */}
        <div className="flex flex-col items-center justify-center py-6">
          <div className="p-3 bg-white rounded-xl shadow-lg shadow-black/50">
            <img src={booking.qrCodeData} alt="Booking QR Ticket" className="w-52 h-52 object-contain" />
          </div>
          <span className="text-[11px] text-slate-400 mt-2 font-mono">
            Scan at gate scanner for entry validation
          </span>
        </div>

        {/* Details Grid */}
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-2 text-xs border border-slate-700/50 mb-5">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="h-3.5 w-3.5 text-slate-400" /> Showtime
            </span>
            <span className="font-semibold text-white">{showTime}</span>
          </div>

          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="h-3.5 w-3.5 text-slate-400" /> Venue
            </span>
            <span className="font-semibold text-white">{booking.show.venue?.name}</span>
          </div>

          <div className="flex items-center justify-between text-slate-300 border-t border-slate-700/60 pt-2 mt-2">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Ticket className="h-3.5 w-3.5 text-brand-400" /> Seats
            </span>
            <span className="font-bold text-brand-400 font-mono text-sm">{seatLabels}</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-black font-bold text-sm transition-all shadow-lg shadow-brand-500/20"
        >
          <Download className="h-4 w-4" /> Download QR Pass (.PNG)
        </button>
      </div>
    </div>
  );
};
