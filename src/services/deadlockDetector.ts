/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Deadlock Detection Module — Core Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Identifies negotiations that have reached a stalled / deadlocked state by
 * evaluating four independently configurable conditions:
 *
 *  1. STAGNATION   — No meaningful change in offers for N consecutive turns.
 *  2. REJ. CYCLING — Repeated rejection of similar proposals.
 *  3. POS. CYCLING — Agents repeatedly returning to the same positions.
 *  4. TIMEOUT      — Negotiation exceeding the maximum allowed rounds.
 *
 * When a deadlock is detected the module escalates through a resolution ladder:
 *   compromise_proposal → modify_stance → final_round → breakdown
 *
 * Public API (backwards-compatible with existing NegotiationArena usage):
 *   detectDeadlock()            → DeadlockStatus  (same shape as before)
 *   analyseDeadlock()           → DeadlockAnalysis (richer, for the UI panel)
 *   generateCompromiseTerms()   → bridging offer terms
 *   buildResolutionTurn()       → mediator NegotiationTurn
 *   deadlockResolutionText      → human-readable resolution sentences
 *   DEADLOCK_REASON_LABELS      → short labels per reason
 *   DEADLOCK_REASON_DESCRIPTIONS → verbose per-reason diagnostic text
 *   DEFAULT_DEADLOCK_CONFIG     → factory thresholds
 *   resolveDeadlockConfig()     → merge helper
 *   validateDeadlockConfig()    → validation helper
 */

import {
  DeadlockConfig,
  DeadlockReason,
  DeadlockResolution,
  DeadlockStatus,
  NegotiationTurn,
} from '../types.ts';

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_DEADLOCK_CONFIG: DeadlockConfig = {
  /** Trigger stagnation after this many consecutive identical-signature turns. */
  unchangedOfferLimit: 3,
  /** Trigger rejection-cycling after this many back-to-back rejections. */
  repeatedRejectionLimit: 2,
  /** Trigger position-cycling when any agent revisits the same offer ≥ N times. */
  repeatedPositionLimit: 2,
};

// ─── Resolution escalation ladder ────────────────────────────────────────────

const RESOLUTION_LADDER: DeadlockResolution[] = [
  'compromise_proposal',
  'modify_stance',
  'final_round',
  'breakdown',
];

// ─── Label / description maps ─────────────────────────────────────────────────

export const DEADLOCK_REASON_LABELS: Record<DeadlockReason, string> = {
  no_meaningful_offer_change: 'No meaningful change in recent offers',
  repeated_rejection:         'Similar proposals have been repeatedly rejected',
  repeated_position:          'A party has returned to the same position',
  maximum_rounds_reached:     'Maximum allowed rounds reached',
};

export const DEADLOCK_REASON_DESCRIPTIONS: Record<DeadlockReason, string> = {
  no_meaningful_offer_change:
    'Multiple consecutive offers contain identical or near-identical terms. The negotiation has stalled without material progress.',
  repeated_rejection:
    'One or more parties have rejected similar proposals multiple times in a row, signalling an irreconcilable gap on the current terms.',
  repeated_position:
    'An agent has cycled back to a previously-stated position, indicating an unwillingness to make genuine concessions on the affected dimension.',
  maximum_rounds_reached:
    'The negotiation has consumed all allowed rounds. A binding resolution or impasse declaration is required immediately.',
};

export const deadlockResolutionText: Record<DeadlockResolution, string> = {
  none:
    'No intervention required.',
  compromise_proposal:
    'Mediator is issuing a balanced compromise proposal that splits the outstanding gap between parties.',
  modify_stance:
    'Mediator is requesting each party to materially revise at least one core position before the next exchange.',
  final_round:
    'Mediator is granting one final facilitated round; both parties must submit their best and final executable terms.',
  breakdown:
    'Resolution attempts have failed; declaring a negotiation breakdown — no agreement is possible under current conditions.',
};

// ─── Extended analysis result (for the DeadlockStatusPanel) ──────────────────

