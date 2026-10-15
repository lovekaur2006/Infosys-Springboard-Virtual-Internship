/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Calendar, ExternalLink, Clock, RefreshCw, X, AlertCircle } from 'lucide-react';
import { GoogleCalendarEvent, listCalendarEvents } from '../services/calendarService.ts';

interface CalendarEventListModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  onOpenScheduleModal: () => void;
}

export const CalendarEventListModal: React.FC<CalendarEventListModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  onOpenScheduleModal,
}) => {
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listCalendarEvents(accessToken);
      setEvents(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch calendar events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && accessToken) {
      fetchEvents();
    }
  }, [isOpen, accessToken]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Google Calendar Sync</h3>
              <p className="text-xs text-slate-400">Scheduled sessions in your Google account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Synced Negotiations ({events.length})
            </span>
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <span>Fetching events from Google Calendar...</span>
            </div>
          ) : events.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs bg-slate-50 dark:bg-slate-800/40 rounded-xl p-6 border border-dashed border-slate-200 dark:border-slate-800">
              <Calendar className="w-8 h-8 mx-auto text-slate-400 mb-2 stroke-1" />
              <p className="font-medium text-slate-700 dark:text-slate-300">No scheduled sessions yet</p>
              <p className="mt-1 text-slate-500">
                Schedule a session for your configured scenario to sync it directly with Google Calendar.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenScheduleModal();
                }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs shadow-xs"
              >
                Schedule Session Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => {
                const startRaw = ev.start?.dateTime || ev.start?.date;
                const startDate = startRaw ? new Date(startRaw) : null;
                return (
                  <div
                    key={ev.id}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {ev.summary}
                      </h4>
                      {ev.htmlLink && (
                        <a
                          href={ev.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-blue-500 transition-colors"
                          title="Open in Google Calendar"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    {startDate && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>
                          {startDate.toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
