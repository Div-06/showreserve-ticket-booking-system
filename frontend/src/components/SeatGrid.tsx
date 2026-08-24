import React from 'react';
import { SeatMapItem, SeatCategory } from '../types';
import { Sparkles, Crown, Armchair } from 'lucide-react';

interface SeatGridProps {
  seats: SeatMapItem[];
  selectedSeatIds: string[];
  totalRows: number;
  totalCols: number;
  aisles: number[];
  onToggleSeat: (seat: SeatMapItem) => void;
  disabled?: boolean;
}

export const SeatGrid: React.FC<SeatGridProps> = ({
  seats,
  selectedSeatIds,
  totalRows,
  totalCols,
  aisles,
  onToggleSeat,
  disabled = false,
}) => {
  // Group seats by rowLabel
  const rowsMap = new Map<string, SeatMapItem[]>();
  for (const seat of seats) {
    if (!rowsMap.has(seat.rowLabel)) {
      rowsMap.set(seat.rowLabel, []);
    }
    rowsMap.get(seat.rowLabel)!.push(seat);
  }

  // Sort rows alphabetically
  const sortedRowKeys = Array.from(rowsMap.keys()).sort();
  for (const key of sortedRowKeys) {
    rowsMap.get(key)!.sort((a, b) => a.colNumber - b.colNumber);
  }

  const getCategoryBadge = (cat: SeatCategory) => {
    switch (cat) {
      case 'VIP':
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-400">
            <Crown className="h-3 w-3" /> VIP
          </span>
        );
      case 'PREMIUM':
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-purple-400">
            <Sparkles className="h-3 w-3" /> Premium
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
            <Armchair className="h-3 w-3" /> Standard
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Screen / Stage Projection Bar */}
      <div className="w-full max-w-2xl mb-12 flex flex-col items-center">
        <div className="w-full h-3 bg-gradient-to-r from-transparent via-brand-500/80 to-transparent rounded-full shadow-[0_0_25px_rgba(34,197,94,0.6)]" />
        <div className="w-3/4 h-8 bg-gradient-to-b from-brand-500/10 to-transparent border-t border-brand-500/30 rounded-t-[100px] flex items-center justify-center -mt-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-brand-400/80">
            SCREEN / STAGE
          </span>
        </div>
      </div>

      {/* Seat Map Matrix */}
      <div className="overflow-x-auto w-full py-4 flex justify-center">
        <div className="inline-flex flex-col gap-3 min-w-max px-4">
          {sortedRowKeys.map((rowKey) => {
            const rowSeats = rowsMap.get(rowKey) || [];
            return (
              <div key={rowKey} className="flex items-center gap-3">
                {/* Row Label (Left) */}
                <div className="w-6 text-center text-xs font-bold text-slate-400 font-mono">
                  {rowKey}
                </div>

                {/* Seat Buttons */}
                <div className="flex items-center gap-2">
                  {rowSeats.map((seat) => {
                    const isSelected = selectedSeatIds.includes(seat.id);
                    const isAvailable = seat.status === 'AVAILABLE';
                    const isHeldByMe = seat.isHeldByMe || isSelected;
                    const isHeldByOther = seat.status === 'HELD' && !seat.isHeldByMe && !isSelected;
                    const isBooked = seat.status === 'BOOKED';

                    const isAisleAfter = aisles.includes(seat.colNumber);

                    let seatBg = 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/50 text-emerald-300';
                    let title = `${seat.seatNumber} (${seat.category}) - $${seat.price} [Available]`;

                    if (isHeldByMe) {
                      seatBg = 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 scale-105';
                      title = `${seat.seatNumber} - Held by You ($${seat.price})`;
                    } else if (isHeldByOther) {
                      seatBg = 'bg-amber-600/30 border-amber-500/40 text-amber-300/80 cursor-not-allowed';
                      title = `${seat.seatNumber} - Currently Held by Another Customer`;
                    } else if (isBooked) {
                      seatBg = 'bg-rose-950/40 border-rose-800/30 text-rose-500/40 cursor-not-allowed';
                      title = `${seat.seatNumber} - Booked`;
                    }

                    // Category accent indicators
                    let categoryBorder = '';
                    if (seat.category === 'VIP' && isAvailable && !isSelected) {
                      categoryBorder = 'ring-1 ring-amber-400/40';
                    } else if (seat.category === 'PREMIUM' && isAvailable && !isSelected) {
                      categoryBorder = 'ring-1 ring-purple-400/40';
                    }

                    return (
                      <React.Fragment key={seat.id}>
                        <button
                          type="button"
                          disabled={disabled || isBooked || isHeldByOther}
                          onClick={() => onToggleSeat(seat)}
                          title={title}
                          className={`
                            relative w-9 h-9 rounded-t-lg rounded-b-md flex flex-col items-center justify-center
                            border text-xs font-semibold font-mono transition-all duration-150
                            ${seatBg}
                            ${categoryBorder}
                            ${!isBooked && !isHeldByOther && !disabled ? 'cursor-pointer active:scale-95' : ''}
                          `}
                        >
                          <span className="text-[11px] leading-none">{seat.seatNumber}</span>
                          <span className="text-[8px] opacity-75 leading-none mt-0.5">
                            ${seat.price}
                          </span>
                        </button>

                        {/* Gap for Aisle */}
                        {isAisleAfter && <div className="w-6" />}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Row Label (Right) */}
                <div className="w-6 text-center text-xs font-bold text-slate-400 font-mono">
                  {rowKey}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Categories */}
      <div className="mt-8 pt-6 border-t border-slate-800/80 w-full flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/50" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-600 border border-blue-400 shadow-sm" />
          <span className="font-semibold text-blue-300">Selected / Held by You</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-amber-600/30 border border-amber-500/40" />
          <span className="text-amber-300">Held by Someone Else</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-rose-950/40 border border-rose-800/30" />
          <span className="text-rose-400">Booked</span>
        </div>
      </div>
    </div>
  );
};