export interface DeadlockAnalysis {
  isDeadlocked:      boolean;
  reasons:           DeadlockReason[];
  reasonText:        string;
  /** Verbose per-reason diagnostic strings (for tooltips / expanded detail). */
  diagnostics:       Partial<Record<DeadlockReason, string>>;
  resolution:        DeadlockResolution;
  resolutionAttempts: number;
  /** 0–100 proximity-to-deadlock scores for each condition (not just pass/fail). */
  conditionScores: {
    stagnation:       number;
    rejectionCycling: number;
    positionCycling:  number;
    roundTimeout:     number;
  };
  /** 'none' | 'warning' | 'critical' */
  severity: 'none' | 'warning' | 'critical';
}

// ─── Internal utilities ───────────────────────────────────────────────────────

/** Strip currency symbols, commas and whitespace, keep alphanumerics + punctuation. */
const normalizeValue = (raw: string): string =>
  raw
    .toLowerCase()
    .replace(/[₹$,\s]/g, '')
    .replace(/[^a-z0-9.%\-\/]/g, '')
    .trim();

/** Canonical offer signature — two turns with the same signature are identical. */
const offerSignature = (turn: NegotiationTurn): string =>
  (turn.offeredTerms ?? [])
    .map((t) => `${normalizeValue(t.label)}:${normalizeValue(t.value)}`)
    .sort()
    .join('|');

/** Jaccard similarity between two signatures (0 = different, 1 = identical). */
function signatureSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const tokensA = new Set(a.split('|').filter(Boolean));
  const tokensB = new Set(b.split('|').filter(Boolean));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  const intersection = [...tokensA].filter((t) => tokensB.has(t)).length;
  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 1 : intersection / union;
}

/** `true` when a turn was injected by the mediator / orchestrator. */
const isMediatorTurn = (turn: NegotiationTurn): boolean =>
  turn.id.startsWith('deadlock-') || turn.agentId === 'orchestrator-mediator';

// ─── Primary public API ───────────────────────────────────────────────────────

/**
 * Backwards-compatible entry point — returns a `DeadlockStatus` (same shape
 * the NegotiationArena already reads).
 */
export function detectDeadlock(
  turns:        NegotiationTurn[],
  currentRound: number,
  maxRounds:    number,
  overrides?:   Partial<DeadlockConfig>,
): DeadlockStatus {
  const a = analyseDeadlock(turns, currentRound, maxRounds, overrides);
  return {
    isDeadlocked:      a.isDeadlocked,
    reasons:           a.reasons,
    reasonText:        a.reasonText,
    resolution:        a.resolution,
    resolutionAttempts: a.resolutionAttempts,
  };
}

/**
 * Extended detection — returns full `DeadlockAnalysis` (consumed by
 * `DeadlockStatusPanel`).
 */
