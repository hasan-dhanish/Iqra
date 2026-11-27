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
  day: { left: string; top: string; width: string; height: string };
  night: { left: string; top: string; width: string; height: string };
  labelPosition?: 'top' | 'bottom';
}

const DESK_HOTSPOTS: DeskHotspot[] = [
  {
    id: 'notebook',
    tab: 'notebooks',
    label: 'Book Shelf',
    subtitle: 'Open your study notebooks',
    accent: '#1B5E5A',
    icon: BookOpen,
    day: { left: '35%', top: '76%', width: '34%', height: '23%' },
    night: { left: '35%', top: '76%', width: '34%', height: '23%' },
    labelPosition: 'top',
  },
  {
    id: 'folder',
    tab: 'matrix',
    label: 'Folder Shelf',
    subtitle: 'Open folders & study matrix',
    accent: '#254454',
    icon: FolderOpen,
    day: { left: '53%', top: '67%', width: '25%', height: '19%' },
    night: { left: '53%', top: '67%', width: '25%', height: '19%' },
    labelPosition: 'top',
  },
  {
    id: 'tablet',
    tab: 'youtube',
    label: 'Youtube',
    subtitle: 'Watch study lectures',
    accent: '#A43850',
    icon: Tv,
    day: { left: '24%', top: '55%', width: '20%', height: '29%' },
    night: { left: '24%', top: '55%', width: '20%', height: '29%' },
    labelPosition: 'top',
  },
  {
    id: 'timer',
    tab: 'timer',
    label: 'Focus Timer',
    subtitle: 'Start Pomodoro or countdown',
    accent: '#9B5B76',
    icon: Timer,
    day: { left: '43%', top: '56%', width: '10%', height: '17%' },
    night: { left: '43%', top: '56%', width: '10%', height: '17%' },
    labelPosition: 'top',
  },
  {
    id: 'habits',
    tab: 'tracker',
    label: 'Habit Tracker',
    subtitle: 'Check daily streaks & habits',
    accent: '#133F47',
    icon: CheckCircle2,
    day: { left: '77%', top: '58%', width: '10.5%', height: '15%' },
    night: { left: '77%', top: '58%', width: '10.5%', height: '15%' },
    labelPosition: 'top',
  },
  {
    id: 'files',
    tab: 'resources',
    label: 'My Files',
    subtitle: 'Browse study PDFs & resources',
    accent: '#5B3A70',
    icon: Library,
    day: { left: '80.5%', top: '71%', width: '19%', height: '23%' },
    night: { left: '80.5%', top: '71%', width: '19%', height: '23%' },
    labelPosition: 'top',
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

        {/* Interactive Clickable Desk Object Hotspots */}
        <div className="absolute inset-0 z-10">
          {DESK_HOTSPOTS.map((spot) => {
            const rect = darkMode ? spot.night : spot.day;
            const isHovered = hoveredId === spot.id;
            const Icon = spot.icon;

            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => onNavigate(spot.tab)}
                onMouseEnter={() => setHoveredId(spot.id)}
                onMouseLeave={() => setHoveredId((prev) => (prev === spot.id ? null : prev))}
                aria-label={`Open ${spot.label}`}
                style={{
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                }}
                className="group absolute rounded-2xl cursor-pointer focus:outline-none transition-all duration-200"
              >
                {/* Soft Luminous Hover Outline */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 rounded-2xl transition-all duration-200 ${
                    isHovered
                      ? 'bg-white/12 ring-2 ring-white/80 shadow-[0_0_24px_rgba(255,255,255,0.45)]'
                      : 'bg-transparent ring-0 hover:bg-white/8'
                  }`}
                />

                {/* Floating Glass Label Pill on Hover */}
                <div
                  className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-xl border border-white/20 text-white shadow-xl whitespace-nowrap flex items-center gap-2 transition-all duration-200 ${
                    isHovered
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-1.5 scale-95'
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
              </button>
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
