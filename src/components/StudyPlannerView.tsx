import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardList,
  Edit3,
  Eye,
  Plus,
  Printer,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export interface BlueprintUnit {
  id: string;
  unitLabel: string;
  topic: string;
  illustrations: string;
  priorityTag?: string;
  volumeTag?: 'MAX VOLUME' | 'HIGH VOLUME' | '';
  done?: boolean;
}

export interface BlueprintSubject {
  id: string;
  title: string;
  weightage: string;
  units: BlueprintUnit[];
  sequenceUnitIds: string[];
}

export interface StudyBlueprint {
  id: string;
  title: string;
  subtitle: string;
  focusCallout: string;
  subjects: BlueprintSubject[];
  updatedAt: number;
}

const STORAGE_KEY = 'iqra_study_blueprints_v1';

function createDefaultBlueprint(): StudyBlueprint {
  return {
    id: 'bp_default_exam',
    title: 'EXAM PREPARATION BLUEPRINT',
    subtitle: 'Strategic Study Sequence & Priority Mapping',
    focusCallout: '20-MARK CASE STUDIES',
    updatedAt: Date.now(),
    subjects: [
      {
        id: 'sub_tax',
        title: 'INCOME TAX AND PLANNING',
        weightage: '70% Sums | 30% Theory',
        units: [
          { id: 'tax_u1', unitLabel: 'Unit 1', topic: 'Basics of Income Tax', illustrations: '18 Illus.', done: false },
          {
            id: 'tax_u2',
            unitLabel: 'Unit 2',
            topic: 'Income from Salaries',
            illustrations: '40 Illus.',
            priorityTag: '20-MARK CASE STUDY',
            volumeTag: 'MAX VOLUME',
            done: false,
          },
          { id: 'tax_u3', unitLabel: 'Unit 3', topic: 'Income from House Property', illustrations: '20 Illus.', done: false },
          { id: 'tax_u4', unitLabel: 'Unit 4', topic: 'Income from Capital Gains', illustrations: '26 Illus.', done: false },
          {
            id: 'tax_u5',
            unitLabel: 'Unit 5',
            topic: 'Income from Other Sources | Clubbing of Income (Theory)',
            illustrations: '15 Illus.',
            done: false,
          },
        ],
        sequenceUnitIds: ['tax_u2', 'tax_u4', 'tax_u3', 'tax_u1', 'tax_u5'],
      },
      {
        id: 'sub_fm',
        title: 'FINANCIAL MANAGEMENT',
        weightage: '60% Sums | 40% Theory',
        units: [
          {
            id: 'fm_u1',
            unitLabel: 'Unit 1',
            topic: 'Basics of Financial Management (Theory)',
            illustrations: 'Theory Only',
            done: false,
          },
          { id: 'fm_u2', unitLabel: 'Unit 2', topic: 'Time Value of Money (Prerequisite)', illustrations: '23 Illus.', done: false },
          {
            id: 'fm_u3',
            unitLabel: 'Unit 3',
            topic: 'Capital Budgeting',
            illustrations: '62 Illus.',
            priorityTag: '20-MARK CASE STUDY',
            volumeTag: 'MAX VOLUME',
            done: false,
          },
          { id: 'fm_u4', unitLabel: 'Unit 4', topic: 'Leverage (18) | Capital Structure (19)', illustrations: '37 Illus. Total', done: false },
          { id: 'fm_u5', unitLabel: 'Unit 5', topic: 'Working Capital Management', illustrations: '24 Illus.', done: false },
        ],
        sequenceUnitIds: ['fm_u2', 'fm_u3', 'fm_u4', 'fm_u5', 'fm_u1'],
      },
      {
        id: 'sub_adm',
        title: 'ACCOUNTING FOR DECISION MAKING',
        weightage: '80% Sums | 20% Theory',
        units: [
          {
            id: 'adm_u1',
            unitLabel: 'Unit 1',
            topic: 'Basics of Management Accounting (Theory)',
            illustrations: 'Theory Only',
            done: false,
          },
          {
            id: 'adm_u2',
            unitLabel: 'Unit 2',
            topic: 'Ratio Analysis',
            illustrations: '37 Illus.',
            volumeTag: 'HIGH VOLUME',
            done: false,
          },
          { id: 'adm_u3', unitLabel: 'Unit 3', topic: 'Fund Flow (Theory) | Cash Flow (20 Illus.)', illustrations: '20 Illus.', done: false },
          { id: 'adm_u4', unitLabel: 'Unit 4', topic: 'Budget and Budgetary Control', illustrations: '23 Illus.', done: false },
          {
            id: 'adm_u5',
            unitLabel: 'Unit 5',
            topic: 'Marginal Costing',
            illustrations: '15 Illus.',
            priorityTag: '20-MARK CASE STUDY',
            done: false,
          },
        ],
        sequenceUnitIds: ['adm_u5', 'adm_u2', 'adm_u3', 'adm_u4', 'adm_u1'],
      },
    ],
  };
}