export function analyseDeadlock(
  turns:        NegotiationTurn[],
  currentRound: number,
  maxRounds:    number,
  overrides?:   Partial<DeadlockConfig>,
): DeadlockAnalysis {
  const config: DeadlockConfig = { ...DEFAULT_DEADLOCK_CONFIG, ...overrides };

  const resolutionAttempts = turns.filter(isMediatorTurn).length;

  const lastMediatorIdx = turns.map(isMediatorTurn).lastIndexOf(true);
  const recentHistory = lastMediatorIdx >= 0 ? turns.slice(lastMediatorIdx + 1) : turns;
  const participantTurns = recentHistory.filter((t) => !isMediatorTurn(t));
  const offerTurns = participantTurns.filter((t) => (t.offeredTerms?.length ?? 0) > 0);

  const reasons:     DeadlockReason[] = [];
  const diagnostics: Partial<Record<DeadlockReason, string>> = {};

  // ── Condition 1: Stagnation ─────────────────────────────────────────────────
  const stagnationScore = evalStagnation(offerTurns, config.unchangedOfferLimit);
  if (stagnationScore >= 100) {
    reasons.push('no_meaningful_offer_change');
    const window   = offerTurns.slice(-config.unchangedOfferLimit);
    const agentSet = [...new Set(window.map((t) => t.agentName))].join(' and ');
    diagnostics['no_meaningful_offer_change'] =
      `${agentSet} submitted ${window.length} consecutive offers with no material change in terms.`;
  }

  // ── Condition 2: Rejection cycling ─────────────────────────────────────────
  const rejectionScore = evalRejectionCycling(participantTurns, config.repeatedRejectionLimit);
  if (rejectionScore >= 100) {
    reasons.push('repeated_rejection');
    const rejectTurns  = participantTurns.filter((t) => t.decision === 'reject').slice(-config.repeatedRejectionLimit);
    const rejectAgents = [...new Set(rejectTurns.map((t) => t.agentName))].join(' and ');
    diagnostics['repeated_rejection'] =
      `${rejectAgents} rejected ${config.repeatedRejectionLimit} consecutive proposals, indicating an irreconcilable gap on current terms.`;
  }

  // ── Condition 3: Position cycling ──────────────────────────────────────────
  const { score: positionScore, detail: positionDetail } = evalPositionCycling(
    offerTurns,
    config.repeatedPositionLimit,
  );
  if (positionScore >= 100) {
    reasons.push('repeated_position');
    diagnostics['repeated_position'] = positionDetail;
  }

  // ── Condition 4: Round timeout ─────────────────────────────────────────────
  const roundTimeoutScore = evalRoundTimeout(currentRound, maxRounds);
  if (roundTimeoutScore >= 100) {
    reasons.push('maximum_rounds_reached');
    diagnostics['maximum_rounds_reached'] =
      `Round ${currentRound} has reached or exceeded the configured maximum of ${maxRounds} rounds.`;
  }

  const isDeadlocked = reasons.length > 0;
  const resolution: DeadlockResolution = isDeadlocked
    ? RESOLUTION_LADDER[Math.min(resolutionAttempts, RESOLUTION_LADDER.length - 1)]
    : 'none';

  const severity: DeadlockAnalysis['severity'] =
    !isDeadlocked
      ? 'none'
      : reasons.includes('maximum_rounds_reached') || resolution === 'breakdown'
        ? 'critical'
        : 'warning';

  const reasonText =
    reasons.map((r) => DEADLOCK_REASON_LABELS[r]).join(' · ') ||
    'Negotiation is progressing normally.';

  return {
    isDeadlocked,
    reasons,
    reasonText,
    diagnostics,
    resolution,
    resolutionAttempts,
    conditionScores: {
      stagnation:       stagnationScore,
      rejectionCycling: rejectionScore,
      positionCycling:  positionScore,
      roundTimeout:     roundTimeoutScore,
    },
    severity,
  };
}

// ─── Condition evaluators (return 0–100; ≥100 = deadlock triggered) ───────────

function evalStagnation(offerTurns: NegotiationTurn[], limit: number): number {
  if (offerTurns.length < 2) return 0;
  const window = offerTurns.slice(-limit);
  if (window.length < limit) {
    const sigs   = window.map(offerSignature);
    const unique = new Set(sigs).size;
    return unique === 1 ? Math.round((window.length / limit) * 90) : 0;
  }
  const sigs = window.map(offerSignature);
  if (new Set(sigs).size === 1) return 100;
  // Near-stagnation: pairwise Jaccard similarity
  let totalSim = 0, comparisons = 0;
  for (let i = 0; i < sigs.length - 1; i++) {
    totalSim += signatureSimilarity(sigs[i], sigs[i + 1]);
    comparisons++;
  }
  const avgSim = comparisons > 0 ? totalSim / comparisons : 0;
  return Math.round(avgSim * 80);
}

function evalRejectionCycling(participantTurns: NegotiationTurn[], limit: number): number {
  // Map each rejection to the signature of the proposal it answered
  const rejectedProposalSigs = participantTurns
    .map((turn, idx) => {
      if (turn.decision !== 'reject') return '';
      return offerSignature(turn) || offerSignature(participantTurns[idx - 1] ?? turn);
    })
    .filter(Boolean);

  const counts = new Map<string, number>();
  for (const sig of rejectedProposalSigs) {
    counts.set(sig, (counts.get(sig) ?? 0) + 1);
  }
  const maxCount = Math.max(0, ...[...counts.values()]);
  if (maxCount >= limit) return 100;
  if (maxCount === 0) return 0;
  return Math.round((maxCount / limit) * 70);
}

