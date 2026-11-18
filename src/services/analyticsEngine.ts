/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Task 5 / Milestone 4 - Performance Analytics Module.
 *
 * Pure functions that aggregate many saved negotiation sessions into
 * dashboard-ready statistics, recurring problems and improvement tips.
 */

import { DEADLOCK_REASON_LABELS } from './deadlockDetector.ts';
import type { PostInteractionSummary, SessionMode } from './postInteractionSummary.ts';

export interface SessionRecord {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  status: 'settled' | 'impasse';
  agreementScore: number;
  mode: SessionMode | null;
  createdAt: string; // ISO date
  summary?: PostInteractionSummary | null;
}

export interface GroupStat {
  key: string;
  label: string;
  sessions: number;
  agreementRate: number; // %
  avgResolutionScore: number;
  avgAgreementScore: number;
  avgRounds: number;
}

export interface PersonalityStat {
  personality: string;
  appearances: number;
  avgGoalAchievement: number;
  avgConcessions: number;
  avgReciprocity: number;
  avgCooperation: number;
}

export interface TrendPoint {
  index: number;
  date: string;
  scenarioTitle: string;
  status: 'settled' | 'impasse';
  resolutionScore: number;
  agreementScore: number;
}

export interface DeadlockTrigger {
  reason: string;
  label: string;
  count: number;
  share: number; // % of sessions
}

export interface Insight {
  type: 'challenge' | 'recommendation' | 'positive';
  text: string;
}

export interface AnalyticsReport {
  generatedAt: string;
  totals: {
    sessions: number;
    settled: number;
    impasse: number;
    agreementRate: number;
    avgResolutionScore: number;
    avgAgreementScore: number;
    avgRounds: number;
    avgConcessionsPerSession: number;
    sessionsWithDeadlock: number;
  };
  byScenario: GroupStat[];
  byMode: GroupStat[];
  byPersonalityPair: GroupStat[];
  byPersonality: PersonalityStat[];
  deadlockTriggers: DeadlockTrigger[];
  trend: TrendPoint[];
  insights: Insight[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : 0);

const MODE_LABEL: Record<string, string> = {
  auto: 'Simulation (AI vs AI)',
  interactive: 'Practice (Human vs AI)',
  unknown: 'Unknown mode',
};

function groupStat(key: string, label: string, rows: SessionRecord[]): GroupStat {
  const withSummary = rows.filter((r) => r.summary);
  return {
    key,
    label,
    sessions: rows.length,
    agreementRate: pct(rows.filter((r) => r.status === 'settled').length, rows.length),
    avgResolutionScore: Math.round(avg(withSummary.map((r) => r.summary!.resolutionScore))),
    avgAgreementScore: Math.round(avg(rows.map((r) => r.agreementScore))),
    avgRounds: round1(avg(withSummary.map((r) => r.summary!.roundsUsed))),
  };
}

function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyFn(item);
    map.set(k, [...(map.get(k) ?? []), item]);
  }
  return map;
}

