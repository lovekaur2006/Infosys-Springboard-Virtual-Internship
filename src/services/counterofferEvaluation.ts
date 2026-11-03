/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AgentConfig, NegotiationTurn } from '../types.ts';

export type EvaluationDecision = 'accept' | 'counter' | 'reject';

export interface ObjectiveSignal {
  objective: string;
  status: 'satisfied' | 'acceptable' | 'compromised' | 'unmet';
  score: number;
  detail: string;
}

export interface ConstraintSignal {
  constraint: string;
  state: 'met' | 'at-risk' | 'violated' | 'unaddressed';
  isRedLine?: boolean;
  detail: string;
}

export interface ConcessionRecommendation {
  tactic: string;
  recommendedConcessionPercent: number;
  concessionNote: string;
  tradeOffAdvice: string;
  suggestedTerms: { label: string; value: string; rationale?: string }[];
}

export interface ConcessionMetrics {
  totalConcessionsMade: number;
  lastConcessionDelta: number | null;
  reciprocityRatio: number;
  concessionPace: 'Aggressive' | 'Steady' | 'Cautious';
}

export interface CounterofferEvaluation {
  decision: EvaluationDecision;
  decisionRationale: string;
  score: number;
  objectiveScore: number;
  constraintScore: number;
  label: 'Favorable' | 'Workable' | 'Risky' | 'Unacceptable' | 'Insufficient detail';
  summary: string;
  signals: ConstraintSignal[];
  objectiveSignals: ObjectiveSignal[];
  nextMove: string;
  concessionRecommendation?: ConcessionRecommendation;
  concessionMetrics?: ConcessionMetrics;
}

export interface EvaluationContext {
  round?: number;
  maxRounds?: number;
  turns?: NegotiationTurn[];
  scenarioId?: string;
  isFinalRound?: boolean;
}

export interface RoleConcessionRecord {
  round: number;
  note: string;
  terms: { label: string; value: string }[];
  deltaFromPrevious?: number | null;
}

const meaningfulWords = (text: string) =>
  text.toLowerCase().match(/[a-z]{4,}|\d{2,}/g)?.filter((word) => ![
    'with', 'from', 'that', 'this', 'must', 'have', 'will', 'your', 'their', 'minimum', 'maximum', 'limit', 'within', 'under', 'over', 'include',
  ].includes(word)) || [];

export const amounts = (text: string): number[] =>
  [...text.matchAll(/(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)/gi)]
    .map((match) => Number(match[1].replace(/,/g, '')))
    .filter(Number.isFinite);

export const termArea = (text: string): 'money' | 'protection' | 'structure' | 'other' => {
  const value = text.toLowerCase();
  if (/price|salary|compensation|budget|allocation|cost|\barr\b|\bbase\b|\bpay\b|cash|fund/.test(value)) return 'money';
  if (/support|warranty|sla|uptime|service|security|compliance|audit|soc-2|guarantee|credits/.test(value)) return 'protection';
  if (/term|duration|year|month|remote|hybrid|onsite|work model|joining|bonus|equity|vesting|tranche|phase/.test(value)) return 'structure';
  return 'other';
};

/**
 * Extracts money targets from metric/goal text.
 */
function parseFinancialMetric(agent: AgentConfig): {
  isCostMinimizer: boolean;
  target?: number;
  floor?: number;
  ceiling?: number;
} {
  const roleText = `${agent.roleTitle} ${agent.organization} ${agent.primaryGoal}`.toLowerCase();
  const isCostMinimizer = /buyer|procurement|cfo|finance|cost|save|lowest|ceiling|budget limit|reduce/.test(roleText);

  const metricAmounts = amounts(agent.targetMetric);
  const goalAmounts = amounts(agent.primaryGoal);
  const allAmounts = [...metricAmounts, ...goalAmounts];

  let ceiling: number | undefined;
  let floor: number | undefined;
  let target: number | undefined;

  for (const c of agent.keyConstraints) {
    const cAmounts = amounts(c);
    if (!cAmounts.length) continue;
    if (cAmounts.length >= 2 || /range|between/i.test(c)) {
      floor = Math.min(...cAmounts);
      ceiling = Math.max(...cAmounts);
    }
    if (/maximum|cap|ceiling|no more|not exceed|under|below|budget limit/i.test(c)) {
      ceiling = cAmounts[0];
    }
    if (/minimum|floor|at least|no less|above/i.test(c)) {
      floor = cAmounts[0];
    }
  }

  if (isCostMinimizer) {
    ceiling = ceiling || (allAmounts.length ? Math.max(...allAmounts) : undefined);
    target = allAmounts.length ? Math.min(...allAmounts) : ceiling;
  } else {
    floor = floor || (allAmounts.length ? Math.min(...allAmounts) : undefined);
    target = allAmounts.length ? Math.max(...allAmounts) : floor;
  }

  return { isCostMinimizer, target, floor, ceiling };
}

/**
 * Evaluates the incoming offer against the agent's objectives (primaryGoal and targetMetric).
 */
