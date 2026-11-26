import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { PlannerTask } from '../types';

const PLANNER_STORAGE_KEY = 'iqra_daily_planner_v1';

const TASK_COLORS = [
  '#133F47',
  '#0A5386',
  '#9B5B76',
  '#1B5E5A',
  '#5B3A70',
  '#A43850',
  '#D97706',
];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

function formatReadableDate(iso: string, todayIso: string, tomorrowIso: string): string {
  if (iso === todayIso) return 'Today';
  if (iso === tomorrowIso) return 'Tomorrow';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export const HabitTrackerView: React.FC = () => {
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const tomorrowIso = useMemo(() => addDaysIso(todayIso, 1), [todayIso]);

  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [tasks, setTasks] = useState<PlannerTask[]>(() => {
    try {
      const raw = localStorage.getItem(PLANNER_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as PlannerTask[]) : [];
    } catch {
      return [];
    }
  });
  const [newTitle, setNewTitle] = useState('');
  const [newColor, setNewColor] = useState(TASK_COLORS[0]);

  useEffect(() => {
    try {
      localStorage.setItem(PLANNER_STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      // ignore storage errors
    }
  }, [tasks]);

  const dayTasks = useMemo(() => {
    return tasks
      .filter((t) => t.date === selectedDate)
      .sort((a, b) => Number(a.completed) - Number(b.completed) || b.createdAt - a.createdAt);
  }, [tasks, selectedDate]);

  const completedCount = dayTasks.filter((t) => t.completed).length;
  const totalCount = dayTasks.length;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const unfinishedTodayCount = useMemo(
    () => tasks.filter((t) => t.date === todayIso && !t.completed).length,
    [tasks, todayIso]
  );

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const next: PlannerTask = {
      id: `pln_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      date: selectedDate,
      title: trimmed,
      color: newColor,
      completed: false,
      createdAt: Date.now(),
    };
    setTasks((prev) => [next, ...prev]);
    setNewTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const carryOverToTomorrow = () => {
    setTasks((prev) =>
      prev.map((t) =>
        t.date === todayIso && !t.completed ? { ...t, date: tomorrowIso } : t
      )
    );
    setSelectedDate(tomorrowIso);
  };

  const clearCompletedForDay = () => {
    setTasks((prev) =>
      prev.filter((t) => !(t.date === selectedDate && t.completed))
    );
  };

  const dateTitle = formatReadableDate(selectedDate, todayIso, tomorrowIso);
  const fullSubDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1E] flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-[#133F47]" />
            Daily Planner
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Plan for today or tomorrow, and check off what you&apos;ve completed
          </p>
        </div>

        {/* Day Switcher: Today / Tomorrow / Any Date */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-black/5 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setSelectedDate(todayIso)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedDate === todayIso
                  ? 'bg-[#133F47] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1C1C1E]'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(tomorrowIso)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                selectedDate === tomorrowIso
                  ? 'bg-[#133F47] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1C1C1E]'
              }`}
            >
              Tomorrow
            </button>
          </div>

          <div className="flex items-center gap-1 paper-card rounded-xl px-1.5 py-1">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDaysIso(d, -1))}
              title="Previous day"
              className="p-1 rounded-lg text-[#6E6E73] hover:text-[#1C1C1E] hover:bg-black/5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="text-xs font-semibold text-[#1C1C1E] bg-transparent focus:outline-none px-1"
            />
            <button
              type="button"
              onClick={() => setSelectedDate((d) => addDaysIso(d, 1))}
              title="Next day"
              className="p-1 rounded-lg text-[#6E6E73] hover:text-[#1C1C1E] hover:bg-black/5"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Planner Card */}
      <div className="paper-card rounded-2xl p-5 sm:p-6 space-y-5">
        {/* Selected Day Summary + Progress */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E2E0D8]/80">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#1C1C1E]">{dateTitle}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono-num bg-[#133F47]/10 text-[#133F47]">
                {completedCount}/{totalCount} done
              </span>
            </div>
            <p className="text-[11px] text-[#8E8E93] mt-0.5">{fullSubDate}</p>
          </div>

          <div className="flex items-center gap-3">
            {selectedDate === todayIso && unfinishedTodayCount > 0 && (
              <button
                type="button"
                onClick={carryOverToTomorrow}
                className="ios-press inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E2E0D8] bg-white/60 hover:bg-white text-[11px] font-semibold text-[#133F47]"
                title="Move remaining tasks to Tomorrow"
              >
                Move unfinished to Tomorrow
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
            {completedCount > 0 && (
              <button
                type="button"
                onClick={clearCompletedForDay}
                className="text-[11px] font-semibold text-[#8E8E93] hover:text-red-600"
              >
                Clear completed
              </button>
            )}
          </div>
        </div>

        {/* Completion Progress Bar */}
        {totalCount > 0 && (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-black/8 overflow-hidden">
              <div
                className="h-full bg-[#133F47] transition-all duration-300 rounded-full"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-semibold text-[#8E8E93]">
              <span>
                {completionPct === 100
                  ? 'All planned items completed!'
                  : `${totalCount - completedCount} remaining`}
              </span>
              <span className="font-mono-num">{completionPct}%</span>
            </div>
          </div>
        )}

        {/* Quick Add Form */}
        <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={
              selectedDate === tomorrowIso
                ? 'Plan something for tomorrow...'
                : `Add a task for ${dateTitle.toLowerCase()}...`
            }
            className="flex-1 px-4 py-2.5 text-xs font-medium rounded-xl border border-[#E2E0D8] bg-white/70 focus:outline-none focus:border-[#133F47]"
          />

          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <div className="flex items-center gap-1.5 px-1">
              {TASK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform ${
                    newColor === c ? 'scale-115 ring-2 ring-offset-2 ring-[#1C1C1E]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  title="Pick tag color"
                />
              ))}
            </div>

            <button
              type="submit"
              className="ios-press inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#133F47] hover:bg-[#0E2F35] text-white text-xs font-semibold shadow-sm shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>
        </form>

        {/* Task Checklist */}
        {dayTasks.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-[#D6D3CB] rounded-2xl">
            <Sparkles className="w-6 h-6 text-[#133F47]/60 mx-auto" />
            <div className="text-xs font-semibold text-[#1C1C1E]">
              Nothing planned for {dateTitle} yet
            </div>
            <p className="text-[11px] text-[#8E8E93]">
              Type what you want to get done above and press Enter.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dayTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl border transition-all group ${
                  task.completed
                    ? 'bg-black/[0.02] border-[#E2E0D8]/50 opacity-75'
                    : 'bg-white/65 border-[#E2E0D8] hover:border-[#133F47]/40 shadow-2xs'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      task.completed
                        ? 'border-transparent text-white'
                        : 'border-[#C7C5BE] bg-white hover:border-[#133F47]'
                    }`}
                    style={
                      task.completed ? { backgroundColor: task.color } : undefined
                    }
                  >
                    {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>

                  <span
                    className="w-1.5 h-5 rounded-full shrink-0"
                    style={{ backgroundColor: task.color }}
                  />

                  <span
                    className={`text-xs font-semibold truncate ${
                      task.completed
                        ? 'line-through text-[#8E8E93]'
                        : 'text-[#1C1C1E]'
                    }`}
                  >
                    {task.title}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => deleteTask(task.id)}
                  title="Delete item"
                  className="p-1.5 rounded-lg text-[#8E8E93] opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
