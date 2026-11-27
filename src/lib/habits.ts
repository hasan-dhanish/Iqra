export type HabitKind = 'regular' | 'measurable' | 'quitting';

export interface HabitItem {
  id: string;
  name: string;
  kind: HabitKind;
  color: string;
  // Regular
  completedDates: string[];
  // Measurable
  target?: number;
  unit?: string;
  progressByDate?: Record<string, number>;
  // Quitting
  quitStartDate?: string;
  relapsedDates?: string[];
  createdAt: number;
}

export interface SleepEntry {
  date: string; // YYYY-MM-DD
  bedTime: string; // HH:MM
  wakeTime: string; // HH:MM
  durationMins: number;
}

export const HABITS_STORAGE_KEY = 'iqra_habits_v2';
export const SLEEP_STORAGE_KEY = 'iqra_sleep_v1';
export const FOCUS_COUNT_KEY = 'iqra_focus_count_v1';

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function loadHabits(): HabitItem[] {
  try {
    const raw = localStorage.getItem(HABITS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HabitItem[]) : [];
  } catch {
    return [];
  }
}

export function saveHabits(habits: HabitItem[]): void {
  try {
    localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits));
  } catch {
    // ignore
  }
}

export function loadSleepLogs(): Record<string, SleepEntry> {
  try {
    const raw = localStorage.getItem(SLEEP_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SleepEntry>) : {};
  } catch {
    return {};
  }
}

export function saveSleepLogs(logs: Record<string, SleepEntry>): void {
  try {
    localStorage.setItem(SLEEP_STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // ignore
  }
}

export function calcSleepDurationMins(bedTime: string, wakeTime: string): number {
  const [bh, bm] = bedTime.split(':').map(Number);
  const [wh, wm] = wakeTime.split(':').map(Number);
  if ([bh, bm, wh, wm].some((n) => Number.isNaN(n))) return 0;
  const bedTotal = bh * 60 + bm;
  let wakeTotal = wh * 60 + wm;
  if (wakeTotal <= bedTotal) wakeTotal += 24 * 60;
  return wakeTotal - bedTotal;
}

export function isHabitDoneOnDate(h: HabitItem, iso: string): boolean {
  if (h.kind === 'regular') {
    return h.completedDates.includes(iso);
  }
  if (h.kind === 'measurable') {
    const val = h.progressByDate?.[iso] ?? 0;
    return val >= (h.target || 1);
  }
  // quitting: clean on `iso` if iso >= quitStartDate && iso <= today && not relapsed
  const start = h.quitStartDate || toIsoDate(new Date(h.createdAt));
  if (iso < start) return false;
  return !(h.relapsedDates ?? []).includes(iso);
}

export function getHabitDayProgress(h: HabitItem, iso: string): number {
  if (h.kind === 'measurable') {
    const val = h.progressByDate?.[iso] ?? 0;
    const target = h.target || 1;
    return Math.min(1, Math.max(0, val / target));
  }
  return isHabitDoneOnDate(h, iso) ? 1 : 0;
}

export function calcDayCompletionPct(habits: HabitItem[], iso: string): number {
  if (habits.length === 0) return 0;
  const totalProgress = habits.reduce((sum, h) => sum + getHabitDayProgress(h, iso), 0);
  return Math.round((totalProgress / habits.length) * 100);
}

export function calcHabitStreak(h: HabitItem, todayIso: string): number {
  if (h.kind === 'quitting') {
    const start = h.quitStartDate || toIsoDate(new Date(h.createdAt));
    const relapsed = new Set(h.relapsedDates ?? []);
    const cursor = new Date(`${todayIso}T00:00:00`);
    let streak = 0;
    while (true) {
      const iso = toIsoDate(cursor);
      if (iso < start || relapsed.has(iso)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
      if (streak > 3650) break;
    }
    return streak;
  }

  const cursor = new Date(`${todayIso}T00:00:00`);
  if (!isHabitDoneOnDate(h, todayIso)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (isHabitDoneOnDate(h, toIsoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 3650) break;
  }
  return streak;
}

export function calcOverallDailyStreak(habits: HabitItem[], todayIso: string): number {
  if (habits.length === 0) return 0;
  const checkable = habits.filter((h) => h.kind !== 'quitting');
  const pool = checkable.length > 0 ? checkable : habits;

  const hasAnyDone = (iso: string) => pool.some((h) => isHabitDoneOnDate(h, iso));

  const cursor = new Date(`${todayIso}T00:00:00`);
  if (!hasAnyDone(todayIso)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (hasAnyDone(toIsoDate(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    if (streak > 3650) break;
  }
  return streak;
}
