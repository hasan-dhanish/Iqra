import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Coffee,
  GraduationCap,
  MapPin,
  Plus,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { DAYS_OF_WEEK } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { CollegePeriodDef, CollegeTimetableCell, TimetableKind } from '../types';

const SLOT_COLORS = ['#C2598B', '#0A5386', '#1B5E5A', '#8B1E1E', '#7C3AED', '#B45309'];
const KINDS: TimetableKind[] = ['Study', 'Revision', 'Lab', 'Class', 'Break'];

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const total = (h * 60 + m + mins) % (24 * 60);
  const nh = String(Math.floor(total / 60)).padStart(2, '0');
  const nm = String(total % 60).padStart(2, '0');
  return `${nh}:${nm}`;
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export const TimetableView: React.FC = () => {
  const {
    projects,
    collegeTimetable,
    timetableSlots,
    studyGoals,
    updateCollegeTimetable,
    addTimetableSlot,
    deleteTimetableSlot,
    addStudyGoal,
    toggleStudyGoal,
    deleteStudyGoal,
  } = useLdoi();

  const [section, setSection] = useState<'college' | 'study'>('college');

  // College Timetable Wizard State
  const [showSetup, setShowSetup] = useState(false);
  const [periodCount, setPeriodCount] = useState(
    () => collegeTimetable.periods.filter((p) => !p.isBreak).length || 6
  );
  const [firstStartTime, setFirstStartTime] = useState(
    () => collegeTimetable.periods[0]?.startTime || '09:00'
  );
  const [periodDuration, setPeriodDuration] = useState(50);

  // Cell editor modal state
  const [editingCell, setEditingCell] = useState<{
    dayIdx: number;
    period: CollegePeriodDef;
  } | null>(null);
  const [cellSubjectId, setCellSubjectId] = useState('');
  const [cellTitle, setCellTitle] = useState('');
  const [cellRoom, setCellRoom] = useState('');
  const [cellColor, setCellColor] = useState('#C2598B');

  // After-college study block state
  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('18:30');
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [kind, setKind] = useState<TimetableKind>('Study');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [colorHex, setColorHex] = useState('#C2598B');

  // Study Goal form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDate, setGoalDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Current day & time for live highlight
  const now = new Date();
  const jsDay = now.getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const toggleCollegeDay = async (dayIdx: number) => {
    const exists = collegeTimetable.days.includes(dayIdx);
    const nextDays = exists
      ? collegeTimetable.days.filter((d) => d !== dayIdx)
      : [...collegeTimetable.days, dayIdx].sort((a, b) => a - b);
    if (nextDays.length === 0) return;
    await updateCollegeTimetable({ ...collegeTimetable, days: nextDays });
  };

  const handleGeneratePeriods = async (e: React.FormEvent) => {
    e.preventDefault();
    const count = Math.max(1, Math.min(12, periodCount));
    const nextPeriods: CollegePeriodDef[] = [];
    let cursor = firstStartTime;

    for (let i = 1; i <= count; i++) {
      const end = addMinutes(cursor, periodDuration);
      nextPeriods.push({
        id: `p${i}`,
        label: `Period ${i}`,
        isBreak: false,
        startTime: cursor,
        endTime: end,
      });
      cursor = end;

      // Auto-insert a 15-min short break after Period 2 and a 45-min lunch after Period 4 if count >= 5
      if (i === 2 && count >= 4) {
        const bEnd = addMinutes(cursor, 15);
        nextPeriods.push({
          id: 'b_short',
          label: 'Short Break',
          isBreak: true,
          startTime: cursor,
          endTime: bEnd,
        });
        cursor = bEnd;
      } else if (i === 4 && count >= 5) {
        const lEnd = addMinutes(cursor, 45);
        nextPeriods.push({
          id: 'b_lunch',
          label: 'Lunch Break',
          isBreak: true,
          startTime: cursor,
          endTime: lEnd,
        });
        cursor = lEnd;
      }
    }

    await updateCollegeTimetable({
      ...collegeTimetable,
      periods: nextPeriods,
    });
    setShowSetup(false);
  };

  const updatePeriodField = async (
    periodId: string,
    patch: Partial<CollegePeriodDef>
  ) => {
    await updateCollegeTimetable({
      ...collegeTimetable,
      periods: collegeTimetable.periods.map((p) =>
        p.id === periodId ? { ...p, ...patch } : p
      ),
    });
  };

  const addCustomBreak = async () => {
    const last = collegeTimetable.periods[collegeTimetable.periods.length - 1];
    const start = last ? last.endTime : '12:00';
    const end = addMinutes(start, 30);
    await updateCollegeTimetable({
      ...collegeTimetable,
      periods: [
        ...collegeTimetable.periods,
        {
          id: `b_${Date.now().toString(36)}`,
          label: 'Break',
          isBreak: true,
          startTime: start,
          endTime: end,
        },
      ],
    });
  };

  const removePeriod = async (periodId: string) => {
    if (collegeTimetable.periods.length <= 1) return;
    await updateCollegeTimetable({
      ...collegeTimetable,
      periods: collegeTimetable.periods.filter((p) => p.id !== periodId),
    });
  };

  const openCellEditor = (dayIdx: number, period: CollegePeriodDef) => {
    if (period.isBreak) return;
    const key = `${dayIdx}-${period.id}`;
    const existing = collegeTimetable.cells[key];
    setEditingCell({ dayIdx, period });
    setCellSubjectId(existing?.projectId ?? '');
    setCellTitle(existing?.title ?? '');
    setCellRoom(existing?.room ?? '');
    setCellColor(existing?.colorHex ?? '#C2598B');
  };

  const saveCell = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCell) return;
    const key = `${editingCell.dayIdx}-${editingCell.period.id}`;
    const subj = projects.find((p) => p.id === cellSubjectId);
    const finalTitle = cellTitle.trim() || subj?.title || '';
    const nextCells = { ...collegeTimetable.cells };

    if (!finalTitle) {
      delete nextCells[key];
    } else {
      const entry: CollegeTimetableCell = {
        title: finalTitle,
        projectId: cellSubjectId || undefined,
        room: cellRoom.trim(),
        colorHex: cellColor,
      };
      nextCells[key] = entry;
    }

    await updateCollegeTimetable({ ...collegeTimetable, cells: nextCells });
    setEditingCell(null);
  };

  const clearCell = async () => {
    if (!editingCell) return;
    const key = `${editingCell.dayIdx}-${editingCell.period.id}`;
    const nextCells = { ...collegeTimetable.cells };
    delete nextCells[key];
    await updateCollegeTimetable({ ...collegeTimetable, cells: nextCells });
    setEditingCell(null);
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await addTimetableSlot({
      dayOfWeek,
      startTime,
      endTime,
      title: title.trim(),
      projectId: projectId || undefined,
      kind,
      locationOrLink: locationOrLink.trim(),
      owner: 'Sajitha',
      colorHex,
    });
    setTitle('');
    setLocationOrLink('');
    setShowAddForm(false);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle.trim()) return;
    await addStudyGoal({
      title: goalTitle.trim(),
      targetDate: goalDate,
      completed: false,
      owner: 'Sajitha',
    });
    setGoalTitle('');
  };

  const filteredSlots = useMemo(
    () =>
      timetableSlots
        .filter((s) => (selectedDay === 'all' ? true : s.dayOfWeek === selectedDay))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [timetableSlots, selectedDay]
  );

  const visibleDays = selectedDay === 'all' ? [0, 1, 2, 3, 4, 5, 6] : [selectedDay];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1E] flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#C2598B]" />
            Timetable &amp; Study Plan
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Your virtual college class timetable, after-college study blocks, and daily goals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-black/5 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setSection('college')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                section === 'college'
                  ? 'bg-[#C2598B] text-white'
                  : 'text-[#6E6E73] hover:text-[#1C1C1E]'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              College Timetable
            </button>
            <button
              type="button"
              onClick={() => setSection('study')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 ${
                section === 'study'
                  ? 'bg-[#C2598B] text-white'
                  : 'text-[#6E6E73] hover:text-[#1C1C1E]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Study Plan &amp; Goals
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: VIRTUAL COLLEGE TIMETABLE */}
      {section === 'college' && (
        <div className="space-y-4">
          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {DAYS_OF_WEEK.slice(0, 6).map((day, idx) => {
                const active = collegeTimetable.days.includes(idx);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleCollegeDay(idx)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                      active
                        ? 'bg-[#C2598B]/15 text-[#C2598B] border-[#C2598B]/40'
                        : 'paper-card text-[#8E8E93] border-[#E2E0D8]'
                    }`}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowSetup((v) => !v)}
              className="ios-press inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#C2598B] hover:bg-[#B04B7B] text-white rounded-xl shadow-xs"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {showSetup ? 'Close Setup' : 'Setup Periods & Times'}
            </button>
          </div>

          {/* Interactive Period & Time Wizard */}
          {showSetup && (
            <div className="paper-card rounded-2xl p-5 space-y-5 border border-[#E2E0D8]">
              <form onSubmit={handleGeneratePeriods} className="space-y-4">
                <div className="text-sm font-bold text-[#1C1C1E]">
                  Configure Your College Schedule
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">
                      How many periods per day?
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={periodCount}
                      onChange={(e) => setPeriodCount(Number(e.target.value) || 6)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">
                      When does Period 1 start?
                    </label>
                    <input
                      type="time"
                      value={firstStartTime}
                      onChange={(e) => setFirstStartTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">
                      Minutes per period
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={180}
                      step={5}
                      value={periodDuration}
                      onChange={(e) => setPeriodDuration(Number(e.target.value) || 50)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={addCustomBreak}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#E2E0D8] text-[#52525B] hover:text-[#1C1C1E]"
                  >
                    <Coffee className="w-3.5 h-3.5" /> + Add Break Slot
                  </button>
                  <button
                    type="submit"
                    className="ios-press px-4 py-2 text-xs font-semibold bg-[#C2598B] text-white rounded-xl"
                  >
                    Generate Virtual Timetable
                  </button>
                </div>
              </form>

              {/* Fine-tune individual period start/end times */}
              <div className="pt-3 border-t border-[#E2E0D8]/70 space-y-2">
                <div className="text-xs font-bold text-[#1C1C1E]">
                  Fine-Tune Each Period / Break Time
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {collegeTimetable.periods.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 p-2 rounded-xl border border-[#E2E0D8]/80 bg-white/40"
                    >
                      <input
                        type="text"
                        value={p.label}
                        onChange={(e) => updatePeriodField(p.id, { label: e.target.value })}
                        className="w-28 px-2 py-1 text-xs font-semibold rounded-lg border border-[#E2E0D8] bg-white/70"
                      />
                      <input
                        type="time"
                        value={p.startTime}
                        onChange={(e) => updatePeriodField(p.id, { startTime: e.target.value })}
                        className="px-2 py-1 text-xs rounded-lg border border-[#E2E0D8] bg-white/70"
                      />
                      <span className="text-xs text-[#8E8E93]">–</span>
                      <input
                        type="time"
                        value={p.endTime}
                        onChange={(e) => updatePeriodField(p.id, { endTime: e.target.value })}
                        className="px-2 py-1 text-xs rounded-lg border border-[#E2E0D8] bg-white/70"
                      />
                      <label className="inline-flex items-center gap-1 text-[11px] text-[#6E6E73] cursor-pointer ml-auto">
                        <input
                          type="checkbox"
                          checked={p.isBreak}
                          onChange={(e) => updatePeriodField(p.id, { isBreak: e.target.checked })}
                          className="accent-[#C2598B]"
                        />
                        Break
                      </label>
                      <button
                        type="button"
                        onClick={() => removePeriod(p.id)}
                        className="text-[#8E8E93] hover:text-red-600 p-1"
                        title="Remove slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Virtual Timetable Matrix */}
          <div className="paper-card rounded-2xl p-4 overflow-x-auto">
            <div className="text-[11px] text-[#8E8E93] mb-3">
              Click any period cell to assign a subject, room, and color.
            </div>
            <table className="w-full border-collapse min-w-[760px]">
              <thead>
                <tr>
                  <th className="text-left text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] p-2.5 border-b border-[#E2E0D8]/70 w-24">
                    Day
                  </th>
                  {collegeTimetable.periods.map((p) => {
                    const isCurrent = nowHHMM >= p.startTime && nowHHMM <= p.endTime;
                    return (
                      <th
                        key={p.id}
                        className={`text-center p-2.5 border-b border-[#E2E0D8]/70 ${
                          p.isBreak ? 'w-20 bg-black/[0.02]' : ''
                        } ${isCurrent ? 'bg-[#C2598B]/10 rounded-t-xl' : ''}`}
                      >
                        <div className="text-xs font-bold text-[#1C1C1E]">{p.label}</div>
                        <div className="text-[10px] font-mono-num text-[#8E8E93] mt-0.5">
                          {formatTime12(p.startTime)} – {formatTime12(p.endTime)}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {collegeTimetable.days.map((dayIdx) => {
                  const isToday = dayIdx === todayIdx;
                  return (
                    <tr
                      key={dayIdx}
                      className={`border-b border-[#E2E0D8]/40 last:border-b-0 ${
                        isToday ? 'bg-[#C2598B]/[0.05]' : ''
                      }`}
                    >
                      <td className="p-2.5 align-middle">
                        <div className="flex items-center gap-1.5">
                          {isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#C2598B] shrink-0" />
                          )}
                          <span
                            className={`text-xs font-bold ${
                              isToday ? 'text-[#C2598B]' : 'text-[#1C1C1E]'
                            }`}
                          >
                            {DAYS_OF_WEEK[dayIdx].slice(0, 3)}
                          </span>
                        </div>
                      </td>

                      {collegeTimetable.periods.map((p) => {
                        if (p.isBreak) {
                          return (
                            <td
                              key={p.id}
                              className="p-1.5 text-center align-middle bg-black/[0.02]"
                            >
                              <div className="text-[10px] font-semibold text-[#8E8E93] tracking-wider uppercase">
                                {p.label.split(' ')[0]}
                              </div>
                            </td>
                          );
                        }

                        const cell = collegeTimetable.cells[`${dayIdx}-${p.id}`];
                        const isLiveNow =
                          isToday && nowHHMM >= p.startTime && nowHHMM <= p.endTime;

                        return (
                          <td key={p.id} className="p-1.5 align-top">
                            <button
                              type="button"
                              onClick={() => openCellEditor(dayIdx, p)}
                              style={
                                cell
                                  ? {
                                      backgroundColor: `${cell.colorHex}18`,
                                      borderColor: `${cell.colorHex}55`,
                                    }
                                  : undefined
                              }
                              className={`w-full min-h-[58px] p-2 rounded-xl border text-left transition-all hover:scale-[1.01] ${
                                cell
                                  ? ''
                                  : 'border-dashed border-[#D6D3CB] hover:border-[#C2598B]/60 bg-white/30'
                              } ${isLiveNow ? 'ring-2 ring-[#C2598B]/50' : ''}`}
                            >
                              {cell ? (
                                <div className="space-y-0.5">
                                  <div
                                    className="text-xs font-bold leading-tight line-clamp-2"
                                    style={{ color: cell.colorHex }}
                                  >
                                    {cell.title}
                                  </div>
                                  {cell.room && (
                                    <div className="text-[10px] text-[#6E6E73] truncate">
                                      {cell.room}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center text-[11px] text-[#A1A1AA]">
                                  + Add
                                </div>
                              )}
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
        </div>
      )}

      {/* SECTION 2: AFTER-COLLEGE STUDY PLAN & GOALS */}
      {section === 'study' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedDay('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap border transition-colors ${
                  selectedDay === 'all'
                    ? 'bg-[#C2598B] text-white border-[#C2598B]'
                    : 'paper-card text-[#52525B] border-[#E2E0D8]'
                }`}
              >
                Full Week
              </button>
              {DAYS_OF_WEEK.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(idx)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap border transition-colors ${
                    selectedDay === idx
                      ? 'bg-[#C2598B] text-white border-[#C2598B]'
                      : 'paper-card text-[#52525B] border-[#E2E0D8]'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="ios-press inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#C2598B] hover:bg-[#B04B7B] text-white rounded-xl shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Study Block
            </button>
          </div>

          {showAddForm && (
            <form
              onSubmit={handleCreateSlot}
              className="paper-card rounded-2xl p-5 space-y-4 border border-[#E2E0D8]"
            >
              <div className="text-sm font-bold text-[#1C1C1E]">New Study Block</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. DSA Practice / Revision"
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                >
                  {DAYS_OF_WEEK.map((d, idx) => (
                    <option key={d} value={idx}>
                      {d}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="px-2.5 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                  />
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="px-2.5 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                  />
                </div>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                >
                  <option value="">General / Unlinked</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as TimetableKind)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={locationOrLink}
                  onChange={(e) => setLocationOrLink(e.target.value)}
                  placeholder="Desk / Library / Link"
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {SLOT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColorHex(c)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        colorHex === c ? 'scale-110 border-[#1C1C1E]' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <label
                    className="w-6 h-6 rounded-full cursor-pointer border border-black/15 overflow-hidden"
                    style={{
                      background:
                        'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                    }}
                    title="Color Wheel"
                  >
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#6E6E73]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ios-press px-4 py-1.5 text-xs font-semibold bg-[#C2598B] text-white rounded-xl"
                  >
                    Save Block
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleDays.map((dayIdx) => {
              const daySlots = filteredSlots.filter((s) => s.dayOfWeek === dayIdx);
              return (
                <div key={dayIdx} className="paper-card rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#E2E0D8]/70 pb-2">
                    <span className="text-xs font-bold text-[#1C1C1E]">
                      {DAYS_OF_WEEK[dayIdx]}
                    </span>
                    <span className="text-[11px] font-mono-num text-[#8E8E93]">
                      {daySlots.length} {daySlots.length === 1 ? 'block' : 'blocks'}
                    </span>
                  </div>

                  {daySlots.length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-[#8E8E93]">
                      No study blocks
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {daySlots.map((slot) => {
                        const subj = projects.find((p) => p.id === slot.projectId);
                        return (
                          <div
                            key={slot.id}
                            className="p-2.5 rounded-xl border border-[#E2E0D8]/80 bg-white/40 space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: slot.colorHex }}
                                />
                                <span className="text-xs font-bold text-[#1C1C1E] truncate">
                                  {slot.title}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteTimetableSlot(slot.id)}
                                className="text-[#8E8E93] hover:text-red-600 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#6E6E73]">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>
                                {slot.startTime} – {slot.endTime}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-black/5 text-[10px] font-semibold">
                                {slot.kind}
                              </span>
                            </div>
                            {(subj || slot.locationOrLink) && (
                              <div className="flex items-center gap-2 text-[11px] text-[#8E8E93] truncate">
                                {subj && (
                                  <span className="font-semibold text-[#C2598B]">{subj.title}</span>
                                )}
                                {slot.locationOrLink && (
                                  <span className="inline-flex items-center gap-1 truncate">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    {slot.locationOrLink}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Study Goals */}
          <div className="paper-card rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#1C1C1E]">Study Goals &amp; Targets</h2>
              <p className="text-xs text-[#8E8E93]">Track daily or weekly learning targets</p>
            </div>

            <form onSubmit={handleCreateGoal} className="flex flex-wrap gap-2">
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                placeholder="e.g. Finish Chapter 4 notes..."
                className="flex-1 min-w-[200px] px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
              />
              <input
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
              />
              <button
                type="submit"
                className="ios-press px-4 py-2 text-xs font-semibold bg-[#C2598B] text-white rounded-xl inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Goal
              </button>
            </form>

            {studyGoals.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {studyGoals.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[#E2E0D8]/80 bg-white/40"
                  >
                    <button
                      type="button"
                      onClick={() => toggleStudyGoal(g.id)}
                      className="flex items-center gap-2 text-left min-w-0 flex-1"
                    >
                      {g.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#8E8E93] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div
                          className={`text-xs font-semibold truncate ${
                            g.completed ? 'line-through text-[#8E8E93]' : 'text-[#1C1C1E]'
                          }`}
                        >
                          {g.title}
                        </div>
                        <div className="text-[10px] text-[#8E8E93]">{g.targetDate}</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStudyGoal(g.id)}
                      className="text-[#8E8E93] hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cell Editor Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={saveCell}
            className="w-full max-w-sm paper-card rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="px-5 py-3.5 border-b border-[#E2E0D8] flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-[#1C1C1E]">
                  {DAYS_OF_WEEK[editingCell.dayIdx]} · {editingCell.period.label}
                </div>
                <div className="text-[11px] text-[#8E8E93]">
                  {formatTime12(editingCell.period.startTime)} –{' '}
                  {formatTime12(editingCell.period.endTime)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1 text-[#71717A] hover:text-[#18181B]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              {projects.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">
                    Pick Subject (optional)
                  </label>
                  <select
                    value={cellSubjectId}
                    onChange={(e) => {
                      setCellSubjectId(e.target.value);
                      const subj = projects.find((p) => p.id === e.target.value);
                      if (subj && !cellTitle.trim()) setCellTitle(subj.title);
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                  >
                    <option value="">Custom Class Name</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">
                  Class / Subject Name
                </label>
                <input
                  type="text"
                  autoFocus
                  value={cellTitle}
                  onChange={(e) => setCellTitle(e.target.value)}
                  placeholder="e.g. Data Structures"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">
                  Room / Lab (optional)
                </label>
                <input
                  type="text"
                  value={cellRoom}
                  onChange={(e) => setCellRoom(e.target.value)}
                  placeholder="e.g. Room 204 / Lab 2"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Color</label>
                <div className="flex items-center gap-1.5">
                  {SLOT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCellColor(c)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        cellColor === c ? 'scale-110 border-[#1C1C1E]' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <label
                    className="w-6 h-6 rounded-full cursor-pointer border border-black/15 overflow-hidden"
                    style={{
                      background:
                        'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                    }}
                    title="Color Wheel"
                  >
                    <input
                      type="color"
                      value={cellColor}
                      onChange={(e) => setCellColor(e.target.value)}
                      className="opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-[#E2E0D8] flex justify-between gap-2">
              <button
                type="button"
                onClick={clearCell}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:underline"
              >
                Clear Slot
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#6E6E73]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ios-press px-4 py-1.5 text-xs font-semibold bg-[#C2598B] text-white rounded-xl"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
