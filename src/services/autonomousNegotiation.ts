import { AgentConfig, DeadlockStatus, NegotiationTurn, ScenarioTemplate, SettlementSummary } from '../types.ts';
import { evaluateCounteroffer } from './counterofferEvaluation.ts';
import { generateSettlementSummary, generateTurnDialogue } from './negotiationEngine.ts';
import { buildResolutionTurn, detectDeadlock } from './deadlockDetector.ts';

export interface AutonomousStep {
  turn: NegotiationTurn | null;
  round: number;
  outcome: SettlementSummary | null;
  deadlock: DeadlockStatus;
}

const deadlockFor = (scenario: ScenarioTemplate, turns: NegotiationTurn[], round: number) =>
  detectDeadlock(turns, round, scenario.orchestrator.maxRounds, scenario.orchestrator.deadlockConfig);

function buildDeadlockResolutionTurn(
  scenario: ScenarioTemplate,
  turns: NegotiationTurn[],
  round: number,
  status: DeadlockStatus
): NegotiationTurn {
  const agentIds = scenario.defaultAgents.map((a) => a.id);
  return buildResolutionTurn(scenario.orchestrator.name, status, turns, agentIds, round);
}

const numericValues = (terms: NegotiationTurn['offeredTerms']) =>
  (terms || []).flatMap((term) => [...term.value.matchAll(/([\d,]+)/g)].map((match) => Number(match[1].replace(/,/g, ''))).filter(Number.isFinite));

const latestTurnByRole = (agents: AgentConfig[], turns: NegotiationTurn[]) => agents.map((agent) =>
  [...turns].reverse().find((turn) => turn.agentId === agent.id && turn.offeredTerms?.length)
);

function incomingOfferFor(
  scenario: ScenarioTemplate,
  agent: AgentConfig,
  turns: NegotiationTurn[],
  incoming: NegotiationTurn
): NegotiationTurn {
  if (scenario.id !== 'budget-allocation' || agent.id !== 'cfo-finance') return incoming;

  const roleOffers = latestTurnByRole(scenario.defaultAgents, turns);
  const productOffer = roleOffers.find((turn) => turn?.agentId === 'product-lead');
  const infraOffer = roleOffers.find((turn) => turn?.agentId === 'infra-lead');
  const productAmount = numericValues(productOffer?.offeredTerms).find((value) => value > 100_000) || 0;
  const infraAmount = numericValues(infraOffer?.offeredTerms).find((value) => value > 100_000) || 0;
  return {
    ...incoming,
    offeredTerms: [
      { label: 'Total Project Allocation', value: `₹${(productAmount + infraAmount).toLocaleString('en-IN')}` },
      ...(productOffer?.offeredTerms || []),
      ...(infraOffer?.offeredTerms || []),
    ],
  };
}

function roleAcceptsOffer(
  scenario: ScenarioTemplate,
  agent: AgentConfig,
  round: number,
  turns: NegotiationTurn[],
  incoming: NegotiationTurn
): boolean {
  if (scenario.id === 'vendor-pricing' && /seller|supplier|vendor/i.test(`${agent.id} ${agent.roleTitle}`) && round >= 3) {
    const price = incoming.offeredTerms?.flatMap((term) => /price|budget|amount/i.test(term.label) ? numericValues([term]) : [])[0];
    return Boolean(price && price >= 800_000 && price <= 800_000);
  }

  if (scenario.id === 'job-offer' && /recruiter|employer/i.test(`${agent.id} ${agent.roleTitle}`) && round >= 2) {
    const base = incoming.offeredTerms?.flatMap((term) => /base|salary/i.test(term.label) ? numericValues([term]) : [])[0];
    const hasBonus = incoming.offeredTerms?.some((term) => /bonus/i.test(term.label));
    const hasFlexibility = incoming.offeredTerms?.some((term) => /remote|work|arrangement/i.test(`${term.label} ${term.value}`));
    return Boolean(base && base >= 700_000 && base <= 900_000 && hasBonus && hasFlexibility);
  }

  if (scenario.id === 'budget-allocation' && agent.id === 'cfo-finance' && round >= 2) {
    const latest = latestTurnByRole(scenario.defaultAgents, turns);
    const product = latest.find((turn) => turn?.agentId === 'product-lead');
    const infrastructure = latest.find((turn) => turn?.agentId === 'infra-lead');
    const productBudget = numericValues(product?.offeredTerms).find((value) => value > 100_000) || 0;
    const infraBudget = numericValues(infrastructure?.offeredTerms).find((value) => value > 100_000) || 0;
    const productHasPhase = Boolean(product?.offeredTerms?.some((term) => /phase|defer/i.test(`${term.label} ${term.value}`)));
    const infraHasCompliance = Boolean(infrastructure?.offeredTerms?.some((term) => /soc|compliance/i.test(`${term.label} ${term.value}`)));
    return productBudget >= 650_000 && infraBudget >= 550_000 && productBudget + infraBudget <= 1_500_000 && productHasPhase && infraHasCompliance;
  }
  return false;
}

