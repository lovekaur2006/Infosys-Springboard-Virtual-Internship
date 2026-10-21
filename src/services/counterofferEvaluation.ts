import { AgentConfig, NegotiationTurn } from '../types.ts';

export interface ConstraintSignal {
  constraint: string;
  state: 'met' | 'at-risk' | 'unaddressed';
  detail: string;
}

export interface CounterofferEvaluation {
  score: number;
  label: 'Favorable' | 'Workable' | 'Risky' | 'Insufficient detail';
  summary: string;
  signals: ConstraintSignal[];
  nextMove: string;
}

const meaningfulWords = (text: string) =>
  text.toLowerCase().match(/[a-z]{4,}|\d{2,}/g)?.filter((word) => ![
    'with', 'from', 'that', 'this', 'must', 'have', 'will', 'your', 'their', 'minimum', 'maximum', 'limit', 'within', 'under', 'over', 'include',
  ].includes(word)) || [];

const amounts = (text: string) =>
  [...text.matchAll(/(?:₹|rs\.?\s*)?([\d,]+(?:\.\d+)?)/gi)]
    .map((match) => Number(match[1].replace(/,/g, '')))
    .filter(Number.isFinite);

const termArea = (text: string) => {
  const value = text.toLowerCase();
  if (/price|salary|compensation|budget|allocation|cost|\barr\b|\bbase\b|\bpay\b/.test(value)) return 'money';
  if (/support|warranty|sla|uptime|service|security|compliance|audit/.test(value)) return 'protection';
  if (/term|duration|year|month|remote|hybrid|onsite|work model|joining|bonus|equity|vesting/.test(value)) return 'structure';
  return 'other';
};

export function evaluateCounteroffer(agent: AgentConfig, turn?: NegotiationTurn): CounterofferEvaluation {
  const offeredTerms = turn?.offeredTerms || [];
  if (offeredTerms.length === 0) {
    return {
      score: 0,
      label: 'Insufficient detail',
      summary: 'No priced or structured counteroffer is available yet. Ask the other side to put specific terms on the table.',
      signals: agent.keyConstraints.map((constraint) => ({ constraint, state: 'unaddressed', detail: 'No offer term to compare.' })),
      nextMove: 'Request a written offer with a value for each priority term before making a concession.',
    };
  }

  const offerText = offeredTerms.map(({ label, value }) => `${label}: ${value}`).join(' | ');
  const offerWords = new Set(meaningfulWords(offerText));
  const signals: ConstraintSignal[] = agent.keyConstraints.map((constraint) => {
    const words = [...new Set(meaningfulWords(constraint))];
    const overlap = words.filter((word) => offerWords.has(word));
    const area = termArea(constraint);
    const relevantTerms = offeredTerms.filter((term) => termArea(`${term.label} ${term.value}`) === area);
    const limit = amounts(constraint)[0];
    const offerValues = relevantTerms.flatMap((term) => amounts(term.value));

    if (area === 'money' && limit && offerValues.length) {
      const value = offerValues[0];
      const isUpperBound = /maximum|cap|ceiling|no more|not exceed|under|below|budget limit/i.test(constraint);
      const isLowerBound = /minimum|floor|at least|no less|above/i.test(constraint);
      if (isUpperBound) {
        const met = value <= limit;
        return { constraint, state: met ? 'met' : 'at-risk', detail: met ? `Offer ${value.toLocaleString()} is within the ${limit.toLocaleString()} limit.` : `Offer ${value.toLocaleString()} exceeds the ${limit.toLocaleString()} limit.` };
      }
      if (isLowerBound) {
        const met = value >= limit;
        return { constraint, state: met ? 'met' : 'at-risk', detail: met ? `Offer ${value.toLocaleString()} meets the ${limit.toLocaleString()} floor.` : `Offer ${value.toLocaleString()} is below the ${limit.toLocaleString()} floor.` };
      }
    }

    if (overlap.length >= 2) return { constraint, state: 'met', detail: `Offer addresses ${overlap.slice(0, 3).join(', ')}.` };
    if (overlap.length === 1) return { constraint, state: 'at-risk', detail: `Offer mentions ${overlap[0]}, but does not confirm the full boundary.` };
    return { constraint, state: 'unaddressed', detail: 'Not covered in this offer.' };
  });

  const met = signals.filter((signal) => signal.state === 'met').length;
  const atRisk = signals.filter((signal) => signal.state === 'at-risk').length;
  const addressed = met + atRisk;
  const score = Math.max(0, Math.min(100, Math.round(55 + met * 15 - atRisk * 22 - (signals.length - addressed) * 5)));
  const label = addressed === 0 ? 'Insufficient detail' : atRisk > 0 ? 'Risky' : met >= Math.ceil(signals.length / 2) ? 'Favorable' : 'Workable';
  const summary = atRisk
    ? `${atRisk} boundary signal${atRisk === 1 ? '' : 's'} need clarification or protection before acceptance.`
    : addressed === 0
      ? 'The offer does not address enough of this role’s constraints to evaluate safely.'
      : `${met} of ${signals.length} role constraints are addressed, with no detected boundary conflicts.`;
  const nextMove = atRisk
    ? agent.personality === 'Risk-Averse'
      ? 'Hold on the affected red line. Ask for the boundary to be written into the offer before discussing trade-offs.'
      : 'Name the affected boundary and counter with a specific reciprocal trade. Keep the red line protected.'
    : agent.personality === 'Aggressive'
      ? 'Keep the next concession conditional. Ask for movement on your highest-value open term first.'
      : agent.personality === 'Collaborative'
        ? 'Package one lower-priority give with a matching improvement on your top priority.'
        : 'Confirm the written safeguards, then move one term at a time in small increments.';

  return { score, label, summary, signals, nextMove };
}

export function getRoleConcessionHistory(agent: AgentConfig, turns: NegotiationTurn[]) {
  return turns
    .filter((turn) => turn.agentId === agent.id)
    .filter((turn) => (turn.concessionNote && !/direct human counter-offer submitted/i.test(turn.concessionNote)) || turn.offeredTerms?.length)
    .map((turn) => ({
      round: turn.round,
      note: turn.concessionNote && !/direct human counter-offer submitted/i.test(turn.concessionNote)
        ? turn.concessionNote
        : 'Offer recorded; concession amount was not stated.',
      terms: turn.offeredTerms || [],
    }));
}