function evalPositionCycling(
  offerTurns: NegotiationTurn[],
  limit:      number,
): { score: number; detail: string } {
  const positions = new Map<string, { count: number; agentName: string }>();
  for (const turn of offerTurns) {
    const key     = `${turn.agentId}:${offerSignature(turn)}`;
    const current = positions.get(key);
    positions.set(key, { count: (current?.count ?? 0) + 1, agentName: turn.agentName });
  }
  const maxEntry = [...positions.entries()].reduce<[string, { count: number; agentName: string }] | null>(
    (best, entry) => (!best || entry[1].count > best[1].count ? entry : best),
    null,
  );
  const maxCount = maxEntry?.[1].count ?? 0;
  if (maxCount >= limit) {
    return {
      score:  100,
      detail: `${maxEntry![1].agentName} has returned to the same offer position ${maxCount} time(s) without conceding.`,
    };
  }
  const score = maxCount >= 2 ? Math.round(((maxCount - 1) / Math.max(limit - 1, 1)) * 80) : 0;
  return { score, detail: '' };
}

function evalRoundTimeout(currentRound: number, maxRounds: number): number {
  if (currentRound >= maxRounds) return 100;
  if (maxRounds <= 1) return 0;
  return Math.round(Math.min((currentRound - 1) / (maxRounds - 1), 1) * 80);
}

// ─── Compromise proposal generator ───────────────────────────────────────────

/**
 * Generates a mediator-authored bridging proposal by computing a weighted
 * midpoint between the most recent numeric terms from each party.
 */
export function generateCompromiseTerms(
  turns:    NegotiationTurn[],
  agentIds: string[],
  weight:   number = 0.5,
): { label: string; value: string }[] {
  const latestOffers = agentIds
    .map((id) => [...turns].reverse().find(
      (t) => t.agentId === id && (t.offeredTerms?.length ?? 0) > 0,
    ))
    .filter(Boolean) as NegotiationTurn[];

  if (latestOffers.length < 2) {
    return latestOffers[0]?.offeredTerms?.slice(0, 3).map((t) => ({
      label: `Mediator compromise: ${t.label}`,
      value: t.value,
    })) ?? [];
  }

  const [offerA, offerB] = latestOffers;
  const termsA = offerA.offeredTerms ?? [];
  const termsB = offerB.offeredTerms ?? [];
  const result: { label: string; value: string }[] = [];

  const allLabels = [...new Set([...termsA.map((t) => t.label), ...termsB.map((t) => t.label)])];

  for (const label of allLabels.slice(0, 4)) {
    const normLabel = normalizeValue(label);
    const tA = termsA.find((t) => normalizeValue(t.label) === normLabel);
    const tB = termsB.find((t) => normalizeValue(t.label) === normLabel);

    if (tA && tB) {
      const numA = extractLeadingNumber(tA.value);
      const numB = extractLeadingNumber(tB.value);
      if (numA !== null && numB !== null) {
        const mid       = Math.round(numA * weight + numB * (1 - weight));
        const formatted = formatLikeOriginal(mid, tA.value);
        result.push({ label: `Compromise: ${label}`, value: formatted });
      } else {
        const leverageA = offerA.leverageScore ?? 50;
        const leverageB = offerB.leverageScore ?? 50;
        result.push({ label: `Mediator: ${label}`, value: leverageA >= leverageB ? tA.value : tB.value });
      }
    } else {
      const term = tA ?? tB;
      if (term) result.push({ label: `Mediator: ${label}`, value: term.value });
    }
  }
  return result;
}