export function buildAnalytics(input: SessionRecord[]): AnalyticsReport {
  const sessions = [...input].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const withSummary = sessions.filter((s) => s.summary);
  const settled = sessions.filter((s) => s.status === 'settled').length;

  // --- group stats ---------------------------------------------------------
  const byScenario = [...groupBy(sessions, (s) => s.scenarioId)].map(([id, rows]) =>
    groupStat(id, rows[0].scenarioTitle, rows),
  );
  const byMode = [...groupBy(sessions, (s) => s.mode ?? 'unknown')].map(([mode, rows]) =>
    groupStat(mode, MODE_LABEL[mode] ?? mode, rows),
  );
  const pairKey = (s: SessionRecord) =>
    (s.summary?.agentReviews ?? [])
      .map((r) => r.personality)
      .sort()
      .join(' × ');
  const byPersonalityPair = [...groupBy(withSummary.filter((s) => pairKey(s)), pairKey)]
    .map(([k, rows]) => groupStat(k, k, rows))
    .sort((a, b) => a.avgResolutionScore - b.avgResolutionScore);

  // --- per-personality performance ----------------------------------------
  const reviewRows = withSummary.flatMap((s) => s.summary!.agentReviews);
  const byPersonality: PersonalityStat[] = [...groupBy(reviewRows, (r) => r.personality)].map(([p, rows]) => ({
    personality: p,
    appearances: rows.length,
    avgGoalAchievement: Math.round(avg(rows.map((r) => r.goalAchievement))),
    avgConcessions: round1(avg(rows.map((r) => r.concessionsMade))),
    avgReciprocity: round1(avg(rows.map((r) => r.reciprocityRatio))),
    avgCooperation: Math.round(avg(rows.map((r) => r.avgCooperation))),
  }));

  // --- deadlock triggers ----------------------------------------------------
  const reasonCounts = new Map<string, number>();
  let sessionsWithDeadlock = 0;
  for (const s of withSummary) {
    const reasons = s.summary!.deadlockReasons;
    if (reasons.length || s.summary!.mediatorInterventions > 0) sessionsWithDeadlock += 1;
    for (const r of reasons) reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);
  }
  const deadlockTriggers: DeadlockTrigger[] = [...reasonCounts]
    .map(([reason, count]) => ({
      reason,
      label: (DEADLOCK_REASON_LABELS as Record<string, string>)[reason] ?? reason,
      count,
      share: pct(count, withSummary.length),
    }))
    .sort((a, b) => b.count - a.count);

  // --- trend ------------------------------------------------------------
  const trend: TrendPoint[] = sessions.map((s, index) => ({
    index: index + 1,
    date: s.createdAt,
    scenarioTitle: s.scenarioTitle,
    status: s.status,
    resolutionScore: s.summary?.resolutionScore ?? s.agreementScore,
    agreementScore: s.agreementScore,
  }));

  const totals = {
    sessions: sessions.length,
    settled,
    impasse: sessions.length - settled,
    agreementRate: pct(settled, sessions.length),
    avgResolutionScore: Math.round(avg(withSummary.map((s) => s.summary!.resolutionScore))),
    avgAgreementScore: Math.round(avg(sessions.map((s) => s.agreementScore))),
    avgRounds: round1(avg(withSummary.map((s) => s.summary!.roundsUsed))),
    avgConcessionsPerSession: round1(
      avg(withSummary.map((s) => s.summary!.agentReviews.reduce((n, r) => n + r.concessionsMade, 0))),
    ),
    sessionsWithDeadlock,
  };

  return {
    generatedAt: new Date().toISOString(),
    totals,
    byScenario,
    byMode,
    byPersonalityPair,
    byPersonality,
    deadlockTriggers,
    trend,
    insights: buildInsights(sessions, totals, byScenario, byMode, byPersonalityPair, byPersonality, deadlockTriggers, trend),
  };
}

