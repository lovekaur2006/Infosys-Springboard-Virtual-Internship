/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CalendarUser } from '../services/authService.ts';
import {
  Sparkles,
  Layers,
  Calendar,
  Sliders,
  Play,
  RotateCcw,
} from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';

interface NavbarProps {
  user: CalendarUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isLoadingAuth: boolean;
  activeView: 'config' | 'negotiation';
  onSwitchView: (view: 'config' | 'negotiation') => void;
  onResetDefaults: () => void;
  onOpenCalendarModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignIn,
  onSignOut,
  isLoadingAuth,
  activeView,
  onSwitchView,
  onResetDefaults,
  onOpenCalendarModal,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & App Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                NegotiateAI
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                v2.4
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Scenario Selection & Agent Configuration Module
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onSwitchView('config')}
            className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'config'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configuration</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchView('negotiation')}
            className={`cursor-pointer flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeView === 'negotiation'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Live Arena</span>
          </button>
        </div>

        {/* Right Side: Google Calendar Auth & Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onResetDefaults}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors hidden md:flex items-center gap-1 text-xs font-medium"
            title="Reset to scenario defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <GoogleSignInButton
            user={user}
            onSignIn={onSignIn}
            onSignOut={onSignOut}
            isLoading={isLoadingAuth}
            onOpenCalendarModal={onOpenCalendarModal}
          />
        </div>
      </div>
    </header>
  );
};
