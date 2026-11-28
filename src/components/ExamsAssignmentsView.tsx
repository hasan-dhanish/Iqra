import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  MapPin,
  Plus,
  Trash2,
} from 'lucide-react';
import { formatDateShort, getDeadlineUrgency } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { AssignmentStatus, OwnerScope, PriorityLevel } from '../types';

export const ExamsAssignmentsView: React.FC = () => {
  const {
    projects,
    assignments,
    exams,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    addExam,
    updateExam,
    deleteExam,
  } = useLdoi();

  const [tab, setTab] = useState<'assignments' | 'exams'>('assignments');
  const [ownerFilter, setOwnerFilter] = useState<'All' | OwnerScope>('All');

  // Assignment form
  const [showAsgForm, setShowAsgForm] = useState(false);
  const [asgTitle, setAsgTitle] = useState('');
  const [asgProjectId, setAsgProjectId] = useState('');
  const [asgDueDate, setAsgDueDate] = useState('');
  const [asgPriority, setAsgPriority] = useState<PriorityLevel>('Medium');
  const [asgOwner, setAsgOwner] = useState<OwnerScope>('Both');
  const [asgLink, setAsgLink] = useState('');
  const [asgDesc, setAsgDesc] = useState('');

  // Exam form
  const [showExamForm, setShowExamForm] = useState(false);
  const [exTitle, setExTitle] = useState('');
  const [exProjectId, setExProjectId] = useState('');
  const [exDate, setExDate] = useState('');
  const [exTime, setExTime] = useState('09:30');
  const [exDuration, setExDuration] = useState(120);
  const [exVenue, setExVenue] = useState('');
  const [exScope, setExScope] = useState('');
  const [exOwner, setExOwner] = useState<OwnerScope>('Both');

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asgTitle.trim()) return;
    await addAssignment({
      projectId: asgProjectId || undefined,
      title: asgTitle.trim(),
      description: asgDesc.trim(),
      dueDate: asgDueDate,
      status: 'Pending',
      priority: asgPriority,
      submissionLink: asgLink.trim(),
      owner: asgOwner,
    });
    setAsgTitle('');
    setAsgDesc('');
    setAsgLink('');
    setShowAsgForm(false);
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exTitle.trim()) return;
    await addExam({
      projectId: exProjectId || undefined,
      title: exTitle.trim(),
      examDate: exDate,
      startTime: exTime,
      durationMinutes: exDuration,
      venueOrLink: exVenue.trim(),
      syllabusScope: exScope.trim(),
      prepProgress: 0,
      owner: exOwner,
    });
    setExTitle('');
    setExVenue('');
    setExScope('');
    setShowExamForm(false);
  };

  const filteredAssignments = useMemo(
    () =>
      assignments
        .filter((a) => (ownerFilter === 'All' ? true : a.owner === ownerFilter || a.owner === 'Both'))
        .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999')),
    [assignments, ownerFilter]
  );

  const filteredExams = useMemo(
    () =>
      exams
        .filter((ex) => (ownerFilter === 'All' ? true : ex.owner === ownerFilter || ex.owner === 'Both'))
        .sort((a, b) => (a.examDate || '9999').localeCompare(b.examDate || '9999')),
    [exams, ownerFilter]
  );

  const nextStatus = (s: AssignmentStatus): AssignmentStatus =>
    s === 'Pending'
      ? 'In Progress'
      : s === 'In Progress'
      ? 'Submitted'
      : s === 'Submitted'
      ? 'Graded'
      : 'Pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1E] flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#8B1E1E]" />
            Exams &amp; Assignments
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Track assignment deadlines, submission links, exam schedules, and syllabus readiness
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-black/5 rounded-xl p-1">
            {(['All', 'Shajitha', 'Dhani', 'Both'] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOwnerFilter(o)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  ownerFilter === o
                    ? 'bg-[#8B1E1E] text-white'
                    : 'text-[#6E6E73] hover:text-[#1C1C1E]'
                }`}
              >
                {o}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              tab === 'assignments'
                ? setShowAsgForm((v) => !v)
                : setShowExamForm((v) => !v)
            }
            className="ios-press inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#8B1E1E] hover:bg-[#A32424] text-white rounded-xl shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {tab === 'assignments' ? 'Add Assignment' : 'Add Exam'}
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('assignments')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors ${
            tab === 'assignments'
              ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]'
              : 'paper-card text-[#52525B] border-[#E2E0D8]'
          }`}
        >
          Assignments ({filteredAssignments.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('exams')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl border transition-colors ${
            tab === 'exams'
              ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]'
              : 'paper-card text-[#52525B] border-[#E2E0D8]'
          }`}
        >
          Exams ({filteredExams.length})
        </button>
      </div>

      {/* Assignments Tab */}
      {tab === 'assignments' && (
        <div className="space-y-4">
          {showAsgForm && (
            <form
              onSubmit={handleAddAssignment}
              className="paper-card rounded-2xl p-5 space-y-4 border border-[#E2E0D8]"
            >
              <div className="text-sm font-bold text-[#1C1C1E]">New Assignment</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={asgTitle}
                  onChange={(e) => setAsgTitle(e.target.value)}
                  placeholder="Assignment Title *"
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
                <select
                  value={asgProjectId}
                  onChange={(e) => setAsgProjectId(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                >
                  <option value="">General / No Subject</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={asgDueDate}
                  onChange={(e) => setAsgDueDate(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
                <select
                  value={asgPriority}
                  onChange={(e) => setAsgPriority(e.target.value as PriorityLevel)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
                <select
                  value={asgOwner}
                  onChange={(e) => setAsgOwner(e.target.value as OwnerScope)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                >
                  <option value="Both">Both</option>
                  <option value="Shajitha">Shajitha</option>
                  <option value="Dhani">Dhani</option>
                </select>
                <input
                  type="url"
                  value={asgLink}
                  onChange={(e) => setAsgLink(e.target.value)}
                  placeholder="Submission / Portal URL (optional)"
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
              </div>
              <textarea
                rows={2}
                value={asgDesc}
                onChange={(e) => setAsgDesc(e.target.value)}
                placeholder="Notes, rubric, or requirements..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAsgForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#6E6E73]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ios-press px-4 py-1.5 text-xs font-semibold bg-[#8B1E1E] text-white rounded-xl"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          )}

          {filteredAssignments.length === 0 ? (
            <div className="paper-card rounded-2xl p-10 text-center text-xs text-[#8E8E93]">
              No assignments yet. Click &ldquo;Add Assignment&rdquo; to track upcoming deadlines.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAssignments.map((a) => {
                const subj = projects.find((p) => p.id === a.projectId);
                const urgency = getDeadlineUrgency(a.dueDate);
                return (
                  <div
                    key={a.id}
                    className="paper-card rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#1C1C1E]">{a.title}</span>
                        {subj && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0A5386]/15 text-[#0A5386]">
                            {subj.title}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            a.priority === 'High'
                              ? 'bg-red-500/15 text-red-700'
                              : a.priority === 'Medium'
                              ? 'bg-amber-500/15 text-amber-700'
                              : 'bg-black/5 text-[#52525B]'
                          }`}
                        >
                          {a.priority}
                        </span>
                      </div>
                      {a.description && (
                        <p className="text-xs text-[#6E6E73]">{a.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#8E8E93]">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDateShort(a.dueDate)}
                        </span>
                        <span>· {a.owner}</span>
                        {a.submissionLink && (
                          <a
                            href={a.submissionLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#0A5386] hover:underline inline-flex items-center gap-1"
                          >
                            Portal <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          urgency.tone === 'overdue'
                            ? 'bg-red-500/15 text-red-700'
                            : urgency.tone === 'today' || urgency.tone === 'soon'
                            ? 'bg-amber-500/15 text-amber-700'
                            : 'bg-black/5 text-[#52525B]'
                        }`}
                      >
                        {urgency.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateAssignment(a.id, { status: nextStatus(a.status) })}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-colors ${
                          a.status === 'Submitted' || a.status === 'Graded'
                            ? 'bg-emerald-600/15 text-emerald-700'
                            : a.status === 'In Progress'
                            ? 'bg-amber-500/15 text-amber-700'
                            : 'bg-black/5 text-[#1C1C1E]'
                        }`}
                        title="Click to cycle status"
                      >
                        {a.status}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteAssignment(a.id)}
                        className="p-1.5 text-[#8E8E93] hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Exams Tab */}
      {tab === 'exams' && (
        <div className="space-y-4">
          {showExamForm && (
            <form
              onSubmit={handleAddExam}
              className="paper-card rounded-2xl p-5 space-y-4 border border-[#E2E0D8]"
            >
              <div className="text-sm font-bold text-[#1C1C1E]">New Exam Details</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={exTitle}
                  onChange={(e) => setExTitle(e.target.value)}
                  placeholder="Exam Title (e.g. Midterm Exam) *"
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
                <select
                  value={exProjectId}
                  onChange={(e) => setExProjectId(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                >
                  <option value="">General / No Subject</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={exDate}
                  onChange={(e) => setExDate(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={exTime}
                    onChange={(e) => setExTime(e.target.value)}
                    className="px-2.5 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                  />
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={exDuration}
                    onChange={(e) => setExDuration(Number(e.target.value) || 60)}
                    placeholder="Mins"
                    title="Duration in minutes"
                    className="px-2.5 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                  />
                </div>
                <input
                  type="text"
                  value={exVenue}
                  onChange={(e) => setExVenue(e.target.value)}
                  placeholder="Room / Hall / Online Link"
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
                <select
                  value={exOwner}
                  onChange={(e) => setExOwner(e.target.value as OwnerScope)}
                  className="px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                >
                  <option value="Both">Both</option>
                  <option value="Shajitha">Shajitha</option>
                  <option value="Dhani">Dhani</option>
                </select>
              </div>
              <textarea
                rows={2}
                value={exScope}
                onChange={(e) => setExScope(e.target.value)}
                placeholder="Syllabus scope (e.g. Units 1–3, Chapters 4 & 5, formulas...)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowExamForm(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#6E6E73]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ios-press px-4 py-1.5 text-xs font-semibold bg-[#8B1E1E] text-white rounded-xl"
                >
                  Save Exam
                </button>
              </div>
            </form>
          )}

          {filteredExams.length === 0 ? (
            <div className="paper-card rounded-2xl p-10 text-center text-xs text-[#8E8E93]">
              No exams scheduled yet. Click &ldquo;Add Exam&rdquo; to enter exam details &amp; syllabus scope.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExams.map((ex) => {
                const subj = projects.find((p) => p.id === ex.projectId);
                const urgency = getDeadlineUrgency(ex.examDate);
                return (
                  <div key={ex.id} className="paper-card rounded-2xl p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[#1C1C1E]">{ex.title}</span>
                          {subj && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0A5386]/15 text-[#0A5386]">
                              {subj.title}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-[#8E8E93] mt-1">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {formatDateShort(ex.examDate)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {ex.startTime} ({ex.durationMinutes}m)
                          </span>
                          {ex.venueOrLink && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {ex.venueOrLink}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            urgency.tone === 'overdue'
                              ? 'bg-black/10 text-[#52525B]'
                              : urgency.tone === 'today' || urgency.tone === 'soon'
                              ? 'bg-red-500/15 text-red-700'
                              : 'bg-[#8B1E1E]/15 text-[#8B1E1E]'
                          }`}
                        >
                          {urgency.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteExam(ex.id)}
                          className="p-1 text-[#8E8E93] hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {ex.syllabusScope && (
                      <div className="p-2.5 rounded-xl bg-black/5 text-xs text-[#3A3A3C] flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#8E8E93]" />
                        <span>{ex.syllabusScope}</span>
                      </div>
                    )}

                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold">
                        <span className="text-[#8E8E93]">Prep Readiness ({ex.owner})</span>
                        <span className="font-mono-num text-[#1C1C1E]">{ex.prepProgress}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={ex.prepProgress}
                        onChange={(e) =>
                          updateExam(ex.id, { prepProgress: Number(e.target.value) })
                        }
                        className="w-full accent-[#8B1E1E] cursor-pointer"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
