import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  Layers,
  ListChecks,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Trash2,
} from 'lucide-react';
import { formatDateShort } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { OwnerScope, SyllabusStatus } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { ProjectPinboard } from './ProjectPinboard';

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({
  projectId,
  onBack,
  darkMode,
  onToggleDarkMode,
}) => {
  const {
    projects,
    syllabusTopics,
    resources,
    updateProject,
    deleteProject,
    addSyllabusTopic,
    updateSyllabusTopic,
    deleteSyllabusTopic,
    addResource,
    deleteResource,
  } = useLdoi();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'syllabus' | 'pinboard'>('syllabus');

  // Syllabus single topic add
  const [unitNum, setUnitNum] = useState(1);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicDate, setTopicDate] = useState('');
  const [topicMins, setTopicMins] = useState(45);
  const [topicOwner, setTopicOwner] = useState<OwnerScope>('Both');

  // Bulk syllabus paste
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Quick subject resource
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');

  const project = projects.find((p) => p.id === projectId);

  const subjectTopics = useMemo(
    () =>
      syllabusTopics
        .filter((t) => t.projectId === projectId)
        .sort((a, b) => a.unitNumber - b.unitNumber || a.createdAt.localeCompare(b.createdAt)),
    [syllabusTopics, projectId]
  );

  const subjectResources = useMemo(
    () => resources.filter((r) => r.projectId === projectId),
    [resources, projectId]
  );

  if (!project) {
    return (
      <div className="fixed inset-0 z-30 ios-desk-bg flex items-center justify-center p-6">
        <div className="paper-card rounded-xl p-8 text-center">
          <p className="text-sm font-medium text-[#18181B]">Subject not found</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 px-3 py-1.5 text-xs font-medium bg-[#18181B] text-white rounded-md"
          >
            Back to Subjects
          </button>
        </div>
      </div>
    );
  }

  const completedCount = subjectTopics.filter((t) => t.status === 'Completed').length;
  const progressPct =
    subjectTopics.length > 0 ? Math.round((completedCount / subjectTopics.length) * 100) : 0;

  const handleEndProject = async () => {
    await updateProject(project.id, { status: 'Completed' });
  };

  const handleDeleteProject = async () => {
    setConfirmDeleteOpen(false);
    await deleteProject(project.id);
    onBack();
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) return;
    await addSyllabusTopic({
      projectId: project.id,
      unitNumber: unitNum,
      title: topicTitle.trim(),
      description: '',
      targetDate: topicDate,
      status: 'Not Started',
      owner: topicOwner,
      estimatedMinutes: topicMins,
    });
    setTopicTitle('');
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      await addSyllabusTopic({
        projectId: project.id,
        unitNumber: unitNum,
        title: lines[i].replace(/^[-*•\d.)]+\s*/, ''),
        description: '',
        targetDate: topicDate,
        status: 'Not Started',
        owner: topicOwner,
        estimatedMinutes: topicMins,
      });
    }
    setBulkText('');
    setShowBulkPaste(false);
  };

  const cycleTopicStatus = async (id: string, current: SyllabusStatus) => {
    const next: SyllabusStatus =
      current === 'Not Started'
        ? 'In Progress'
        : current === 'In Progress'
        ? 'Completed'
        : 'Not Started';
    await updateSyllabusTopic(id, { status: next });
  };

  const handleAddSubjectResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim()) return;
    await addResource({
      projectId: project.id,
      kind: resUrl.includes('youtube') || resUrl.includes('youtu.be') ? 'Video' : 'Bookmark',
      title: resTitle.trim(),
      url: resUrl.trim(),
      content: '',
      tags: [project.title],
      owner: 'Both',
    });
    setResTitle('');
    setResUrl('');
  };

  return (
    <div className="fixed inset-0 z-30 matrix-clean-bg flex flex-col overflow-hidden">
      {/* Fixed Floating Top-Left Back + Title */}
      <div className="fixed top-4 left-4 z-40 flex items-center gap-2 paper-card rounded-full pl-1.5 pr-3.5 py-1.5 shadow-lg border border-[#E4E2DC] backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          title="Back to Subjects"
          className="ios-press p-1.5 rounded-full bg-white/80 border border-[#E4E2DC] hover:border-[#18181B] text-[#18181B]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-semibold text-[#18181B] max-w-[180px] truncate">
          {project.title}
        </span>
      </div>

      {/* Fixed Floating Top-Center Mode Switcher */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 paper-card rounded-full p-1 shadow-lg border border-[#E4E2DC] backdrop-blur-md">
        <button
          type="button"
          onClick={() => setViewMode('syllabus')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            viewMode === 'syllabus'
              ? 'bg-[#0A5386] text-white'
              : 'text-[#52525B] hover:text-[#18181B]'
          }`}
        >
          <ListChecks className="w-3.5 h-3.5" />
          Syllabus &amp; Plan
        </button>
        <button
          type="button"
          onClick={() => setViewMode('pinboard')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            viewMode === 'pinboard'
              ? 'bg-[#0A5386] text-white'
              : 'text-[#52525B] hover:text-[#18181B]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Study Pinboard
        </button>
      </div>

      {/* Fixed Floating Top-Right Actions */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleDarkMode}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="ios-press p-2 rounded-full paper-card border border-[#E4E2DC] text-[#18181B] shadow-lg"
        >
          {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
        {project.status !== 'Completed' && (
          <button
            type="button"
            onClick={handleEndProject}
            className="ios-press hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#0F766E] hover:bg-[#115E59] text-white rounded-full shadow-lg"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark Complete
          </button>
        )}
        <button
          type="button"
          onClick={() => setConfirmDeleteOpen(true)}
          title="Delete Subject"
          className="ios-press inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full paper-card border border-[#E4E2DC] hover:border-[#DC2626] text-[#71717A] hover:text-[#DC2626] shadow-lg"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>

      {/* Body */}
      {viewMode === 'pinboard' ? (
        <ProjectPinboard project={project} />
      ) : (
        <div className="flex-1 overflow-y-auto pt-20 pb-12 px-4 sm:px-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Subject Overview + Progress */}
            <div className="paper-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#0A5386]/15 text-[#0A5386]">
                    {project.category}
                  </span>
                  <span className="text-xs text-[#8E8E93]">{project.clientName}</span>
                </div>
                <h1 className="text-lg font-bold text-[#1C1C1E] mt-1">{project.title}</h1>
                {project.deadline && (
                  <p className="text-xs text-[#8E8E93] mt-0.5">
                    Target Date: {formatDateShort(project.deadline)}
                  </p>
                )}
              </div>

              <div className="min-w-[180px] space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-[#8E8E93]">Syllabus Mastery</span>
                  <span className="font-mono-num text-[#1C1C1E]">
                    {progressPct}% ({completedCount}/{subjectTopics.length})
                  </span>
                </div>
                <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                  <div
                    className="h-full bg-[#0A5386] transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Add Syllabus Topic + Bulk Paste */}
            <div className="paper-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-[#1C1C1E]">Syllabus &amp; Learning Plan</div>
                <button
                  type="button"
                  onClick={() => setShowBulkPaste((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0A5386] hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {showBulkPaste ? 'Single Topic Mode' : 'Bulk Paste Syllabus'}
                </button>
              </div>

              {showBulkPaste ? (
                <form onSubmit={handleBulkImport} className="space-y-3">
                  <div className="flex flex-wrap gap-2 items-center text-xs">
                    <span className="text-[#8E8E93] font-semibold">Unit #:</span>
                    <input
                      type="number"
                      min={1}
                      value={unitNum}
                      onChange={(e) => setUnitNum(Number(e.target.value) || 1)}
                      className="w-16 px-2 py-1 rounded-lg border border-[#E2E0D8] bg-white/60"
                    />
                    <span className="text-[#8E8E93] font-semibold ml-2">Target Date:</span>
                    <input
                      type="date"
                      value={topicDate}
                      onChange={(e) => setTopicDate(e.target.value)}
                      className="px-2 py-1 rounded-lg border border-[#E2E0D8] bg-white/60"
                    />
                  </div>
                  <textarea
                    rows={5}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder="Paste syllabus topics (one per line)..."
                    className="w-full p-3 text-xs rounded-xl border border-[#E2E0D8] bg-white/60 focus:outline-none focus:border-[#0A5386]"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="ios-press px-4 py-2 text-xs font-semibold bg-[#0A5386] text-white rounded-xl"
                    >
                      Import All Lines
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAddTopic} className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    min={1}
                    value={unitNum}
                    onChange={(e) => setUnitNum(Number(e.target.value) || 1)}
                    title="Unit / Module Number"
                    className="w-16 px-2.5 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                  />
                  <input
                    type="text"
                    required
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                    placeholder="Add syllabus topic or chapter..."
                    className="flex-1 min-w-[200px] px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60 focus:outline-none focus:border-[#0A5386]"
                  />
                  <input
                    type="date"
                    value={topicDate}
                    onChange={(e) => setTopicDate(e.target.value)}
                    className="px-2.5 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                  />
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={topicMins}
                    onChange={(e) => setTopicMins(Number(e.target.value) || 30)}
                    title="Estimated minutes"
                    className="w-20 px-2.5 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                  />
                  <select
                    value={topicOwner}
                    onChange={(e) => setTopicOwner(e.target.value as OwnerScope)}
                    className="px-2.5 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                  >
                    <option value="Both">Both</option>
                    <option value="Sajitha">Sajitha</option>
                    <option value="Dhani">Dhani</option>
                  </select>
                  <button
                    type="submit"
                    className="ios-press px-4 py-2 text-xs font-semibold bg-[#0A5386] text-white rounded-xl inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </form>
              )}

              {/* Topic List */}
              {subjectTopics.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#8E8E93] border border-dashed border-[#D6D3CB] rounded-xl">
                  No syllabus topics yet. Add topics one by one or use Bulk Paste Syllabus!
                </div>
              ) : (
                <div className="space-y-2">
                  {subjectTopics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#E2E0D8]/80 bg-white/40"
                    >
                      <button
                        type="button"
                        onClick={() => cycleTopicStatus(topic.id, topic.status)}
                        className="flex items-center gap-3 text-left min-w-0 flex-1"
                        title="Click to cycle status: Not Started -> In Progress -> Completed"
                      >
                        {topic.status === 'Completed' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : topic.status === 'In Progress' ? (
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-[#8E8E93] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div
                            className={`text-xs font-semibold truncate ${
                              topic.status === 'Completed'
                                ? 'line-through text-[#8E8E93]'
                                : 'text-[#1C1C1E]'
                            }`}
                          >
                            <span className="text-[#0A5386] mr-1.5">U{topic.unitNumber}</span>
                            {topic.title}
                          </div>
                          <div className="text-[10px] text-[#8E8E93]">
                            {topic.status} · ~{topic.estimatedMinutes}m · {topic.owner}
                            {topic.targetDate ? ` · Target ${formatDateShort(topic.targetDate)}` : ''}
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteSyllabusTopic(topic.id)}
                        className="text-[#8E8E93] hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Subject Quick Resources */}
            <div className="paper-card rounded-2xl p-5 space-y-3">
              <div className="text-sm font-bold text-[#1C1C1E]">Subject Links &amp; Resources</div>
              <form onSubmit={handleAddSubjectResource} className="flex flex-wrap gap-2">
                <input
                  type="text"
                  required
                  value={resTitle}
                  onChange={(e) => setResTitle(e.target.value)}
                  placeholder="Resource title (e.g. MIT Lecture Notes PDF)"
                  className="flex-1 min-w-[180px] px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
                <input
                  type="url"
                  value={resUrl}
                  onChange={(e) => setResUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 min-w-[180px] px-3 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/60"
                />
                <button
                  type="submit"
                  className="ios-press px-4 py-2 text-xs font-semibold bg-[#5B3A70] text-white rounded-xl inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Link
                </button>
              </form>

              {subjectResources.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subjectResources.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-[#E2E0D8]/80 bg-white/40"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#1C1C1E] truncate">
                          {r.title}
                        </div>
                        {r.url && (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#0A5386] hover:underline inline-flex items-center gap-1 truncate max-w-full"
                          >
                            Open link <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteResource(r.id)}
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
        </div>
      )}

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Delete Subject"
        message={`Delete "${project.title}" and all its syllabus topics, pinned pages, and notes?`}
        confirmLabel="Delete Subject"
        onConfirm={handleDeleteProject}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
