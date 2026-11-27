import React, { useEffect, useMemo, useState } from 'react';
import { ColorRingPicker } from './ColorRingPicker';
import { ConfirmModal } from './ConfirmModal';
import {
  Ban,
  Check,
  CheckCircle2,
  Flame,
  Gauge,
  Minus,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import {
  calcDayCompletionPct,
  calcHabitStreak,
  calcOverallDailyStreak,
  isHabitDoneOnDate,
  loadHabits,
  saveHabits,
  toIsoDate,
  type HabitItem,
  type HabitKind,
} from '../lib/habits';

function getLast364Days(todayIso: string): string[] {
  const days: string[] = [];
  const base = new Date(`${todayIso}T00:00:00`);
  for (let i = 363; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    days.push(toIsoDate(d));
  }
  return days;
}

export const HabitTrackerView: React.FC = () => {
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const [habits, setHabits] = useState<HabitItem[]>(() => loadHabits());
  const [habitToDelete, setHabitToDelete] = useState<{ id: string; name: string } | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKind, setNewKind] = useState<HabitKind>('regular');
  const [newColor, setNewColor] = useState('#133F47');
  const [newTarget, setNewTarget] = useState(2);
  const [newUnit, setNewUnit] = useState('L');

  useEffect(() => {
    saveHabits(habits);
  }, [habits]);

  const yearDays = useMemo(() => getLast364Days(todayIso), [todayIso]);
  const last7Days = useMemo(() => yearDays.slice(-7), [yearDays]);
  const yearWeeks = useMemo(() => {
    const weeks: string[][] = [];
    for (let i = 0; i < yearDays.length; i += 7) {
      weeks.push(yearDays.slice(i, i + 7));
    }
    return weeks;
  }, [yearDays]);

  const todayPct = useMemo(() => calcDayCompletionPct(habits, todayIso), [habits, todayIso]);
  const overallStreak = useMemo(() => calcOverallDailyStreak(habits, todayIso), [habits, todayIso]);

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    const item: HabitItem = {
      id: `hab_${Date.now().toString(36)}`,
      name: trimmed,
      kind: newKind,
      color: newColor,
      completedDates: [],
      target: newKind === 'measurable' ? Math.max(1, newTarget) : undefined,
      unit: newKind === 'measurable' ? newUnit.trim() || 'units' : undefined,
      progressByDate: newKind === 'measurable' ? {} : undefined,
      quitStartDate: newKind === 'quitting' ? todayIso : undefined,
      relapsedDates: newKind === 'quitting' ? [] : undefined,
      createdAt: Date.now(),
    };
    setHabits((prev) => [item, ...prev]);
    setNewName('');
    setShowAdd(false);
  };

  const toggleRegular = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const has = h.completedDates.includes(todayIso);
        return {
          ...h,
          completedDates: has
            ? h.completedDates.filter((d) => d !== todayIso)
            : [...h.completedDates, todayIso],
        };
      })
    );
  };

  const adjustMeasurable = (id: string, delta: number) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const curr = h.progressByDate?.[todayIso] ?? 0;
        const nextVal = Math.max(0, Math.round((curr + delta) * 10) / 10);
        return {
          ...h,
          progressByDate: { ...(h.progressByDate ?? {}), [todayIso]: nextVal },
        };
      })
    );
  };

  const toggleQuittingRelapse = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const relapsed = h.relapsedDates ?? [];
        const has = relapsed.includes(todayIso);
        return {
          ...h,
          relapsedDates: has
            ? relapsed.filter((d) => d !== todayIso)
            : [...relapsed, todayIso],
        };
      })
    );
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1E] dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#133F47] dark:text-[#2DD4BF]" />
            Habit Tracker
          </h1>
          <p className="text-xs text-[#8E8E93] dark:text-zinc-400 mt-0.5">
            Track regular, measurable &amp; quitting habits and yearly consistency
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl paper-card text-xs font-bold text-[#133F47] dark:text-[#2DD4BF] inline-flex items-center gap-1.5">
            <span className="font-mono-num">{todayPct}%</span>
            <span>done today</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl paper-card text-xs font-bold text-amber-600 dark:text-amber-400 inline-flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            <span className="font-mono-num">{overallStreak}d</span>
            <span>streak</span>
          </div>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="ios-press inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#133F47] hover:bg-[#0E2F35] dark:bg-[#2DD4BF] dark:hover:bg-[#5EEAD4] text-white dark:text-[#0C1A1C] text-xs font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            New Habit
          </button>
        </div>
      </div>

      {/* Centered New Habit Popup Modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-workspace-enter"
          onClick={() => setShowAdd(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowAdd(false);
          }}
        >
          <form
            onSubmit={handleAddHabit}
            onClick={(e) => e.stopPropagation()}
            className="paper-card w-full max-w-md rounded-3xl p-6 space-y-5 border border-[#E2E0D8] shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1C1C1E]">Create New Habit</h2>
                <p className="text-xs text-[#8E8E93] mt-0.5">
                  Choose a name, colour, and tracking type
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="p-1.5 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] hover:bg-black/5 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Habit Name */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Habit Name
              </label>
              <input
                type="text"
                required
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={
                  newKind === 'measurable'
                    ? 'e.g. Drink Water, Walk, Study Pages'
                    : newKind === 'quitting'
                    ? 'e.g. No Junk Food, No Late Scrolling'
                    : 'e.g. Morning Revision, Skincare'
                }
                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-[#E2E0D8] bg-white/75 focus:outline-none focus:border-[#133F47]"
              />
            </div>

            {/* 2. Habit Type */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'regular', label: 'Regular', icon: CheckCircle2 },
                    { id: 'measurable', label: 'Measurable', icon: Gauge },
                    { id: 'quitting', label: 'Quitting', icon: Ban },
                  ] as const
                ).map((k) => {
                  const Icon = k.icon;
                  const active = newKind === k.id;
                  return (
                    <button
                      key={k.id}
                      type="button"
                      onClick={() => setNewKind(k.id)}
                      className={`ios-press flex flex-col items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                        active
                          ? 'bg-[#133F47] text-white border-[#133F47] shadow-sm'
                          : 'border-[#E2E0D8] bg-white/60 text-[#52525B] hover:text-[#1C1C1E]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{k.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {newKind === 'measurable' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                    Daily Target
                  </label>
                  <input
                    type="number"
                    min={1}
                    step="any"
                    value={newTarget}
                    onChange={(e) => setNewTarget(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-xs font-mono-num font-semibold rounded-xl border border-[#E2E0D8] bg-white/75 focus:outline-none focus:border-[#133F47]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="L, min, pgs"
                    className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-[#E2E0D8] bg-white/75 focus:outline-none focus:border-[#133F47]"
                  />
                </div>
              </div>
            )}

            {/* 3. Colour */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93]">
                Colour
              </label>
              <ColorRingPicker value={newColor} onChange={setNewColor} size={136} />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E2E0D8]/70">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#52525B] hover:bg-black/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ios-press px-5 py-2 rounded-xl text-white text-xs font-semibold shadow-sm"
                style={{ backgroundColor: newColor }}
              >
                Add Habit
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Habit Sections */}
      <div className="space-y-5">
        {/* Today's Overall Progress Bar */}
        <div className="paper-card rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#1C1C1E] dark:text-white">
            <span>Today&apos;s Completion</span>
            <span className="font-mono-num text-[#133F47] dark:text-[#2DD4BF]">{todayPct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#133F47] dark:bg-[#2DD4BF] rounded-full transition-all duration-300 shadow-2xs"
              style={{ width: `${todayPct}%` }}
            />
          </div>
        </div>

        {/* Unified Habits List */}
        <div className="paper-card rounded-2xl p-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-[#8E8E93] dark:text-zinc-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#133F47] dark:text-[#2DD4BF]" />
            My Habits
          </div>

          {habits.length === 0 ? (
            <div className="py-8 text-center space-y-2 border border-dashed border-[#D6D3CB] dark:border-white/15 rounded-2xl">
              <p className="text-xs text-[#8E8E93] dark:text-zinc-400">No habits added yet.</p>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="ios-press inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#133F47] dark:bg-[#2DD4BF] text-white dark:text-[#0C1A1C] text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                New Habit
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {habits.map((h) => {
                const streak = calcHabitStreak(h, todayIso);
                const kindLabel =
                  h.kind === 'regular'
                    ? 'Regular'
                    : h.kind === 'measurable'
                    ? 'Measurable'
                    : 'Quitting';

                const renderWeekDots = () => (
                  <div className="flex items-center gap-1.5">
                    {last7Days.map((iso) => {
                      const dayDone = isHabitDoneOnDate(h, iso);
                      const isToday = iso === todayIso;
                      return (
                        <span
                          key={iso}
                          title={`${iso}: ${dayDone ? 'Done' : 'Missed'}`}
                          className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                            isToday ? 'ring-1 ring-offset-1 ring-black/15 dark:ring-white/25 dark:ring-offset-transparent' : ''
                          }`}
                          style={{
                            backgroundColor: dayDone ? h.color : 'rgba(142, 142, 147, 0.22)',
                          }}
                        />
                      );
                    })}
                  </div>
                );

                if (h.kind === 'regular') {
                  const done = isHabitDoneOnDate(h, todayIso);
                  return (
                    <div
                      key={h.id}
                      className="relative overflow-hidden aspect-square p-4 rounded-[26px] border flex flex-col justify-between gap-2 group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                      style={{
                        borderColor: done ? `${h.color}70` : `${h.color}2A`,
                        background: done
                          ? `linear-gradient(145deg, ${h.color}2B 0%, ${h.color}0E 55%, rgba(255,255,255,0.03) 100%)`
                          : `linear-gradient(145deg, ${h.color}12 0%, rgba(255,255,255,0.02) 70%)`,
                      }}
                    >
                      <div
                        className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl transition-opacity duration-300"
                        style={{
                          backgroundColor: h.color,
                          opacity: done ? 0.32 : 0.12,
                        }}
                      />

                      <div className="relative z-10 flex items-start justify-between gap-1.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${h.color}20`,
                            color: h.color,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: h.color }}
                          />
                          {kindLabel}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/18 text-amber-700 dark:text-amber-300 text-[10px] font-bold font-mono-num inline-flex items-center gap-0.5">
                            <Flame className="w-3 h-3" />
                            {streak}d
                          </span>
                          <button
                            type="button"
                            onClick={() => setHabitToDelete({ id: h.id, name: h.name })}
                            className="p-1 text-[#8E8E93] hover:text-red-500 transition-colors"
                            aria-label={`Delete ${h.name}`}
                            title="Delete habit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="relative z-10 space-y-2.5 my-auto">
                        <div className="text-base font-extrabold text-[#1C1C1E] dark:text-white line-clamp-2 leading-snug">
                          {h.name}
                        </div>
                        {renderWeekDots()}
                      </div>

                      <div className="relative z-10 flex items-center justify-between gap-2 pt-1">
                        <span
                          className="text-[11px] font-bold"
                          style={{ color: done ? h.color : undefined }}
                        >
                          <span className={done ? '' : 'text-[#8E8E93] dark:text-zinc-400'}>
                            {done ? 'Done today' : 'Tap to complete'}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRegular(h.id)}
                          aria-label={done ? `Unmark ${h.name}` : `Mark ${h.name} done`}
                          className={`ios-press w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shrink-0 ${
                            done
                              ? 'text-white border-transparent'
                              : 'bg-white/75 dark:bg-white/10 hover:scale-105'
                          }`}
                          style={
                            done
                              ? {
                                  backgroundColor: h.color,
                                  boxShadow: `0 6px 16px -3px ${h.color}88`,
                                }
                              : { borderColor: h.color, color: h.color }
                          }
                        >
                          <Check className="w-4 h-4 stroke-[2.75]" />
                        </button>
                      </div>
                    </div>
                  );
                }

                if (h.kind === 'measurable') {
                  const curr = h.progressByDate?.[todayIso] ?? 0;
                  const target = h.target || 1;
                  const pct = Math.min(100, Math.round((curr / target) * 100));
                  const done = pct >= 100;
                  return (
                    <div
                      key={h.id}
                      className="relative overflow-hidden aspect-square p-4 rounded-[26px] border flex flex-col justify-between gap-2 group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                      style={{
                        borderColor: done ? `${h.color}70` : `${h.color}2A`,
                        background: done
                          ? `linear-gradient(145deg, ${h.color}2B 0%, ${h.color}0E 55%, rgba(255,255,255,0.03) 100%)`
                          : `linear-gradient(145deg, ${h.color}14 0%, rgba(255,255,255,0.02) 70%)`,
                      }}
                    >
                      <div
                        className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl transition-opacity duration-300"
                        style={{
                          backgroundColor: h.color,
                          opacity: done ? 0.32 : 0.14,
                        }}
                      />

                      <div className="relative z-10 flex items-start justify-between gap-1.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                          style={{
                            backgroundColor: `${h.color}20`,
                            color: h.color,
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: h.color }}
                          />
                          {kindLabel}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono-num"
                            style={{
                              backgroundColor: `${h.color}1F`,
                              color: h.color,
                            }}
                          >
                            {pct}%
                          </span>
                          <button
                            type="button"
                            onClick={() => setHabitToDelete({ id: h.id, name: h.name })}
                            className="p-1 text-[#8E8E93] hover:text-red-500 transition-colors"
                            aria-label={`Delete ${h.name}`}
                            title="Delete habit"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="relative z-10 space-y-2 my-auto">
                        <div className="text-base font-extrabold text-[#1C1C1E] dark:text-white line-clamp-2 leading-snug">
                          {h.name}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono-num text-[#6E6E73] dark:text-zinc-300">
                          <span>
                            <strong className="text-[#1C1C1E] dark:text-white">{curr}</strong> / {target} {h.unit}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: h.color,
                              boxShadow: pct > 0 ? `0 0 10px ${h.color}88` : undefined,
                            }}
                          />
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center justify-between gap-2 pt-1">
                        <div className="flex-1 min-w-0 pr-1">{renderWeekDots()}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => adjustMeasurable(h.id, -1)}
                            className="ios-press w-8 h-8 rounded-full border border-[#E2E0D8] dark:border-white/15 bg-white/80 dark:bg-white/10 flex items-center justify-center text-[#1C1C1E] dark:text-white shadow-2xs hover:scale-105 transition-transform"
                            aria-label={`Decrease ${h.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustMeasurable(h.id, 1)}
                            className="ios-press w-8 h-8 rounded-full text-white flex items-center justify-center hover:scale-105 transition-transform"
                            style={{
                              backgroundColor: h.color,
                              boxShadow: `0 5px 14px -3px ${h.color}88`,
                            }}
                            aria-label={`Increase ${h.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                const cleanToday = isHabitDoneOnDate(h, todayIso);
                return (
                  <div
                    key={h.id}
                    className="relative overflow-hidden aspect-square p-4 rounded-[26px] border flex flex-col justify-between gap-2 group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                    style={{
                      borderColor: cleanToday ? `${h.color}70` : 'rgba(239, 68, 68, 0.45)',
                      background: cleanToday
                        ? `linear-gradient(145deg, ${h.color}28 0%, ${h.color}0B 55%, rgba(255,255,255,0.03) 100%)`
                        : 'linear-gradient(145deg, rgba(239, 68, 68, 0.16) 0%, rgba(255,255,255,0.02) 70%)',
                    }}
                  >
                    <div
                      className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl transition-opacity duration-300"
                      style={{
                        backgroundColor: cleanToday ? h.color : '#EF4444',
                        opacity: 0.28,
                      }}
                    />

                    <div className="relative z-10 flex items-start justify-between gap-1.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
                        style={{
                          backgroundColor: `${h.color}20`,
                          color: h.color,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: h.color }}
                        />
                        {kindLabel}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/18 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold font-mono-num">
                          {streak}d clean
                        </span>
                        <button
                          type="button"
                          onClick={() => setHabitToDelete({ id: h.id, name: h.name })}
                          className="p-1 text-[#8E8E93] hover:text-red-500 transition-colors"
                          aria-label={`Delete ${h.name}`}
                          title="Delete habit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="relative z-10 space-y-2.5 my-auto">
                      <div className="text-base font-extrabold text-[#1C1C1E] dark:text-white line-clamp-2 leading-snug">
                        {h.name}
                      </div>
                      {renderWeekDots()}
                    </div>

                    <div className="relative z-10 flex items-center justify-between gap-2 pt-1">
                      <span
                        className={`text-[11px] font-bold ${
                          cleanToday ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {cleanToday ? 'Clean today' : 'Slipped today'}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleQuittingRelapse(h.id)}
                        aria-label={cleanToday ? `Log slip for ${h.name}` : `Reset slip for ${h.name}`}
                        title={cleanToday ? 'Clean today (click if slipped)' : 'Reset slip'}
                        className={`ios-press w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                          cleanToday
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-[0_6px_16px_-3px_rgba(16,185,129,0.55)]'
                            : 'bg-red-500/15 border-red-500 text-red-500'
                        }`}
                      >
                        {cleanToday ? (
                          <Check className="w-4 h-4 stroke-[2.75]" />
                        ) : (
                          <RotateCcw className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Yearly Overview Heatmap (52 weeks x 7 days) */}
      <div className="paper-card rounded-2xl p-5 space-y-3 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[640px]">
          <div>
            <h2 className="text-sm font-bold text-[#1C1C1E] dark:text-white">Yearly Overview</h2>
            <p className="text-[11px] text-[#8E8E93] dark:text-zinc-400">
              Daily habit completion percentage across the past 52 weeks
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#8E8E93] dark:text-zinc-400">
            <span>0%</span>
            <span className="w-3 h-3 rounded-xs bg-black/[0.06] dark:bg-white/[0.08]" />
            <span className="w-3 h-3 rounded-xs bg-[#133F47]/30 dark:bg-[#2DD4BF]/30" />
            <span className="w-3 h-3 rounded-xs bg-[#133F47]/65 dark:bg-[#2DD4BF]/65" />
            <span className="w-3 h-3 rounded-xs bg-[#133F47] dark:bg-[#2DD4BF]" />
            <span>100%</span>
          </div>
        </div>

        <div className="flex gap-1 min-w-[640px]">
          {yearWeeks.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1 flex-1">
              {week.map((iso) => {
                const pct = calcDayCompletionPct(habits, iso);
                const bg =
                  pct === 0
                    ? 'bg-black/[0.06] dark:bg-white/[0.08]'
                    : pct < 40
                    ? 'bg-[#133F47]/30 dark:bg-[#2DD4BF]/30'
                    : pct < 80
                    ? 'bg-[#133F47]/65 dark:bg-[#2DD4BF]/65'
                    : 'bg-[#133F47] dark:bg-[#2DD4BF]';
                return (
                  <div
                    key={iso}
                    title={`${iso}: ${pct}% completed`}
                    className={`w-full aspect-square rounded-[3px] ${bg} transition-colors`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <ConfirmModal
        open={!!habitToDelete}
        title="Delete Habit"
        message="Are you sure you want to Delete ?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={() => {
          if (habitToDelete) {
            deleteHabit(habitToDelete.id);
            setHabitToDelete(null);
          }
        }}
        onCancel={() => setHabitToDelete(null)}
      />
    </div>
  );
};
