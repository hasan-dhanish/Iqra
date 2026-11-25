import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  GraduationCap,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { DAYS_OF_WEEK, formatDateShort, getDeadlineUrgency } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import { getJournalPlainText } from '../lib/pinboard';
import type { ActiveTab } from '../types';
import { FolderCard } from './FolderCard';
import { SevenSegmentClock } from './SevenSegmentClock';

interface DashboardViewProps {
  onNavigate: (tab: ActiveTab) => void;
  onOpenProject: (projectId: string) => void;
}

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenProject,
}) => {
  const {
    currentUser,
    projects,
    syllabusTopics,
    timetableSlots,
    assignments,
    exams,
    studyGoals,
    journalEntries,
    addStudyGoal,
    toggleStudyGoal,
    deleteStudyGoal,
    updateAssignment,
  } = useLdoi();

  const myName = currentUser?.name ?? 'Sajitha';

  // Live clock
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Pomodoro Focus Timer
  const [pomodoroMode, setPomodoroMode] = useState<'focus' | 'break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          if (pomodoroMode === 'focus') {
            setCompletedSessions((c) => c + 1);
            setPomodoroMode('break');
            return BREAK_SECONDS;
          } else {
            setPomodoroMode('focus');
            return FOCUS_SECONDS;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, pomodoroMode]);

  const pomoMins = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const pomoSecs = String(secondsLeft % 60).padStart(2, '0');

  const switchPomodoroMode = (mode: 'focus' | 'break') => {
    setTimerRunning(false);
    setPomodoroMode(mode);
    setSecondsLeft(mode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS);
  };

  // Quick study goal input
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    await addStudyGoal({
      title: newGoalTitle.trim(),
      targetDate: new Date().toISOString().slice(0, 10),
      completed: false,
      owner: myName,
    });
    setNewGoalTitle('');
  };

  // Weekday index: Monday = 0 .. Sunday = 6
  const jsDay = now.getDay();
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1;
  const todaySlots = useMemo(
    () =>
      timetableSlots
        .filter((s) => s.dayOfWeek === todayIdx)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [timetableSlots, todayIdx]
  );

  const activeSubjects = projects.filter(
    (p) => p.status !== 'Archived' && p.status !== 'Completed'
  );

  const pendingAssignments = assignments.filter(
    (a) => a.status !== 'Submitted' && a.status !== 'Graded'
  );

  const upcomingDeadlines = useMemo(() => {
    const items = [
      ...pendingAssignments.map((a) => ({
        id: a.id,
        kind: 'Assignment' as const,
        title: a.title,
        subject: projects.find((p) => p.id === a.projectId)?.title ?? 'General',
        date: a.dueDate,
        owner: a.owner,
        status: a.status,
      })),
      ...exams.map((ex) => ({
        id: ex.id,
        kind: 'Exam' as const,
        title: ex.title,
        subject: projects.find((p) => p.id === ex.projectId)?.title ?? 'General',
        date: ex.examDate,
        owner: ex.owner,
        status: `${ex.prepProgress}% ready`,
      })),
    ];
    return items
      .map((item) => ({ ...item, urgency: getDeadlineUrgency(item.date) }))
      .sort((a, b) => (a.urgency.daysLeft ?? 999) - (b.urgency.daysLeft ?? 999))
      .slice(0, 6);
  }, [pendingAssignments, exams, projects]);

  const totalTopics = syllabusTopics.length;
  const completedTopics = syllabusTopics.filter((t) => t.status === 'Completed').length;
  const overallProgress = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

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
    <div className="space-y-6">
      {/* Top Row: StandBy Digital Clock + Focus Pomodoro Widget */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="paper-card rounded-2xl px-4 py-3 flex items-center gap-4 border border-[#E2E0D8] shadow-xs w-fit">
          <SevenSegmentClock
            hours={hoursStr}
            minutes={minsStr}
            seconds={secsStr}
            period={periodStr}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#0A5386]">
                {weekday}
              </span>
              <span className="text-xs font-medium text-[#8E8E93]">· {dateLabel}</span>
            </div>
            <h1 className="mt-0.5 text-sm sm:text-base font-semibold text-[#1C1C1E] truncate">
              {greeting}, {myName}
            </h1>
          </div>
        </div>

        {/* Compact Pomodoro Focus Timer */}
        <div className="paper-card rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-3 border border-[#E2E0D8] shadow-xs">
          <div className="flex items-center gap-1 bg-black/5 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => switchPomodoroMode('focus')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                pomodoroMode === 'focus'
                  ? 'bg-[#0A5386] text-white'
                  : 'text-[#6E6E73] hover:text-[#1C1C1E]'
              }`}
            >
              Focus 25m
            </button>
            <button
              type="button"
              onClick={() => switchPomodoroMode('break')}
              className={`px-2 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                pomodoroMode === 'break'
                  ? 'bg-[#1B5E5A] text-white'
                  : 'text-[#6E6E73] hover:text-[#1C1C1E]'
              }`}
            >
              Break 5m
            </button>
          </div>

          <div className="font-mono-num text-lg font-bold tracking-tight text-[#1C1C1E] min-w-[58px] text-center">
            {pomoMins}:{pomoSecs}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className="ios-press w-8 h-8 rounded-xl bg-[#0A5386] hover:bg-[#0C64A1] text-white flex items-center justify-center"
              title={timerRunning ? 'Pause Timer' : 'Start Timer'}
            >
              {timerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setTimerRunning(false);
                setSecondsLeft(pomodoroMode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS);
              }}
              className="ios-press w-8 h-8 rounded-xl border border-[#E2E0D8] text-[#6E6E73] hover:text-[#1C1C1E] flex items-center justify-center"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {completedSessions > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">
              {completedSessions} done
            </span>
          )}
        </div>
      </div>

      {/* Summary Widget Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => onNavigate('timetable')}
          className="paper-card rounded-2xl p-4 flex items-center gap-3.5 text-left hover:shadow-sm transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-[#133F47] text-white flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8E8E93]">Today&apos;s Blocks</div>
            <div className="text-xl font-bold font-mono-num text-[#1C1C1E]">
              {todaySlots.length}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('subjects')}
          className="paper-card rounded-2xl p-4 flex items-center gap-3.5 text-left hover:shadow-sm transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-[#254454] text-white flex items-center justify-center shrink-0">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8E8E93]">Active Subjects</div>
            <div className="text-xl font-bold font-mono-num text-[#1C1C1E]">
              {activeSubjects.length}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('exams')}
          className="paper-card rounded-2xl p-4 flex items-center gap-3.5 text-left hover:shadow-sm transition-shadow"
        >
          <div className="w-10 h-10 rounded-xl bg-[#8B1E1E] text-white flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8E8E93]">Pending &amp; Exams</div>
            <div className="text-xl font-bold font-mono-num text-[#1C1C1E]">
              {pendingAssignments.length + exams.length}
            </div>
          </div>
        </button>

        <div className="paper-card rounded-2xl p-4 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#0A5386] text-white flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-[#8E8E93]">Syllabus Progress</div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono-num text-[#1C1C1E]">
                {overallProgress}%
              </span>
              <span className="text-[11px] text-[#8E8E93]">
                ({completedTopics}/{totalTopics})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-Column Workspace: Today's Timetable & Goals | Upcoming Exams & Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Today's Schedule + Study Goals */}
        <div className="paper-card rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1C1C1E]">
                {DAYS_OF_WEEK[todayIdx]}&apos;s Timetable
              </h2>
              <p className="text-xs text-[#8E8E93]">Scheduled classes &amp; study sessions</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('timetable')}
              className="text-xs font-semibold text-[#0A5386] hover:underline inline-flex items-center gap-1"
            >
              Full Week <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todaySlots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D6D3CB] p-4 text-center text-xs text-[#8E8E93]">
              No sessions scheduled for {DAYS_OF_WEEK[todayIdx]}. Add blocks in Timetable &amp; Plan.
            </div>
          ) : (
            <div className="space-y-2">
              {todaySlots.map((slot) => {
                const subj = projects.find((p) => p.id === slot.projectId);
                return (
                  <div
                    key={slot.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-[#E2E0D8]/80 bg-white/40"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-1.5 h-8 rounded-full shrink-0"
                        style={{ backgroundColor: slot.colorHex || '#0A5386' }}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#1C1C1E] truncate">
                          {slot.title}
                        </div>
                        <div className="text-[11px] text-[#8E8E93] truncate">
                          {slot.startTime} – {slot.endTime} · {slot.kind}
                          {subj ? ` · ${subj.title}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 text-[#52525B] shrink-0">
                      {slot.owner}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Daily Study Goals */}
          <div className="pt-3 border-t border-[#E2E0D8]/80 space-y-2.5">
            <div className="text-xs font-bold text-[#1C1C1E]">Daily Study Goals</div>
            <form onSubmit={handleAddGoal} className="flex gap-2">
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="Add a study goal for today..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-[#E2E0D8] bg-white/60 focus:outline-none focus:border-[#0A5386]"
              />
              <button
                type="submit"
                className="ios-press px-3 py-1.5 rounded-xl bg-[#0A5386] text-white text-xs font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </form>

            {studyGoals.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {studyGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleStudyGoal(goal.id)}
                      className="flex items-center gap-2 text-left min-w-0 flex-1"
                    >
                      {goal.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#8E8E93] shrink-0" />
                      )}
                      <span
                        className={`text-xs truncate ${
                          goal.completed ? 'line-through text-[#8E8E93]' : 'text-[#1C1C1E]'
                        }`}
                      >
                        {goal.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteStudyGoal(goal.id)}
                      className="text-[#8E8E93] hover:text-red-600 p-1"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Exams & Assignments */}
        <div className="paper-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1C1C1E]">Upcoming Exams &amp; Assignments</h2>
              <p className="text-xs text-[#8E8E93]">Sorted by nearest deadline</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('exams')}
              className="text-xs font-semibold text-[#8B1E1E] hover:underline inline-flex items-center gap-1"
            >
              Manage All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingDeadlines.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#D6D3CB] p-6 text-center text-xs text-[#8E8E93]">
              No upcoming assignments or exams yet. Add them in Exams &amp; Assignments.
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#E2E0D8]/80 bg-white/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.kind === 'Exam'
                            ? 'bg-[#8B1E1E]/15 text-[#8B1E1E]'
                            : 'bg-[#0A5386]/15 text-[#0A5386]'
                        }`}
                      >
                        {item.kind}
                      </span>
                      <span className="text-xs font-bold text-[#1C1C1E] truncate">
                        {item.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#8E8E93] mt-0.5 truncate">
                      {item.subject} · {formatDateShort(item.date)} · {item.owner}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.urgency.tone === 'overdue'
                          ? 'bg-red-500/15 text-red-700'
                          : item.urgency.tone === 'today' || item.urgency.tone === 'soon'
                          ? 'bg-amber-500/15 text-amber-700'
                          : 'bg-black/5 text-[#52525B]'
                      }`}
                    >
                      {item.urgency.label}
                    </span>
                    {item.kind === 'Assignment' && (
                      <button
                        type="button"
                        onClick={() => updateAssignment(item.id, { status: 'Submitted' })}
                        className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/25"
                        title="Mark Submitted"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Subjects Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1C1C1E]">Active Subjects</h2>
          <button
            type="button"
            onClick={() => onNavigate('subjects')}
            className="text-xs font-semibold text-[#0A5386] hover:underline inline-flex items-center gap-1"
          >
            All Subjects <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeSubjects.length === 0 ? (
          <div className="paper-card rounded-2xl p-6 text-center text-xs text-[#8E8E93]">
            No subjects added yet. Go to Subjects &amp; Syllabus to add your first course or learning plan.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeSubjects.slice(0, 3).map((subj) => {
              const subjTopics = syllabusTopics.filter((t) => t.projectId === subj.id);
              const doneCount = subjTopics.filter((t) => t.status === 'Completed').length;
              return (
                <FolderCard
                  key={subj.id}
                  project={subj}
                  taskCount={subjTopics.length}
                  completedCount={doneCount}
                  docCount={0}
                  assignees={[]}
                  onClick={() => onOpenProject(subj.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Study Notebooks */}
      {journalEntries.length > 0 && (
        <div className="paper-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1B5E5A]" />
              <h2 className="text-sm font-bold text-[#1C1C1E]">Recent Study Notebooks</h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('notebooks')}
              className="text-xs font-semibold text-[#1B5E5A] hover:underline inline-flex items-center gap-1"
            >
              Open Bookshelf <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {journalEntries.slice(0, 3).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onNavigate('notebooks')}
                className="text-left p-3 rounded-xl border border-[#E2E0D8]/80 bg-white/40 hover:bg-white/60 transition-colors"
              >
                <div className="text-xs font-bold text-[#1C1C1E] truncate">{entry.title}</div>
                <div className="text-[11px] text-[#8E8E93] line-clamp-2 mt-1">
                  {getJournalPlainText(entry.content) || 'Empty notebook'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
