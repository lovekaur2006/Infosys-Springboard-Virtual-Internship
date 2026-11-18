/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Task 5 / Milestone 4 - Post-Interaction Analysis panel.
 * Shows the narrative summary, resolution score, sentiment journey timeline,
 * concession timeline and per-agent recommendations.
 */

import React from 'react';
import { Activity, AlertTriangle, Gauge, Lightbulb, ThumbsUp, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { PostInteractionSummary, ResolutionGrade, SentimentPoint } from '../services/postInteractionSummary.ts';
import { SCORE_WEIGHTS } from '../services/postInteractionSummary.ts';

const LINE_COLORS = ['#0f766e', '#7c3aed', '#d97706', '#e11d48'];

const GRADE_STYLES: Record<ResolutionGrade, { text: string; badge: string; stroke: string }> = {
  Excellent: { text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', stroke: '#059669' },
  Good: { text: 'text-teal-700', badge: 'bg-teal-50 text-teal-700 border-teal-200', stroke: '#0f766e' },
  Fair: { text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700 border-amber-200', stroke: '#d97706' },
  Poor: { text: 'text-rose-700', badge: 'bg-rose-50 text-rose-700 border-rose-200', stroke: '#e11d48' },
};

const SENTIMENT_LABEL: Record<SentimentPoint['sentiment'], string> = {
  collaborative: 'Collaborative',
  assertive: 'Assertive',
  defensive: 'Defensive',
  mediating: 'Mediating',
};

export const ScoreGauge: React.FC<{ score: number; grade: ResolutionGrade }> = ({ score, grade }) => {
  const r = 46;
  const c = 2 * Math.PI * r;
  const style = GRADE_STYLES[grade];
  return (
    <div className="relative h-32 w-32 shrink-0" role="img" aria-label={`Resolution score ${score} out of 100, ${grade}`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={style.stroke} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black ${style.text}`}>{score}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">/ 100</span>
      </div>
    </div>
  );
};

const BreakdownBar: React.FC<{ label: string; value: number; weight?: string }> = ({ label, value, weight }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
      <span>{label}{weight && <span className="ml-1 text-slate-400">({weight})</span>}</span>
      <span>{value}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  </div>
);

export const SentimentChart: React.FC<{ journey: SentimentPoint[] }> = ({ journey }) => {
  const W = 640, H = 230, L = 38, R = 14, T = 14, B = 30;
  const n = journey.length;
  if (n === 0) return <div className="text-xs text-slate-400">No turns recorded.</div>;
  const x = (i: number) => L + (n === 1 ? (W - L - R) / 2 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / 100) * (H - T - B);
  const agents = Array.from(new Set(journey.filter((p) => !p.isMediator).map((p) => p.agentName)));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sentiment journey: cooperation index per turn">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#e2e8f0" strokeDasharray={g === 50 ? '0' : '3 3'} />
            <text x={L - 6} y={y(g) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{g}</text>
          </g>
        ))}
        {journey.map((p) => p.isMediator && (
          <g key={`m-${p.turnIndex}`}>
            <line x1={x(p.turnIndex)} x2={x(p.turnIndex)} y1={T} y2={H - B} stroke="#94a3b8" strokeDasharray="4 3" />
            <text x={x(p.turnIndex)} y={T + 9} textAnchor="middle" fontSize="9" fill="#64748b">Mediator</text>
          </g>
        ))}
        {agents.map((name, ai) => {
          const pts = journey.filter((p) => p.agentName === name && !p.isMediator);
          const color = LINE_COLORS[ai % LINE_COLORS.length];
          return (
            <g key={name}>
              <polyline fill="none" stroke={color} strokeWidth="2" points={pts.map((p) => `${x(p.turnIndex)},${y(p.cooperation)}`).join(' ')} />
              {pts.map((p) => (
                <circle key={p.turnIndex} cx={x(p.turnIndex)} cy={y(p.cooperation)} r="4" fill="#fff" stroke={color} strokeWidth="2">
                  <title>{`${name} - turn ${p.turnIndex + 1} (round ${p.round}): ${SENTIMENT_LABEL[p.sentiment]}, cooperation ${p.cooperation}, leverage ${p.leverage}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {journey.map((p) => (
          <text key={`t-${p.turnIndex}`} x={x(p.turnIndex)} y={H - 12} textAnchor="middle" fontSize="9" fill="#94a3b8">{p.turnIndex + 1}</text>
        ))}
        <text x={(L + W - R) / 2} y={H - 1} textAnchor="middle" fontSize="9" fill="#94a3b8">Turn</text>
      </svg>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-600">
        {agents.map((name, ai) => (
          <span key={name} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-4 rounded-full" style={{ backgroundColor: LINE_COLORS[ai % LINE_COLORS.length] }} />
            {name}
          </span>
        ))}
        <span className="text-slate-400">Cooperation index: collaborative 80, mediating 60, assertive 45, defensive 25</span>
      </div>
    </div>
  );
};

const TrendBadge: React.FC<{ trend: PostInteractionSummary['cooperationTrend'] }> = ({ trend }) => {
  const map = {
    improving: { icon: <TrendingUp className="h-3.5 w-3.5" />, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    stable: { icon: <Minus className="h-3.5 w-3.5" />, cls: 'bg-slate-50 text-slate-600 border-slate-200' },
    deteriorating: { icon: <TrendingDown className="h-3.5 w-3.5" />, cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  }[trend];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold capitalize ${map.cls}`}>
      {map.icon} Cooperation {trend}
    </span>
  );
};

export const PostInteractionPanel: React.FC<{ summary: PostInteractionSummary }> = ({ summary }) => {
  const grade = GRADE_STYLES[summary.resolutionGrade];
  const b = summary.scoreBreakdown;
  const pctW = (w: number) => `${Math.round(w * 100)}%`;

  return (
    <section className="pn-report-section space-y-6" aria-label="Post-interaction analysis">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">
        <Activity className="h-4 w-4" /> Post-interaction analysis
      </div>

      {/* Score + narrative */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <ScoreGauge score={summary.resolutionScore} grade={summary.resolutionGrade} />
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><Gauge className="h-4 w-4 text-teal-700" /> Resolution quality</span>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${grade.badge}`}>{summary.resolutionGrade}</span>
                <TrendBadge trend={summary.cooperationTrend} />
              </div>
              <p className="text-xs leading-relaxed text-slate-600">{summary.narrative}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
                <span>{summary.mode === 'interactive' ? 'Practice Mode' : 'Simulation Mode'}</span>
                <span>{summary.roundsUsed}/{summary.maxRounds} rounds</span>
                <span>{summary.totalTurns} turns</span>
                <span>{summary.mediatorInterventions} mediator interventions</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="text-sm font-bold text-slate-900">Score breakdown</div>
          <BreakdownBar label="Agreement reached" value={b.agreement} weight={pctW(SCORE_WEIGHTS.agreement)} />
          <BreakdownBar label="Goal achievement" value={b.goals} weight={pctW(SCORE_WEIGHTS.goals)} />
          <BreakdownBar label="Outcome balance" value={b.balance} weight={pctW(SCORE_WEIGHTS.balance)} />
          <BreakdownBar label="Efficiency" value={b.efficiency} weight={pctW(SCORE_WEIGHTS.efficiency)} />
          {b.deadlockPenalty > 0 && <div className="text-[11px] font-semibold text-rose-600">Deadlock penalty: -{b.deadlockPenalty}</div>}
        </div>
      </div>

      {/* Sentiment journey */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
        <div className="mb-3 text-sm font-bold text-slate-900">Sentiment journey</div>
        <SentimentChart journey={summary.sentimentJourney} />
      </div>

      {/* Concession timeline */}
      {summary.concessionTimeline.length > 0 && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
          <div className="mb-3 text-sm font-bold text-slate-900">Concession timeline</div>
          <ol className="space-y-2.5">
            {summary.concessionTimeline.map((c, i) => (
              <li key={i} className="flex gap-3 text-xs">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[10px] font-black text-teal-700">{c.round}</span>
                <span><strong className="text-slate-800">{c.agentName}:</strong> <span className="text-slate-600">{c.note}</span></span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Per-agent reviews */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {summary.agentReviews.map((r) => (
          <div key={r.agentId} className="space-y-4 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">{r.agentName}</div>
                <div className="text-[11px] text-slate-500">{r.roleTitle} · {r.personality}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-black text-teal-700">{r.goalAchievement}%</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Goals met</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="rounded-xl bg-slate-50 p-2"><div className="font-black text-slate-800">{r.concessionsMade}</div><div className="text-slate-500">Concessions</div></div>
              <div className="rounded-xl bg-slate-50 p-2"><div className="font-black text-slate-800">{r.reciprocityRatio}</div><div className="text-slate-500">Reciprocity</div></div>
              <div className="rounded-xl bg-slate-50 p-2"><div className="font-black text-slate-800">{r.avgCooperation}</div><div className="text-slate-500">Cooperation</div></div>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {r.strengths.map((s, i) => <li key={`s${i}`} className="flex gap-2"><ThumbsUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />{s}</li>)}
              {r.weaknesses.map((s, i) => <li key={`w${i}`} className="flex gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />{s}</li>)}
              {r.improvements.map((s, i) => <li key={`i${i}`} className="flex gap-2"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-600" />{s}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};
