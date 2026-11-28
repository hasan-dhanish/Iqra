import React, { useEffect, useRef, useState } from 'react';
import {
  Battery,
  BatteryCharging,
  BookOpen,
  CheckCircle2,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Moon,
  Send,
  Sparkles,
  Sun,
  Timer,
  Tv,
  X,
  Zap,
} from 'lucide-react';
import { getMemberColor, getMemberInitials } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import { useBatteryStatus } from '../lib/useBatteryStatus';
import type { ActiveTab } from '../types';
import { LdoiLogo } from './LdoiLogo';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const NAV_ITEMS: {
  id: ActiveTab;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
    { id: 'dashboard', label: 'My Dashboard', color: '#0A5386', icon: LayoutDashboard },
    { id: 'tracker', label: 'Habit Tracker', color: '#133F47', icon: CheckCircle2 },
    { id: 'matrix', label: 'Folder Shelf', color: '#254454', icon: Layers },
    { id: 'timer', label: 'Focus Timer', color: '#9B5B76', icon: Timer },
    { id: 'youtube', label: 'Youtube', color: '#A43850', icon: Tv },
    { id: 'notebooks', label: 'Book Shelf', color: '#1B5E5A', icon: BookOpen },
    { id: 'resources', label: 'My Files', color: '#5B3A70', icon: Library },
  ];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  darkMode,
  onToggleDarkMode,
}) => {
  const { currentUser, signOut } = useLdoi();
  const battery = useBatteryStatus();
  const [spideyStage, setSpideyStage] = useState<'idle' | 'intro' | 'chat'>('idle');
  const spideyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (spideyTimerRef.current) window.clearTimeout(spideyTimerRef.current);
    };
  }, []);

  const handleSpideyClick = () => {
    if (spideyTimerRef.current) window.clearTimeout(spideyTimerRef.current);
    if (spideyStage !== 'idle') {
      setSpideyStage('idle');
      return;
    }
    setSpideyStage('intro');
    spideyTimerRef.current = window.setTimeout(() => {
      setSpideyStage('chat');
    }, 750);
  };

  const closeSpidey = () => {
    if (spideyTimerRef.current) window.clearTimeout(spideyTimerRef.current);
    setSpideyStage('idle');
  };

  return (
    <aside
      className={`no-print relative z-30 w-full md:w-64 md:my-4 md:ml-4 md:h-[calc(100vh-2rem)] md:sticky md:top-4 shrink-0 bg-white/70 backdrop-blur-2xl border-b md:border md:rounded-2xl flex flex-col justify-between overflow-visible ${darkMode
        ? 'md:border-white/10 md:shadow-[0_20px_48px_rgba(0,0,0,0.45)]'
        : 'border-white/60 md:border-[#E4E2DC] md:shadow-[0_18px_42px_rgba(24,24,27,0.10)]'
        }`}
    >
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-[#E2E0D8] flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <LdoiLogo size={36} />
            <div>
              <div className="text-sm font-bold text-[#1C1C1E] leading-tight">
                Iqra Desk
              </div>
              <div className="text-[11px] font-medium text-[#8E8E93]">
                Sajitha&apos;s Study Space
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {battery.supported && battery.pct !== null && (
              <span
                className={`md:hidden inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#E2E0D8] text-[10px] font-bold font-mono-num ${
                  battery.charging
                    ? 'text-emerald-600'
                    : battery.pct <= 20
                    ? 'text-red-500'
                    : 'text-[#52525B]'
                }`}
                title={battery.charging ? 'Charging' : 'On Battery'}
              >
                {battery.charging ? (
                  <Zap className="w-3 h-3 fill-current" />
                ) : (
                  <Battery className="w-3 h-3" />
                )}
                {battery.pct}%
              </span>
            )}
            <button
              type="button"
              onClick={onToggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="ios-press p-1.5 rounded-lg border border-[#E2E0D8] text-[#52525B] hover:text-[#1C1C1E]"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={signOut}
              title="Sign Out"
              className="md:hidden ios-press p-1.5 rounded-lg border border-[#E2E0D8] text-[#52525B] hover:text-red-600"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation with iOS App-Icon Squircles */}
        <nav className="p-3 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                style={
                  active
                    ? {
                      backgroundColor: `${item.color}28`,
                      borderColor: `${item.color}88`,
                    }
                    : undefined
                }
                className={`relative ios-press flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all ${active
                  ? 'shadow-2xs text-[#1C1C1E]'
                  : darkMode
                    ? 'border-transparent text-zinc-300 hover:bg-white/10 hover:text-white'
                    : 'border-transparent text-[#3A3A3C] hover:bg-[#E4E0D5] hover:text-[#18181B]'
                  }`}
              >
                {active && (
                  <img
                    key={activeTab}
                    src="/mascot-tab.png"
                    alt=""
                    aria-hidden="true"
                    className="bunny-jump-up hidden md:block pointer-events-none select-none absolute -top-[47px] right-9 h-12 w-auto drop-shadow-sm z-20"
                  />
                )}
                <span
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-white"
                  style={{ backgroundColor: item.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile Card (desktop/tablet sidebar) */}
      <div className="hidden md:block relative p-3 border-t border-[#E2E0D8]">
        {spideyStage === 'idle' && (
          <button
            type="button"
            onClick={handleSpideyClick}
            title="Click to summon Spidey AI Study Buddy"
            className="hidden md:block absolute -top-8.5 left-2 h-9 cursor-pointer transition-transform hover:scale-110 focus:outline-none z-20"
          >
            <img
              src="/spiderman-badge.png"
              alt="Spidey AI Mascot"
              className="h-9 w-auto drop-shadow-sm select-none"
            />
          </button>
        )}

        {/* Stage 1: Spiderman (1) Intro Pop-up */}
        {spideyStage === 'intro' && (
          <div className="hidden md:block absolute -top-24 left-2 z-30 pointer-events-none bunny-jump-up">
            <img
              src="/spiderman-wave.png"
              alt="Spidey AI arriving"
              className="h-24 w-auto drop-shadow-lg select-none"
            />
          </div>
        )}

        {/* Stage 2: Spiderman (3) Mascot in place + Active AI Chatbot Popover */}
        {spideyStage === 'chat' && (
          <>
            <button
              type="button"
              onClick={closeSpidey}
              title="Close Spidey AI"
              className="hidden md:block absolute -top-20 left-2 z-30 cursor-pointer focus:outline-none"
            >
              <img
                src="/spiderman-chat.png"
                alt="Spidey AI"
                className="h-20 w-auto drop-shadow-lg select-none"
              />
            </button>

            <div className="fixed bottom-20 left-4 md:absolute md:bottom-[76px] md:left-[94px] z-50 w-72 sm:w-80 spidey-chat-card rounded-2xl p-4 shadow-2xl animate-workspace-enter">
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E2E0D8]/70">
              <div className="flex items-center gap-2.5">
                <img
                  src="/spiderman-chat.png"
                  alt="Spidey AI"
                  className="h-12 w-auto drop-shadow-sm select-none shrink-0"
                />
                <div>
                  <div className="text-xs font-bold text-[#1C1C1E] flex items-center gap-1">
                    Spidey AI
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#9B5B76]/15 text-[#9B5B76]">
                      Soon
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8E8E93]">Iqra Desk Study Buddy</div>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSpidey}
                className="p-1 rounded-lg text-[#8E8E93] hover:text-[#1C1C1E]"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="py-3 space-y-2.5">
              <div className="p-2.5 rounded-xl bg-black/5 text-xs text-[#3A3A3C] leading-relaxed">
                Hey {currentUser?.name ?? 'Sajitha'}! Soon I&apos;ll help you summarize notes, quiz your syllabus, and plan exam prep.
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Summarize syllabus', 'Quiz me', 'Plan today'].map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border border-[#E2E0D8] text-[#6E6E73]"
                  >
                    <Sparkles className="w-2.5 h-2.5 text-[#9B5B76]" />
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative flex items-center pt-1">
              <input
                type="text"
                disabled
                placeholder="AI integration coming soon..."
                className="w-full pl-3 pr-9 py-2 text-xs rounded-xl border border-[#E2E0D8] bg-white/50 opacity-75 cursor-not-allowed"
              />
              <button
                type="button"
                disabled
                className="absolute right-1.5 w-6 h-6 rounded-lg bg-[#9B5B76]/60 text-white flex items-center justify-center cursor-not-allowed"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
          </>
        )}

        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{
                backgroundColor: currentUser ? getMemberColor(currentUser.name) : '#007AFF',
              }}
            >
              {currentUser ? getMemberInitials(currentUser.name) : 'LD'}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#1C1C1E] truncate">
                {currentUser?.name}
              </div>
              <div className="text-[10px] text-[#8E8E93] truncate">{currentUser?.email}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            title="Sign Out"
            className="ios-press p-1.5 rounded-lg text-[#636366] hover:text-[#FF3B30] hover:bg-[#F2F1EC]"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Live System Battery Bar */}
        {battery.supported && battery.pct !== null && (
          <div className="mt-2 px-2 py-1.5 rounded-xl bg-black/[0.04] space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold">
              <span className="inline-flex items-center gap-1 text-[#6E6E73]">
                {battery.charging ? (
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Battery
                    className={`w-3.5 h-3.5 ${
                      battery.pct <= 20 ? 'text-red-500' : 'text-[#52525B]'
                    }`}
                  />
                )}
                {battery.charging ? 'Charging' : battery.pct <= 20 ? 'Low Battery' : 'Battery'}
              </span>
              <span
                className={`font-mono-num font-bold ${
                  battery.charging
                    ? 'text-emerald-600'
                    : battery.pct <= 20
                    ? 'text-red-500'
                    : 'text-[#1C1C1E]'
                }`}
              >
                {battery.pct}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${battery.pct}%`,
                  backgroundColor: battery.charging
                    ? '#10B981'
                    : battery.pct <= 20
                    ? '#EF4444'
                    : battery.pct <= 50
                    ? '#F59E0B'
                    : '#0A84FF',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
