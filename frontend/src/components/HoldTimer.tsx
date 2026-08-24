import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface HoldTimerProps {
  expiresAt: string;
  onExpire?: () => void;
}

export const HoldTimer: React.FC<HoldTimerProps> = ({ expiresAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState<{ minutes: number; seconds: number; totalSec: number }>({
    minutes: 0,
    seconds: 0,
    totalSec: 0,
  });

  useEffect(() => {
    const calculateTime = () => {
      const difference = new Date(expiresAt).getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ minutes: 0, seconds: 0, totalSec: 0 });
        if (onExpire) onExpire();
        return;
      }

      const totalSec = Math.floor(difference / 1000);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;
      setTimeLeft({ minutes, seconds, totalSec });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const isUrgent = timeLeft.totalSec <= 120 && timeLeft.totalSec > 0;
  const isExpired = timeLeft.totalSec === 0;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-mono text-sm font-semibold transition-all ${
        isExpired
          ? 'bg-rose-950/60 border-rose-700/80 text-rose-300 animate-pulse'
          : isUrgent
            ? 'bg-amber-950/60 border-amber-600/80 text-amber-300 animate-bounce'
            : 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
      }`}
    >
      {isUrgent ? (
        <AlertTriangle className="h-4 w-4 text-amber-400" />
      ) : (
        <Clock className="h-4 w-4 text-emerald-400" />
      )}
      <span>
        {isExpired
          ? 'HOLD EXPIRED'
          : `Reserved: ${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`}
      </span>
    </div>
  );
};
