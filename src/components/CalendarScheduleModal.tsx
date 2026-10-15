/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, X, Users, Sparkles, Send } from 'lucide-react';
import { AgentConfig, ScenarioTemplate } from '../types.ts';
import { CalendarEventPayload } from '../services/calendarService.ts';

interface CalendarScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: ScenarioTemplate;
  agents: AgentConfig[];
  onTriggerConfirmation: (event: CalendarEventPayload) => void;
}

function localDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const CalendarScheduleModal: React.FC<CalendarScheduleModalProps> = ({
  isOpen,
  onClose,
  scenario,
  agents,
  onTriggerConfirmation,
}) => {
  const [date, setDate] = useState(() => localDatePlusDays(1));
  const [time, setTime] = useState('10:00');
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [meetingTitle, setMeetingTitle] = useState(
    `NegotiateAI Session: ${scenario.title}`
  );
  const [location, setLocation] = useState('Google Meet / NegotiateAI Virtual Room');

  useEffect(() => {
    if (!isOpen) return;
    setDate(localDatePlusDays(1));
    setTime('10:00');
    setDurationMinutes(45);
    setMeetingTitle(`NegotiateAI Session: ${scenario.title}`);
    setLocation('Google Meet / NegotiateAI Virtual Room');
  }, [isOpen, scenario.title]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const timePart = time.length === 5 ? `${time}:00` : time;
    const startDateTime = new Date(`${date}T${timePart}`);
    if (Number.isNaN(startDateTime.getTime())) {
      return;
    }
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    const description = [
      `🤖 NegotiateAI Scenario: ${scenario.title}`,
      `Category: ${scenario.category} (${scenario.complexity} complexity)`,
      `Orchestrator: ${scenario.orchestrator.name} (${scenario.orchestrator.roleTitle})`,
      '',
      '👥 Participating AI Agents & Configured Personalities:',
      ...agents.map(
        (a) =>
          `• ${a.name} (${a.roleTitle}) - Personality: ${a.personality}\n  Target: ${a.targetMetric}\n  Primary Goal: ${a.primaryGoal}`
      ),
      '',
      '🎯 Key Agenda & Objectives:',
      ...scenario.orchestrator.arbitrationRules.map((rule, idx) => `${idx + 1}. ${rule}`),
      '',
      `Generated via Google AI Studio NegotiateAI Module.`,
    ].join('\n');

    onTriggerConfirmation({
      summary: meetingTitle,
      description,
      location,
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Schedule on Google Calendar</h3>
              <p className="text-xs text-slate-400">Lock in your multi-agent negotiation session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Event Title
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              >
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes (Recommended)</option>
                <option value={60}>60 Minutes</option>
                <option value={90}>90 Minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Location / Virtual Room
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Configured Session Attendees ({agents.length} Agents)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {agents.map((a) => (
                <span
                  key={a.id}
                  className="px-2 py-0.5 text-[11px] font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300"
                >
                  {a.name} ({a.personality})
                </span>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="cursor-pointer inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Continue to Confirmation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
