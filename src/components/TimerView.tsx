import React from 'react';
import {
  Check,
  Clock,
  Flame,
  Timer,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { FloatingTimerWidget } from './FloatingTimerWidget';

export interface StudySessionLog {
  id: string;
  label: string;
  durationSeconds: number;
  savedAt: string;
}

export interface TimerViewProps {
  mode: 'countdown' | 'stopwatch';
  setMode: (m: 'countdown' | 'stopwatch') => void;
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
  handleSaveSession: () => void;
  deleteSession: (id: string) => void;
  ambientOn: boolean;
  setAmbientOn: (fn: (prev: boolean) => boolean) => void;
  midpointAcked?: boolean;
  onMidpointAck?: () => void;
  victoryDismissed?: boolean;
  onVictoryDismiss?: () => void;
}

export const TimerView: React.FC<TimerViewProps> = ({
  mode,
  setMode,
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
  handleSaveSession,
  deleteSession,
  ambientOn,
  setAmbientOn,
  midpointAcked,
  onMidpointAck,
  victoryDismissed,
  onVictoryDismiss,
}) => {
  const displaySeconds = mode === 'countdown' ? countdownLeft : stopwatchElapsed;

  const totalTarget = customMins * 60;
  const progressPct =
    mode === 'countdown' && totalTarget > 0
      ? Math.min(100, Math.max(0, ((totalTarget - countdownLeft) / totalTarget) * 100))
      : ((stopwatchElapsed % 3600) / 3600) * 100;

  const totalMinutesLogged = sessions.reduce(
    (sum, s) => sum + Math.max(1, Math.round(s.durationSeconds / 60)),
    0
  );

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
            {totalMinutesLogged}m focused
          </div>

          <button
            type="button"
            onClick={() => setAmbientOn((v) => !v)}
            className={`ios-press px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              ambientOn
                ? 'bg-[#9B5B76] text-white border-[#9B5B76]'
                : 'paper-card border-[#E2E0D8] text-[#52525B]'
            }`}
            title="Soft brown-noise ambient focus sound"
          >
            {ambientOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            {ambientOn ? 'Rain Hum ON' : 'Rain Hum'}
          </button>

          <div className="flex items-center gap-1 bg-black/5 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setMode('countdown')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'countdown'
                  ? 'bg-[#9B5B76] text-white'
                  : 'text-[#6E6E73] hover:text-[#1C1C1E]'
              }`}
            >
              Countdown
            </button>
            <button
              type="button"
              onClick={() => setMode('stopwatch')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                mode === 'stopwatch'
                  ? 'bg-[#9B5B76] text-white'
                  : 'text-[#6E6E73] hover:text-[#1C1C1E]'
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
          {/* Focus Intent Pill */}
          <div className="flex justify-center">
            <input
              type="text"
              value={sessionLabel}
              onChange={(e) => setSessionLabel(e.target.value)}
              placeholder="What are you focusing on? (e.g. Calculus Ch. 4)"
              className="w-full max-w-sm text-center px-4 py-2 text-xs font-semibold rounded-full border border-[#E2E0D8] bg-white/50 focus:outline-none focus:border-[#9B5B76]"
            />
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
              midpointAcked={midpointAcked}
              onMidpointAck={onMidpointAck}
              victoryDismissed={victoryDismissed}
              onVictoryDismiss={onVictoryDismiss}
            />
          </div>

          {mode === 'countdown' && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[15, 30, 45, 60, 90].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => applyPresetMinutes(m)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors ${
                    customMins === m
                      ? 'bg-[#9B5B76] text-white border-[#9B5B76]'
                      : 'border-[#E2E0D8] bg-white/40 text-[#52525B] hover:text-[#1C1C1E]'
                  }`}
                >
                  {m}m
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={customMins}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(300, Number(e.target.value) || 1));
                    applyPresetMinutes(val);
                  }}
                  className="w-16 px-2.5 py-1.5 text-xs text-center font-mono-num rounded-xl border border-[#E2E0D8] bg-white/60"
                />
                <span className="text-[11px] text-[#8E8E93]">min</span>
              </div>
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
                      onClick={() => deleteSession(s.id)}
                      className="text-[#8E8E93] hover:text-red-600 p-1"
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
    </div>
  );
};
