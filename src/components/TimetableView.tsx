import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import { DAYS_OF_WEEK } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { OwnerScope, TimetableKind } from '../types';

const SLOT_COLORS = ['#0A5386', '#1B5E5A', '#8B1E1E', '#5B3A70', '#B45309', '#254454'];
const KINDS: TimetableKind[] = ['Class', 'Study', 'Lab', 'Revision', 'Break'];

export const TimetableView: React.FC = () => {
  const {
    currentUser,
    projects,
    timetableSlots,
    studyGoals,
    addTimetableSlot,
    deleteTimetableSlot,
    addStudyGoal,
    toggleStudyGoal,
    deleteStudyGoal,
  } = useLdoi();

  const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
  const [ownerFilter, setOwnerFilter] = useState<'All' | OwnerScope>('All');

  // New slot form state
  const [dayOfWeek, setDayOfWeek] = useState<number>(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [kind, setKind] = useState<TimetableKind>('Study');
  const [locationOrLink, setLocationOrLink] = useState('');
  const [owner, setOwner] = useState<OwnerScope>('Both');
  const [colorHex, setColorHex] = useState('#0A5386');
  const [showAddForm, setShowAddForm] = useState(false);

  // Study Goal form
  const [goalTitle, setGoalTitle] = useState('');
  const [goalDate, setGoalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [goalOwner, setGoalOwner] = useState<OwnerScope>(currentUser?.name ?? 'Sajitha');

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
      owner,
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
      owner: goalOwner,
    });
    setGoalTitle('');
  };

  const filteredSlots = useMemo(
    () =>
      timetableSlots
        .filter((s) => (selectedDay === 'all' ? true : s.dayOfWeek === selectedDay))
        .filter((s) => (ownerFilter === 'All' ? true : s.owner === ownerFilter || s.owner === 'Both'))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [timetableSlots, selectedDay, ownerFilter]
  );

  const visibleDays = selectedDay === 'all' ? [0, 1, 2, 3, 4, 5, 6] : [selectedDay];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1E] flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#133F47]" />
            Timetable &amp; Study Plan
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Weekly schedule, classes, study blocks, and daily goals for Sajitha &amp; Dhani
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-black/5 rounded-xl p-1">
            {(['All', 'Sajitha', 'Dhani', 'Both'] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOwnerFilter(o)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  ownerFilter === o
                    ? 'bg-[#133F47] text-white'
                    : 'text-[#6E6E73] hover:text-[#1C1C1E]'
                }`}
              >
                {o}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="ios-press inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#0A5386] hover:bg-[#0C64A1] text-white rounded-xl shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Time Block
          </button>
        </div>
      </div>

      {/* Add Timetable Block Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateSlot}
          className="paper-card rounded-2xl p-5 space-y-4 border border-[#E2E0D8]"
        >
          <div className="text-sm font-bold text-[#1C1C1E]">New Timetable Block</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Algorithms Lecture"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60 focus:outline-none focus:border-[#0A5386]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Day</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60 focus:outline-none focus:border-[#0A5386]"
              >
                {DAYS_OF_WEEK.map((d, idx) => (
                  <option key={d} value={idx}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Subject</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
              >
                <option value="">General / Unlinked</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Type</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as TimetableKind)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">For</label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value as OwnerScope)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
              >
                <option value="Both">Both (Sajitha &amp; Dhani)</option>
                <option value="Sajitha">Sajitha</option>
                <option value="Dhani">Dhani</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">
                Room / Link
              </label>
              <input
                type="text"
                value={locationOrLink}
                onChange={(e) => setLocationOrLink(e.target.value)}
                placeholder="Room 204 or Zoom URL"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8E8E93] mb-1">Color</label>
              <div className="flex items-center gap-1.5 pt-1">
                {SLOT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColorHex(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      colorHex === c ? 'scale-110 border-[#1C1C1E]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                {/* Color Wheel */}
                <label
                  className="w-6 h-6 rounded-full cursor-pointer border border-black/15 shrink-0 overflow-hidden"
                  style={{
                    background:
                      'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                  }}
                  title="Custom Color Wheel"
                >
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs font-semibold text-[#6E6E73] hover:text-[#1C1C1E]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ios-press px-4 py-1.5 text-xs font-semibold bg-[#0A5386] text-white rounded-xl"
            >
              Save Block
            </button>
          </div>
        </form>
      )}

      {/* Day Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedDay('all')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap border transition-colors ${
            selectedDay === 'all'
              ? 'bg-[#0A5386] text-white border-[#0A5386]'
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
                ? 'bg-[#0A5386] text-white border-[#0A5386]'
                : 'paper-card text-[#52525B] border-[#E2E0D8]'
            }`}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Weekly Timetable Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleDays.map((dayIdx) => {
          const daySlots = filteredSlots.filter((s) => s.dayOfWeek === dayIdx);
          return (
            <div key={dayIdx} className="paper-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E0D8]/70 pb-2">
                <span className="text-xs font-bold text-[#1C1C1E]">{DAYS_OF_WEEK[dayIdx]}</span>
                <span className="text-[11px] font-mono-num text-[#8E8E93]">
                  {daySlots.length} {daySlots.length === 1 ? 'block' : 'blocks'}
                </span>
              </div>

              {daySlots.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-[#8E8E93]">Free day</div>
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
                            title="Remove block"
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
                            {subj && <span className="font-semibold text-[#0A5386]">{subj.title}</span>}
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

      {/* Study Plan & Goals */}
      <div className="paper-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#1C1C1E]">Study Goals &amp; Targets</h2>
            <p className="text-xs text-[#8E8E93]">Track daily or weekly learning targets</p>
          </div>
        </div>

        <form onSubmit={handleCreateGoal} className="flex flex-wrap gap-2">
          <input
            type="text"
            value={goalTitle}
            onChange={(e) => setGoalTitle(e.target.value)}
            placeholder="e.g. Finish Dynamic Programming practice set..."
            className="flex-1 min-w-[200px] px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60 focus:outline-none focus:border-[#0A5386]"
          />
          <input
            type="date"
            value={goalDate}
            onChange={(e) => setGoalDate(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
          />
          <select
            value={goalOwner}
            onChange={(e) => setGoalOwner(e.target.value as OwnerScope)}
            className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
          >
            <option value="Sajitha">Sajitha</option>
            <option value="Dhani">Dhani</option>
            <option value="Both">Both</option>
          </select>
          <button
            type="submit"
            className="ios-press px-4 py-2 text-xs font-semibold bg-[#1B5E5A] text-white rounded-xl inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Goal
          </button>
        </form>

        {studyGoals.length === 0 ? (
          <div className="text-xs text-[#8E8E93] py-2">No study goals yet.</div>
        ) : (
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
                    <div className="text-[10px] text-[#8E8E93]">
                      {g.targetDate} · {g.owner}
                    </div>
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
  );
};