export function evaluateObjectives(
  agent: AgentConfig,
  offeredTerms: { label: string; value: string }[],
  speechText: string = ''
): { score: number; signals: ObjectiveSignal[] } {
  const signals: ObjectiveSignal[] = [];
  const offerText = `${offeredTerms.map((t) => `${t.label}: ${t.value}`).join(' | ')} ${speechText}`;
  const fin = parseFinancialMetric(agent);

  const moneyTerms = offeredTerms.filter((t) => termArea(`${t.label} ${t.value}`) === 'money');
  const offerAmounts = moneyTerms.flatMap((t) => amounts(t.value));
  const primaryAmount = offerAmounts.length ? offerAmounts[0] : null;

  // 1. Target Metric Evaluation
  if (primaryAmount !== null && (fin.target !== undefined || fin.floor !== undefined || fin.ceiling !== undefined)) {
    if (fin.isCostMinimizer) {
      const budgetCap = fin.ceiling ?? fin.target ?? primaryAmount;
      const idealTarget = fin.target ?? budgetCap;

      if (primaryAmount <= idealTarget) {
        signals.push({
          objective: `Target Metric (${agent.targetMetric})`,
          status: 'satisfied',
          score: 100,
          detail: `Offer of ₹${primaryAmount.toLocaleString('en-IN')} meets or beats ideal cost target ₹${idealTarget.toLocaleString('en-IN')}.`,
        });
      } else if (primaryAmount <= budgetCap) {
        const span = Math.max(1, budgetCap - idealTarget);
        const overIdeal = primaryAmount - idealTarget;
        const subScore = Math.max(65, Math.round(95 - (overIdeal / span) * 25));
        signals.push({
          objective: `Target Metric (${agent.targetMetric})`,
          status: 'acceptable',
          score: subScore,
          detail: `Offer of ₹${primaryAmount.toLocaleString('en-IN')} is within budget ceiling ₹${budgetCap.toLocaleString('en-IN')}.`,
        });
      } else {
        const excess = primaryAmount - budgetCap;
        signals.push({
          objective: `Target Metric (${agent.targetMetric})`,
          status: 'unmet',
          score: Math.max(10, Math.round(50 - (excess / budgetCap) * 50)),
          detail: `Offer of ₹${primaryAmount.toLocaleString('en-IN')} exceeds budget ceiling ₹${budgetCap.toLocaleString('en-IN')} by ₹${excess.toLocaleString('en-IN')}.`,
        });
      }
    } else {
      // Maximizer (Vendor, Candidate, Dept Head)
      const minFloor = fin.floor ?? fin.target ?? primaryAmount;
      const idealTarget = fin.target ?? minFloor;

      if (primaryAmount >= idealTarget) {
        signals.push({
          objective: `Target Metric (${agent.targetMetric})`,
          status: 'satisfied',
          score: 100,
          detail: `Offer of ₹${primaryAmount.toLocaleString('en-IN')} satisfies ideal target of ₹${idealTarget.toLocaleString('en-IN')}.`,
        });
      } else if (primaryAmount >= minFloor) {
        const span = Math.max(1, idealTarget - minFloor);
        const underIdeal = idealTarget - primaryAmount;
        const subScore = Math.max(65, Math.round(95 - (underIdeal / span) * 25));
        signals.push({
          objective: `Target Metric (${agent.targetMetric})`,
          status: 'acceptable',
          score: subScore,
          detail: `Offer of ₹${primaryAmount.toLocaleString('en-IN')} clears required floor of ₹${minFloor.toLocaleString('en-IN')}.`,
        });
      } else {
        const deficit = minFloor - primaryAmount;
        signals.push({
          objective: `Target Metric (${agent.targetMetric})`,
          status: 'unmet',
          score: Math.max(10, Math.round(45 - (deficit / minFloor) * 50)),
          detail: `Offer of ₹${primaryAmount.toLocaleString('en-IN')} falls short of minimum floor ₹${minFloor.toLocaleString('en-IN')} by ₹${deficit.toLocaleString('en-IN')}.`,
        });
      }
    }
  } else {
    // Non-financial or unpriced metric
    const targetWords = meaningfulWords(agent.targetMetric);
    const offerWords = new Set(meaningfulWords(offerText));
    const overlap = targetWords.filter((w) => offerWords.has(w));
    if (overlap.length >= 2) {
      signals.push({
        objective: `Target Metric (${agent.targetMetric})`,
        status: 'satisfied',
        score: 85,
        detail: `Offer aligns with target terms (${overlap.slice(0, 3).join(', ')}).`,
      });
    } else if (overlap.length === 1) {
      signals.push({
        objective: `Target Metric (${agent.targetMetric})`,
        status: 'acceptable',
        score: 65,
        detail: `Offer touches on target metric (${overlap[0]}).`,
      });
    } else {
      signals.push({
        objective: `Target Metric (${agent.targetMetric})`,
        status: 'unmet',
        score: 30,
        detail: 'Target metric is not directly referenced in current offer terms.',
      });
    }
  }

  // 2. Primary Goal Alignment
  const goalWords = [...new Set(meaningfulWords(agent.primaryGoal))];
  const offerWordSet = new Set(meaningfulWords(offerText));
  const goalOverlap = goalWords.filter((w) => offerWordSet.has(w));

  // Qualitative checks for special goal topics
  const hasWarranty = /warranty|guarantee/i.test(offerText);
  const hasSLA = /sla|uptime|99\.9/i.test(offerText);
  const hasRemote = /remote|hybrid|wfh/i.test(offerText);
  const hasBonus = /bonus|signing/i.test(offerText);
  const hasEquity = /equity|vesting/i.test(offerText);
  const hasPhasing = /phase|tranche|milestone/i.test(offerText);
  const hasLongTerm = /year|multi-year|long-term|commitment|partnership|agreement|contract/i.test(offerText);

  let qualitativeBonus = 0;
  if (/warranty/i.test(agent.primaryGoal) && hasWarranty) qualitativeBonus += 15;
  if (/sla|uptime/i.test(agent.primaryGoal) && hasSLA) qualitativeBonus += 15;
  if (/remote|flexibility/i.test(agent.primaryGoal) && hasRemote) qualitativeBonus += 15;
  if (/bonus/i.test(agent.primaryGoal) && hasBonus) qualitativeBonus += 10;
  if (/equity/i.test(agent.primaryGoal) && hasEquity) qualitativeBonus += 10;
  if (/phase|tranche/i.test(agent.primaryGoal) && hasPhasing) qualitativeBonus += 15;
  if (/partnership|contract|long-term|value/i.test(agent.primaryGoal) && hasLongTerm) qualitativeBonus += 25;

  // If target metric is satisfied or acceptable, anchor primary goal baseline
  const metricSatisfied = signals.some((s) => s.status === 'satisfied');
  const metricAcceptable = signals.some((s) => s.status === 'acceptable');
  const baseGoalScore = metricSatisfied ? 55 : metricAcceptable ? 40 : 20;

  const overlapRatio = goalWords.length > 0 ? goalOverlap.length / goalWords.length : 0;
  let goalScore = Math.min(100, Math.round(baseGoalScore + overlapRatio * 35 + qualitativeBonus));

  if (goalScore >= 75) {
    signals.push({
      objective: 'Primary Goal Alignment',
      status: 'satisfied',
      score: goalScore,
      detail: `Stated offer matches key priorities (${goalOverlap.slice(0, 4).join(', ') || 'essential elements addressed'}).`,
    });
  } else if (goalScore >= 50) {
    signals.push({
      objective: 'Primary Goal Alignment',
      status: 'acceptable',
      score: goalScore,
      detail: `Partial alignment with primary goal (${goalOverlap.slice(0, 3).join(', ') || 'some priorities addressed'}).`,
    });
  } else {
    signals.push({
      objective: 'Primary Goal Alignment',
      status: 'unmet',
      score: goalScore,
      detail: 'Core strategic priorities in primary goal are largely unfulfilled in this offer.',
    });
  }

  const avgScore = Math.round(signals.reduce((acc, s) => acc + s.score, 0) / signals.length);
  return { score: avgScore, signals };
}

