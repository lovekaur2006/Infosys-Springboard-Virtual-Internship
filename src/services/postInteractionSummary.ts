/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Task 5 / Milestone 4 - Post-Interaction Summary Agent.
 *
 * Turns a finished negotiation (transcript + settlement + deadlock state) into:
 *   1. a narrative summary
 *   2. a sentiment journey timeline
 *   3. a resolution quality score with a transparent breakdown
 *   4. per-agent strengths / weaknesses / recommendations
 *
 * The agent is deterministic and rule-based so it works offline and is unit-testable.
 */

import {
  AgentConfig,
  DeadlockStatus,
  NegotiationTurn,
  PersonalityType,
  ScenarioTemplate,
  SettlementSummary,
} from '../types.ts';
import { calculateConcessionMetrics } from './counterofferEvaluation.ts';

export type SessionMode = 'interactive' | 'auto';
export type Sentiment = NegotiationTurn['sentiment'];
export type ResolutionGrade = 'Excellent' | 'Good' | 'Fair' | 'Poor';
export type CooperationTrend = 'improving' | 'stable' | 'deteriorating';

/** Cooperation index (0-100) assigned to each sentiment label. */
export const SENTIMENT_COOPERATION: Record<Sentiment, number> = {
  collaborative: 80,
  mediating: 60,
  assertive: 45,
  defensive: 25,
};

/** Weights used for the resolution quality score (sum = 1). */
export const SCORE_WEIGHTS = { agreement: 0.35, goals: 0.3, balance: 0.2, efficiency: 0.15 } as const;

export interface SentimentPoint {
  turnIndex: number;
  round: number;
  agentId: string;
  agentName: string;
  sentiment: Sentiment;
  cooperation: number;
  leverage: number;
  isMediator: boolean;
}

export interface ConcessionEvent {
  round: number;
  agentName: string;
  note: string;
}

