import React, { useEffect, useState } from 'react';
import {
  Check,
  Clock,
  Flame,
  PenLine,
  Timer,
  Trash2,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { FloatingTimerWidget } from './FloatingTimerWidget';

export interface StudySessionLog {
  id: string;
  label: string;
  durationSeconds: number;
  savedAt: string;
}

export interface TimerViewProps {
  mode: 'countdown' | 'pomodoro' | 'stopwatch';
  setMode: (m: 'countdown' | 'pomodoro' | 'stopwatch') => void;
  pomoPhase: 'focus' | 'shortBreak' | 'longBreak';
  onSelectPomoPhase: (phase: 'focus' | 'shortBreak' | 'longBreak') => void;
  customMins: number;
  countdownLeft: number;
  stopwatchElapsed: number;
  running: boolean;
  setRunning: (fn: (prev: boolean) => boolean) => void;
  applyPresetMinutes: (mins: number) => void;
  handleReset: () => void;
  sessionLabel: string;
  setSessionLabel: (val: string) => void;
  sessions: StudySessionLog[];
  focusCount: number;
  handleSaveSession: () => void;
  deleteSession: (id: string) => void;
  midpointAcked?: boolean;
  onMidpointAck?: () => void;
  victoryDismissed?: boolean;
  onVictoryDismiss?: () => void;
}

export const TimerView: React.FC<TimerViewProps> = ({
  mode,
  setMode,
  pomoPhase,
  onSelectPomoPhase,
  customMins,
  countdownLeft,
  stopwatchElapsed,
  running,
  setRunning,
  applyPresetMinutes,
  handleReset,
  sessionLabel,
  setSessionLabel,
  sessions,
  focusCount,
  handleSaveSession,
  deleteSession,
  midpointAcked,
  onMidpointAck,
  victoryDismissed,
  onVictoryDismiss,
}) => {
  const displaySeconds =
    mode === 'countdown' || mode === 'pomodoro' ? countdownLeft : stopwatchElapsed;

  const targetMins =
    mode === 'pomodoro'
      ? pomoPhase === 'focus'
        ? 25
        : pomoPhase === 'shortBreak'
        ? 5
        : 15
      : customMins;
  const totalTarget = targetMins * 60;
  const progressPct =
    (mode === 'countdown' || mode === 'pomodoro') && totalTarget > 0
      ? Math.min(100, Math.max(0, ((totalTarget - countdownLeft) / totalTarget) * 100))
      : ((stopwatchElapsed % 3600) / 3600) * 100;

  const totalMinutesLogged = sessions.reduce(
    (sum, s) => sum + Math.max(1, Math.round(s.durationSeconds / 60)),
    0
  );

  // Local string state so user can clear the field with Backspace without it instantly resetting
  const [minInputStr, setMinInputStr] = useState<string>(() => String(customMins));
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  useEffect(() => {
    setMinInputStr(String(customMins));
  }, [customMins]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1C1C1E] flex items-center gap-2">
            <Timer className="w-5 h-5 text-[#9B5B76]" />
            Focus Timer
          </h1>
          <p className="text-xs text-[#8E8E93] mt-0.5">
            Keeps running in a floating mini-bar whenever you switch tabs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl paper-card text-xs font-semibold text-[#9B5B76] inline-flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            {focusCount}x focused · {totalMinutesLogged}m
          </div>

          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMode('countdown')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'countdown'
                  ? 'bg-[#9B5B76] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1C1C1E] dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10'
              }`}
            >
              Countdown
            </button>
            <button
              type="button"
              onClick={() => setMode('pomodoro')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'pomodoro'
                  ? 'bg-[#9B5B76] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1C1C1E] dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10'
              }`}
            >
              Pomodoro
            </button>
            <button
              type="button"
              onClick={() => setMode('stopwatch')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'stopwatch'
                  ? 'bg-[#9B5B76] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1C1C1E] dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/10'
              }`}
            >
              Stopwatch
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Main Interactive Timer Card */}
        <div className="lg:col-span-7 paper-card rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Focus Intent: Dotted blank space with "What are you focusing on?" text & pen symbol */}
          <div className="flex justify-center">
            {isEditingLabel ? (
              <div className="w-full max-w-sm flex items-center gap-2 border-2 border-dashed border-[#9B5B76] bg-white/70 dark:bg-white/10 rounded-full px-4 py-1.5 shadow-2xs">
                <input
                  type="text"
                  autoFocus
                  value={sessionLabel}
                  onChange={(e) => setSessionLabel(e.target.value)}
                  onBlur={() => setIsEditingLabel(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsEditingLabel(false);
                  }}
                  placeholder="What are you focusing on?"
                  className="w-full text-center text-xs font-semibold bg-transparent focus:outline-none text-[#1C1C1E] dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setIsEditingLabel(false)}
                  className="text-[11px] font-bold text-[#9B5B76] hover:text-[#874D65] px-1 shrink-0"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingLabel(true)}
                title="Click to edit focus topic"
                className="group border-2 border-dashed border-[#C4C2BA] dark:border-white/20 hover:border-[#9B5B76] dark:hover:border-[#9B5B76] rounded-full px-5 py-2 inline-flex items-center gap-2.5 transition-all text-xs font-semibold bg-white/30 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10"
              >
                <span className={sessionLabel ? 'text-[#1C1C1E] dark:text-white' : 'text-[#8E8E93] dark:text-zinc-400'}>
                  {sessionLabel || 'What are you focusing on?'}
                </span>
                <PenLine className="w-3.5 h-3.5 text-[#9B5B76] opacity-75 group-hover:opacity-100 group-hover:scale-110 transition-all shrink-0" />
              </button>
            )}
          </div>

          {/* Semi-Circle Rotary Shinchan Timer (same design as Floating Bar) */}
          <div className="py-1">
            <FloatingTimerWidget
              variant="embedded"
              seconds={displaySeconds}
              progressPct={progressPct}
              running={running}
              sessionLabel={sessionLabel}
              onToggleRunning={() => setRunning((r) => !r)}
              onRestart={handleReset}
              onLogSession={handleSaveSession}
              midpointAcked={midpointAcked}
              onMidpointAck={onMidpointAck}
              victoryDismissed={victoryDismissed}
              onVictoryDismiss={onVictoryDismiss}
            />
          </div>

          {mode === 'pomodoro' && (
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-black/[0.05] dark:bg-white/10 border border-[#E2E0D8]/70 dark:border-white/10">
                {(
                  [
                    { id: 'focus', label: 'Focus', sub: '25m', color: '#9B5B76' },
                    { id: 'shortBreak', label: 'Short Break', sub: '5m', color: '#1B5E5A' },
                    { id: 'longBreak', label: 'Long Break', sub: '15m', color: '#0A5386' },
                  ] as const
                ).map((ph) => {
                  const active = pomoPhase === ph.id;
                  return (
                    <button
                      key={ph.id}
                      type="button"
                      onClick={() => onSelectPomoPhase(ph.id)}
                      style={active ? { backgroundColor: ph.color } : undefined}
                      className={`ios-press px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        active
                          ? 'text-white shadow-md'
                          : 'text-[#52525B] hover:text-[#1C1C1E] dark:text-zinc-300 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
                      }`}
                    >
                      <span>{ph.label}</span>
                      <span
                        className={`text-[10px] font-mono-num px-1.5 py-0.5 rounded-full ${
                          active ? 'bg-white/20 text-white' : 'bg-black/5 dark:bg-white/10 text-[#8E8E93] dark:text-zinc-400'
                        }`}
                      >
                        {ph.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {mode === 'countdown' && (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = Math.max(1, customMins - 5);
                  setMinInputStr(String(next));
                  applyPresetMinutes(next);
                }}
                disabled={customMins <= 1}
                title="Decrease 5 minutes"
                className="ios-press w-8 h-8 rounded-full border border-[#E2E0D8] bg-white/70 flex items-center justify-center text-sm font-bold text-[#52525B] hover:text-[#1C1C1E] hover:bg-white shadow-2xs transition-all disabled:opacity-30"
              >
                −
              </button>
              <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#E2E0D8] bg-white/80 shadow-2xs focus-within:border-[#9B5B76] focus-within:ring-2 focus-within:ring-[#9B5B76]/20 transition-all">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={minInputStr}
                  onFocus={(e) => e.currentTarget.select()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setMinInputStr(raw);
                    if (raw !== '') {
                      const num = parseInt(raw, 10);
                      if (num >= 1 && num <= 300) {
                        applyPresetMinutes(num);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (!minInputStr || parseInt(minInputStr, 10) < 1) {
                      setMinInputStr(String(customMins || 25));
                      applyPresetMinutes(customMins || 25);
                    } else {
                      const clamped = Math.max(1, Math.min(300, parseInt(minInputStr, 10)));
                      setMinInputStr(String(clamped));
                      applyPresetMinutes(clamped);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-12 text-center font-bold text-sm font-mono-num bg-transparent focus:outline-none text-[#1C1C1E]"
                  placeholder="min"
                />
                <span className="text-xs font-semibold text-[#8E8E93]">min</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const next = Math.min(300, customMins + 5);
                  setMinInputStr(String(next));
                  applyPresetMinutes(next);
                }}
                disabled={customMins >= 300}
                title="Increase 5 minutes"
                className="ios-press w-8 h-8 rounded-full border border-[#E2E0D8] bg-white/70 flex items-center justify-center text-sm font-bold text-[#52525B] hover:text-[#1C1C1E] hover:bg-white shadow-2xs transition-all disabled:opacity-30"
              >
                +
              </button>
            </div>
          )}

          {/* Finish & Log */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleSaveSession}
              className="ios-press inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/25 text-xs font-semibold"
            >
              <Check className="w-3.5 h-3.5" />
              Finish &amp; Log
            </button>
          </div>
        </div>

        {/* Right: Study Session History */}
        <div className="lg:col-span-5 paper-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E0D8]/70 pb-2.5">
            <span className="text-sm font-bold text-[#1C1C1E]">Focus History</span>
            <span className="text-xs text-[#8E8E93]">{sessions.length} sessions</span>
          </div>

          {sessions.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#8E8E93]">
              Start the timer and click &ldquo;Finish &amp; Log&rdquo; to record your study sessions here.
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {sessions.map((s) => {
                const mins = Math.max(1, Math.round(s.durationSeconds / 60));
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-white/40 border border-[#E2E0D8]/60 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Clock className="w-3.5 h-3.5 text-[#9B5B76] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-semibold text-[#1C1C1E] truncate">{s.label}</div>
                        <div className="text-[10px] text-[#8E8E93]">
                          {mins} min · {s.savedAt}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSessionToDelete(s.id)}
                      className="text-[#8E8E93] hover:text-red-600 p-1 transition-colors"
                      title="Delete session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={!!sessionToDelete}
        title="Delete Focus Session"
        message="Are you sure you want to Delete ?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        onConfirm={() => {
          if (sessionToDelete) {
            deleteSession(sessionToDelete);
            setSessionToDelete(null);
          }
        }}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
};
