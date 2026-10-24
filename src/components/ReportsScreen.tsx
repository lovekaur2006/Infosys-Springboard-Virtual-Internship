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
  Download,
} from 'lucide-react';
import { AgentConfig, ScenarioTemplate, SettlementSummary } from '../types.ts';
import { generateSettlementSummary } from '../services/negotiationEngine.ts';
import { CalendarEventPayload } from '../services/calendarService.ts';

interface ReportsScreenProps {
  scenario: ScenarioTemplate;
  agents: AgentConfig[];
  scheduledEvent: CalendarEventPayload | null;
  onStartNegotiation: () => void;
  onOpenScheduleModal: () => void;
  isCalendarConnected: boolean;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  scenario,
  agents,
  scheduledEvent,
  onStartNegotiation,
  onOpenScheduleModal,
  isCalendarConnected,
}) => {
  const summary: SettlementSummary = generateSettlementSummary(scenario, agents);
  const reportDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const scheduledStart = scheduledEvent ? new Date(scheduledEvent.startDateTime) : null;
  const scheduledEnd = scheduledEvent ? new Date(scheduledEvent.endDateTime) : null;
  const hasValidSchedule = Boolean(
    scheduledStart && scheduledEnd &&
    !Number.isNaN(scheduledStart.getTime()) && !Number.isNaN(scheduledEnd.getTime())
  );
  const sessionDate = hasValidSchedule
    ? scheduledStart!.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'No date scheduled';
  const sessionTime = hasValidSchedule
    ? `${scheduledStart!.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })} to ${scheduledEnd!.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}`
    : 'Schedule a session to include its time in this report';

  const downloadPdf = () => {
    const previousTitle = document.title;
    const reportTitle = `${scenario.title} - Negotiation Report`;
    document.title = reportTitle;
    window.addEventListener('afterprint', () => {
      document.title = previousTitle;
    }, { once: true });
    window.print();
  };

  return (
    <div className="pn-page space-y-8 animate-in fade-in duration-200">
      {/* Title */}
      <div className="pn-report-heading flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Outcome brief / Settlement review</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            The deal, at a glance.
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Analytical summary of agreement terms, boundary compliance, and simulated outcome scorecards for{' '}
            <strong className="text-slate-800">{scenario.title}</strong>.
          </p>
        </div>

        <div className="pn-report-actions flex flex-wrap items-center gap-2 self-start">
          <button
            type="button"
            onClick={downloadPdf}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition-colors hover:border-indigo-200 hover:text-indigo-700"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
          <button
            onClick={onOpenScheduleModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-100 transition-colors"
          >
            <Calendar className="w-4 h-4 text-teal-700" />
            <span>{isCalendarConnected ? 'Schedule in Google Cal' : 'Connect & Schedule'}</span>
          </button>
        </div>
      </div>

      <div className={`pn-report-session ${hasValidSchedule ? 'is-scheduled' : 'is-unscheduled'}`}>
        <span className="pn-report-session-icon"><Calendar className="h-4 w-4" /></span>
        <div className="pn-report-session-copy">
          <span className="pn-report-session-label">Negotiation session</span>
          <strong>{hasValidSchedule ? scheduledEvent?.summary : 'No session scheduled'}</strong>
          <span>{sessionDate} <i>/</i> {sessionTime}</span>
          {hasValidSchedule && scheduledEvent?.location && <small>{scheduledEvent.location}</small>}
        </div>
        <span className="pn-report-session-state">{hasValidSchedule ? 'SCHEDULED' : 'PENDING'}</span>
      </div>

      {/* Top Metric Cards */}
      <div className="pn-report-metrics grid grid-cols-1 sm:grid-cols-3 gap-5">
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
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-teal-700">
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
      <div className="pn-report-sections grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Key Terms */}
        <div className="pn-report-section pn-report-terms bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
          <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-700" />
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
        <div className="pn-report-section pn-report-compliance bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4">
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
      <div className="pn-report-section pn-report-executive bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-2">
        <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-teal-700" />
          Executive Synthesis
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          {summary.executiveSummary}
        </p>

        <div className="pt-4 flex justify-end">
          <button
            onClick={onStartNegotiation}
            className="py-2.5 px-5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
          >
            <span>Run New Arena Simulation</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="pn-pdf-footer" aria-hidden="true">
        <span>PARLEYNET / CONFIDENTIAL NEGOTIATION SUMMARY</span>
        <span>PREPARED {reportDate.toUpperCase()}</span>
      </div>

      <article className="pn-export-doc" aria-hidden="true">
        <header className="pn-export-topline">
          <div className="pn-export-brand"><b>PN</b><span>PARLEYNET<small>NEGOTIATION INTELLIGENCE</small></span></div>
          <div className="pn-export-doc-type">OUTCOME REPORT <i>/</i> {reportDate.toUpperCase()}</div>
        </header>

        <section className="pn-export-cover">
          <div className="pn-export-cover-copy">
            <span className="pn-export-kicker">NEGOTIATION OUTCOME REPORT</span>
            <h1>{scenario.title}</h1>
            <p>{scenario.shortDescription}</p>
            <div className="pn-export-tags"><span>{scenario.category}</span><span>{scenario.complexity} complexity</span></div>
          </div>
          <div className="pn-export-score-seal"><small>AGREEMENT</small><b>{summary.agreementScore}</b><span>OUT OF 100</span></div>
        </section>

        <section className={`pn-export-session ${hasValidSchedule ? 'is-scheduled' : ''}`}>
          <div className="pn-export-session-symbol"><Calendar className="h-4 w-4" /></div>
          <div className="pn-export-session-main">
            <span className="pn-export-label">NEGOTIATION SESSION</span>
            <strong>{hasValidSchedule ? scheduledEvent?.summary : 'No session scheduled'}</strong>
            <span>{sessionDate} <i>/</i> {sessionTime}</span>
            {hasValidSchedule && scheduledEvent?.location && <small>{scheduledEvent.location}</small>}
          </div>
          <b className="pn-export-session-status">{hasValidSchedule ? 'SCHEDULED' : 'PENDING'}</b>
        </section>

        <section className="pn-export-snapshot">
          <div><span className="pn-export-label">SETTLEMENT</span><b className="pn-export-status">{summary.status}</b><small>Final outcome</small></div>
          <div><span className="pn-export-label">AGREEMENT SCORE</span><b>{summary.agreementScore}<small> / 100</small></b><small>Mutual utility rating</small></div>
          <div><span className="pn-export-label">PARTICIPANTS</span><b>{agents.length}<small> parties</small></b><small>{agents.map((agent) => agent.name).join(' / ')}</small></div>
        </section>

        <div className="pn-export-grid">
          <section className="pn-export-panel pn-export-terms">
            <div className="pn-export-section-head"><span>01</span><h2>Agreed terms</h2></div>
            <div className="pn-export-table-head"><span>TERM</span><span>AGREED OUTCOME</span><span>RATING</span></div>
            {summary.keyTerms.map((term, index) => (
              <div className="pn-export-term-row" key={`${term.term}-${index}`}>
                <b>{term.term}</b><span>{term.agreedValue}</span><em>{term.satisfaction}</em>
              </div>
            ))}
          </section>

          <section className="pn-export-panel pn-export-compliance">
            <div className="pn-export-section-head"><span>02</span><h2>Boundary review</h2></div>
            {summary.constraintCompliance.map((item, index) => (
              <div className="pn-export-compliance-row" key={`${item.agentName}-${index}`}>
                <div><b>{item.agentName}</b><em className={item.compliant ? 'is-compliant' : 'is-not-compliant'}>{item.compliant ? 'COMPLIANT' : 'REVIEW'}</em></div>
                <p>{item.notes}</p>
              </div>
            ))}
          </section>
        </div>

        <section className="pn-export-synthesis">
          <div className="pn-export-section-head"><span>03</span><h2>Executive synthesis</h2></div>
          <p>{summary.executiveSummary}</p>
        </section>

        <footer className="pn-export-footer">
          <span>PARLEYNET <i>/</i> CONFIDENTIAL NEGOTIATION SUMMARY</span>
          <span>PREPARED {reportDate.toUpperCase()}</span>
        </footer>
      </article>
    </div>
  );
};