/**
 * Evaluates the incoming offer against the agent's constraints.
 */
export function evaluateConstraints(
  agent: AgentConfig,
  offeredTerms: { label: string; value: string }[],
  speechText: string = '',
  isFinalRound: boolean = false
): {
  score: number;
  signals: ConstraintSignal[];
  hasViolation: boolean;
  violatedConstraints: string[];
} {
  const offerText = `${offeredTerms.map((t) => `${t.label}: ${t.value}`).join(' | ')} ${speechText}`;
  const offerWords = new Set(meaningfulWords(offerText));
  const violatedConstraints: string[] = [];

  const signals: ConstraintSignal[] = agent.keyConstraints.map((constraint) => {
    const isRedLine = /must|mandatory|non-negotiable|cannot|absolute|hard cap|strict|ceiling|floor|limit/i.test(constraint);
    const words = [...new Set(meaningfulWords(constraint))];
    const overlap = words.filter((word) => offerWords.has(word));
    const area = termArea(constraint);
    const relevantTerms = offeredTerms.filter((term) => termArea(`${term.label} ${term.value}`) === area);
    const cAmounts = amounts(constraint);
    const limit = cAmounts[0];
    const offerValues = relevantTerms.flatMap((term) => amounts(term.value));

    // Numerical constraint evaluation
    if (area === 'money' && cAmounts.length > 0 && offerValues.length) {
      const value = offerValues[0];
      const isRange = cAmounts.length >= 2 || /range|between/i.test(constraint);

      if (isRange) {
        const lowerLimit = Math.min(...cAmounts);
        const upperLimit = Math.max(...cAmounts);

        if (value > upperLimit) {
          const delta = value - upperLimit;
          if (isFinalRound || delta > upperLimit * 0.35) {
            violatedConstraints.push(constraint);
            return {
              constraint,
              isRedLine,
              state: 'violated',
              detail: `Offer ₹${value.toLocaleString('en-IN')} exceeds upper limit ₹${upperLimit.toLocaleString('en-IN')} by ₹${delta.toLocaleString('en-IN')}.`,
            };
          }
          return {
            constraint,
            isRedLine,
            state: 'at-risk',
            detail: `Offer ₹${value.toLocaleString('en-IN')} exceeds ceiling ₹${upperLimit.toLocaleString('en-IN')}; concession required.`,
          };
        }

        if (value < lowerLimit) {
          const deficit = lowerLimit - value;
          if (isFinalRound || deficit > lowerLimit * 0.35) {
            violatedConstraints.push(constraint);
            return {
              constraint,
              isRedLine,
              state: 'violated',
              detail: `Offer ₹${value.toLocaleString('en-IN')} is below required floor ₹${lowerLimit.toLocaleString('en-IN')} by ₹${deficit.toLocaleString('en-IN')}.`,
            };
          }
          return {
            constraint,
            isRedLine,
            state: 'at-risk',
            detail: `Offer ₹${value.toLocaleString('en-IN')} is below floor ₹${lowerLimit.toLocaleString('en-IN')}; concession required.`,
          };
        }

        return {
          constraint,
          isRedLine,
          state: 'met',
          detail: `Offer ₹${value.toLocaleString('en-IN')} is within range ₹${lowerLimit.toLocaleString('en-IN')} - ₹${upperLimit.toLocaleString('en-IN')}.`,
        };
      }

      const isUpperBound = /maximum|cap|ceiling|no more|not exceed|under|below|budget limit/i.test(constraint);
      const isLowerBound = /minimum|floor|at least|no less|above/i.test(constraint);

      if (isUpperBound) {
        if (value <= limit) {
          return {
            constraint,
            isRedLine,
            state: 'met',
            detail: `Offer ₹${value.toLocaleString('en-IN')} complies with ceiling of ₹${limit.toLocaleString('en-IN')}.`,
          };
        }
        const delta = value - limit;
        // At deadline or if grossly exceeding limit (>35%), it's a fatal violation
        if (isFinalRound || delta > limit * 0.35) {
          violatedConstraints.push(constraint);
          return {
            constraint,
            isRedLine,
            state: 'violated',
            detail: `Offer ₹${value.toLocaleString('en-IN')} exceeds upper limit ₹${limit.toLocaleString('en-IN')} by ₹${delta.toLocaleString('en-IN')}.`,
          };
        }
        return {
          constraint,
          isRedLine,
          state: 'at-risk',
          detail: `Offer ₹${value.toLocaleString('en-IN')} exceeds ceiling ₹${limit.toLocaleString('en-IN')}; concession required.`,
        };
      }

      if (isLowerBound) {
        if (value >= limit) {
          return {
            constraint,
            isRedLine,
            state: 'met',
            detail: `Offer ₹${value.toLocaleString('en-IN')} meets or exceeds minimum floor ₹${limit.toLocaleString('en-IN')}.`,
          };
        }
        const deficit = limit - value;
        // At deadline or if grossly below floor (>35%), it's a fatal violation
        if (isFinalRound || deficit > limit * 0.35) {
          violatedConstraints.push(constraint);
          return {
            constraint,
            isRedLine,
            state: 'violated',
            detail: `Offer ₹${value.toLocaleString('en-IN')} is below required floor ₹${limit.toLocaleString('en-IN')} by ₹${deficit.toLocaleString('en-IN')}.`,
          };
        }
        return {
          constraint,
          isRedLine,
          state: 'at-risk',
          detail: `Offer ₹${value.toLocaleString('en-IN')} is below floor ₹${limit.toLocaleString('en-IN')}; concession required.`,
        };
      }
    }

    // Contract duration / term length evaluation
    if (/year|month|contract|duration/i.test(constraint) && limit !== undefined && limit <= 10) {
      const offeredDuration = relevantTerms.flatMap((t) => amounts(t.value))[0] || amounts(offerText).find((n) => n <= 10);
      if (offeredDuration !== undefined) {
        const isMin = /minimum|least|floor|want/i.test(constraint);
        const isMax = /maximum|most|cap/i.test(constraint);
        if (isMin && offeredDuration >= limit) {
          return {
            constraint,
            isRedLine,
            state: 'met',
            detail: `Offer confirms ${offeredDuration}-year term, satisfying the ${limit}-year requirement.`,
          };
        }
        if (isMax && offeredDuration <= limit) {
          return {
            constraint,
            isRedLine,
            state: 'met',
            detail: `Offer confirms ${offeredDuration}-year term within the ${limit}-year limit.`,
          };
        }
        if (isFinalRound) {
          violatedConstraints.push(constraint);
          return {
            constraint,
            isRedLine,
            state: 'violated',
            detail: `Offer ${offeredDuration} years does not satisfy ${limit}-year constraint at deadline.`,
          };
        }
        return {
          constraint,
          isRedLine,
          state: 'at-risk',
          detail: `Offer specifies ${offeredDuration} years; ${limit}-year condition needs alignment.`,
        };
      }
    }

    // Qualitative terms: warranty, support duration, SLA, remote, SOC-2
    if (/warranty/i.test(constraint)) {
      if (/warranty|guarantee/i.test(offerText)) {
        return { constraint, isRedLine, state: 'met', detail: 'Warranty clause is explicitly included in the terms.' };
      }
      if (isFinalRound && isRedLine) {
        violatedConstraints.push(constraint);
        return { constraint, isRedLine, state: 'violated', detail: 'Mandatory warranty requirement missing at final round.' };
      }
      return { constraint, isRedLine, state: 'at-risk', detail: 'Warranty requirement is omitted from the offer.' };
    }

    if (/support/i.test(constraint) && limit !== undefined) {
      if (/support/i.test(offerText)) {
        return { constraint, isRedLine, state: 'met', detail: `Support requirement addressed in offer.` };
      }
      return { constraint, isRedLine, state: 'at-risk', detail: `Support duration is unclear or unaddressed.` };
    }

    if (/soc-2|compliance|security/i.test(constraint)) {
      if (/soc-2|compliance|security/i.test(offerText)) {
        return { constraint, isRedLine, state: 'met', detail: 'SOC-2 security/compliance terms included.' };
      }
      if (isFinalRound && isRedLine) {
        violatedConstraints.push(constraint);
        return { constraint, isRedLine, state: 'violated', detail: 'Critical compliance requirement missing at deadline.' };
      }
      return { constraint, isRedLine, state: 'at-risk', detail: 'Critical compliance requirement is missing.' };
    }

    if (/remote/i.test(constraint)) {
      if (/remote|hybrid|wfh/i.test(offerText)) {
        return { constraint, isRedLine, state: 'met', detail: 'Work arrangement flexibility confirmed in proposal.' };
      }
      return { constraint, isRedLine, state: 'at-risk', detail: 'Remote/hybrid arrangement not explicitly committed.' };
    }

    if (overlap.length >= 2) {
      return { constraint, isRedLine, state: 'met', detail: `Offer addresses ${overlap.slice(0, 3).join(', ')}.` };
    }
    if (overlap.length === 1) {
      return { constraint, isRedLine, state: 'at-risk', detail: `Offer mentions ${overlap[0]}, but boundary requires verification.` };
    }
    return { constraint, isRedLine, state: 'unaddressed', detail: 'Not addressed in this offer.' };
  });

  const metCount = signals.filter((s) => s.state === 'met').length;
  const atRiskCount = signals.filter((s) => s.state === 'at-risk').length;
  const violatedCount = signals.filter((s) => s.state === 'violated').length;
  const unaddressedCount = signals.filter((s) => s.state === 'unaddressed').length;

  const rawScore = 100 - (violatedCount * 40) - (atRiskCount * 18) - (unaddressedCount * 8) + (metCount * 5);
  const constraintScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    score: constraintScore,
    signals,
    hasViolation: violatedCount > 0,
    violatedConstraints,
  };
}

