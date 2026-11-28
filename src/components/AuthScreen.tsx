import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, Moon, Sun } from 'lucide-react';
import { useLdoi } from '../context/LdoiContext';
import { LdoiLogo } from './LdoiLogo';

interface AuthScreenProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const DUMMY_PASSCODE = 'study123';
const DEFAULT_USER = 'Shajitha' as const;

export const AuthScreen: React.FC<AuthScreenProps> = ({
  darkMode,
  onToggleDarkMode,
}) => {
  const { signIn, quickLocalSignIn, syncMode } = useLdoi();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const triggerUnlockAnimation = (onDone: () => void) => {
    setUnlocking(true);
    window.setTimeout(() => {
      onDone();
    }, 450);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('Enter your password');
      return;
    }

    if (syncMode === 'local') {
      if (password !== DUMMY_PASSCODE) {
        setError('Incorrect password');
        return;
      }
      triggerUnlockAnimation(() => quickLocalSignIn(DEFAULT_USER));
      return;
    }

    setBusy(true);
    const email = `${DEFAULT_USER.toLowerCase()}@learninghub.local`;
    const res = await signIn(email, password);
    setBusy(false);
    if (res.error) {
      setError(res.error);
    }
  };

  return (
    <div className="relative min-h-[100dvh] flex flex-col justify-end p-4 sm:p-6 overflow-hidden bg-[#111317]">
      {/* Sunrise Layer (Day) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 login-workbench-day transition-opacity duration-500 ease-in-out"
        style={{ opacity: darkMode ? 0 : 1 }}
      />
      {/* Pinkish-Darker Sunset Layer (Night) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 login-workbench-bg transition-opacity duration-500 ease-in-out"
        style={{ opacity: darkMode ? 1 : 0 }}
      />

      {/* Bottom Glassmorphic Dock */}
      <div className="relative z-10 flex flex-col items-center gap-2 pb-1 sm:pb-3">
        {error && (
          <div className="px-3.5 py-1.5 text-[11px] font-semibold rounded-full text-[#FCA5A5] bg-[#DC2626]/30 border border-[#DC2626]/40 backdrop-blur-xl">
            {error}
          </div>
        )}

        <div
          className={`w-full sm:w-auto rounded-2xl px-3.5 py-2.5 backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 ${darkMode
            ? 'login-glass-card text-zinc-100'
            : 'login-glass-card-day text-[#23211E]'
            }`}
        >
          {unlocking ? (
            <div className="px-6 py-1.5 flex items-center justify-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#4D8B6F]" />
              <span className="text-xs font-bold">
                Opening Study Desk...
              </span>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-wrap items-center justify-between sm:justify-center gap-2.5 sm:gap-3"
            >
              {/* Brand */}
              <div className="flex items-center gap-2.5 pr-1">
                <LdoiLogo size={30} />
                <span className="text-xs font-bold tracking-tight whitespace-nowrap">
                  Iqra Desk
                </span>
              </div>

              {/* Password Input + Submit */}
              <div className="relative flex items-center flex-1 sm:flex-initial min-w-[170px]">
                <Lock
                  className={`w-3.5 h-3.5 absolute left-3 pointer-events-none ${darkMode ? 'text-zinc-400' : 'text-[#8C806E]'
                    }`}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Password..."
                  className={`w-full sm:w-44 pl-8 pr-9 py-1.5 text-xs rounded-xl focus:outline-none focus:ring-2 ${darkMode
                    ? 'bg-black/35 border border-white/15 text-white placeholder:text-zinc-400 focus:border-[#388BFD] focus:ring-[#388BFD]/25'
                    : 'bg-white/70 border border-white/80 text-[#23211E] placeholder:text-[#787065] focus:bg-white/90 focus:border-[#2E74B5]'
                    }`}
                />
                <button
                  type="submit"
                  disabled={busy}
                  title="Enter Study Desk"
                  className="ios-press absolute right-1 w-6 h-6 rounded-lg bg-[#2E74B5] hover:bg-[#3682C9] text-white flex items-center justify-center disabled:opacity-60"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Dark / Light (Sunrise / Sunset) Toggle inside the Bottom Bar */}
              <button
                type="button"
                onClick={onToggleDarkMode}
                title={darkMode ? 'Switch to Sunrise (Day)' : 'Switch to Sunset (Night)'}
                className={`ios-press p-2 rounded-xl border transition-colors ${darkMode
                  ? 'bg-white/10 border-white/15 text-zinc-200 hover:bg-white/20 hover:text-white'
                  : 'bg-white/60 border-white/80 text-[#23211E] hover:bg-white/90'
                  }`}
              >
                {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
