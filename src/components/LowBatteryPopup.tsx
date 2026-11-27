import React, { useEffect, useState } from 'react';
import { BatteryWarning, X } from 'lucide-react';
import { useBatteryStatus } from '../lib/useBatteryStatus';

export const LowBatteryPopup: React.FC = () => {
  const { pct, charging } = useBatteryStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (charging || (pct !== null && pct > 20)) {
      setDismissed(false);
    }
  }, [charging, pct]);

  if (pct === null || charging || pct > 20 || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-44 sm:w-48 rounded-[26px] bg-white shadow-[0_20px_48px_rgba(0,0,0,0.3)] border border-red-500/30 overflow-hidden animate-workspace-enter select-none">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        title="Dismiss"
        className="absolute top-2.5 right-2.5 z-20 p-1 rounded-full bg-black/45 hover:bg-black/65 text-white transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="relative w-full aspect-square bg-white">
        <img
          src="/low-battery.jpg"
          alt="Low Battery"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 p-3 pt-7 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-white">
            <BatteryWarning className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-xs font-extrabold tracking-tight drop-shadow">
              Low Battery
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold font-mono-num">
            {pct}%
          </span>
        </div>
      </div>
    </div>
  );
};
