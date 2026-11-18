/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Task 5 / Milestone 4 - Performance Analytics Dashboard (multi-session insights).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart3, CheckCircle2, Database, Download, FileText, Lightbulb, Play, Printer, Trash2, Wand2,
} from 'lucide-react';
import { analyticsToMarkdown, buildAnalytics, sessionsToCsv, SessionRecord, TrendPoint } from '../services/analyticsEngine.ts';
import { fetchAnalyticsSessions } from '../services/apiService.ts';
import { clearLocalSessions, loadLocalSessions, mergeSessions, saveLocalSessions } from '../services/sessionStore.ts';
import { generateDemoSessions } from '../services/demoDataGenerator.ts';

interface AnalyticsDashboardProps {
  userEmail: string | null;
  onStartNegotiation: () => void;
}

const download = (filename: string, content: string, type: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const Card: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
  <div className={`pn-report-section rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs ${className}`}>
    <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">{icon}{title}</div>
    {children}
  </div>
);

const Kpi: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
    <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
    {hint && <div className="mt-1 text-xs font-medium text-slate-500">{hint}</div>}
  </div>
);

const HBar: React.FC<{ label: string; value: number; right: string; color?: string }> = ({ label, value, right, color = 'bg-teal-600' }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700">
      <span className="truncate">{label}</span>
      <span className="shrink-0 text-slate-500">{right}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  </div>
);