/**
 * Determines whether to Accept, Counter, or Reject based on objectives, constraints, and negotiation stage.
 */
export function decideOfferAction(
  objectiveScore: number,
  constraintScore: number,
  hasViolation: boolean,
  signals: ConstraintSignal[],
  objectiveSignals: ObjectiveSignal[],
  context?: EvaluationContext
): {
  decision: EvaluationDecision;
  decisionRationale: string;
  label: 'Favorable' | 'Workable' | 'Risky' | 'Unacceptable' | 'Insufficient detail';
} {
  const isFinalRound = context?.round && context?.maxRounds ? context.round >= context.maxRounds : Boolean(context?.isFinalRound);
  const atRiskCount = signals.filter((s) => s.state === 'at-risk').length;
  const violatedCount = signals.filter((s) => s.state === 'violated').length;
  const metCount = signals.filter((s) => s.state === 'met').length;

  // REJECT CONDITION
  if (hasViolation || violatedCount > 0) {
    const violatedNames = signals.filter((s) => s.state === 'violated').map((s) => s.constraint).join('; ');
    return {
      decision: 'reject',
      label: 'Unacceptable',
      decisionRationale: `The incoming offer violates mandatory boundary constraints (${violatedNames || 'boundary limits exceeded'}). It falls outside acceptable walkaway thresholds.`,
    };
  }

  if (isFinalRound) {
    // If deadline reached and critical terms are still unresolved
    if (objectiveScore < 65 || atRiskCount > 0 || constraintScore < 70) {
      return {
        decision: 'reject',
        label: 'Unacceptable',
        decisionRationale: `The negotiation reached the maximum round limit (${context?.maxRounds || 'final'}) without sufficiently satisfying key constraints and objectives.`,
      };
    }
  }

  // In Round 1, parties exchange initial anchors and explore trade-offs rather than instantly settling
  if (context?.round === 1) {
    return {
      decision: 'counter',
      label: atRiskCount > 0 ? 'Risky' : 'Workable',
      decisionRationale: `Opening position recorded. Proposing structured counteroffer to establish the bargaining envelope.`,
    };
  }

  // ACCEPT CONDITION
  // Accepts if objectives are sufficiently satisfied and constraints are safely met
  const objectivesSatisfied = objectiveScore >= 70;
  const constraintsSafe = constraintScore >= 75 && atRiskCount === 0;

  if (objectivesSatisfied && constraintsSafe) {
    return {
      decision: 'accept',
      label: 'Favorable',
      decisionRationale: `The offer sufficiently satisfies role objectives (objective score ${objectiveScore}/100) and satisfies all boundary constraints (${metCount}/${signals.length} verified).`,
    };
  }

  // If in late rounds (round >= 2) with strong overall satisfaction and no boundary violations
  if (context?.round && context.round >= 2 && objectiveScore >= 70 && constraintScore >= 70 && atRiskCount <= 1) {
    return {
      decision: 'accept',
      label: 'Favorable',
      decisionRationale: `The offer achieves a balanced mutual agreement meeting core boundaries (score ${Math.round((objectiveScore + constraintScore) / 2)}/100). Final terms accepted.`,
    };
  }

  // COUNTER CONDITION
  // Offer has potential but requires modification
  return {
    decision: 'counter',
    label: atRiskCount > 0 ? 'Risky' : 'Workable',
    decisionRationale: `The proposal has potential but requires adjustment: ${atRiskCount > 0 ? `${atRiskCount} term(s) are at risk` : 'core objective targets can be improved'}. Modifying terms and proposing counteroffer.`,
  };
}