function buildInsights(
  sessions: SessionRecord[],
  totals: AnalyticsReport['totals'],
  byScenario: GroupStat[],
  byMode: GroupStat[],
  pairs: GroupStat[],
  byPersonality: PersonalityStat[],
  triggers: DeadlockTrigger[],
  trend: TrendPoint[],
): Insight[] {
  const out: Insight[] = [];
  if (sessions.length === 0) {
    return [{ type: 'recommendation', text: 'Run a few negotiations (or load demo data) to unlock analytics.' }];
  }

  if (totals.agreementRate >= 80) {
    out.push({ type: 'positive', text: `Strong overall agreement rate of ${totals.agreementRate}% across ${totals.sessions} sessions.` });
  } else if (totals.agreementRate < 60) {
    out.push({ type: 'challenge', text: `Only ${totals.agreementRate}% of sessions ended in agreement. Review opening positions and concession pacing.` });
  }

  const weakScenario = [...byScenario].filter((g) => g.sessions >= 2).sort((a, b) => a.agreementRate - b.agreementRate)[0];
  if (weakScenario && weakScenario.agreementRate < 100) {
    out.push({ type: 'challenge', text: `${weakScenario.label} is the hardest scenario (${weakScenario.agreementRate}% agreement over ${weakScenario.sessions} sessions).` });
  }

  if (triggers[0]) {
    out.push({ type: 'challenge', text: `Most common deadlock trigger: "${triggers[0].label}" (${triggers[0].count} session${triggers[0].count === 1 ? '' : 's'}).` });
    out.push({ type: 'recommendation', text: 'Introduce earlier mediator prompts or smaller, more frequent concessions to avoid repeated stalls.' });
  }

  const lowRecip = byPersonality.filter((p) => p.avgConcessions >= 1 && p.avgReciprocity < 0.6);
  if (lowRecip.length) {
    out.push({ type: 'challenge', text: `${lowRecip.map((p) => p.personality).join(', ')} agents concede more than they receive (low reciprocity). Encourage conditional concessions.` });
  }

  const worstPair = pairs.find((g) => g.sessions >= 1 && g.avgResolutionScore < 60);
  if (worstPair) {
    out.push({ type: 'challenge', text: `Weakest personality pairing: ${worstPair.label} (average resolution score ${worstPair.avgResolutionScore}).` });
  }

  if (byMode.length > 1) {
    const sorted = [...byMode].sort((a, b) => b.avgResolutionScore - a.avgResolutionScore);
    const gap = sorted[0].avgResolutionScore - sorted[sorted.length - 1].avgResolutionScore;
    if (gap >= 10) {
      out.push({ type: 'recommendation', text: `${sorted[0].label} sessions score ${gap} points higher than ${sorted[sorted.length - 1].label}. Use the stronger mode’s tactics as a practice benchmark.` });
    }
  }

  if (totals.avgRounds >= 3.5) {
    out.push({ type: 'challenge', text: `Negotiations average ${totals.avgRounds} rounds, close to the round limit. Efficiency can improve with stronger first offers.` });
  }

  if (trend.length >= 4) {
    const half = Math.floor(trend.length / 2);
    const delta = avg(trend.slice(half).map((t) => t.resolutionScore)) - avg(trend.slice(0, half).map((t) => t.resolutionScore));
    if (delta >= 5) out.push({ type: 'positive', text: `Resolution quality is trending up (+${Math.round(delta)} points between early and recent sessions).` });
    else if (delta <= -5) out.push({ type: 'challenge', text: `Resolution quality is trending down (${Math.round(delta)} points between early and recent sessions).` });
  }

  if (!out.length) out.push({ type: 'positive', text: 'No recurring problems detected. Try harder personality pairings to stress-test the agents.' });
  return out;
}

// ---------------------------------------------------------------------------
// Report export helpers (used by the dashboard's download buttons)
// ---------------------------------------------------------------------------

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function sessionsToCsv(sessions: SessionRecord[]): string {
  const header = ['id', 'date', 'scenario', 'mode', 'status', 'agreement_score', 'resolution_score', 'grade', 'rounds', 'mediator_interventions', 'deadlock_reasons'];
  const rows = sessions.map((s) => [
    s.id,
    s.createdAt,
    s.scenarioTitle,
    s.mode ?? 'unknown',
    s.status,
    s.agreementScore,
    s.summary?.resolutionScore ?? '',
    s.summary?.resolutionGrade ?? '',
    s.summary?.roundsUsed ?? '',
    s.summary?.mediatorInterventions ?? '',
    (s.summary?.deadlockReasons ?? []).join('; '),
  ]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export function analyticsToMarkdown(report: AnalyticsReport): string {
  const t = report.totals;
  const lines = [
    '# NegotiateAI Performance Analytics Report',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    `- Sessions: ${t.sessions} (settled ${t.settled}, impasse ${t.impasse})`,
    `- Agreement rate: ${t.agreementRate}%`,
    `- Average resolution score: ${t.avgResolutionScore}/100`,
    `- Average rounds: ${t.avgRounds}`,
    `- Sessions needing mediation: ${t.sessionsWithDeadlock}`,
    '',
    '## By scenario',
    ...report.byScenario.map((g) => `- ${g.label}: ${g.sessions} sessions, ${g.agreementRate}% agreement, resolution ${g.avgResolutionScore}`),
    '',
    '## Deadlock triggers',
    ...(report.deadlockTriggers.length ? report.deadlockTriggers.map((d) => `- ${d.label}: ${d.count}`) : ['- None recorded']),
    '',
    '## Insights',
    ...report.insights.map((i) => `- [${i.type}] ${i.text}`),
  ];
  return lines.join('\n');
}