const TrendChart: React.FC<{ points: TrendPoint[] }> = ({ points }) => {
  const W = 640, H = 220, L = 36, R = 12, T = 12, B = 26;
  const data = points.slice(-40);
  const n = data.length;
  if (n === 0) return null;
  const x = (i: number) => L + (n === 1 ? (W - L - R) / 2 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / 100) * (H - T - B);
  const line = (key: 'resolutionScore' | 'agreementScore') => data.map((p, i) => `${x(i)},${y(p[key])}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Resolution and agreement score trend by session">
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={L - 6} y={y(g) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">{g}</text>
          </g>
        ))}
        <polyline fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" points={line('agreementScore')} />
        <polyline fill="none" stroke="#0f766e" strokeWidth="2" points={line('resolutionScore')} />
        {data.map((p, i) => (
          <circle key={p.index} cx={x(i)} cy={y(p.resolutionScore)} r="3.5" fill={p.status === 'settled' ? '#059669' : '#e11d48'} stroke="#fff" strokeWidth="1">
            <title>{`Session ${p.index} - ${p.scenarioTitle}: ${p.status}, resolution ${p.resolutionScore}, agreement ${p.agreementScore}`}</title>
          </circle>
        ))}
        <text x={(L + W - R) / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">Session (oldest to newest)</text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-4 text-[11px] font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 bg-teal-700" /> Resolution score</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 border-t border-dashed border-slate-400" /> Agreement score</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Settled</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-600" /> Impasse</span>
      </div>
    </div>
  );
};

const INSIGHT_STYLE = {
  challenge: { icon: <AlertTriangle className="h-4 w-4 text-amber-600" />, cls: 'bg-amber-50 border-amber-200' },
  recommendation: { icon: <Lightbulb className="h-4 w-4 text-indigo-600" />, cls: 'bg-indigo-50 border-indigo-200' },
  positive: { icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, cls: 'bg-emerald-50 border-emerald-200' },
} as const;

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userEmail, onStartNegotiation }) => {
  const [remote, setRemote] = useState<SessionRecord[]>([]);
  const [local, setLocal] = useState<SessionRecord[]>(() => loadLocalSessions());
  const [loading, setLoading] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);

  useEffect(() => {
    if (!userEmail) return;
    let cancelled = false;
    setLoading(true);
    fetchAnalyticsSessions(userEmail)
      .then((rows) => { if (!cancelled) { setRemote(rows); setApiUnavailable(false); } })
      .catch(() => { if (!cancelled) setApiUnavailable(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userEmail]);

  const sessions = useMemo(() => mergeSessions(remote, local), [remote, local]);
  const report = useMemo(() => buildAnalytics(sessions), [sessions]);
  const t = report.totals;

  const loadDemo = () => {
    const demo = generateDemoSessions();
    saveLocalSessions(demo);
    setLocal(loadLocalSessions());
  };
  const clearLocal = () => {
    clearLocalSessions();
    setLocal([]);
  };

  const recent = [...sessions].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);

  return (
    <div className="pn-page space-y-8 animate-in fade-in duration-200">
      <div className="pn-report-heading flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">Performance analytics / Multi-session insights</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">How your negotiations are going.</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Trends, recurring deadlock triggers and agent performance across {t.sessions} session{t.sessions === 1 ? '' : 's'}.
          </p>
        </div>
        <div className="pn-report-actions flex flex-wrap items-center gap-2 self-start">
          <button type="button" onClick={loadDemo} className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-800 hover:bg-teal-100">
            <Wand2 className="h-4 w-4" /> Load demo data
          </button>
          <button type="button" disabled={!t.sessions} onClick={() => download('negotiation-sessions.csv', sessionsToCsv(sessions), 'text/csv')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-indigo-200 disabled:opacity-40">
            <Download className="h-4 w-4" /> CSV
          </button>
          <button type="button" disabled={!t.sessions} onClick={() => download('analytics-report.md', analyticsToMarkdown(report), 'text/markdown')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-indigo-200 disabled:opacity-40">
            <FileText className="h-4 w-4" /> Report
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-indigo-200">
            <Printer className="h-4 w-4" /> PDF
          </button>
          {local.length > 0 && (
            <button type="button" onClick={clearLocal} title="Clear sessions stored in this browser" className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
        <Database className="h-3.5 w-3.5" />
        {loading ? 'Loading saved sessions...' : `${remote.length} from database, ${local.length} stored in this browser`}
        {apiUnavailable && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">Database API unavailable, showing local sessions only (run npm run dev:stack)</span>}
      </div>

      {t.sessions === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <BarChart3 className="mx-auto h-8 w-8 text-slate-300" />
          <div className="mt-3 text-sm font-bold text-slate-800">No completed negotiations yet</div>
          <p className="mt-1 text-xs text-slate-500">Finish a negotiation, or load demo data to preview the dashboard.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={onStartNegotiation} className="inline-flex items-center gap-2 rounded-xl bg-[#101a32] px-4 py-2.5 text-xs font-bold text-white"><Play className="h-4 w-4" /> Start negotiation</button>
            <button onClick={loadDemo} className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-xs font-bold text-teal-800"><Wand2 className="h-4 w-4" /> Load demo data</button>
          </div>
        </div>
      ) : (
        <>
          <div className="pn-report-metrics grid grid-cols-2 gap-5 lg:grid-cols-4">
            <Kpi label="Agreement rate" value={`${t.agreementRate}%`} hint={`${t.settled} settled / ${t.impasse} impasse`} />
            <Kpi label="Avg resolution score" value={`${t.avgResolutionScore}/100`} hint="Goals, balance, efficiency" />
            <Kpi label="Avg rounds" value={`${t.avgRounds}`} hint="Lower means more efficient" />
            <Kpi label="Needed mediation" value={`${t.sessionsWithDeadlock}`} hint={`${t.avgConcessionsPerSession} concessions / session`} />
          </div>

          <Card title="Score trend" icon={<BarChart3 className="h-4 w-4 text-teal-700" />}>
            <TrendChart points={report.trend} />
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Agreement rate by scenario">
              <div className="space-y-4">
                {report.byScenario.map((g) => (
                  <HBar key={g.key} label={g.label} value={g.agreementRate} right={`${g.agreementRate}% · ${g.sessions} sessions · resolution ${g.avgResolutionScore}`} />
                ))}
              </div>
            </Card>
            <Card title="Simulation vs Practice mode">
              <div className="space-y-4">
                {report.byMode.map((g) => (
                  <HBar key={g.key} label={g.label} value={g.avgResolutionScore} right={`resolution ${g.avgResolutionScore} · ${g.agreementRate}% agreed · ${g.sessions} sessions`} color="bg-indigo-600" />
                ))}
              </div>
            </Card>
            <Card title="Recurring deadlock triggers" icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}>
              {report.deadlockTriggers.length === 0 ? (
                <p className="text-xs text-slate-500">No deadlocks recorded.</p>
              ) : (
                <div className="space-y-4">
                  {report.deadlockTriggers.map((d) => (
                    <HBar key={d.reason} label={d.label} value={d.share} right={`${d.count} sessions (${d.share}%)`} color="bg-amber-500" />
                  ))}
                </div>
              )}
            </Card>
            <Card title="Agent performance by personality">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-400">
                    <tr><th className="pb-2">Personality</th><th className="pb-2">Goals met</th><th className="pb-2">Concessions</th><th className="pb-2">Reciprocity</th><th className="pb-2">Cooperation</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {report.byPersonality.map((p) => (
                      <tr key={p.personality}><td className="py-2">{p.personality}</td><td>{p.avgGoalAchievement}%</td><td>{p.avgConcessions}</td><td>{p.avgReciprocity}</td><td>{p.avgCooperation}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card title="Personality pairings (weakest first)">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {report.byPersonalityPair.map((g) => (
                <div key={g.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div className="font-bold text-slate-800">{g.label}</div>
                  <div className="mt-1 text-slate-500">{g.sessions} sessions · {g.agreementRate}% agreed · resolution {g.avgResolutionScore}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Insights & improvement opportunities" icon={<Lightbulb className="h-4 w-4 text-indigo-600" />}>
            <ul className="space-y-2">
              {report.insights.map((i, idx) => (
                <li key={idx} className={`flex items-start gap-2.5 rounded-2xl border p-3 text-xs text-slate-800 ${INSIGHT_STYLE[i.type].cls}`}>
                  <span className="mt-0.5 shrink-0">{INSIGHT_STYLE[i.type].icon}</span>{i.text}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Recent sessions">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-slate-400">
                  <tr><th className="pb-2">Date</th><th className="pb-2">Scenario</th><th className="pb-2">Mode</th><th className="pb-2">Status</th><th className="pb-2">Resolution</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {recent.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2">{new Date(s.createdAt).toLocaleDateString()}</td>
                      <td>{s.scenarioTitle}</td>
                      <td>{s.mode === 'interactive' ? 'Practice' : s.mode === 'auto' ? 'Simulation' : '-'}</td>
                      <td className={s.status === 'settled' ? 'text-emerald-700' : 'text-rose-700'}>{s.status}</td>
                      <td>{s.summary ? `${s.summary.resolutionScore} (${s.summary.resolutionGrade})` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