/**
 * Generates a structured concession recommendation and proposed counteroffer terms.
 */
export function generateConcession(
  agent: AgentConfig,
  incomingTurn: NegotiationTurn,
  evaluation: CounterofferEvaluation,
  round: number = 1,
  maxRounds: number = 4
): ConcessionRecommendation {
  const personality = agent.personality;
  const fin = parseFinancialMetric(agent);
  const incomingAmounts = (incomingTurn.offeredTerms || []).flatMap((t) => amounts(t.value));
  const incomingMoney = incomingAmounts.length ? incomingAmounts[0] : fin.target;

  let tactic = '';
  let recommendedConcessionPercent = 10;
  let tradeOffAdvice = '';
  let concessionNote = '';
  const suggestedTerms: { label: string; value: string; rationale?: string }[] = [];

  if (personality === 'Aggressive') {
    recommendedConcessionPercent = 5;
    tactic = 'Anchored Reciprocal Defense';
    tradeOffAdvice = 'Concede minimally (3-5%). Demand a high-value concession from the counterpart in return for any movement.';
    concessionNote = `Offered minor concession while locking in reciprocal demand on priority terms.`;

    if (fin.isCostMinimizer) {
      const counterPrice = incomingMoney && fin.target ? Math.round(fin.target + (incomingMoney - fin.target) * 0.25) : (fin.ceiling || 800_000);
      suggestedTerms.push({ label: 'Proposed Price', value: `₹${counterPrice.toLocaleString('en-IN')}`, rationale: 'Firm anchor near cost ceiling' });
      suggestedTerms.push({ label: 'Payment Terms', value: 'Net-60', rationale: 'Cash flow defense' });
      suggestedTerms.push({ label: 'SLA Guarantee', value: '99.99% Mandatory', rationale: 'Risk mitigation' });
    } else {
      const counterPrice = incomingMoney && fin.target ? Math.round(fin.target - (fin.target - incomingMoney) * 0.25) : (fin.floor || 800_000);
      suggestedTerms.push({ label: 'Revised Price', value: `₹${counterPrice.toLocaleString('en-IN')}`, rationale: 'Protects margin floor' });
      suggestedTerms.push({ label: 'Contract Term', value: '2-Year Agreement', rationale: 'Revenue security' });
      suggestedTerms.push({ label: 'Value Add-on', value: 'Dedicated Engineering Support', rationale: 'Non-cash sweetener' });
    }
  } else if (personality === 'Collaborative') {
    recommendedConcessionPercent = 15;
    tactic = 'Integrative Trade-Off Packaging';
    tradeOffAdvice = 'Offer a meaningful move toward the middle ground, paired with non-price value creation (e.g. warranty, payment cadence, signing bonus).';
    concessionNote = `Proposed balanced compromise splitting the difference with value add-ons.`;

    if (fin.isCostMinimizer) {
      const counterPrice = incomingMoney && fin.target ? Math.round(fin.target + (incomingMoney - fin.target) * 0.5) : (fin.ceiling || 800_000);
      suggestedTerms.push({ label: 'Compromise Price', value: `₹${counterPrice.toLocaleString('en-IN')}`, rationale: 'Fair midpoint' });
      suggestedTerms.push({ label: 'Payment Terms', value: 'Net-45 Compromise', rationale: 'Balanced cash flow' });
      suggestedTerms.push({ label: 'Warranty & Support', value: '1 Year Full Coverage', rationale: 'Mutual security' });
    } else {
      const counterPrice = incomingMoney && fin.target ? Math.round(incomingMoney + (fin.target - incomingMoney) * 0.5) : (fin.floor || 800_000);
      suggestedTerms.push({ label: 'Target Price', value: `₹${counterPrice.toLocaleString('en-IN')}`, rationale: 'Collaborative adjustment' });
      suggestedTerms.push({ label: 'Term Commitment', value: '24 Months', rationale: 'Shared stability' });
      suggestedTerms.push({ label: 'Bonus / Add-on', value: 'Priority Onboarding & SLAs', rationale: 'Integrative benefit' });
    }
  } else {
    // Risk-Averse
    recommendedConcessionPercent = 8;
    tactic = 'Safeguard-First Bracket Move';
    tradeOffAdvice = 'Prioritize ironclad contractual protections (SLA credits, penalty clauses, warranty) before conceding on price.';
    concessionNote = `Moved conservatively while securing downside protections and audit safeguards.`;

    if (fin.isCostMinimizer) {
      const counterPrice = incomingMoney && fin.target ? Math.round(fin.target + (incomingMoney - fin.target) * 0.3) : (fin.ceiling || 800_000);
      suggestedTerms.push({ label: 'Conservative Offer', value: `₹${counterPrice.toLocaleString('en-IN')}`, rationale: 'Protects budget limit' });
      suggestedTerms.push({ label: 'Downside Protection', value: 'SLA Credit Penalty Clauses', rationale: 'Risk reduction' });
      suggestedTerms.push({ label: 'Audit Clause', value: 'Annual Performance Review', rationale: 'Contractual guardrail' });
    } else {
      const counterPrice = incomingMoney && fin.target ? Math.round(fin.target - (fin.target - incomingMoney) * 0.3) : (fin.floor || 800_000);
      suggestedTerms.push({ label: 'Conservative Floor', value: `₹${counterPrice.toLocaleString('en-IN')}`, rationale: 'Risk-calibrated minimum' });
      suggestedTerms.push({ label: 'Payment Cadence', value: 'Net-30 Milestone Disbursements', rationale: 'Guaranteed solvency' });
      suggestedTerms.push({ label: 'Compliance Guarantee', value: 'SOC-2 Standard Included', rationale: 'Regulatory certainty' });
    }
  }

  return {
    tactic,
    recommendedConcessionPercent,
    concessionNote,
    tradeOffAdvice,
    suggestedTerms,
  };
}

