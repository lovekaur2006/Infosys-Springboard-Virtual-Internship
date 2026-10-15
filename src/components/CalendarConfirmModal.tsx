/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, AlertCircle, Check, X, Clock, MapPin, Users } from 'lucide-react';
import { CalendarEventPayload } from '../services/calendarService.ts';

interface CalendarConfirmModalProps {
  isOpen: boolean;
  eventDetails: CalendarEventPayload | null;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export const CalendarConfirmModal: React.FC<CalendarConfirmModalProps> = ({
  isOpen,
  eventDetails,
  onConfirm,
  onCancel,
  isSubmitting,
}) => {
  if (!isOpen || !eventDetails) return null;

  const startDate = new Date(eventDetails.startDateTime);
  const endDate = new Date(eventDetails.endDateTime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">Confirm Calendar Scheduling</h3>
              <p className="text-xs text-blue-100">Permission verification before writing to Google Calendar</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="p-1 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
              With your permission, this action will create a new scheduled negotiation event in your primary
              Google Calendar. You can modify or remove it in your Google Calendar at any time.
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                Event Title
              </div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                {eventDetails.summary}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>
                  {startDate.toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                  {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                  {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>{eventDetails.location || 'NegotiateAI Virtual Room'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Agenda & Participants
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-300 max-h-32 overflow-y-auto whitespace-pre-line bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                {eventDetails.description}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="cursor-pointer inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Adding to Calendar...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Confirm & Add to Calendar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
