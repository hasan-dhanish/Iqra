import React, { useEffect, useState } from 'react';
import { ArrowLeft, Maximize2, Moon, Sun, Tv, X } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { DashboardView } from './components/DashboardView';
import { FloatingTimerWidget, preloadTimerAssets } from './components/FloatingTimerWidget';
import { JournalView } from './components/JournalView';
import { LowBatteryPopup } from './components/LowBatteryPopup';
import { ProjectPinboard } from './components/ProjectPinboard';
import { ResourcesView } from './components/ResourcesView';
import { Sidebar } from './components/Sidebar';
import { StudyFoldersView, type StudyFolder } from './components/StudyFoldersView';
import { StudyPlannerView } from './components/StudyPlannerView';
import { TimerView, type StudySessionLog } from './components/TimerView';
import { HabitTrackerView } from './components/HabitTrackerView';
import { YoutubeView, type YoutubeActiveVideo } from './components/YoutubeView';
import { FOCUS_COUNT_KEY } from './lib/habits';
import { LdoiProvider, useLdoi } from './context/LdoiContext';
import type { ActiveTab, Project } from './types';

const SESSIONS_KEY = 'iqra_study_sessions_v1';

const DEFAULT_MATRIX_PROJECT: Project = {
  id: 'iqra_study_matrix',
  title: 'Study Matrix',
  clientName: 'Iqra Desk',
  category: 'Core',
  status: 'Active',
  requirements: '',
  teamIdea: '',
  liveNotebookText: '',
  deadline: '',
  quotedAmountInr: 0,
  budgetNotes: '',
  createdBy: 'Sajitha',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const WorkspaceShell: React.FC = () => {
  const { currentUser, authLoading } = useLdoi();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('ldoi_theme');
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  // Persistent Global Focus Timer State
  const [timerMode, setTimerMode] = useState<'countdown' | 'pomodoro' | 'stopwatch'>('countdown');
  const [pomoPhase, setPomoPhase] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [customMins, setCustomMins] = useState(45);
  const [countdownLeft, setCountdownLeft] = useState(45 * 60);
  const [stopwatchElapsed, setStopwatchElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [floatingPinned, setFloatingPinned] = useState(false);
  const [activeMatrixFolder, setActiveMatrixFolder] = useState<StudyFolder | null>(null);
  const [activeYtVideo, setActiveYtVideo] = useState<YoutubeActiveVideo | null>(null);
  const [midpointAcked, setMidpointAcked] = useState(false);
  const [victoryDismissed, setVictoryDismissed] = useState(false);
  const [sessionLabel, setSessionLabel] = useState('');
  const [focusCount, setFocusCount] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(FOCUS_COUNT_KEY)) || 0;
    } catch {
      return 0;
    }
  });
  const [sessions, setSessions] = useState<StudySessionLog[]>(() => {
    try {
      const raw = localStorage.getItem(SESSIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    preloadTimerAssets();
  }, []);

  const pomoPhaseMins = (phase: 'focus' | 'shortBreak' | 'longBreak') =>
    phase === 'focus' ? 25 : phase === 'shortBreak' ? 5 : 15;

  const selectPomoPhase = (phase: 'focus' | 'shortBreak' | 'longBreak') => {
    setTimerRunning(false);
    setMidpointAcked(false);
    setVictoryDismissed(false);
    setPomoPhase(phase);
    setCountdownLeft(pomoPhaseMins(phase) * 60);
  };

  useEffect(() => {
    if (!timerRunning) return;
    const id = window.setInterval(() => {
      if (timerMode === 'countdown' || timerMode === 'pomodoro') {
        setCountdownLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setStopwatchElapsed((prev) => prev + 1);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerMode]);

  const applyPresetMinutes = (mins: number) => {
    setTimerRunning(false);
    setMidpointAcked(false);
    setVictoryDismissed(false);
    setTimerMode('countdown');
    setCustomMins(mins);
    setCountdownLeft(mins * 60);
  };

  const handleResetTimer = (keepFloating = false) => {
    setTimerRunning(false);
    setMidpointAcked(false);
    setVictoryDismissed(false);
    if (keepFloating) setFloatingPinned(true);
    if (timerMode === 'countdown') setCountdownLeft(customMins * 60);
    else if (timerMode === 'pomodoro') setCountdownLeft(pomoPhaseMins(pomoPhase) * 60);
    else setStopwatchElapsed(0);
  };

  const handleSaveSession = () => {
    const targetSecs =
      timerMode === 'pomodoro' ? pomoPhaseMins(pomoPhase) * 60 : customMins * 60;
    const studiedSecs =
      timerMode === 'stopwatch'
        ? stopwatchElapsed
        : Math.max(0, targetSecs - countdownLeft);
    if (studiedSecs < 10) return;

    const next: StudySessionLog[] = [
      {
        id: `ses_${Date.now().toString(36)}`,
        label: sessionLabel.trim() || 'Study Session',
        durationSeconds: studiedSecs,
        savedAt: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
      ...sessions,
    ].slice(0, 15);

    const nextCount = focusCount + 1;
    setSessions(next);
    setFocusCount(nextCount);
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
      localStorage.setItem(FOCUS_COUNT_KEY, String(nextCount));
    } catch {
      // ignore
    }
    handleResetTimer();
  };

  const deleteSession = (id: string) => {
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    try {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const toggleDarkMode = () => {
    setDarkMode((d) => {
      const next = !d;
      try {
        localStorage.setItem('ldoi_theme', next ? 'dark' : 'light');
      } catch {
        // ignore
      }
      return next;
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F4F0] flex items-center justify-center text-xs text-[#52525B]">
        Loading Iqra Desk...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
  }

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'timer') {
      setFloatingPinned(false);
    }
    if (tab !== 'matrix') {
      setActiveMatrixFolder(null);
    }
  };

  const targetMinsForProgress =
    timerMode === 'pomodoro' ? pomoPhaseMins(pomoPhase) : customMins;
  const hasTimerProgress =
    timerMode === 'countdown' || timerMode === 'pomodoro'
      ? countdownLeft < targetMinsForProgress * 60
      : stopwatchElapsed > 0;
  const showFloatingTimer =
    activeTab !== 'timer' && (timerRunning || hasTimerProgress || floatingPinned);
  const miniSeconds =
    timerMode === 'countdown' || timerMode === 'pomodoro' ? countdownLeft : stopwatchElapsed;
  const totalTarget = targetMinsForProgress * 60;
  const miniProgressPct =
    (timerMode === 'countdown' || timerMode === 'pomodoro') && totalTarget > 0
      ? ((totalTarget - countdownLeft) / totalTarget) * 100
      : ((stopwatchElapsed % 3600) / 3600) * 100;

  return (
    <div
      className={`relative min-h-screen md:h-screen md:overflow-hidden ios-desk-bg theme-smooth flex flex-col md:flex-row animate-workspace-enter ${
        darkMode ? 'dark-theme' : ''
      }`}
    >
      {/* Subtle Ambient Study Desk Doodles & Sparkles */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 overflow-hidden z-0 ${
          darkMode ? 'text-rose-200/15' : 'text-[#9B5B76]/20'
        }`}
      >
        <svg className="absolute top-8 right-12 w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14 9L21 11L14 13L12 20L10 13L3 11L10 9L12 2Z" />
        </svg>
        <svg className="absolute top-24 right-32 w-4 h-4 opacity-70" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14 9L21 11L14 13L12 20L10 13L3 11L10 9L12 2Z" />
        </svg>
        <svg className="absolute top-14 left-1/3 w-5 h-5 opacity-60" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14 9L21 11L14 13L12 20L10 13L3 11L10 9L12 2Z" />
        </svg>
        <svg className="absolute top-44 left-[22%] w-3.5 h-3.5 opacity-75" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14 9L21 11L14 13L12 20L10 13L3 11L10 9L12 2Z" />
        </svg>
        <svg className="absolute top-1/2 right-8 w-6 h-6 opacity-65" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14 9L21 11L14 13L12 20L10 13L3 11L10 9L12 2Z" />
        </svg>
        <svg className="absolute bottom-36 right-1/3 w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14 9L21 11L14 13L12 20L10 13L3 11L10 9L12 2Z" />
        </svg>
        <svg className="absolute bottom-14 right-14 w-9 h-9 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
          <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
          <line x1="6" y1="1" x2="6" y2="4" />
          <line x1="10" y1="1" x2="10" y2="4" />
          <line x1="14" y1="1" x2="14" y2="4" />
        </svg>
        <svg className="absolute bottom-24 left-1/3 w-6 h-6 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </div>

      {!(activeTab === 'matrix' && activeMatrixFolder) && (
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      )}

      <main className="relative flex-1 min-w-0 md:h-screen md:overflow-y-auto p-3 sm:p-5 lg:p-8 pb-24 md:pb-8">
        <div
          className={
            activeTab === 'youtube' || activeTab === 'dashboard'
              ? 'w-full md:h-full'
              : 'max-w-7xl mx-auto'
          }
        >
          {activeTab === 'dashboard' && (
            <DashboardView
              darkMode={darkMode}
              onNavigate={handleSelectTab}
              onOpenFolder={(folder) => {
                setActiveMatrixFolder(folder);
                setActiveTab('matrix');
              }}
              timerSeconds={miniSeconds}
              timerRunning={timerRunning}
              onToggleTimer={() => setTimerRunning((r) => !r)}
            />
          )}

          {activeTab === 'tracker' && <HabitTrackerView />}

          {activeTab === 'planner' && <StudyPlannerView />}

          {activeTab === 'timer' && (
            <TimerView
              mode={timerMode}
              setMode={(m) => {
                setTimerRunning(false);
                setMidpointAcked(false);
                setVictoryDismissed(false);
                setTimerMode(m);
                if (m === 'pomodoro') {
                  setPomoPhase('focus');
                  setCountdownLeft(25 * 60);
                } else if (m === 'countdown') {
                  setCountdownLeft(customMins * 60);
                }
              }}
              pomoPhase={pomoPhase}
              onSelectPomoPhase={selectPomoPhase}
              customMins={customMins}
              countdownLeft={countdownLeft}
              stopwatchElapsed={stopwatchElapsed}
              running={timerRunning}
              setRunning={setTimerRunning}
              applyPresetMinutes={applyPresetMinutes}
              handleReset={handleResetTimer}
              sessionLabel={sessionLabel}
              setSessionLabel={setSessionLabel}
              sessions={sessions}
              focusCount={focusCount}
              handleSaveSession={handleSaveSession}
              deleteSession={deleteSession}
              midpointAcked={midpointAcked}
              onMidpointAck={() => setMidpointAcked(true)}
              victoryDismissed={victoryDismissed}
              onVictoryDismiss={() => setVictoryDismissed(true)}
            />
          )}

          {activeTab === 'youtube' && (
            <YoutubeView
              initialVideo={activeYtVideo}
              onVideoChange={setActiveYtVideo}
            />
          )}

          {activeTab === 'matrix' && !activeMatrixFolder && (
            <StudyFoldersView onOpenFolder={(folder) => setActiveMatrixFolder(folder)} />
          )}

          {activeTab === 'matrix' && activeMatrixFolder && (
            <div className="fixed inset-0 z-30 matrix-clean-bg flex flex-col overflow-hidden">
              <div className="fixed top-4 left-4 z-40 flex items-center gap-2 paper-card rounded-full pl-1.5 pr-3.5 py-1.5 shadow-lg border border-[#E4E2DC] backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setActiveMatrixFolder(null)}
                  title="Back to Study Folders"
                  className="ios-press p-1.5 rounded-full bg-white/80 border border-[#E4E2DC] hover:border-[#18181B] text-[#18181B]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: activeMatrixFolder.color }}
                />
                <span className="text-xs font-semibold text-[#18181B]">
                  {activeMatrixFolder.name}
                </span>
              </div>

              <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleDarkMode}
                  title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  className="ios-press p-2 rounded-full paper-card border border-[#E4E2DC] text-[#18181B] shadow-lg"
                >
                  {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>

              <ProjectPinboard
                key={activeMatrixFolder.id}
                project={{
                  ...DEFAULT_MATRIX_PROJECT,
                  id: activeMatrixFolder.id,
                  title: activeMatrixFolder.name,
                }}
              />
            </div>
          )}

          {activeTab === 'notebooks' && <JournalView />}

          {activeTab === 'resources' && <ResourcesView />}
        </div>
      </main>

      {/* Floating Rotary Arc Timer Widget when active on other tabs */}
      {showFloatingTimer && (
        <FloatingTimerWidget
          seconds={miniSeconds}
          progressPct={miniProgressPct}
          running={timerRunning}
          sessionLabel={sessionLabel}
          onToggleRunning={() => setTimerRunning((r) => !r)}
          onRestart={() => handleResetTimer(true)}
          onLogSession={handleSaveSession}
          onDismiss={() => setFloatingPinned(false)}
          onOpenTimerTab={() => handleSelectTab('timer')}
          midpointAcked={midpointAcked}
          onMidpointAck={() => setMidpointAcked(true)}
          victoryDismissed={victoryDismissed}
          onVictoryDismiss={() => setVictoryDismissed(true)}
        />
      )}

      {/* Persistent YouTube Mini-Player when switching away from YouTube tab */}
      {activeTab !== 'youtube' && activeYtVideo && (
        <div className="fixed bottom-4 left-4 md:left-72 z-40 w-64 sm:w-72 paper-card rounded-2xl shadow-2xl border border-[#E2E0D8] overflow-hidden animate-workspace-enter">
          <div className="px-3 py-1.5 bg-[#A43850]/12 border-b border-[#E2E0D8] flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <Tv className="w-3.5 h-3.5 text-[#A43850] shrink-0" />
              <span className="text-[11px] font-bold text-[#1C1C1E] truncate">
                {activeYtVideo.title}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectTab('youtube')}
                title="Back to YouTube Player"
                className="p-1 rounded-md text-[#52525B] hover:text-[#1C1C1E] hover:bg-black/5"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setActiveYtVideo(null)}
                title="Close Mini-Player"
                className="p-1 rounded-md text-[#52525B] hover:text-red-600 hover:bg-black/5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="w-full aspect-video bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
                activeYtVideo.videoId
              )}?autoplay=1`}
              title={activeYtVideo.title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Low Battery Popup (<= 20% and unplugged) */}
      <LowBatteryPopup />
    </div>
  );
};

export function App() {
  return (
    <LdoiProvider>
      <WorkspaceShell />
    </LdoiProvider>
  );
}

export default App;