function extractLeadingNumber(value: string): number | null {
  const match = value.match(/[\d,]+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function formatLikeOriginal(value: number, original: string): string {
  const prefix = original.match(/^[^\d]*/)?.[0] ?? '';
  const suffix = original.match(/[^0-9,]+$/)?.[0]  ?? '';
  return `${prefix}${value.toLocaleString('en-IN')}${suffix}`;
}

// ─── Resolution turn builder ──────────────────────────────────────────────────

/**
 * Builds the mediator NegotiationTurn that gets inserted into the dialogue
 * stream when a deadlock is detected and a resolution is chosen.
 */
export function buildResolutionTurn(
  orchestratorName: string,
  status:           DeadlockStatus,
  turns:            NegotiationTurn[],
  agentIds:         string[],
  round:            number,
): NegotiationTurn {
  const resolution = status.resolution;
  let speechText  = '';
  let offeredTerms: { label: string; value: string }[] | undefined;
  let concessionNote = '';

  switch (resolution) {
    case 'compromise_proposal': {
      offeredTerms = generateCompromiseTerms(turns, agentIds);
      speechText =
        `⚖️ Deadlock detected (${status.reasonText}). ` +
        `The mediator is issuing a compromise proposal bridging the outstanding gap. ` +
        `Both parties are invited to respond to the following terms:`;
      concessionNote = 'Mediator-generated midpoint compromise between last-known positions.';
      break;
    }
    case 'modify_stance': {
      speechText =
        `🔄 Negotiation has stalled (${status.reasonText}). ` +
        `The mediator requires each party to materially revise at least one core position. ` +
        `Submit a revised offer that meaningfully departs from your previous stance.`;
      concessionNote = 'Mediator directive: parties must modify stance before next turn.';
      break;
    }
    case 'final_round': {
      speechText =
        `⏳ Final facilitated round triggered (${status.reasonText}). ` +
        `This is your last opportunity to reach agreement. ` +
        `Both parties must submit their best and final executable terms immediately.`;
      concessionNote = 'Mediator has triggered the final round; best-and-final terms required.';
      break;
    }
    case 'breakdown': {
      const attempts = status.resolutionAttempts;
      speechText =
        `❌ Negotiation breakdown declared (${status.reasonText}). ` +
        `All resolution attempts have been exhausted after ${attempts} mediator intervention(s). ` +
        `No agreement can be reached under current conditions. Session is closing.`;
      concessionNote = 'Mediator formally declares impasse — no further negotiation possible.';
      break;
    }
    default:
      speechText = 'Mediator monitoring active. No intervention required at this time.';
  }

  return {
    id:           `deadlock-${status.resolutionAttempts + 1}-${Date.now()}`,
    round,
    timestamp:    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    agentId:      'orchestrator-mediator',
    agentName:    orchestratorName,
    roleTitle:    'Deadlock Mediator',
    personality:  'Collaborative',
    speechText,
    offeredTerms,
    concessionNote,
    sentiment:         'mediating',
    leverageScore:     50,
    decision:          resolution === 'breakdown' ? 'reject' : 'counter',
    decisionRationale: status.reasonText,
  };
}

// ─── Config helpers ───────────────────────────────────────────────────────────

/** Merge overrides on top of factory defaults. */
export function resolveDeadlockConfig(overrides?: Partial<DeadlockConfig>): DeadlockConfig {
  return { ...DEFAULT_DEADLOCK_CONFIG, ...overrides };
}

/** Validate a `DeadlockConfig` object; returns an array of error strings. */
export function validateDeadlockConfig(config: Partial<DeadlockConfig>): string[] {
  const errors: string[] = [];
  for (const [key, label] of [
    ['unchangedOfferLimit',    'unchangedOfferLimit'],
    ['repeatedRejectionLimit', 'repeatedRejectionLimit'],
    ['repeatedPositionLimit',  'repeatedPositionLimit'],
  ] as [keyof DeadlockConfig, string][]) {
    const v = config[key];
    if (v !== undefined && (!Number.isInteger(v) || (v as number) < 1)) {
      errors.push(`${label} must be a positive integer (minimum 1).`);
    }
  }
  return errors;
}
