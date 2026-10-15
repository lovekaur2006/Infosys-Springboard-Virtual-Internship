/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Play,
  Calendar,
  Layers,
  Sparkles,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { AgentConfig, ScenarioTemplate, ValidationResult } from '../types.ts';

interface ValidationPanelProps {
  validation: ValidationResult;
  scenario: ScenarioTemplate;
  agents: AgentConfig[];
  onStartNegotiation: () => void;
  onOpenCalendarModal: () => void;
  isCalendarConnected: boolean;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  validation,
  scenario,
  agents,
  onStartNegotiation,
  onOpenCalendarModal,
  isCalendarConnected,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Validation Score & Status */}
        <div className="space-y-3 max-w-xl">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-2xl font-bold text-sm shadow-xs ${
                validation.isValid
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
              }`}
            >
              {validation.score}%
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Configuration Validation
                </h3>
                {validation.isValid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Ready to Negotiate</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Action Required</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                All participant roles, individual goals, constraints, and personalities are mapped to the downstream Orchestrator Agent.
              </p>
            </div>
          </div>

          {/* Validation Checklist items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            {validation.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
              >
                {item.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                    {item.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Actions (Start Negotiation + Schedule in Google Calendar) */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-3 shrink-0">
          <button
            type="button"
            onClick={onStartNegotiation}
            disabled={!validation.isValid}
            className="cursor-pointer inline-flex items-center justify-center gap-2.5 px-7 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Start Negotiation</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenCalendarModal}
            className="cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Schedule Session on Calendar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