/**
 * Computes concession metrics and reciprocity ratio across turns.
 */
export function calculateConcessionMetrics(
  agent: AgentConfig,
  turns: NegotiationTurn[]
): ConcessionMetrics {
  const roleTurns = turns.filter((t) => t.agentId === agent.id);
  const otherTurns = turns.filter((t) => t.agentId !== agent.id);

  const roleAmounts = roleTurns.flatMap((t) => (t.offeredTerms || []).flatMap((item) => amounts(item.value)));
  const otherAmounts = otherTurns.flatMap((t) => (t.offeredTerms || []).flatMap((item) => amounts(item.value)));

  let roleDelta = 0;
  if (roleAmounts.length >= 2) {
    roleDelta = Math.abs(roleAmounts[0] - roleAmounts[roleAmounts.length - 1]);
  }

  let otherDelta = 0;
  if (otherAmounts.length >= 2) {
    otherDelta = Math.abs(otherAmounts[0] - otherAmounts[otherAmounts.length - 1]);
  }

  const lastConcessionDelta = roleAmounts.length >= 2
    ? Math.abs(roleAmounts[roleAmounts.length - 1] - roleAmounts[roleAmounts.length - 2])
    : null;

  const reciprocityRatio = roleDelta > 0 ? Number((otherDelta / roleDelta).toFixed(2)) : 1.0;
  const concessionPace = agent.personality === 'Aggressive' ? 'Aggressive' : agent.personality === 'Collaborative' ? 'Steady' : 'Cautious';

  return {
    totalConcessionsMade: Math.max(0, roleTurns.filter((t) => t.concessionNote).length),
    lastConcessionDelta,
    reciprocityRatio,
    concessionPace,
  };
}