export function buildImpasse(scenario: ScenarioTemplate, agents: AgentConfig[], turns: NegotiationTurn[]): SettlementSummary {
  const lastTurn = turns[turns.length - 1];
  const lastOffer = [...turns].reverse().find((turn) => turn.offeredTerms?.length);
  return {
    status: 'impasse',
    title: `No agreement reached: ${scenario.title}`,
    agreementScore: 0,
    keyTerms: (lastOffer?.offeredTerms || []).map((term) => ({ term: term.label, agreedValue: term.value, satisfaction: 'Compromised' as const })),
    constraintCompliance: agents.map((agent) => ({
      agentName: agent.name,
      compliant: false,
      notes: 'The negotiation ended before this role’s boundaries were jointly verified.',
    })),
    executiveSummary: `The parties did not reach agreement within ${scenario.orchestrator.maxRounds} rounds. The final offer from ${lastOffer?.agentName || lastTurn?.agentName || 'the parties'} remains unaccepted.`,
  };
}

export function advanceAutonomousNegotiation(
  scenario: ScenarioTemplate,
  agents: AgentConfig[],
  turns: NegotiationTurn[],
  currentRound: number
): AutonomousStep {
  if (agents.length === 0) return { turn: null, round: currentRound, outcome: buildImpasse(scenario, agents, turns), deadlock: deadlockFor(scenario, turns, currentRound) };

  if (turns.length === 0) {
    const opening = generateTurnDialogue(scenario, agents, 1, 0, []);
    const openingTurn = { ...opening, decision: 'opening' as const, decisionRationale: `${agents[0].roleTitle} opens the negotiation.` };
    return { turn: openingTurn, round: 1, outcome: null, deadlock: deadlockFor(scenario, [openingTurn], 1) };
  }

  const previous = turns[turns.length - 1];
  const deadlock = deadlockFor(scenario, turns, currentRound);
  if (deadlock.isDeadlocked && previous.agentId !== 'orchestrator-mediator') {
    if (deadlock.resolution === 'breakdown') {
      return { turn: null, round: currentRound, outcome: buildImpasse(scenario, agents, turns), deadlock };
    }
    const intervention = buildDeadlockResolutionTurn(scenario, turns, currentRound, deadlock);
    return { turn: intervention, round: currentRound, outcome: null, deadlock };
  }

  const previousParticipantTurn = [...turns].reverse().find((turn) => turn.agentId !== 'orchestrator-mediator') || previous;
  const previousAgentIndex = Math.max(0, agents.findIndex((agent) => agent.id === previousParticipantTurn.agentId));
  const nextAgentIndex = (previousAgentIndex + 1) % agents.length;
  const round = nextAgentIndex === 0 ? currentRound + 1 : currentRound;
  if (round > scenario.orchestrator.maxRounds) {
    const deadlock = { ...deadlockFor(scenario, turns, currentRound), isDeadlocked: true, resolution: 'breakdown' as const };
    return { turn: null, round: currentRound, outcome: buildImpasse(scenario, agents, turns), deadlock };
  }

  const agent = agents[nextAgentIndex];
  const incoming = incomingOfferFor(scenario, agent, turns, previous);
  const evaluation = evaluateCounteroffer(agent, incoming, {
    round,
    maxRounds: scenario.orchestrator.maxRounds,
    turns,
    scenarioId: scenario.id,
  });
  const accepted = scenario.id === 'budget-allocation'
    ? agent.id === 'cfo-finance' && (roleAcceptsOffer(scenario, agent, round, turns, incoming) || evaluation.decision === 'accept')
    : roleAcceptsOffer(scenario, agent, round, turns, incoming) || evaluation.decision === 'accept';
  const rejected = !accepted && (evaluation.decision === 'reject' || round >= scenario.orchestrator.maxRounds);
  const generated = generateTurnDialogue(scenario, agents, round, nextAgentIndex, turns);
  const decision: NonNullable<NegotiationTurn['decision']> = accepted ? 'accept' : rejected ? 'reject' : 'counter';

  let speechText = generated.speechText;
  if (accepted) {
    speechText = `I have reviewed ${incoming.agentName}’s offer against my role’s constraints. The terms meet the required boundaries, so I accept. ${generated.speechText}`;
  } else if (rejected) {
    speechText = `I have reviewed ${incoming.agentName}’s final offer against my role’s constraints. It does not meet the required boundaries, so I must reject it. No agreement is recorded.`;
  } else if (incoming.offeredTerms?.length) {
    const context = incoming.offeredTerms.slice(0, 2).map((term) => `${term.label}: ${term.value}`).join('; ');
    speechText = `After reviewing ${incoming.agentName}’s proposal (${context}), ${generated.speechText}`;
  }

  const turn: NegotiationTurn = {
    ...generated,
    speechText,
    decision,
    decisionRationale: accepted
      ? (evaluation.decisionRationale || `Accepted after checking this role’s offer boundaries (evaluation signal ${evaluation.score}/100).`)
      : rejected
        ? (evaluation.decisionRationale || `Rejected at the round limit because the final offer did not satisfy the role’s boundaries (evaluation signal ${evaluation.score}/100).`)
        : (evaluation.decisionRationale || `Countered after checking ${agent.name}’s boundaries (evaluation signal ${evaluation.score}/100).`),
    evaluationScore: evaluation.score,
    respondingToTurnId: previous.id,
    concessionNote: generated.concessionNote || (round > 1 ? `Revised position in response to ${incoming.agentName}; offer boundaries checked before moving.` : 'Opening position; no concession made yet.'),
    offeredTerms: rejected ? undefined : generated.offeredTerms,
  };
  const nextTurns = [...turns, turn];
  const detected = deadlockFor(scenario, nextTurns, round);
  if (accepted) return { turn, round, outcome: generateSettlementSummary(scenario, agents), deadlock: detected };
  if (rejected) {
    return { turn, round, outcome: buildImpasse(scenario, agents, nextTurns), deadlock: { ...detected, isDeadlocked: true, resolution: 'breakdown' } };
  }
  if (detected.isDeadlocked && detected.resolution === 'breakdown') {
    return { turn, round, outcome: buildImpasse(scenario, agents, nextTurns), deadlock: detected };
  }
  return { turn, round, outcome: null, deadlock: detected };
}

export function simulateAutonomousNegotiation(scenario: ScenarioTemplate, agents: AgentConfig[]) {
  const turns: NegotiationTurn[] = [];
  let round = 1;
  let outcome: SettlementSummary | null = null;
  const maxTurns = scenario.orchestrator.maxRounds * Math.max(1, agents.length) + 1;

  for (let step = 0; step < maxTurns && !outcome; step += 1) {
    const result = advanceAutonomousNegotiation(scenario, agents, turns, round);
    round = result.round;
    if (result.turn) turns.push(result.turn);
    outcome = result.outcome;
  }
  if (!outcome) outcome = buildImpasse(scenario, agents, turns);
  return { turns, round, outcome };
}
