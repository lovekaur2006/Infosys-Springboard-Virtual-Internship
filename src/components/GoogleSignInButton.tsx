/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CalendarUser } from '../services/authService.ts';
import { Calendar, CheckCircle2, LogOut } from 'lucide-react';

interface GoogleSignInButtonProps {
  user: CalendarUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  isLoading: boolean;
  onOpenCalendarModal?: () => void;
  onDemoSignIn?: () => void;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  user,
  onSignIn,
  onSignOut,
  isLoading,
  onOpenCalendarModal,
  onDemoSignIn,
}) => {
  if (user) {
    const isDemo = user.email?.includes('infosys-springboard.org');
    return (
      <div className="flex items-center gap-2">
        {onOpenCalendarModal && (
          <button
            onClick={onOpenCalendarModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            title="View Scheduled Calendar Events"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>{isDemo ? 'Demo Calendar Active' : 'Google Calendar Active'}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </button>
        )}

        <div className="flex items-center gap-2 pl-2 pr-1 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'User'}
              className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </div>
          )}
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
            {user.displayName || user.email}
          </span>
          <button
            onClick={onSignOut}
            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onSignIn}
        disabled={isLoading}
        type="button"
        className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg shadow-xs transition-all disabled:opacity-50"
        title="Sign in with Google to sync directly to your real Google Calendar"
      >
        {/* Official Google Brand Icon */}
        <svg
          className="w-4 h-4 flex-shrink-0"
          viewBox="0 0 48 48"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
        <span>{isLoading ? 'Connecting...' : 'Connect Calendar'}</span>
      </button>

      {onDemoSignIn && (
        <button
          onClick={onDemoSignIn}
          type="button"
          className="cursor-pointer px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
          title="Test without Google Cloud OAuth credentials"
        >
          Demo Mode
        </button>
      )}
    </div>
  );
};
