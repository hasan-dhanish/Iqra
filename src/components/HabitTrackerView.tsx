import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  loadHabits,
  saveHabits,
  toIsoDate,
  type HabitItem,
} from '../lib/habits';
import { ColorRingPicker } from './ColorRingPicker';
import { ConfirmModal } from './ConfirmModal';

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const TASK_CHECKERS = [
  '/task-checkers/checker-1.png',
  '/task-checkers/checker-2.png',
  '/task-checkers/checker-3.png',
  '/task-checkers/checker-4.png',
  '/task-checkers/checker-5.png',
  '/task-checkers/checker-6.png',
];

interface MonthDay {
  iso: string;
  dayNum: number;
  weekdayLetter: string;
  isToday: boolean;
  isFuture: boolean;
}

function getMonthDays(year: number, monthIndex: number, todayIso: string): MonthDay[] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const list: MonthDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, monthIndex, d);
    const iso = toIsoDate(dateObj);
    list.push({
      iso,
      dayNum: d,
      weekdayLetter: WEEKDAY_LETTERS[dateObj.getDay()],
      isToday: iso === todayIso,
      isFuture: iso > todayIso,
    });
  }
  return list;
}

export const HabitTrackerView: React.FC = () => {
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const todayDate = useMemo(() => new Date(`${todayIso}T00:00:00`), [todayIso]);

  const [habits, setHabits] = useState<HabitItem[]>(() => loadHabits());
  const [viewYear, setViewYear] = useState(() => todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => todayDate.getMonth());
  const [halfMonth, setHalfMonth] = useState<0 | 1>(() =>
    todayDate.getDate() <= 15 ? 0 : 1
  );

  // Add / Edit Habit Modal
  const [habitModal, setHabitModal] = useState<{
    mode: 'create' | 'edit';
    habitId?: string;
    name: string;
    color: string;
  } | null>(null);

  const [habitToDelete, setHabitToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showAllDonePopup, setShowAllDonePopup] = useState(false);
  const todayColRef = useRef<HTMLTableCellElement | null>(null);

  useEffect(() => {
    saveHabits(habits);
  }, [habits]);

  const monthDays = useMemo(() => {
    const all = getMonthDays(viewYear, viewMonth, todayIso);
    return halfMonth === 0 ? all.slice(0, 15) : all.slice(15);
  }, [viewYear, viewMonth, halfMonth, todayIso]);

  const monthLabel = useMemo(() => {
    const d = new Date(viewYear, viewMonth, 1);
    const shortMonth = d.toLocaleDateString('en-US', { month: 'short' });
    const start = monthDays[0]?.dayNum ?? 1;
    const end = monthDays[monthDays.length - 1]?.dayNum ?? 15;
    return `${shortMonth} ${start} - ${end}, ${viewYear}`;
  }, [viewYear, viewMonth, monthDays]);

  // Auto-scroll horizontal table to today's column on smaller screens
  useEffect(() => {
    if (todayColRef.current) {
      todayColRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [viewYear, viewMonth, halfMonth]);

  const goPrevMonth = () => {
    if (halfMonth === 1) {
      setHalfMonth(0);
    } else if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
      setHalfMonth(1);
    } else {
      setViewMonth((m) => m - 1);
      setHalfMonth(1);
    }
  };

  const goNextMonth = () => {
    if (halfMonth === 0) {
      setHalfMonth(1);
    } else if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
      setHalfMonth(0);
    } else {
      setViewMonth((m) => m + 1);
      setHalfMonth(0);
    }
  };

  const toggleHabitDay = (habitId: string, iso: string, isFuture: boolean) => {
    if (isFuture) return;
    const wasAllDone =
      habits.length > 0 && habits.every((h) => h.completedDates.includes(iso));

    const nextHabits = habits.map((h) => {
      if (h.id !== habitId) return h;
      const done = h.completedDates.includes(iso);
      return {
        ...h,
        completedDates: done
          ? h.completedDates.filter((d) => d !== iso)
          : [...h.completedDates, iso],
      };
    });

    const isNowAllDone =
      nextHabits.length > 0 &&
      nextHabits.every((h) => h.completedDates.includes(iso));

    setHabits(nextHabits);

    if (!wasAllDone && isNowAllDone) {
      setShowAllDonePopup(true);
    }
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitModal) return;
    const trimmed = habitModal.name.trim();
    if (!trimmed) return;

    if (habitModal.mode === 'create') {
      const item: HabitItem = {
        id: `hab_${Date.now().toString(36)}`,
        name: trimmed,
        kind: 'regular',
        color: habitModal.color,
        completedDates: [],
        createdAt: Date.now(),
      };
      setHabits((prev) => [...prev, item]);
    } else if (habitModal.habitId) {
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitModal.habitId
            ? { ...h, name: trimmed, color: habitModal.color }
            : h
        )
      );
    }
    setHabitModal(null);
  };

  const executeDeleteHabit = () => {
    if (!habitToDelete) return;
    setHabits((prev) => prev.filter((h) => h.id !== habitToDelete.id));
    setHabitToDelete(null);
  };

  return (
    <div className="space-y-4">
      <div className="paper-card rounded-2xl border border-[#E2E0D8] dark:border-white/10 p-4 sm:p-6 space-y-5">
        {/* Top Bar: Month Switcher + New Habit */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-lg border border-[#E2E0D8] dark:border-white/12 bg-black/[0.03] dark:bg-white/[0.04] px-1.5 py-1">
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-md text-[#52525B] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#1C1C1E] dark:hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="min-w-[136px] text-center text-xs sm:text-sm font-bold text-[#1C1C1E] dark:text-white select-none">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-md text-[#52525B] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10 hover:text-[#1C1C1E] dark:hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              setHabitModal({ mode: 'create', name: '', color: '#0A5386' })
            }
            className="ios-press inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#133F47] hover:bg-[#0E2F35] dark:bg-[#2DD4BF] dark:hover:bg-[#5EEAD4] text-white dark:text-[#0C1A1C] text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Habit
          </button>
        </div>

        {/* Monthly Checkbox Grid */}
        {habits.length === 0 ? (
          <div className="py-12 text-center space-y-2.5 border border-dashed border-[#D6D3CB] dark:border-white/15 rounded-xl">
            <p className="text-xs text-[#8E8E93] dark:text-zinc-400">
              No habits added yet. Add a habit to start tracking this month.
            </p>
            <button
              type="button"
              onClick={() =>
                setHabitModal({ mode: 'create', name: '', color: '#0A5386' })
              }
              className="ios-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#133F47] dark:bg-[#2DD4BF] text-white dark:text-[#0C1A1C] text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              New Habit
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto overflow-y-hidden py-3">
            <table className="w-full border-separate border-spacing-0 min-w-[740px]">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-20 text-left align-bottom pb-2.5 pr-3 pl-1 text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] dark:text-zinc-400 w-36 min-w-[144px] bg-inherit"
                  >
                    Habits
                  </th>
                  {monthDays.map((day) => (
                    <th
                      key={`wd-${day.iso}`}
                      className={`pb-0.5 pt-1.5 text-center text-[11px] font-semibold select-none ${
                        day.isToday
                          ? 'bg-[#133F47]/[0.07] dark:bg-[#2DD4BF]/[0.09] text-[#133F47] dark:text-[#2DD4BF] rounded-t-lg'
                          : 'text-[#8E8E93] dark:text-zinc-500'
                      }`}
                    >
                      {day.weekdayLetter}
                    </th>
                  ))}
                </tr>
                <tr>
                  {monthDays.map((day) => (
                    <th
                      key={`num-${day.iso}`}
                      ref={day.isToday ? todayColRef : undefined}
                      className={`pb-3 pt-0.5 text-center select-none ${
                        day.isToday
                          ? 'bg-[#133F47]/[0.07] dark:bg-[#2DD4BF]/[0.09]'
                          : ''
                      }`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 text-xs font-mono-num font-bold rounded-md ${
                          day.isToday
                            ? 'bg-[#133F47] text-white dark:bg-[#2DD4BF] dark:text-[#0C1A1C] shadow-xs'
                            : 'text-[#3F3F46] dark:text-zinc-300'
                        }`}
                      >
                        {day.dayNum}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {habits.map((h, rowIdx) => {
                  const isLastRow = rowIdx === habits.length - 1;
                  const checkerImg = TASK_CHECKERS[rowIdx % TASK_CHECKERS.length];
                  return (
                    <tr key={h.id} className="group/row">
                      {/* Habit Name Cell */}
                      <td className="sticky left-0 z-10 pr-3 pl-1 py-1.5 bg-inherit">
                        <div className="flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setHabitModal({
                                mode: 'edit',
                                habitId: h.id,
                                name: h.name,
                                color: h.color,
                              })
                            }
                            title="Click to edit habit"
                            className="text-left text-xs sm:text-[13px] font-semibold text-[#1C1C1E] dark:text-zinc-100 truncate max-w-[130px] hover:underline decoration-dashed underline-offset-4"
                          >
                            {h.name}
                          </button>

                          <div className="flex items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setHabitModal({
                                  mode: 'edit',
                                  habitId: h.id,
                                  name: h.name,
                                  color: h.color,
                                })
                              }
                              aria-label={`Edit ${h.name}`}
                              title="Edit habit"
                              className="p-1 rounded text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setHabitToDelete({ id: h.id, name: h.name })
                              }
                              aria-label={`Delete ${h.name}`}
                              title="Delete habit"
                              className="p-1 rounded text-[#8E8E93] hover:text-red-600"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* 15-Day Checkboxes */}
                      {monthDays.map((day) => {
                        const checked = h.completedDates.includes(day.iso);
                        const allDoneOnDay =
                          habits.length > 0 &&
                          habits.every((habit) => habit.completedDates.includes(day.iso));
                        return (
                          <td
                            key={day.iso}
                            className={`relative py-2 px-0.5 text-center ${
                              day.isToday
                                ? `bg-[#133F47]/[0.07] dark:bg-[#2DD4BF]/[0.09] ${
                                    isLastRow ? 'rounded-b-lg' : ''
                                  }`
                                : ''
                            }`}
                          >
                            <button
                              type="button"
                              disabled={day.isFuture}
                              onClick={() =>
                                toggleHabitDay(h.id, day.iso, day.isFuture)
                              }
                              aria-label={`${h.name} on ${day.iso}`}
                              title={`${h.name} (${day.iso})`}
                              className={`group/sticker mx-auto w-14 h-14 rounded-lg flex items-center justify-center outline-none focus:outline-none transition-all ${
                                day.isFuture ? 'cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            >
                              <img
                                src={checkerImg}
                                alt={checked ? 'Completed' : 'Not completed'}
                                draggable={false}
                                className={`w-14 h-14 object-contain select-none transition-all duration-300 ${
                                  checked
                                    ? `${
                                        allDoneOnDay ? 'sticker-gold' : 'sticker-regular'
                                      } opacity-100 contrast-[1.03] group-hover/sticker:-translate-y-1 group-hover/sticker:scale-110`
                                    : day.isToday
                                    ? 'grayscale contrast-125 opacity-40 dark:invert dark:opacity-35 group-hover/sticker:-translate-y-0.5 group-hover/sticker:scale-105'
                                    : day.isFuture
                                    ? 'grayscale opacity-12 dark:invert dark:opacity-10'
                                    : 'grayscale opacity-22 dark:invert dark:opacity-18 group-hover/sticker:opacity-45 dark:group-hover/sticker:opacity-35 group-hover/sticker:-translate-y-0.5 group-hover/sticker:scale-105'
                                }`}
                              />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Habit Modal */}
      {habitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setHabitModal(null)}
        >
          <form
            onSubmit={handleSaveHabit}
            onClick={(e) => e.stopPropagation()}
            className="paper-card w-full max-w-sm rounded-2xl p-6 space-y-5 border border-[#E2E0D8] dark:border-white/15 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                {habitModal.mode === 'create' ? 'New Habit' : 'Edit Habit'}
              </h2>
              <button
                type="button"
                onClick={() => setHabitModal(null)}
                className="p-1 rounded-md text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Habit Name
              </label>
              <input
                type="text"
                autoFocus
                required
                value={habitModal.name}
                onChange={(e) =>
                  setHabitModal({ ...habitModal, name: e.target.value })
                }
                placeholder="e.g. Read 20 pages, Exercise"
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#E2E0D8] dark:border-white/15 bg-white/80 dark:bg-white/10 focus:outline-none focus:border-[#133F47]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Colour
              </label>
              <ColorRingPicker
                value={habitModal.color}
                onChange={(color) => setHabitModal({ ...habitModal, color })}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E0D8]/70 dark:border-white/10">
              <button
                type="button"
                onClick={() => setHabitModal(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#52525B] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ios-press px-4 py-2 rounded-lg text-white text-xs font-semibold shadow-xs"
                style={{ backgroundColor: habitModal.color }}
              >
                {habitModal.mode === 'create' ? 'Add Habit' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={!!habitToDelete}
        title="Delete Habit"
        message="Are you sure you want to Delete ?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={executeDeleteHabit}
        onCancel={() => setHabitToDelete(null)}
      />

      {/* All Tasks Done Celebration Popup */}
      {showAllDonePopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs"
          onClick={() => setShowAllDonePopup(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="paper-card relative overflow-hidden w-full max-w-xs rounded-2xl p-5 text-center space-y-4 border border-[#E2E0D8] dark:border-white/15 shadow-2xl"
          >
            {/* Confetti rain behind image, caption, and button */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
              {Array.from({ length: 76 }, (_, idx) => {
                const colors = [
                  '#F59E0B',
                  '#EF4444',
                  '#10B981',
                  '#3B82F6',
                  '#EC4899',
                  '#8B5CF6',
                  '#FBBF24',
                  '#14B8A6',
                  '#F97316',
                ];
                const left = `${((idx * 13 + 3) % 96) + 2}%`;
                const w = 5 + (idx % 4);
                const h = idx % 5 === 0 ? w : 8 + (idx % 6);
                const color = colors[idx % colors.length];
                const dur = `${(2.0 + (idx % 7) * 0.24).toFixed(2)}s`;
                const delay = `-${((idx * 0.37) % 3.2).toFixed(2)}s`;
                const drift = `${(idx % 2 === 0 ? 1 : -1) * (8 + (idx % 12))}px`;
                return (
                  <span
                    key={idx}
                    className="confetti-rain-piece"
                    style={
                      {
                        left,
                        width: `${w}px`,
                        height: `${h}px`,
                        borderRadius: idx % 5 === 0 ? '9999px' : '2px',
                        backgroundColor: color,
                        '--confetti-dur': dur,
                        '--confetti-delay': delay,
                        '--confetti-drift': drift,
                      } as React.CSSProperties
                    }
                  />
                );
              })}
            </div>

            <img
              src="/taskdone.jpg"
              alt="All tasks done for the day"
              draggable={false}
              className="relative z-10 w-full aspect-square object-cover rounded-xl shadow-md"
            />
            <div className="relative z-10 text-base font-extrabold text-[#1C1C1E] dark:text-white">
              All tasks done for the day !
            </div>
            <button
              type="button"
              onClick={() => setShowAllDonePopup(false)}
              className="relative z-10 ios-press w-full py-2.5 rounded-xl bg-[#133F47] hover:bg-[#0E2F35] dark:bg-[#2DD4BF] dark:hover:bg-[#5EEAD4] text-white dark:text-[#0C1A1C] text-xs font-bold"
            >
              Awesome
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
