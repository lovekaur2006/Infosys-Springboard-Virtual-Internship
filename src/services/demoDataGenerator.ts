/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Task 5 / Milestone 4 - Demo / test data generator.
 *
 * Runs real negotiations through the existing engine (AI vs AI and a scripted
 * "human" in Practice Mode) across every scenario and personality pairing, then
 * produces SessionRecords with full post-interaction summaries.
 * Used by the "Load demo data" button, scripts/seed-sessions.ts and the tests.
 */

import { PREBUILT_SCENARIOS } from '../data/scenarios.ts';
import {
  AgentConfig,
  DeadlockStatus,
  NegotiationTurn,
  PersonalityType,
  ScenarioTemplate,
  SettlementSummary,
} from '../types.ts';
import { advanceAutonomousNegotiation, buildImpasse } from './autonomousNegotiation.ts';
import { detectDeadlock } from './deadlockDetector.ts';
import { generateAIResponseToUserInput, generateSettlementSummary } from './negotiationEngine.ts';
import { generatePostInteractionSummary, SessionMode } from './postInteractionSummary.ts';
import type { SessionRecord } from './analyticsEngine.ts';

export const PERSONALITIES: PersonalityType[] = ['Aggressive', 'Collaborative', 'Risk-Averse'];

export interface CompletedSession {
  scenario: ScenarioTemplate;
  agents: AgentConfig[];
  turns: NegotiationTurn[];
  settlement: SettlementSummary;
  deadlock: DeadlockStatus;
  mode: SessionMode;
}

export const withPersonalities = (agents: AgentConfig[], personalities: PersonalityType[]): AgentConfig[] =>
  agents.map((agent, i) => ({ ...agent, personality: personalities[i % personalities.length] }));

/** Simulation Mode: same loop as simulateAutonomousNegotiation but also returns the final deadlock status. */
export function runAutonomousSession(scenario: ScenarioTemplate, agents: AgentConfig[]): CompletedSession {
  const turns: NegotiationTurn[] = [];
  let round = 1;
  let outcome: SettlementSummary | null = null;
  let deadlock: DeadlockStatus = detectDeadlock([], 1, scenario.orchestrator.maxRounds, scenario.orchestrator.deadlockConfig);
  const maxTurns = scenario.orchestrator.maxRounds * Math.max(1, agents.length) + 1;

  for (let step = 0; step < maxTurns && !outcome; step += 1) {
    const result = advanceAutonomousNegotiation(scenario, agents, turns, round);
    round = result.round;
    if (result.turn) turns.push(result.turn);
    outcome = result.outcome;
    deadlock = result.deadlock;
  }
  if (!outcome) outcome = buildImpasse(scenario, agents, turns);
  return { scenario, agents, turns, settlement: outcome, deadlock, mode: 'auto' };
}

/**
 * Practice Mode: a scripted human plays agents[0] against the AI agent agents[1],
 * mirroring the logic in NegotiationArena.handleSendUserTurn.
 * `flexible` humans move toward the AI's terms each round; stubborn humans repeat their opening.
 */
export function runPracticeSession(
  scenario: ScenarioTemplate,
  agents: AgentConfig[],
  humanStyle: 'flexible' | 'stubborn',
): CompletedSession {
  const human = agents[0];
  const ai = agents[1] ?? agents[0];
  const pool = runAutonomousSession(scenario, agents).turns.filter((t) => t.agentId === human.id && t.offeredTerms?.length);
  const maxRounds = scenario.orchestrator.maxRounds;
  const turns: NegotiationTurn[] = [];
  let settlement: SettlementSummary | null = null;
  let deadlock = detectDeadlock([], 1, maxRounds, scenario.orchestrator.deadlockConfig);

  for (let round = 1; round <= maxRounds && !settlement; round += 1) {
    const source = pool[humanStyle === 'stubborn' ? 0 : Math.min(round - 1, pool.length - 1)];
    const humanTurn: NegotiationTurn = {
      id: `turn-user-${round}`,
      round,
      timestamp: '00:00',
      agentId: human.id,
      agentName: `${human.name} (You)`,
      roleTitle: human.roleTitle,
      personality: human.personality,
      speechText: source?.speechText ?? 'Here is my offer.',
      offeredTerms: source?.offeredTerms,
      concessionNote: 'Direct human counter-offer submitted.',
      sentiment: 'collaborative',
      leverageScore: 78,
    };
    const aiTurn = generateAIResponseToUserInput(
      scenario, agents, ai.id, humanTurn.speechText, humanTurn.offeredTerms, round, [...turns, humanTurn],
    );
    turns.push(humanTurn, aiTurn);
    deadlock = detectDeadlock(turns, round, maxRounds, scenario.orchestrator.deadlockConfig);

    if (aiTurn.decision === 'accept') settlement = generateSettlementSummary(scenario, agents);
    else if (round >= maxRounds) {
      settlement =
        aiTurn.decision === 'reject' || deadlock.resolution === 'breakdown'
          ? buildImpasse(scenario, agents, turns)
          : generateSettlementSummary(scenario, agents);
    }
  }
  return { scenario, agents, turns, settlement: settlement ?? buildImpasse(scenario, agents, turns), deadlock, mode: 'interactive' };
}

export function toSessionRecord(session: CompletedSession, id: string, createdAt: Date): SessionRecord {
  const summary = generatePostInteractionSummary(
    session.scenario, session.agents, session.turns, session.settlement, session.deadlock, session.mode,
  );
  return {
    id,
    scenarioId: session.scenario.id,
    scenarioTitle: session.scenario.title,
    status: session.settlement.status,
    agreementScore: Math.round(session.settlement.agreementScore ?? 0),
    mode: session.mode,
    createdAt: createdAt.toISOString(),
    summary,
  };
}

/** Tough pairings are run with a 1-round limit so the demo data contains real impasses and deadlocks. */
const IMPASSE_PAIRS = new Set(['Aggressive|Aggressive', 'Aggressive|Risk-Averse', 'Risk-Averse|Aggressive']);

/** Runs 27 Simulation sessions + 6 Practice sessions (3 scenarios x 9 personality pairs, + 2 human styles). */
export function generateDemoCompletedSessions(): CompletedSession[] {
  const sessions: CompletedSession[] = [];
  for (const base of PREBUILT_SCENARIOS) {
    for (const a of PERSONALITIES) {
      for (const b of PERSONALITIES) {
        const scenario = IMPASSE_PAIRS.has(`${a}|${b}`)
          ? { ...base, orchestrator: { ...base.orchestrator, maxRounds: 1 } }
          : base;
        sessions.push(runAutonomousSession(scenario, withPersonalities(base.defaultAgents, [a, b])));
      }
    }
    sessions.push(runPracticeSession(base, withPersonalities(base.defaultAgents, ['Collaborative', 'Collaborative']), 'flexible'));
    sessions.push(runPracticeSession(base, withPersonalities(base.defaultAgents, ['Aggressive', 'Aggressive']), 'stubborn'));
  }
  return sessions;
}

/** Spreads sessions over the past days (oldest first) so trend charts have a time axis. */
export function demoSessionDate(index: number, total: number, now: Date = new Date()): Date {
  return new Date(now.getTime() - (total - index) * 12 * 60 * 60 * 1000);
}

/** Demo SessionRecords (with summaries) for the "Load demo data" button and tests. */
export function generateDemoSessions(now: Date = new Date()): SessionRecord[] {
  const sessions = generateDemoCompletedSessions();
  return sessions.map((s, i) => toSessionRecord(s, `demo-${i + 1}`, demoSessionDate(i, sessions.length, now)));
}
