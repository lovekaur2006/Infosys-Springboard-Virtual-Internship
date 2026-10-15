/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Home,
  Layers,
  SlidersHorizontal,
  Play,
  FileText,
  Bot,
  Calendar,
  LogOut,
  LogIn,
  ChevronRight,
} from 'lucide-react';
import { CalendarUser } from '../services/authService.ts';

export type NavTab = 'home' | 'scenarios' | 'config' | 'review' | 'negotiation' | 'reports';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: CalendarUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isLoadingAuth: boolean;
  onOpenCalendarEvents: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onSignIn,
  onSignOut,
  isLoadingAuth,
  onOpenCalendarEvents,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="w-4 h-4" />,
    },
    {
      id: 'scenarios',
      label: 'Select Scenario',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 'config',
      label: 'Configure Agents',
      icon: <SlidersHorizontal className="w-4 h-4" />,
    },
    {
      id: 'negotiation',
      label: 'Start Negotiation',
      icon: <Play className="w-4 h-4 fill-current" />,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <FileText className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 bg-[#0A1628] text-slate-300 flex flex-col justify-between shrink-0 min-h-screen border-r border-slate-800/80 select-none shadow-xl">
      {/* Top Branding */}
      <div>
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-tight leading-tight">
                Multi-Agent
              </div>
              <div className="text-[11px] font-medium text-slate-400">
                Negotiation Simulator
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const isActive =
              activeTab === item.id ||
              (item.id === 'config' && activeTab === 'review');

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Better Negotiation & Auth */}
      <div className="p-4 border-t border-slate-800/80 space-y-4">
        {/* Google Calendar Integration Button / State */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Calendar Sync
            </span>
            {user ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/20" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-600" />
            )}
          </div>

          {user ? (
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={onOpenCalendarEvents}
                className="text-[11px] font-medium text-blue-400 hover:text-blue-300 truncate max-w-[120px] text-left underline decoration-dotted"
                title="View scheduled events"
              >
                View calendar
              </button>
              <button
                onClick={onSignOut}
                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              disabled={isLoadingAuth}
              className="w-full mt-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-3 h-3 text-blue-400" />
              {isLoadingAuth ? 'Connecting...' : 'Connect Google Cal'}
            </button>
          )}
        </div>

        {/* Mascot / Slogan from image */}
        <div className="flex items-center gap-2.5 px-2 py-1 text-slate-400">
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-blue-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-200">
              Better Negotiation
            </div>
            <div className="text-[10px] text-slate-400">Better Decisions</div>
          </div>
        </div>
      </div>
    </aside>
  );
};