export interface AgentReview {
  agentId: string;
  agentName: string;
  roleTitle: string;
  personality: PersonalityType;
  goalAchievement: number; // 0-100
  concessionsMade: number;
  reciprocityRatio: number;
  avgCooperation: number;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export interface ScoreBreakdown {
  agreement: number;
  goals: number;
  balance: number;
  efficiency: number;
  deadlockPenalty: number;
}

export interface PostInteractionSummary {
  generatedAt: string;
  scenarioId: string;
  scenarioTitle: string;
  mode: SessionMode;
  status: 'settled' | 'impasse';
  roundsUsed: number;
  maxRounds: number;
  totalTurns: number;
  mediatorInterventions: number;
  narrative: string;
  sentimentJourney: SentimentPoint[];
  cooperationTrend: CooperationTrend;
  concessionTimeline: ConcessionEvent[];
  resolutionScore: number; // 0-100
  resolutionGrade: ResolutionGrade;
  scoreBreakdown: ScoreBreakdown;
  agentReviews: AgentReview[];
  deadlockReasons: string[];
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

export const isMediatorTurn = (turn: NegotiationTurn): boolean =>
  turn.id.startsWith('deadlock-') || turn.agentId === 'orchestrator-mediator';

export function gradeForScore(score: number): ResolutionGrade {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Poor';
}

/** 1. Sentiment journey: one point per turn. */
export function buildSentimentJourney(turns: NegotiationTurn[]): SentimentPoint[] {
  return turns.map((turn, turnIndex) => ({
    turnIndex,
    round: turn.round,
    agentId: turn.agentId,
    agentName: turn.agentName.replace(/\s*\(You\)$/, ''),
    sentiment: turn.sentiment,
    cooperation: SENTIMENT_COOPERATION[turn.sentiment] ?? 50,
    leverage: clamp(turn.leverageScore ?? 50),
    isMediator: isMediatorTurn(turn),
  }));
}

/** Compares first-half and second-half cooperation of the negotiating (non-mediator) turns. */
export function computeCooperationTrend(journey: SentimentPoint[]): CooperationTrend {
  const pts = journey.filter((p) => !p.isMediator);
  if (pts.length < 4) return 'stable';
  const mid = Math.floor(pts.length / 2);
  const delta = avg(pts.slice(mid).map((p) => p.cooperation)) - avg(pts.slice(0, mid).map((p) => p.cooperation));
  if (delta >= 8) return 'improving';
  if (delta <= -8) return 'deteriorating';
  return 'stable';
}

/** Goal achievement for one agent, derived from its last evaluation of an incoming offer. */
function goalAchievementFor(agent: AgentConfig, turns: NegotiationTurn[], settlement: SettlementSummary): number {
  const mine = turns.filter((t) => t.agentId === agent.id && !isMediatorTurn(t));
  const lastEval = [...mine].reverse().find((t) => typeof t.evaluationScore === 'number')?.evaluationScore;
  if (settlement.status === 'settled') return clamp(lastEval ?? settlement.agreementScore);
  // Impasse: partial credit only for how close the last offer got.
  return clamp((lastEval ?? 0) * 0.6);
}

function reviewAgent(
  agent: AgentConfig,
  turns: NegotiationTurn[],
  settlement: SettlementSummary,
  mediatorInterventions: number,
): AgentReview {
  const mine = turns.filter((t) => t.agentId === agent.id && !isMediatorTurn(t));
  const metrics = calculateConcessionMetrics(agent, turns);
  const goal = goalAchievementFor(agent, turns, settlement);
  const avgCooperation = clamp(avg(mine.map((t) => SENTIMENT_COOPERATION[t.sentiment] ?? 50)));
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const improvements: string[] = [];
  const settled = settlement.status === 'settled';

  if (goal >= 75) strengths.push('Secured most of its stated objectives in the final terms.');
  else if (goal < 50) weaknesses.push('Final terms satisfied less than half of its stated objectives.');

  if (metrics.totalConcessionsMade > 0 && metrics.reciprocityRatio >= 0.8) {
    strengths.push('Concessions were matched by the other side (balanced give-and-take).');
  }
  if (metrics.totalConcessionsMade >= 2 && metrics.reciprocityRatio < 0.5) {
    weaknesses.push('Conceded noticeably more than the counterpart gave back.');
    improvements.push('Tie every concession to a specific request in return before moving.');
  }
  if (metrics.totalConcessionsMade === 0 && !settled) {
    weaknesses.push('Never moved from its opening position, which contributed to the impasse.');
    improvements.push('Offer a small, low-cost concession early to signal flexibility.');
  }
  if (metrics.totalConcessionsMade === 0 && settled && goal >= 75) {
    strengths.push('Held its position and still reached agreement.');
  }
  if (avgCooperation >= 70) strengths.push('Maintained a constructive, collaborative tone throughout.');
  if (avgCooperation < 40) {
    weaknesses.push('Tone stayed defensive, which can reduce the counterpart’s willingness to trade.');
    improvements.push('Acknowledge the other side’s interests before restating your own position.');
  }
  if (agent.personality === 'Aggressive' && (mediatorInterventions > 0 || !settled)) {
    improvements.push('Trade lower-priority terms earlier instead of anchoring on every term.');
  }
  if (agent.personality === 'Risk-Averse' && goal < 65) {
    improvements.push('Define a clear walk-away point up front so caution does not turn into over-conceding.');
  }
  if (agent.personality === 'Collaborative' && goal < 65) {
    improvements.push('Pair collaborative language with firmer asks on your highest-priority term.');
  }
  if (mediatorInterventions > 0) {
    weaknesses.push('Negotiation stalled enough to need a mediator intervention.');
  }

  if (!strengths.length) strengths.push('Stayed within its role boundaries and kept the negotiation moving.');
  if (!weaknesses.length) weaknesses.push('No significant weaknesses detected in this session.');
  if (!improvements.length) improvements.push('Repeat this approach and test it against a more aggressive counterpart.');

  return {
    agentId: agent.id,
    agentName: agent.name,
    roleTitle: agent.roleTitle,
    personality: agent.personality,
    goalAchievement: goal,
    concessionsMade: metrics.totalConcessionsMade,
    reciprocityRatio: metrics.reciprocityRatio,
    avgCooperation,
    strengths,
    weaknesses,
    improvements,
  };
}

/** 3. Resolution quality score (0-100) with a transparent breakdown. */
export function computeResolutionScore(
  reviews: AgentReview[],
  settlement: SettlementSummary,
  roundsUsed: number,
  maxRounds: number,
  mediatorInterventions: number,
): { score: number; breakdown: ScoreBreakdown } {
  const goals = reviews.map((r) => r.goalAchievement);
  const agreement = settlement.status === 'settled' ? 100 : 0;
  const goalsAvg = clamp(avg(goals));
  const balance = goals.length > 1 ? clamp(100 - (Math.max(...goals) - Math.min(...goals))) : 100;
  const efficiency = clamp(100 - ((Math.max(roundsUsed, 1) - 1) / Math.max(maxRounds, 1)) * 100);
  const deadlockPenalty = Math.min(15, mediatorInterventions * 5);
  const raw =
    SCORE_WEIGHTS.agreement * agreement +
    SCORE_WEIGHTS.goals * goalsAvg +
    SCORE_WEIGHTS.balance * balance +
    SCORE_WEIGHTS.efficiency * efficiency -
    deadlockPenalty;
  return {
    score: clamp(raw),
    breakdown: { agreement, goals: goalsAvg, balance, efficiency, deadlockPenalty },
  };
}

function buildNarrative(
  scenario: ScenarioTemplate,
  settlement: SettlementSummary,
  mode: SessionMode,
  roundsUsed: number,
  score: number,
  grade: ResolutionGrade,
  trend: CooperationTrend,
  mediatorInterventions: number,
  reviews: AgentReview[],
): string {
  const modeText = mode === 'interactive' ? 'a Practice Mode (Human vs AI)' : 'a Simulation Mode (AI vs AI)';
  const outcome =
    settlement.status === 'settled'
      ? `The parties reached an agreement in ${roundsUsed} round${roundsUsed === 1 ? '' : 's'}`
      : `The parties did not reach agreement within ${roundsUsed} round${roundsUsed === 1 ? '' : 's'}`;
  const best = [...reviews].sort((a, b) => b.goalAchievement - a.goalAchievement)[0];
  const mediation = mediatorInterventions
    ? ` The orchestrator stepped in ${mediatorInterventions} time${mediatorInterventions === 1 ? '' : 's'} to break a stall.`
    : ' No mediator intervention was needed.';
  return (
    `${scenario.title} was run as ${modeText} session. ${outcome}, with a resolution quality score of ` +
    `${score}/100 (${grade}). Overall cooperation was ${trend} across the session.${mediation}` +
    (best ? ` ${best.agentName} achieved the highest goal satisfaction (${best.goalAchievement}%).` : '')
  );
}

/** A completed session handed from the Arena to the Reports screen. */
export interface FinishedSession {
  scenario: ScenarioTemplate;
  agents: AgentConfig[];
  turns: NegotiationTurn[];
  settlement: SettlementSummary;
  summary: PostInteractionSummary;
}

/** Main entry point used by the Arena, Reports screen, tests and the demo-data generator. */
export function generatePostInteractionSummary(
  scenario: ScenarioTemplate,
  agents: AgentConfig[],
  turns: NegotiationTurn[],
  settlement: SettlementSummary,
  deadlock: DeadlockStatus | null | undefined,
  mode: SessionMode,
): PostInteractionSummary {
  const maxRounds = scenario.orchestrator.maxRounds;
  const roundsUsed = Math.max(1, ...turns.map((t) => t.round));
  const mediatorInterventions = turns.filter(isMediatorTurn).length;

  const sentimentJourney = buildSentimentJourney(turns);
  const cooperationTrend = computeCooperationTrend(sentimentJourney);
  const agentReviews = agents.map((a) => reviewAgent(a, turns, settlement, mediatorInterventions));
  const { score, breakdown } = computeResolutionScore(
    agentReviews,
    settlement,
    roundsUsed,
    maxRounds,
    mediatorInterventions,
  );
  const grade = gradeForScore(score);

  const concessionTimeline: ConcessionEvent[] = turns
    .filter((t) => t.concessionNote && !isMediatorTurn(t))
    .map((t) => ({ round: t.round, agentName: t.agentName.replace(/\s*\(You\)$/, ''), note: t.concessionNote as string }));

  const deadlockReasons = Array.from(new Set(deadlock?.reasons ?? []));

  return {
    generatedAt: new Date().toISOString(),
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    mode,
    status: settlement.status,
    roundsUsed,
    maxRounds,
    totalTurns: turns.length,
    mediatorInterventions,
    narrative: buildNarrative(
      scenario, settlement, mode, roundsUsed, score, grade, cooperationTrend, mediatorInterventions, agentReviews,
    ),
    sentimentJourney,
    cooperationTrend,
    concessionTimeline,
    resolutionScore: score,
    resolutionGrade: grade,
    scoreBreakdown: breakdown,
    agentReviews,
    deadlockReasons,
  };
}
