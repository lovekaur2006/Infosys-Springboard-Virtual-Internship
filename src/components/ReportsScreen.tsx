/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  FileText,
  Award,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AgentConfig, ScenarioTemplate, SettlementSummary } from '../types.ts';
import { generateSettlementSummary } from '../services/negotiationEngine.ts';

interface ReportsScreenProps {
  scenario: ScenarioTemplate;
  agents: AgentConfig[];
  onStartNegotiation: () => void;
  onOpenScheduleModal: () => void;
  isCalendarConnected: boolean;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  scenario,
  agents,
  onStartNegotiation,
  onOpenScheduleModal,
  isCalendarConnected,
}) => {
  const summary: SettlementSummary = generateSettlementSummary(scenario, agents);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Negotiation Simulation Reports
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Analytical summary of agreement terms, boundary compliance, and simulated outcome scorecards for{' '}
            <strong className="text-slate-800">{scenario.title}</strong>.
          </p>
        </div>

        <button
          onClick={onOpenScheduleModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors self-start"
        >
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>{isCalendarConnected ? 'Schedule in Google Cal' : 'Connect & Schedule'}</span>
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Settlement Status
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 capitalize">
            {summary.status}
          </div>
          <div className="text-xs text-emerald-600 font-semibold mt-1">
            Agreement reached within allowable zone
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Agreement Score
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-blue-600">
            {summary.agreementScore} / 100
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1">
            Mutual utility optimization rating
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Participating Agents
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900">
            {agents.length} Agents
          </div>
          <div className="text-xs text-slate-500 font-medium mt-1 truncate">
            {agents.map((a) => a.name).join(', ')}
          </div>
        </div>
      </div>

      {/* Agreed Key Terms & Constraint Compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Terms */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Agreed Contract Terms
          </div>

          <div className="divide-y divide-slate-100">
            {summary.keyTerms.map((term, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-800">{term.term}</div>
                  <div className="text-slate-500 mt-0.5">{term.agreedValue}</div>
                </div>
                <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {term.satisfaction}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Constraint Compliance */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            Agent Boundary Compliance
          </div>

          <div className="space-y-3">
            {summary.constraintCompliance.map((comp, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{comp.agentName}</span>
                  <span className="inline-flex items-center gap-1 font-bold text-[10px] text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Compliant
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">{comp.notes}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-2">
        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Executive Synthesis
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {summary.executiveSummary}
        </p>

        <div className="pt-4 flex justify-end">
          <button
            onClick={onStartNegotiation}
            className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <span>Run New Arena Simulation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
