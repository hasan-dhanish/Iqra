import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flame,
  FolderOpen,
  Library,
  Timer,
  Tv,
} from 'lucide-react';
import { useLdoi } from '../context/LdoiContext';
import {
  calcDayCompletionPct,
  calcOverallDailyStreak,
  loadHabits,
  toIsoDate,
  type HabitItem,
} from '../lib/habits';
import type { ActiveTab } from '../types';
import { SevenSegmentClock } from './SevenSegmentClock';
import type { StudyFolder } from './StudyFoldersView';

interface DashboardViewProps {
  darkMode?: boolean;
  onNavigate: (tab: ActiveTab) => void;
  onOpenFolder?: (folder: StudyFolder) => void;
  timerSeconds?: number;
  timerRunning?: boolean;
  onToggleTimer?: () => void;
}

interface DeskHotspot {
  id: string;
  tab: ActiveTab;
  label: string;
  subtitle: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Exact SVG contour path in 1600x900 desk coordinate space */
  path: string;
  /** Anchor point (%) for the floating hover label pill */
  labelAnchor: { left: string; top: string };
}

const DESK_HOTSPOTS: DeskHotspot[] = [
  {
    id: 'notebook',
    tab: 'notebooks',
    label: 'Book Shelf',
    subtitle: 'Open your study notebooks',
    accent: '#1B5E5A',
    icon: BookOpen,
    path: 'M 560 816 L 724 698 Q 815 696 875 724 Q 960 715 1112 758 L 1006 896 Q 885 876 768 866 Q 660 842 560 816 Z',
    labelAnchor: { left: '52%', top: '76%' },
  },
  {
    id: 'folder',
    tab: 'matrix',
    label: 'Folder Shelf',
    subtitle: 'Open folders & study matrix',
    accent: '#254454',
    icon: FolderOpen,
    path: 'M 850 672 L 978 604 L 1228 636 L 1224 658 L 1162 744 L 850 694 Z',
    labelAnchor: { left: '65%', top: '67%' },
  },
  {
    id: 'tablet',
    tab: 'youtube',
    label: 'Youtube',
    subtitle: 'Watch study lectures',
    accent: '#A43850',
    icon: Tv,
    path: 'M 390 546 Q 390 538 398 537 L 644 502 Q 654 501 656 510 L 696 678 Q 698 686 688 689 L 444 753 Q 436 755 430 748 L 392 716 Z',
    labelAnchor: { left: '34%', top: '55%' },
  },
  {
    id: 'timer',
    tab: 'timer',
    label: 'Focus Timer',
    subtitle: 'Start Pomodoro or countdown',
    accent: '#9B5B76',
    icon: Timer,
    path: 'M 716 514 L 828 510 Q 848 510 848 530 L 850 626 Q 850 646 830 647 L 718 653 Q 698 654 698 634 L 696 534 Q 696 514 716 514 Z',
    labelAnchor: { left: '48.2%', top: '56%' },
  },
  {
    id: 'habits',
    tab: 'tracker',
    label: 'Habit Tracker',
    subtitle: 'Check daily streaks & habits',
    accent: '#133F47',
    icon: CheckCircle2,
    path: 'M 1256 532 L 1400 544 L 1386 650 L 1358 650 L 1356 668 L 1272 658 L 1272 640 L 1244 638 Z',
    labelAnchor: { left: '82.5%', top: '58%' },
  },
  {
    id: 'files',
    tab: 'resources',
    label: 'My Files',
    subtitle: 'Browse study PDFs & resources',
    accent: '#5B3A70',
    icon: Library,
    path: 'M 1292 748 L 1418 642 L 1600 676 L 1600 838 L 1562 846 L 1292 796 Z',
    labelAnchor: { left: '90%', top: '71%' },
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  darkMode = false,
  onNavigate,
}) => {
  const { currentUser } = useLdoi();
  const myName = currentUser?.name ?? 'Sajitha';
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Live clock
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const [habits] = useState<HabitItem[]>(() => loadHabits());
  const streakDays = useMemo(() => calcOverallDailyStreak(habits, todayIso), [habits, todayIso]);
  const todayPct = useMemo(() => calcDayCompletionPct(habits, todayIso), [habits, todayIso]);

  const weekday = now.toLocaleDateString('en-IN', { weekday: 'long' });
  const dateLabel = now.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const hour12Raw = now.getHours() % 12 || 12;
  const hoursStr = String(hour12Raw).padStart(2, '0');
  const minsStr = String(now.getMinutes()).padStart(2, '0');
  const secsStr = String(now.getSeconds()).padStart(2, '0');
  const periodStr = now.getHours() >= 12 ? 'PM' : 'AM';
  const greeting =
    now.getHours() < 12
      ? 'Good morning'
      : now.getHours() < 17
        ? 'Good afternoon'
        : 'Good evening';

  return (
    <div className="md:h-full w-full flex items-center justify-center">
      {/* Centered 16:9 FPV Study Desk Stage so hotspot % coordinates stay pixel-locked */}
      <div className="relative w-full max-w-[1380px] aspect-video max-h-full rounded-[28px] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.28)] border border-white/50 dark:border-white/12 bg-[#111317] select-none">
        {/* Day FPV Scene */}
        <img
          src="/fpv-desk-day.jpg"
          alt="Sajitha's Morning Study Desk FPV"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out"
          style={{ opacity: darkMode ? 0 : 1 }}
        />

        {/* Night / Sunset FPV Scene */}
        <img
          src="/fpv-desk-night.jpg"
          alt="Sajitha's Sunset Study Desk FPV"
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out"
          style={{ opacity: darkMode ? 1 : 0 }}
        />

        {/* Subtle Top Vignette for HUD legibility */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 via-black/10 to-transparent"
        />

        {/* Top Floating HUD: Clock + Greeting (Left) & Streak Pill (Right) */}
        <div className="relative z-20 flex flex-wrap items-start justify-between gap-3 p-3.5 sm:p-5 pointer-events-none">
          <div className="pointer-events-auto paper-card rounded-2xl px-3.5 py-2 flex items-center gap-3.5 border border-white/60 dark:border-white/15 shadow-lg backdrop-blur-xl">
            <SevenSegmentClock
              hours={hoursStr}
              minutes={minsStr}
              seconds={secsStr}
              period={periodStr}
            />
            <div className="min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9B5B76] shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#9B5B76]">
                  {weekday}
                </span>
                <span className="text-[11px] font-medium text-[#6E6E73] dark:text-zinc-300">
                  · {dateLabel}
                </span>
              </div>
              <h1 className="mt-0.5 text-sm font-semibold text-[#1C1C1E] dark:text-white truncate">
                {greeting}, {myName}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('tracker')}
            className="pointer-events-auto ios-press paper-card rounded-2xl px-3.5 py-2 flex items-center gap-2.5 border border-white/60 dark:border-white/15 shadow-lg backdrop-blur-xl hover:scale-[1.02] transition-transform"
            title="Open Habit Tracker"
          >
            <div className="w-8 h-8 rounded-full bg-[#133F47]/12 dark:bg-[#2DD4BF]/20 flex items-center justify-center text-[#133F47] dark:text-[#2DD4BF]">
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-left">
              <div className="text-xs font-extrabold font-mono-num text-[#1C1C1E] dark:text-white leading-tight">
                {streakDays} {streakDays === 1 ? 'Day' : 'Days'} Streak
              </div>
              <div className="text-[10px] font-semibold text-[#133F47] dark:text-[#2DD4BF]">
                {todayPct}% habits today
              </div>
            </div>
          </button>
        </div>

        {/* Interactive Object-Shaped Desk Hotspots */}
        <svg
          viewBox="0 0 1600 900"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full z-10"
        >
          <defs>
            <filter id="desk-hotspot-glow" x="-15%" y="-15%" width="130%" height="130%">
              <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ffffff" floodOpacity="0.65" />
            </filter>
          </defs>
          {DESK_HOTSPOTS.map((spot) => {
            const isHovered = hoveredId === spot.id;
            return (
              <path
                key={spot.id}
                d={spot.path}
                role="button"
                tabIndex={0}
                aria-label={`Open ${spot.label}`}
                onClick={() => onNavigate(spot.tab)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onNavigate(spot.tab);
                  }
                }}
                onMouseEnter={() => setHoveredId(spot.id)}
                onMouseLeave={() => setHoveredId((prev) => (prev === spot.id ? null : prev))}
                onFocus={() => setHoveredId(spot.id)}
                onBlur={() => setHoveredId((prev) => (prev === spot.id ? null : prev))}
                className="cursor-pointer focus:outline-none transition-all duration-200"
                fill={isHovered ? 'rgba(255, 255, 255, 0.13)' : 'rgba(255, 255, 255, 0)'}
                stroke={isHovered ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0)'}
                strokeWidth={3.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                filter={isHovered ? 'url(#desk-hotspot-glow)' : undefined}
              />
            );
          })}
        </svg>

        {/* Floating Glass Label Pills on Hover */}
        <div className="pointer-events-none absolute inset-0 z-20">
          {DESK_HOTSPOTS.map((spot) => {
            const isHovered = hoveredId === spot.id;
            const Icon = spot.icon;
            return (
              <div
                key={spot.id}
                style={{ left: spot.labelAnchor.left, top: spot.labelAnchor.top }}
                className={`absolute -translate-x-1/2 -translate-y-full -mt-2.5 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-xl border border-white/20 text-white shadow-xl whitespace-nowrap flex items-center gap-2 transition-all duration-200 ${
                  isHovered
                    ? 'opacity-100 translate-y-[-100%] scale-100'
                    : 'opacity-0 translate-y-[calc(-100%+6px)] scale-95'
                }`}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: spot.accent }}
                >
                  <Icon className="w-3 h-3 text-white" />
                </span>
                <div className="text-left">
                  <div className="text-[11px] font-bold leading-tight flex items-center gap-1">
                    {spot.label}
                    <ArrowRight className="w-3 h-3 opacity-80" />
                  </div>
                  <div className="text-[9px] text-white/70 leading-tight">
                    {spot.subtitle}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtle Bottom-Left Interactive Hint */}
        <div className="pointer-events-none absolute bottom-3 left-3.5 sm:bottom-4 sm:left-5 z-20">
          <div className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/15 text-[10px] font-semibold text-white/90 shadow-sm">
            Click any item on your desk to open it
          </div>
        </div>
      </div>
    </div>
  );
};