function loadBlueprints(): StudyBlueprint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StudyBlueprint[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return [createDefaultBlueprint()];
}

function shortUnitSnippet(unit: BlueprintUnit): string {
  const cleanTopic = unit.topic.split('|')[0].trim();
  const shortTopic = cleanTopic.length > 26 ? `${cleanTopic.slice(0, 24).trim()}…` : cleanTopic;
  return `${unit.unitLabel} (${shortTopic})`;
}

type DeleteTarget =
  | { kind: 'blueprint'; id: string; label: string }
  | { kind: 'subject'; subjectId: string; label: string }
  | { kind: 'unit'; subjectId: string; unitId: string; label: string };

export const StudyPlannerView: React.FC = () => {
  const [blueprints, setBlueprints] = useState<StudyBlueprint[]>(() => loadBlueprints());
  const [activeId, setActiveId] = useState<string>(() => blueprints[0]?.id ?? '');
  const [editMode, setEditMode] = useState(false);

  // Create New Blueprint Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBpTitle, setNewBpTitle] = useState('');
  const [newBpSubtitle, setNewBpSubtitle] = useState('Strategic Study Sequence & Priority Mapping');
  const [newBpCallout, setNewBpCallout] = useState('');
  const [newBpTemplate, setNewBpTemplate] = useState<'blank' | 'sample'>('blank');

  // Quick Add Subject state (in edit mode)
  const [newSubTitle, setNewSubTitle] = useState('');
  const [newSubWeightage, setNewSubWeightage] = useState('60% Sums | 40% Theory');

  // Quick Add Unit draft per subject
  const [addingUnitFor, setAddingUnitFor] = useState<string | null>(null);
  const [draftUnitLabel, setDraftUnitLabel] = useState('');
  const [draftTopic, setDraftTopic] = useState('');
  const [draftIllus, setDraftIllus] = useState('');
  const [draftPriority, setDraftPriority] = useState('');
  const [draftVolume, setDraftVolume] = useState<'MAX VOLUME' | 'HIGH VOLUME' | ''>('');

  // Deletion confirmation
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blueprints));
    } catch {
      // ignore
    }
  }, [blueprints]);

  const activeBp = useMemo(
    () => blueprints.find((b) => b.id === activeId) ?? blueprints[0],
    [blueprints, activeId]
  );

  const progressStats = useMemo(() => {
    if (!activeBp) return { done: 0, total: 0, pct: 0 };
    const allUnits = activeBp.subjects.flatMap((s) => s.units);
    const total = allUnits.length;
    const done = allUnits.filter((u) => u.done).length;
    return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [activeBp]);

  const updateActiveBp = (updater: (bp: StudyBlueprint) => StudyBlueprint) => {
    if (!activeBp) return;
    setBlueprints((prev) =>
      prev.map((b) => (b.id === activeBp.id ? { ...updater(b), updatedAt: Date.now() } : b))
    );
  };

  const handleCreateBlueprint = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newBpTitle.trim() || 'MY STUDY BLUEPRINT';
    const id = `bp_${Date.now().toString(36)}`;
    const base =
      newBpTemplate === 'sample'
        ? {
            ...createDefaultBlueprint(),
            id,
            title: title.toUpperCase(),
            subtitle: newBpSubtitle.trim() || 'Strategic Study Sequence & Priority Mapping',
            focusCallout: newBpCallout.trim().toUpperCase(),
            updatedAt: Date.now(),
          }
        : {
            id,
            title: title.toUpperCase(),
            subtitle: newBpSubtitle.trim() || 'Strategic Study Sequence & Priority Mapping',
            focusCallout: newBpCallout.trim().toUpperCase(),
            subjects: [
              {
                id: `sub_${Date.now().toString(36)}`,
                title: 'SUBJECT 1',
                weightage: '70% Practical | 30% Theory',
                units: [],
                sequenceUnitIds: [],
              },
            ],
            updatedAt: Date.now(),
          };
    setBlueprints((prev) => [base, ...prev]);
    setActiveId(id);
    setNewBpTitle('');
    setNewBpCallout('');
    setShowCreateModal(false);
    setEditMode(true);
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newSubTitle.trim();
    if (!title) return;
    const sub: BlueprintSubject = {
      id: `sub_${Date.now().toString(36)}`,
      title: title.toUpperCase(),
      weightage: newSubWeightage.trim() || '50% Sums | 50% Theory',
      units: [],
      sequenceUnitIds: [],
    };
    updateActiveBp((bp) => ({ ...bp, subjects: [...bp.subjects, sub] }));
    setNewSubTitle('');
  };

  const openAddUnit = (subject: BlueprintSubject) => {
    setAddingUnitFor(subject.id);
    setDraftUnitLabel(`Unit ${subject.units.length + 1}`);
    setDraftTopic('');
    setDraftIllus('');
    setDraftPriority('');
    setDraftVolume('');
  };

  const handleAddUnit = (e: React.FormEvent, subjectId: string) => {
    e.preventDefault();
    if (!draftTopic.trim()) return;
    const unitId = `u_${Date.now().toString(36)}`;
    const unit: BlueprintUnit = {
      id: unitId,
      unitLabel: draftUnitLabel.trim() || 'Unit',
      topic: draftTopic.trim(),
      illustrations: draftIllus.trim() || '—',
      priorityTag: draftPriority.trim() ? draftPriority.trim().toUpperCase() : undefined,
      volumeTag: draftVolume,
      done: false,
    };
    updateActiveBp((bp) => ({
      ...bp,
      subjects: bp.subjects.map((s) =>
        s.id === subjectId
          ? { ...s, units: [...s.units, unit], sequenceUnitIds: [...s.sequenceUnitIds, unitId] }
          : s
      ),
    }));
    setAddingUnitFor(null);
  };

  const toggleUnitDone = (subjectId: string, unitId: string) => {
    updateActiveBp((bp) => ({
      ...bp,
      subjects: bp.subjects.map((s) =>
        s.id === subjectId
          ? {
              ...s,
              units: s.units.map((u) => (u.id === unitId ? { ...u, done: !u.done } : u)),
            }
          : s
      ),
    }));
  };

  const updateUnitField = (
    subjectId: string,
    unitId: string,
    patch: Partial<BlueprintUnit>
  ) => {
    updateActiveBp((bp) => ({
      ...bp,
      subjects: bp.subjects.map((s) =>
        s.id === subjectId
          ? { ...s, units: s.units.map((u) => (u.id === unitId ? { ...u, ...patch } : u)) }
          : s
      ),
    }));
  };

  const moveSequenceItem = (subjectId: string, index: number, dir: -1 | 1) => {
    updateActiveBp((bp) => ({
      ...bp,
      subjects: bp.subjects.map((s) => {
        if (s.id !== subjectId) return s;
        const nextIdx = index + dir;
        if (nextIdx < 0 || nextIdx >= s.sequenceUnitIds.length) return s;
        const copy = [...s.sequenceUnitIds];
        const [moved] = copy.splice(index, 1);
        copy.splice(nextIdx, 0, moved);
        return { ...s, sequenceUnitIds: copy };
      }),
    }));
  };

  const autoOrderSequence = (subjectId: string) => {
    updateActiveBp((bp) => ({
      ...bp,
      subjects: bp.subjects.map((s) => {
        if (s.id !== subjectId) return s;
        const score = (u: BlueprintUnit) =>
          (u.priorityTag ? 100 : 0) +
          (u.volumeTag === 'MAX VOLUME' ? 50 : u.volumeTag === 'HIGH VOLUME' ? 25 : 0);
        const sorted = [...s.units].sort((a, b) => score(b) - score(a));
        return { ...s, sequenceUnitIds: sorted.map((u) => u.id) };
      }),
    }));
  };

  const executeDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === 'blueprint') {
      const remaining = blueprints.filter((b) => b.id !== deleteTarget.id);
      const nextList = remaining.length > 0 ? remaining : [createDefaultBlueprint()];
      setBlueprints(nextList);
      setActiveId(nextList[0].id);
    } else if (deleteTarget.kind === 'subject') {
      updateActiveBp((bp) => ({
        ...bp,
        subjects: bp.subjects.filter((s) => s.id !== deleteTarget.subjectId),
      }));
    } else if (deleteTarget.kind === 'unit') {
      updateActiveBp((bp) => ({
        ...bp,
        subjects: bp.subjects.map((s) =>
          s.id === deleteTarget.subjectId
            ? {
                ...s,
                units: s.units.filter((u) => u.id !== deleteTarget.unitId),
                sequenceUnitIds: s.sequenceUnitIds.filter((id) => id !== deleteTarget.unitId),
              }
            : s
        ),
      }));
    }
    setDeleteTarget(null);
  };

  if (!activeBp) return null;

  return (
    <div className="space-y-5 pb-8">
      {/* Top Toolbar (Hidden on Print) */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 pr-2">
            <ClipboardList className="w-5 h-5 text-[#0A5386] dark:text-sky-400" />
            <h1 className="text-lg font-bold text-[#1C1C1E] dark:text-white">Study Planner</h1>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {blueprints.map((bp) => {
              const selected = bp.id === activeBp.id;
              return (
                <button
                  key={bp.id}
                  type="button"
                  onClick={() => setActiveId(bp.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    selected
                      ? 'bg-[#0A5386] text-white shadow-xs'
                      : 'paper-card text-[#52525B] dark:text-zinc-300 hover:text-[#1C1C1E] dark:hover:text-white'
                  }`}
                >
                  {bp.title}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="ios-press inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-[#0A5386]/50 text-[#0A5386] dark:text-sky-400 dark:border-sky-400/40 text-xs font-semibold hover:bg-[#0A5386]/8 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New Planner
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Study / Edit Mode Switcher */}
          <div className="inline-flex items-center gap-1 bg-black/5 dark:bg-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                !editMode
                  ? 'bg-[#0A5386] text-white shadow-xs'
                  : 'text-[#6E6E73] dark:text-zinc-300 hover:text-[#1C1C1E] dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Study Mode
            </button>
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                editMode
                  ? 'bg-[#0A5386] text-white shadow-xs'
                  : 'text-[#6E6E73] dark:text-zinc-300 hover:text-[#1C1C1E] dark:hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit Blueprint
            </button>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="ios-press inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl paper-card text-xs font-semibold text-[#1C1C1E] dark:text-white hover:shadow-sm"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#0A5386] dark:text-sky-400" />
            Export PDF
          </button>

          <button
            type="button"
            onClick={() =>
              setDeleteTarget({ kind: 'blueprint', id: activeBp.id, label: activeBp.title })
            }
            className="p-2 rounded-xl paper-card text-[#8E8E93] hover:text-red-600 transition-colors"
            title="Delete this blueprint"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Overall Blueprint Completion Strip (Hidden on Print) */}
      <div className="no-print paper-card rounded-2xl px-4 py-3 flex items-center gap-4">
        <div className="text-xs font-bold text-[#1C1C1E] dark:text-white whitespace-nowrap">
          Blueprint Progress
        </div>
        <div className="flex-1 h-2 rounded-full bg-black/8 dark:bg-white/10 overflow-hidden">
          <div
            className="h-full bg-[#0A5386] dark:bg-sky-400 rounded-full transition-all duration-300"
            style={{ width: `${progressStats.pct}%` }}
          />
        </div>
        <div className="text-xs font-mono-num font-bold text-[#0A5386] dark:text-sky-400 whitespace-nowrap">
          {progressStats.done} / {progressStats.total} units ({progressStats.pct}%)
        </div>
      </div>

      {/* BLUEPRINT SHEET */}
      <div className="space-y-5">
        {/* Blueprint Header Banner */}
        <div className="paper-card rounded-2xl p-5 sm:p-6 border-2 border-[#0A5386]/45 dark:border-sky-400/35 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            {editMode ? (
              <>
                <input
                  type="text"
                  value={activeBp.title}
                  onChange={(e) =>
                    updateActiveBp((bp) => ({ ...bp, title: e.target.value.toUpperCase() }))
                  }
                  className="w-full text-xl sm:text-2xl font-black tracking-tight text-[#0A5386] dark:text-sky-400 bg-transparent border-b border-dashed border-[#0A5386]/40 focus:outline-none"
                />
                <input
                  type="text"
                  value={activeBp.subtitle}
                  onChange={(e) =>
                    updateActiveBp((bp) => ({ ...bp, subtitle: e.target.value }))
                  }
                  className="w-full text-xs sm:text-sm font-medium text-[#133F47] dark:text-teal-300 bg-transparent border-b border-dashed border-[#133F47]/30 focus:outline-none"
                />
              </>
            ) : (
              <>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#0A5386] dark:text-sky-400">
                  {activeBp.title}
                </h2>
                <p className="text-xs sm:text-sm font-medium text-[#133F47] dark:text-teal-300">
                  {activeBp.subtitle}
                </p>
              </>
            )}
          </div>

          {(activeBp.focusCallout || editMode) && (
            <div className="rounded-xl border-2 border-dashed border-amber-500/70 bg-amber-50/70 dark:bg-amber-500/10 px-4 py-2.5 text-center shrink-0">
              <div className="text-[11px] font-extrabold tracking-wider text-amber-800 dark:text-amber-300 flex items-center justify-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                COMPULSORY FOCUS
                <Star className="w-3 h-3 fill-current" />
              </div>
              {editMode ? (
                <input
                  type="text"
                  value={activeBp.focusCallout}
                  onChange={(e) =>
                    updateActiveBp((bp) => ({
                      ...bp,
                      focusCallout: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="e.g. 20-MARK CASE STUDIES"
                  className="mt-1 w-48 text-center text-xs font-black text-rose-700 dark:text-rose-300 bg-transparent border-b border-dashed border-amber-500/50 focus:outline-none"
                />
              ) : (
                <div className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300 mt-0.5">
                  {activeBp.focusCallout}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Subject Blueprint Cards */}
        {activeBp.subjects.map((subject, sIdx) => {
          const unitMap = new Map(subject.units.map((u) => [u.id, u]));
          const orderedUnits = subject.sequenceUnitIds
            .map((id) => unitMap.get(id))
            .filter((u): u is BlueprintUnit => Boolean(u));

          return (
            <div
              key={subject.id}
              className="paper-card rounded-2xl overflow-hidden border-2 border-[#0A5386]/40 dark:border-sky-400/30"
            >
              {/* Subject Header */}
              <div className="px-5 py-3.5 border-b border-[#0A5386]/20 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#0A5386]/[0.04] dark:bg-sky-400/[0.06]">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-sm sm:text-base font-black text-[#0A5386] dark:text-sky-400">
                    {sIdx + 1}.
                  </span>
                  {editMode ? (
                    <input
                      type="text"
                      value={subject.title}
                      onChange={(e) =>
                        updateActiveBp((bp) => ({
                          ...bp,
                          subjects: bp.subjects.map((s) =>
                            s.id === subject.id
                              ? { ...s, title: e.target.value.toUpperCase() }
                              : s
                          ),
                        }))
                      }
                      className="flex-1 min-w-0 text-sm sm:text-base font-black text-[#0A5386] dark:text-sky-400 bg-transparent border-b border-dashed border-[#0A5386]/40 focus:outline-none"
                    />
                  ) : (
                    <h3 className="text-sm sm:text-base font-black text-[#0A5386] dark:text-sky-400 truncate">
                      {subject.title}
                    </h3>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {editMode ? (
                    <input
                      type="text"
                      value={subject.weightage}
                      onChange={(e) =>
                        updateActiveBp((bp) => ({
                          ...bp,
                          subjects: bp.subjects.map((s) =>
                            s.id === subject.id ? { ...s, weightage: e.target.value } : s
                          ),
                        }))
                      }
                      className="px-3 py-1 rounded-full border border-[#0A5386]/40 text-xs font-bold text-[#0A5386] dark:text-sky-300 bg-white/70 dark:bg-white/10 w-44 text-center focus:outline-none"
                    />
                  ) : (
                    <span className="px-3 py-1 rounded-full border border-[#0A5386]/40 dark:border-sky-400/40 bg-white/75 dark:bg-sky-400/10 text-xs font-bold text-[#0A5386] dark:text-sky-300">
                      {subject.weightage}
                    </span>
                  )}

                  {editMode && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          kind: 'subject',
                          subjectId: subject.id,
                          label: subject.title,
                        })
                      }
                      className="p-1.5 text-[#8E8E93] hover:text-red-600 transition-colors"
                      title="Delete subject"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Units Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E2E0D8] dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                      {!editMode && <th className="py-2.5 pl-4 pr-1 w-9 no-print" />}
                      <th className="py-2.5 px-4 w-24">Unit</th>
                      <th className="py-2.5 px-4">Topics &amp; Weightage Focus</th>
                      <th className="py-2.5 px-4 w-44">Illustrations</th>
                      {editMode && <th className="py-2.5 pr-4 w-12" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E0D8]/70 dark:divide-white/8 text-xs">
                    {subject.units.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-6 text-center text-xs text-[#8E8E93] dark:text-zinc-400"
                        >
                          No units added yet. Switch to Edit Blueprint or click &ldquo;+ Add Unit&rdquo; below.
                        </td>
                      </tr>
                    ) : (
                      subject.units.map((u) => {
                        const isPriority = Boolean(u.priorityTag);
                        return (
                          <tr
                            key={u.id}
                            onClick={() => {
                              if (!editMode) toggleUnitDone(subject.id, u.id);
                            }}
                            className={`transition-colors ${
                              !editMode ? 'cursor-pointer hover:bg-black/[0.025] dark:hover:bg-white/[0.04]' : ''
                            } ${
                              isPriority
                                ? 'bg-amber-100/65 dark:bg-amber-500/12'
                                : ''
                            } ${u.done && !editMode ? 'opacity-60' : ''}`}
                          >
                            {!editMode && (
                              <td className="py-2.5 pl-4 pr-1 no-print">
                                <span
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                    u.done
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-[#C4C2BA] dark:border-white/25'
                                  }`}
                                >
                                  {u.done && <Check className="w-3 h-3 stroke-[3]" />}
                                </span>
                              </td>
                            )}

                            <td className="py-2.5 px-4 font-bold text-[#1C1C1E] dark:text-white align-middle">
                              {editMode ? (
                                <input
                                  type="text"
                                  value={u.unitLabel}
                                  onChange={(e) =>
                                    updateUnitField(subject.id, u.id, {
                                      unitLabel: e.target.value,
                                    })
                                  }
                                  className="w-20 bg-transparent border-b border-dashed border-[#C4C2BA] focus:outline-none font-bold"
                                />
                              ) : (
                                u.unitLabel
                              )}
                            </td>

                            <td className="py-2.5 px-4 align-middle">
                              {editMode ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <input
                                    type="text"
                                    value={u.topic}
                                    onChange={(e) =>
                                      updateUnitField(subject.id, u.id, { topic: e.target.value })
                                    }
                                    className="flex-1 min-w-[180px] bg-transparent border-b border-dashed border-[#C4C2BA] focus:outline-none font-medium text-[#1C1C1E] dark:text-white"
                                  />
                                  <input
                                    type="text"
                                    value={u.priorityTag ?? ''}
                                    onChange={(e) =>
                                      updateUnitField(subject.id, u.id, {
                                        priorityTag: e.target.value ? e.target.value.toUpperCase() : undefined,
                                      })
                                    }
                                    placeholder="Priority badge (optional)"
                                    className="w-40 px-2 py-0.5 rounded-full border border-dashed border-rose-400/60 text-[10px] font-bold text-rose-700 dark:text-rose-300 bg-transparent focus:outline-none"
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`font-medium text-[#1C1C1E] dark:text-white ${
                                      u.done ? 'line-through' : ''
                                    }`}
                                  >
                                    {u.topic}
                                  </span>
                                  {u.priorityTag && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-rose-400/70 bg-rose-50 dark:bg-rose-500/20 text-[10px] font-black text-rose-700 dark:text-rose-300">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      {u.priorityTag}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="py-2.5 px-4 align-middle">
                              {editMode ? (
                                <div className="flex flex-col gap-1">
                                  <input
                                    type="text"
                                    value={u.illustrations}
                                    onChange={(e) =>
                                      updateUnitField(subject.id, u.id, {
                                        illustrations: e.target.value,
                                      })
                                    }
                                    className="w-28 bg-transparent border-b border-dashed border-[#C4C2BA] focus:outline-none font-mono-num text-[#1C1C1E] dark:text-white"
                                  />
                                  <select
                                    value={u.volumeTag ?? ''}
                                    onChange={(e) =>
                                      updateUnitField(subject.id, u.id, {
                                        volumeTag: e.target.value as BlueprintUnit['volumeTag'],
                                      })
                                    }
                                    className="w-28 text-[10px] font-bold rounded-lg border border-[#E2E0D8] dark:border-white/15 bg-white/70 dark:bg-zinc-900 px-1.5 py-0.5"
                                  >
                                    <option value="">No badge</option>
                                    <option value="MAX VOLUME">MAX VOLUME</option>
                                    <option value="HIGH VOLUME">HIGH VOLUME</option>
                                  </select>
                                </div>
                              ) : (
                                <div className="flex flex-col items-start gap-1">
                                  <span className="font-mono-num font-semibold text-[#1C1C1E] dark:text-white">
                                    {u.illustrations}
                                  </span>
                                  {u.volumeTag && (
                                    <span className="px-2 py-0.5 rounded-full border border-amber-500/70 bg-amber-100/80 dark:bg-amber-500/20 text-[9px] font-black text-amber-800 dark:text-amber-300">
                                      {u.volumeTag}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {editMode && (
                              <td className="py-2.5 pr-4 text-right align-middle">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      kind: 'unit',
                                      subjectId: subject.id,
                                      unitId: u.id,
                                      label: `${u.unitLabel}: ${u.topic}`,
                                    })
                                  }
                                  className="p-1 text-[#8E8E93] hover:text-red-600 transition-colors"
                                  title="Delete unit"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Quick Add Unit Inline Bar (Edit Mode) */}
              {editMode && (
                <div className="px-4 py-2.5 border-t border-[#E2E0D8]/70 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
                  {addingUnitFor === subject.id ? (
                    <form
                      onSubmit={(e) => handleAddUnit(e, subject.id)}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input
                        type="text"
                        value={draftUnitLabel}
                        onChange={(e) => setDraftUnitLabel(e.target.value)}
                        placeholder="Unit 1"
                        className="w-20 px-2.5 py-1.5 text-xs font-bold rounded-xl border border-[#E2E0D8] dark:border-white/15 bg-white/80 dark:bg-white/10"
                      />
                      <input
                        type="text"
                        autoFocus
                        value={draftTopic}
                        onChange={(e) => setDraftTopic(e.target.value)}
                        placeholder="Topic name (e.g. Capital Budgeting)"
                        className="flex-1 min-w-[180px] px-3 py-1.5 text-xs rounded-xl border border-[#E2E0D8] dark:border-white/15 bg-white/80 dark:bg-white/10"
                      />
                      <input
                        type="text"
                        value={draftIllus}
                        onChange={(e) => setDraftIllus(e.target.value)}
                        placeholder="40 Illus."
                        className="w-24 px-2.5 py-1.5 text-xs rounded-xl border border-[#E2E0D8] dark:border-white/15 bg-white/80 dark:bg-white/10"
                      />
                      <input
                        type="text"
                        value={draftPriority}
                        onChange={(e) => setDraftPriority(e.target.value)}
                        placeholder="Priority tag (optional)"
                        className="w-36 px-2.5 py-1.5 text-xs rounded-xl border border-[#E2E0D8] dark:border-white/15 bg-white/80 dark:bg-white/10"
                      />
                      <select
                        value={draftVolume}
                        onChange={(e) =>
                          setDraftVolume(e.target.value as '' | 'HIGH VOLUME' | 'MAX VOLUME')
                        }
                        className="px-2.5 py-1.5 text-xs rounded-xl border border-[#E2E0D8] dark:border-white/15 bg-white/80 dark:bg-zinc-900"
                      >
                        <option value="">Normal</option>
                        <option value="HIGH VOLUME">HIGH VOLUME</option>
                        <option value="MAX VOLUME">MAX VOLUME</option>
                      </select>
                      <button
                        type="submit"
                        className="ios-press px-3.5 py-1.5 rounded-xl bg-[#0A5386] text-white text-xs font-semibold"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingUnitFor(null)}
                        className="p-1.5 text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAddUnit(subject)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0A5386] dark:text-sky-400 hover:underline"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Unit to {subject.title}
                    </button>
                  )}
                </div>
              )}

              {/* Strategic Sequence Footer */}
              {orderedUnits.length > 0 && (
                <div className="px-5 py-3.5 border-t border-[#E2E0D8] dark:border-white/10 bg-[#FAF9F6]/60 dark:bg-white/[0.02] space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-rose-700 dark:text-rose-400 inline-flex items-center gap-1">
                        Sequence <ArrowRight className="w-3.5 h-3.5" />
                      </span>

                      {orderedUnits.map((u, idx) => {
                        const isPriority = Boolean(u.priorityTag);
                        return (
                          <React.Fragment key={u.id}>
                            <div
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-bold transition-all ${
                                isPriority
                                  ? 'border-rose-400 bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300'
                                  : 'border-[#C4C2BA] dark:border-white/20 bg-white/80 dark:bg-white/5 text-[#1C1C1E] dark:text-zinc-200'
                              } ${u.done && !editMode ? 'opacity-50 line-through' : ''}`}
                            >
                              {editMode && idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveSequenceItem(subject.id, idx, -1)}
                                  className="hover:text-[#0A5386] dark:hover:text-sky-400"
                                  title="Move earlier"
                                >
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}
                              <span>
                                {idx + 1}. {shortUnitSnippet(u)}
                              </span>
                              {editMode && idx < orderedUnits.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveSequenceItem(subject.id, idx, 1)}
                                  className="hover:text-[#0A5386] dark:hover:text-sky-400"
                                  title="Move later"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            {idx < orderedUnits.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-[#0A5386] dark:text-sky-400 shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>

                    {editMode && (
                      <button
                        type="button"
                        onClick={() => autoOrderSequence(subject.id)}
                        className="ios-press inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-500/25"
                        title="Automatically place Priority & High Volume units first"
                      >
                        <Sparkles className="w-3 h-3" />
                        Auto-Order by Priority
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add New Subject Bar (Edit Mode) */}
        {editMode && (
          <form
            onSubmit={handleAddSubject}
            className="no-print paper-card rounded-2xl p-4 flex flex-wrap items-center gap-3 border-2 border-dashed border-[#0A5386]/35 dark:border-sky-400/30"
          >
            <input
              type="text"
              value={newSubTitle}
              onChange={(e) => setNewSubTitle(e.target.value)}
              placeholder="New Subject Name (e.g. CORPORATE LAW)"
              className="flex-1 min-w-[200px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E2E0D8] dark:border-white/15 bg-white/75 dark:bg-white/10"
            />
            <input
              type="text"
              value={newSubWeightage}
              onChange={(e) => setNewSubWeightage(e.target.value)}
              placeholder="Weightage (e.g. 60% Sums | 40% Theory)"
              className="w-56 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E2E0D8] dark:border-white/15 bg-white/75 dark:bg-white/10"
            />
            <button
              type="submit"
              className="ios-press inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A5386] text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Subject
            </button>
          </form>
        )}
      </div>

      {/* Create New Study Blueprint Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
          onClick={() => setShowCreateModal(false)}
        >
          <form
            onSubmit={handleCreateBlueprint}
            onClick={(e) => e.stopPropagation()}
            className="paper-card w-full max-w-md rounded-3xl p-6 space-y-4 border border-[#E2E0D8] dark:border-white/15 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1C1C1E] dark:text-white">
                  Create Study Planner
                </h2>
                <p className="text-xs text-[#8E8E93] dark:text-zinc-400">
                  Set up a new strategic exam blueprint in seconds
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-full text-[#8E8E93] hover:text-[#1C1C1E] dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] mb-1">
                  Planner Title
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newBpTitle}
                  onChange={(e) => setNewBpTitle(e.target.value)}
                  placeholder="e.g. SEMESTER 4 FINAL BLUEPRINT"
                  className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E2E0D8] dark:border-white/15 bg-white/75 dark:bg-white/10"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={newBpSubtitle}
                  onChange={(e) => setNewBpSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E2E0D8] dark:border-white/15 bg-white/75 dark:bg-white/10"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#8E8E93] mb-1">
                  Compulsory Focus Callout (Optional)
                </label>
                <input
                  type="text"
                  value={newBpCallout}
                  onChange={(e) => setNewBpCallout(e.target.value)}
                  placeholder="e.g. 20-MARK CASE STUDIES"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#E2E0D8] dark:border-white/15 bg-white/75 dark:bg-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setNewBpTemplate('blank')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                    newBpTemplate === 'blank'
                      ? 'border-[#0A5386] bg-[#0A5386]/10 text-[#0A5386] dark:text-sky-300'
                      : 'border-[#E2E0D8] dark:border-white/15 text-[#6E6E73] dark:text-zinc-400'
                  }`}
                >
                  Blank Blueprint
                </button>
                <button
                  type="button"
                  onClick={() => setNewBpTemplate('sample')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                    newBpTemplate === 'sample'
                      ? 'border-[#0A5386] bg-[#0A5386]/10 text-[#0A5386] dark:text-sky-300'
                      : 'border-[#E2E0D8] dark:border-white/15 text-[#6E6E73] dark:text-zinc-400'
                  }`}
                >
                  Copy Exam Sample
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#6E6E73]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ios-press px-5 py-2 rounded-xl bg-[#0A5386] text-white text-xs font-semibold"
              >
                Create Planner
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title="Confirm Deletion"
        message="Are you sure you want to Delete ?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
