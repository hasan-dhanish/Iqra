import React, { useEffect, useState } from 'react';

interface FlipTileProps {
  value: string;
  accent?: boolean;
}

const FlipTile: React.FC<FlipTileProps> = ({ value, accent = false }) => {
  const [state, setState] = useState({ curr: value, prev: value, tick: 0 });

  useEffect(() => {
    if (value !== state.curr) {
      setState((s) => ({ curr: value, prev: s.curr, tick: s.tick + 1 }));
    }
  }, [value, state.curr]);

  const cardBg = accent ? 'flip-clock-tile-accent' : 'flip-clock-tile';

  const textColor = accent
    ? 'text-[#9B5B76] flip-clock-digit-accent'
    : 'text-[#1C1C1E]';

  return (
    <div
      className={`relative w-11 h-12 sm:w-12 sm:h-14 rounded-xl border shadow-xs select-none overflow-hidden ${cardBg}`}
      style={{ perspective: '260px' }}
    >
      {/* Static Top Half (New Value) */}
      <div className="absolute inset-x-0 top-0 h-1/2 overflow-hidden">
        <div className="h-[200%] w-full flex items-center justify-center">
          <span className={`font-mono-num text-xl sm:text-2xl font-bold leading-none ${textColor}`}>
            {state.curr}
          </span>
        </div>
      </div>

      {/* Static Bottom Half (Old Value during flip, then New Value) */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 overflow-hidden">
        <div className="h-[200%] w-full -translate-y-1/2 flex items-center justify-center">
          <span className={`font-mono-num text-xl sm:text-2xl font-bold leading-none ${textColor}`}>
            {state.prev}
          </span>
        </div>
      </div>

      {/* Animated Folding Top Flap (Old Value -> folds down 0 to -90deg) */}
      {state.tick > 0 && (
        <div
          key={`top-${state.tick}`}
          className={`flip-top-fold absolute inset-x-0 top-0 h-1/2 overflow-hidden z-20 ${cardBg} border-b border-[#9B5B76]/20`}
        >
          <div className="h-[200%] w-full flex items-center justify-center">
            <span className={`font-mono-num text-xl sm:text-2xl font-bold leading-none ${textColor}`}>
              {state.prev}
            </span>
          </div>
        </div>
      )}

      {/* Animated Unfolding Bottom Flap (New Value -> unfolds 90 to 0deg) */}
      {state.tick > 0 && (
        <div
          key={`bot-${state.tick}`}
          className={`flip-bottom-unfold absolute inset-x-0 bottom-0 h-1/2 overflow-hidden z-30 ${cardBg} border-t border-[#9B5B76]/20`}
        >
          <div className="h-[200%] w-full -translate-y-1/2 flex items-center justify-center">
            <span className={`font-mono-num text-xl sm:text-2xl font-bold leading-none ${textColor}`}>
              {state.curr}
            </span>
          </div>
        </div>
      )}

      {/* Center Mechanical Hinge Seam */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-1/2 -translate-y-px h-[1.5px] bg-[#9B5B76]/25 z-40 pointer-events-none"
      />
    </div>
  );
};

interface SevenSegmentClockProps {
  hours: string;
  minutes: string;
  seconds: string;
  period: string;
}

export const SevenSegmentClock: React.FC<SevenSegmentClockProps> = ({
  hours,
  minutes,
  seconds,
  period,
}) => {
  const hh = hours.padStart(2, '0');
  const mm = minutes.padStart(2, '0');
  const ss = seconds.padStart(2, '0');

  return (
    <div
      className="flex items-center gap-1.5 pr-4 border-r border-[#E2E0D8]"
      aria-label={`${hh}:${mm}:${ss} ${period}`}
    >
      <FlipTile value={hh} />

      <div className="flex flex-col items-center justify-center gap-1.5 text-[#9B5B76] px-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      </div>

      <FlipTile value={mm} />

      <div className="flex flex-col items-center justify-center gap-1.5 text-[#9B5B76] px-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
      </div>

      <FlipTile value={ss} accent />

      <span className="text-[10px] font-bold tracking-wider text-[#8E8E93] self-end pb-1 pl-0.5">
        {period}
      </span>
    </div>
  );
};
