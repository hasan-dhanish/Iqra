import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Pause, Play, RotateCcw, X } from 'lucide-react';

interface FloatingTimerWidgetProps {
  seconds: number;
  progressPct: number; // 0..100
  running: boolean;
  sessionLabel?: string;
  onToggleRunning: () => void;
  onRestart: () => void;
  onDismiss?: () => void;
  onOpenTimerTab?: () => void;
  variant?: 'floating' | 'embedded';
  midpointAcked?: boolean;
  onMidpointAck?: () => void;
  victoryDismissed?: boolean;
  onVictoryDismiss?: () => void;
}

const VICTORY_IMAGES = [
  '/victory-1.jpg',
  '/victory-2.jpg',
  '/victory-3.jpg',
  '/victory-4.jpg',
  '/victory-5.jpg',
];

const RESET_IMAGES = [
  '/timer-reset-1.jpg',
  '/timer-reset-2.jpg',
  '/timer-reset-3.jpg',
];

const STILL_FOCUSSING_IMAGE = '/still-focussing.jpg';

function pickRandom(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)];
}

function formatCompactTime(totalSecs: number): string {
  const safe = Math.max(0, Math.floor(totalSecs));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  // 0 deg = 12 o'clock (straight up), negative = left, positive = right
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

/**
 * Draws a filled curved band (annular sector) with soft rounded corners.
 */
function describeRoundedSectorArc(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number,
  cornerR = 3.5
): string {
  const spanDeg = endAngle - startAngle;
  if (spanDeg <= 0.2) return '';

  const cr = Math.min(cornerR, (rOuter - rInner) / 2 - 0.5);
  const maxAngDeg = spanDeg * 0.45;
  const dOuterDeg = Math.min((cr / rOuter) * (180 / Math.PI), maxAngDeg);
  const dInnerDeg = Math.min((cr / rInner) * (180 / Math.PI), maxAngDeg);

  const cOS = polarToXY(cx, cy, rOuter, startAngle);
  const pOSIn = polarToXY(cx, cy, rOuter - cr, startAngle);
  const pOSOut = polarToXY(cx, cy, rOuter, startAngle + dOuterDeg);

  const cOE = polarToXY(cx, cy, rOuter, endAngle);
  const pOEIn = polarToXY(cx, cy, rOuter, endAngle - dOuterDeg);
  const pOEOut = polarToXY(cx, cy, rOuter - cr, endAngle);

  const cIE = polarToXY(cx, cy, rInner, endAngle);
  const pIEIn = polarToXY(cx, cy, rInner + cr, endAngle);
  const pIEOut = polarToXY(cx, cy, rInner, endAngle - dInnerDeg);

  const cIS = polarToXY(cx, cy, rInner, startAngle);
  const pISIn = polarToXY(cx, cy, rInner, startAngle + dInnerDeg);
  const pISOut = polarToXY(cx, cy, rInner + cr, startAngle);

  const largeOuter = endAngle - startAngle - 2 * dOuterDeg > 180 ? 1 : 0;
  const largeInner = endAngle - startAngle - 2 * dInnerDeg > 180 ? 1 : 0;

  return [
    `M ${pOSIn.x.toFixed(2)} ${pOSIn.y.toFixed(2)}`,
    `Q ${cOS.x.toFixed(2)} ${cOS.y.toFixed(2)} ${pOSOut.x.toFixed(2)} ${pOSOut.y.toFixed(2)}`,
    `A ${rOuter} ${rOuter} 0 ${largeOuter} 1 ${pOEIn.x.toFixed(2)} ${pOEIn.y.toFixed(2)}`,
    `Q ${cOE.x.toFixed(2)} ${cOE.y.toFixed(2)} ${pOEOut.x.toFixed(2)} ${pOEOut.y.toFixed(2)}`,
    `L ${pIEIn.x.toFixed(2)} ${pIEIn.y.toFixed(2)}`,
    `Q ${cIE.x.toFixed(2)} ${cIE.y.toFixed(2)} ${pIEOut.x.toFixed(2)} ${pIEOut.y.toFixed(2)}`,
    `A ${rInner} ${rInner} 0 ${largeInner} 0 ${pISIn.x.toFixed(2)} ${pISIn.y.toFixed(2)}`,
    `Q ${cIS.x.toFixed(2)} ${cIS.y.toFixed(2)} ${pISOut.x.toFixed(2)} ${pISOut.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

// Extended semi-circle from -58 deg (left) to +58 deg (right)
const START_ANGLE = -58;
const END_ANGLE = 58;
const TOTAL_SPAN = END_ANGLE - START_ANGLE;
const TICK_COUNT = 28;
const TICKS = Array.from({ length: TICK_COUNT + 1 }, (_, i) => ({
  idx: i,
  angle: START_ANGLE + (i / TICK_COUNT) * TOTAL_SPAN,
  isMajor: i % 5 === 0,
}));

export const FloatingTimerWidget: React.FC<FloatingTimerWidgetProps> = ({
  seconds,
  progressPct,
  running,
  sessionLabel,
  onToggleRunning,
  onRestart,
  onDismiss,
  onOpenTimerTab,
  variant = 'floating',
  midpointAcked = false,
  onMidpointAck,
  victoryDismissed = false,
  onVictoryDismiss,
}) => {
  const isEmbedded = variant === 'embedded';
  // Smoothly interpolate progressPct between 1-second ticks for fluid 60fps baton & arc motion
  const [smoothPct, setSmoothPct] = useState(progressPct);
  const animRef = useRef<{
    fromPct: number;
    toPct: number;
    startTime: number;
  }>({
    fromPct: progressPct,
    toPct: progressPct,
    startTime: 0,
  });
  const prevTargetRef = useRef(progressPct);

  useEffect(() => {
    const prev = prevTargetRef.current;
    prevTargetRef.current = progressPct;

    if (!running || progressPct < prev || Math.abs(progressPct - prev) > 25) {
      // Snap immediately on pause, reset, or large jump
      animRef.current = {
        fromPct: progressPct,
        toPct: progressPct,
        startTime: performance.now(),
      };
      setSmoothPct(progressPct);
      return;
    }

    if (progressPct !== prev) {
      animRef.current = {
        fromPct: prev,
        toPct: progressPct,
        startTime: performance.now(),
      };
    }
  }, [progressPct, running]);

  useEffect(() => {
    if (!running) return;
    let rafId = 0;

    const tick = (now: number) => {
      const { fromPct, toPct, startTime } = animRef.current;
      const elapsed = now - startTime;
      const t = Math.min(1, Math.max(0, elapsed / 1000));
      setSmoothPct(fromPct + (toPct - fromPct) * t);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [running]);

  const [frame, setFrame] = useState(1);
  const [overlayMode, setOverlayMode] = useState<{
    type: 'midpoint' | 'victory' | 'reset';
    image: string;
  } | null>(null);
  const midpointShownRef = useRef(false);
  const victoryShownRef = useRef(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setFrame((f) => (f % 4) + 1);
    }, 110);
    return () => window.clearInterval(id);
  }, [running]);

  // Reset session-level midpoint/victory flags when progress goes back near 0
  useEffect(() => {
    if (progressPct < 10) {
      midpointShownRef.current = false;
      victoryShownRef.current = false;
    }
  }, [progressPct]);

  // Midpoint check ("Are you still focussing" at 50%)
  useEffect(() => {
    if (
      running &&
      progressPct >= 50 &&
      progressPct < 99 &&
      !midpointAcked &&
      !midpointShownRef.current
    ) {
      midpointShownRef.current = true;
      setOverlayMode({ type: 'midpoint', image: STILL_FOCUSSING_IMAGE });
    }
  }, [running, progressPct, midpointAcked]);

  // If acknowledged from the other view, clear any open midpoint overlay
  useEffect(() => {
    if (midpointAcked && overlayMode?.type === 'midpoint') {
      setOverlayMode(null);
    }
  }, [midpointAcked, overlayMode?.type]);

  // Completion check (random Victory image)
  useEffect(() => {
    if (progressPct >= 99.9 && !victoryDismissed && !victoryShownRef.current) {
      victoryShownRef.current = true;
      setOverlayMode({ type: 'victory', image: pickRandom(VICTORY_IMAGES) });
    }
  }, [progressPct, victoryDismissed]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const handleRestartClick = () => {
    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    const wasFocussing =
      progressPct > 0 && progressPct < 99.9 && overlayMode?.type !== 'victory';

    midpointShownRef.current = false;
    victoryShownRef.current = false;
    onRestart();

    if (!wasFocussing) {
      setOverlayMode(null);
      return;
    }

    setOverlayMode({ type: 'reset', image: pickRandom(RESET_IMAGES) });
    resetTimerRef.current = window.setTimeout(() => {
      setOverlayMode(null);
      resetTimerRef.current = null;
    }, 3000);
  };

  const cx = 100;
  const cy = 204;
  const r = 128;
  const clampedPct = Math.min(100, Math.max(0, smoothPct));
  const currentAngle = START_ANGLE + (clampedPct / 100) * TOTAL_SPAN;

  // Shinchan runner position right on the arc at currentAngle
  const runnerPos = polarToXY(cx, cy, r + 4, currentAngle);

  return (
    <div
      className={`${
        isEmbedded
          ? 'relative mx-auto w-64 h-64 sm:w-72 sm:h-72 rounded-[36px] sm:rounded-[40px] pt-4 sm:pt-5 pb-4 sm:pb-5 shadow-[0_16px_40px_rgba(0,0,0,0.16)]'
          : 'fixed bottom-3 right-3 sm:bottom-5 sm:right-5 z-50 w-36 h-36 sm:w-48 sm:h-48 rounded-[24px] sm:rounded-[30px] pt-2.5 sm:pt-3 pb-3 sm:pb-4 shadow-[0_20px_48px_rgba(0,0,0,0.28)]'
      } spidey-chat-card overflow-hidden flex flex-col items-center justify-between select-none animate-workspace-enter group`}
      style={{
        fontFamily:
          '"Nunito", "SF Pro Rounded", ui-rounded, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Subtle Dismiss Button on Hover when Paused (floating only) */}
      {!isEmbedded && !running && onDismiss && !overlayMode && (
        <button
          type="button"
          onClick={onDismiss}
          title="Hide Floating Timer"
          className="absolute top-2.5 left-3 z-30 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[#8E8E93] hover:text-[#1C1C1E]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Subtle Expand Button on Hover (floating only) */}
      {!isEmbedded && onOpenTimerTab && (
        <button
          type="button"
          onClick={onOpenTimerTab}
          title="Open Focus Timer"
          className="absolute top-2.5 right-3 z-30 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-[#8E8E93] hover:text-[#1C1C1E]"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Top Time Readout (Round-Cornered Number Font) */}
      <button
        type="button"
        onClick={onOpenTimerTab}
        disabled={!onOpenTimerTab}
        className={`relative z-20 text-center focus:outline-none px-3 ${
          onOpenTimerTab ? 'cursor-pointer' : 'cursor-default'
        }`}
        title={
          onOpenTimerTab
            ? sessionLabel
              ? `Focusing on: ${sessionLabel}`
              : 'Open Focus Timer'
            : undefined
        }
      >
        <div
          className={`${
            isEmbedded ? 'text-[36px] sm:text-[42px]' : 'text-[22px] sm:text-[30px]'
          } font-extrabold tracking-tight tabular-nums text-[#1C1C1E] leading-none`}
        >
          {formatCompactTime(seconds)}
        </div>
        {sessionLabel && (
          <div
            className={`${
              isEmbedded ? 'text-xs max-w-[200px] mt-1.5' : 'text-[10px] max-w-[140px] mt-1'
            } font-bold text-[#8E8E93] truncate`}
          >
            {sessionLabel}
          </div>
        )}
      </button>

      {/* Extended Semi-Circle Arch (0% Left -> 100% Right) */}
      <svg
        viewBox="0 0 200 192"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="semiBlueArc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0066FF" />
            <stop offset="100%" stopColor="#0A84FF" />
          </linearGradient>
        </defs>

        {/* Subtle Track Arch with soft rounded-cornered ends */}
        <path
          d={describeRoundedSectorArc(
            cx,
            cy,
            r - 12,
            r + 12,
            START_ANGLE,
            END_ANGLE,
            4
          )}
          fill="currentColor"
          className="text-black/[0.05]"
        />

        {/* Blue Elapsed Band (Left 0% -> Baton Hand) with soft rounded corners */}
        {clampedPct > 0.5 && (
          <path
            d={describeRoundedSectorArc(
              cx,
              cy,
              r - 10,
              r + 10,
              START_ANGLE,
              Math.max(START_ANGLE + 1, currentAngle - 2),
              3.5
            )}
            fill="url(#semiBlueArc)"
          />
        )}

        {/* Tick Marks along the Semi-Circle */}
        {TICKS.map((t) => {
          const p1 = polarToXY(cx, cy, t.isMajor ? r - 7 : r - 5, t.angle);
          const p2 = polarToXY(cx, cy, t.isMajor ? r + 7 : r + 5, t.angle);
          const isCovered = t.angle <= currentAngle && clampedPct > 0.5;
          return (
            <line
              key={t.idx}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke={
                isCovered
                  ? t.isMajor
                    ? 'rgba(255,255,255,0.95)'
                    : 'rgba(255,255,255,0.45)'
                  : t.isMajor
                  ? 'rgba(110,110,115,0.85)'
                  : 'rgba(142,142,147,0.45)'
              }
              strokeWidth={t.isMajor ? 2.2 : 1.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Animated Shinchan Running when active, Tired Shinchan when paused */}
        <g
          transform={`translate(${runnerPos.x.toFixed(2)}, ${runnerPos.y.toFixed(2)}) rotate(${currentAngle.toFixed(2)})${running ? ' scale(-1, 1)' : ''}`}
        >
          <image
            href={running ? `/shinchan-${frame}.png` : '/spiderman-paused.png'}
            x={-14}
            y={-26}
            width={28}
            height={28}
            preserveAspectRatio="xMidYMid meet"
          />
        </g>
      </svg>

      {/* Bottom Controls: Pause when running, Play + Restart when paused */}
      <div className="relative z-20 flex items-center justify-center gap-2 sm:gap-3">
        {running ? (
          <button
            type="button"
            onClick={onToggleRunning}
            title="Pause Timer"
            className={`ios-press ${
              isEmbedded ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-9 h-9 sm:w-11 sm:h-11'
            } rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white shadow-lg flex items-center justify-center`}
          >
            <Pause className={`${isEmbedded ? 'w-5 h-5' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} fill-current`} />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleRunning}
              title="Resume Timer"
              className={`ios-press ${
                isEmbedded ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-9 h-9 sm:w-11 sm:h-11'
              } rounded-full bg-[#0A84FF] hover:bg-[#0070E0] text-white shadow-lg flex items-center justify-center`}
            >
              <Play className={`${isEmbedded ? 'w-5 h-5' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} fill-current ml-0.5`} />
            </button>
            <button
              type="button"
              onClick={handleRestartClick}
              title="Restart Timer"
              className={`ios-press ${
                isEmbedded ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-9 h-9 sm:w-11 sm:h-11'
              } rounded-full bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white shadow-lg flex items-center justify-center`}
            >
              <RotateCcw className={isEmbedded ? 'w-5 h-5' : 'w-3.5 h-3.5 sm:w-4 sm:h-4'} />
            </button>
          </>
        )}
      </div>

      {/* Midpoint / Victory / Reset Image Overlays */}
      {overlayMode && (
        <div className="absolute inset-0 z-40 rounded-[30px] overflow-hidden bg-black animate-workspace-enter">
          <img
            src={overlayMode.image}
            alt={
              overlayMode.type === 'midpoint'
                ? 'Are you still focussing'
                : overlayMode.type === 'victory'
                ? 'Focus session complete'
                : 'Timer reset'
            }
            className="w-full h-full object-cover"
          />

          {overlayMode.type === 'midpoint' && (
            <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex flex-col items-center gap-1.5 text-center">
              <span className="text-[11px] font-extrabold text-white leading-tight drop-shadow">
                Are you still focussing
              </span>
              <button
                type="button"
                onClick={() => {
                  onMidpointAck?.();
                  setOverlayMode(null);
                }}
                className="ios-press px-4 py-1 rounded-full bg-[#0A84FF] hover:bg-[#0070E0] text-white text-[11px] font-extrabold shadow-lg"
              >
                Yess
              </button>
            </div>
          )}

          {overlayMode.type === 'victory' && (
            <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleRestartClick}
                className="ios-press px-3.5 py-1 rounded-full bg-[#0A84FF] hover:bg-[#0070E0] text-white text-[11px] font-extrabold shadow-lg flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Restart
              </button>
              {onDismiss && (
                <button
                  type="button"
                  onClick={() => {
                    onVictoryDismiss?.();
                    setOverlayMode(null);
                    onDismiss();
                  }}
                  title="Close"
                  className="ios-press p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