/**
 * Primary Module Entry Point: Evaluates an incoming counteroffer against the agent's objectives and constraints,
 * returning the evaluation score, objective & constraint signals, and the explicit decision (Accept, Counter, or Reject).
 */
export function evaluateCounteroffer(
  agent: AgentConfig,
  turn?: NegotiationTurn,
  context?: EvaluationContext
): CounterofferEvaluation {
  const offeredTerms = turn?.offeredTerms || [];

  if (offeredTerms.length === 0) {
    return {
      decision: 'counter',
      decisionRationale: 'No structured counteroffer is on the table yet. Request specific terms before making a concession.',
      score: 0,
      objectiveScore: 0,
      constraintScore: 0,
      label: 'Insufficient detail',
      summary: 'No priced or structured counteroffer is available yet. Ask the other side to put specific terms on the table.',
      signals: agent.keyConstraints.map((constraint) => ({ constraint, state: 'unaddressed', detail: 'No offer term to compare.' })),
      objectiveSignals: [
        {
          objective: agent.targetMetric,
          status: 'unmet',
          score: 0,
          detail: 'No terms available to evaluate against target metric.',
        },
      ],
      nextMove: 'Request a written offer with a value for each priority term before making a concession.',
    };
  }

  // 1. Evaluate Objectives
  const objEval = evaluateObjectives(agent, offeredTerms, turn?.speechText);

  // 2. Evaluate Constraints
  const isFinal = context?.round && context?.maxRounds ? context.round >= context.maxRounds : Boolean(context?.isFinalRound);
  const constrEval = evaluateConstraints(agent, offeredTerms, turn?.speechText, isFinal);

  // 3. Make Decision: Accept, Counter, or Reject
  const decisionResult = decideOfferAction(
    objEval.score,
    constrEval.score,
    constrEval.hasViolation,
    constrEval.signals,
    objEval.signals,
    context
  );

  // 4. Calculate Overall Composite Score (45% objectives, 55% constraints)
  const compositeScore = Math.max(
    0,
    Math.min(100, Math.round(objEval.score * 0.45 + constrEval.score * 0.55))
  );

  // 5. Build Summary
  const met = constrEval.signals.filter((s) => s.state === 'met').length;
  const atRisk = constrEval.signals.filter((s) => s.state === 'at-risk').length;
  const violated = constrEval.signals.filter((s) => s.state === 'violated').length;

  let summary = '';
  if (violated > 0) {
    summary = `${violated} boundary constraint${violated === 1 ? '' : 's'} violated. Offer is unacceptable.`;
  } else if (atRisk > 0) {
    summary = `${atRisk} boundary signal${atRisk === 1 ? '' : 's'} need clarification or protection before acceptance.`;
  } else {
    summary = `${met} of ${constrEval.signals.length} role constraints are addressed, with no detected boundary conflicts.`;
  }

  // 6. Strategic Next Move
  let nextMove = '';
  if (decisionResult.decision === 'accept') {
    nextMove = 'All objectives and redline constraints are satisfied. Proceed to finalize agreement and schedule review.';
  } else if (decisionResult.decision === 'reject') {
    nextMove = agent.personality === 'Aggressive'
      ? 'Declare walkaway stance. The current terms violate non-negotiable boundaries.'
      : 'Explain the violated constraint clearly and request a revised baseline or end negotiations.';
  } else {
    // Counter
    nextMove = atRisk > 0
      ? agent.personality === 'Risk-Averse'
        ? 'Hold on the affected red line. Ask for the boundary to be written into the offer before discussing trade-offs.'
        : 'Name the affected boundary and counter with a specific reciprocal trade. Keep the red line protected.'
      : agent.personality === 'Aggressive'
        ? 'Keep the next concession conditional. Ask for movement on your highest-value open term first.'
        : agent.personality === 'Collaborative'
          ? 'Package one lower-priority give with a matching improvement on your top priority.'
          : 'Confirm the written safeguards, then move one term at a time in small increments.';
  }

  // 7. Concession Recommendation
  const concessionRecommendation = turn
    ? generateConcession(agent, turn, {} as any, context?.round || 1, context?.maxRounds || 4)
    : undefined;

  // 8. Concession Metrics
  const concessionMetrics = context?.turns ? calculateConcessionMetrics(agent, context.turns) : undefined;

  return {
    decision: decisionResult.decision,
    decisionRationale: decisionResult.decisionRationale,
    score: compositeScore,
    objectiveScore: objEval.score,
    constraintScore: constrEval.score,
    label: decisionResult.label,
    summary,
    signals: constrEval.signals,
    objectiveSignals: objEval.signals,
    nextMove,
    concessionRecommendation,
    concessionMetrics,
  };
}

/**
 * Returns role concession history across recorded turns.
 */
export function getRoleConcessionHistory(
  agent: AgentConfig,
  turns: NegotiationTurn[]
): RoleConcessionRecord[] {
  const roleTurns = turns.filter((turn) => turn.agentId === agent.id);
  const records: RoleConcessionRecord[] = [];

  let previousAmount: number | null = null;
  for (const turn of roleTurns) {
    const hasNote = turn.concessionNote && !/direct human counter-offer submitted/i.test(turn.concessionNote);
    const hasTerms = Boolean(turn.offeredTerms?.length);

    if (hasNote || hasTerms) {
      const currentAmounts = (turn.offeredTerms || []).flatMap((t) => amounts(t.value));
      const currentAmount = currentAmounts.length ? currentAmounts[0] : null;
      const delta = previousAmount !== null && currentAmount !== null ? currentAmount - previousAmount : null;
      if (currentAmount !== null) previousAmount = currentAmount;

      records.push({
        round: turn.round,
        note: hasNote
          ? turn.concessionNote!
          : 'Offer recorded; concession amount was not stated.',
        terms: turn.offeredTerms || [],
        deltaFromPrevious: delta,
      });
    }
  }

  return records;
}
