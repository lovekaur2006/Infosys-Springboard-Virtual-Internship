import assert from 'node:assert/strict';
import { PREBUILT_SCENARIOS } from '../src/data/scenarios.ts';
import { simulateAutonomousNegotiation } from '../src/services/autonomousNegotiation.ts';
import { detectDeadlock } from '../src/services/deadlockDetector.ts';

const expectedOffers: Record<string, RegExp> = {
  'vendor-pricing': /price|payment|SLA|support|ARR|deal status/i,
  'job-offer': /salary|base|bonus|work|remote|offer status|equity/i,
  'budget-allocation': /budget|allocation|SOC|reserve|phase/i,
};
const firstAmount = (turn: { offeredTerms?: { label: string; value: string }[] } | undefined, label: RegExp) => {
  const term = turn?.offeredTerms?.find((item) => label.test(item.label));
  const amount = term?.value.match(/[\d,]+/)?.[0];
  return amount ? Number(amount.replace(/,/g, '')) : null;
};

for (const scenario of PREBUILT_SCENARIOS) {
  const { turns, outcome } = simulateAutonomousNegotiation(scenario, scenario.defaultAgents);
  const scenarioName = scenario.title;

  assert.equal(outcome.status, 'settled', `${scenarioName} should reach agreement`);
  assert.ok(turns.length >= scenario.defaultAgents.length * 2, `${scenarioName} should include opening and revised turns`);
  assert.equal(turns[0].decision, 'opening', `${scenarioName} should begin with an opening position`);

  turns.forEach((turn, index) => {
    const expectedAgent = scenario.defaultAgents[index % scenario.defaultAgents.length];
    assert.equal(turn.agentId, expectedAgent.id, `${scenarioName} turn ${index + 1} should follow role order`);
    if (index > 0) {
      assert.equal(turn.respondingToTurnId, turns[index - 1].id, `${scenarioName} should retain immediate conversation context`);
      assert.ok(['accept', 'counter', 'reject'].includes(turn.decision || ''), `${scenarioName} turn ${index + 1} should record a decision`);
      assert.ok(turn.evaluationScore !== undefined && turn.evaluationScore >= 0 && turn.evaluationScore <= 100, `${scenarioName} should evaluate every incoming offer`);
    }
    if (turn.offeredTerms?.length) {
      assert.ok(expectedOffers[scenario.id].test(turn.offeredTerms.map((term) => `${term.label} ${term.value}`).join(' ')), `${scenarioName} turn ${index + 1} should generate scenario-specific terms: ${JSON.stringify(turn.offeredTerms)}`);
    }
  });

  assert.ok(turns.some((turn) => turn.decision === 'counter'), `${scenarioName} should counter before resolution`);
  assert.equal(turns.at(-1)?.decision, 'accept', `${scenarioName} should end on acceptance`);
  assert.ok(turns.some((turn) => turn.round > 1 && turn.concessionNote), `${scenarioName} should record concessions after round one`);

  if (scenario.id === 'vendor-pricing') {
    const buyerTurns = turns.filter((turn) => turn.agentId === 'buyer-procurement');
    assert.ok((firstAmount(buyerTurns[1], /price/i) || 0) > (firstAmount(buyerTurns[0], /price/i) || 0), 'Buyer should make a measured upward price concession.');
    assert.ok(buyerTurns[1].concessionNote, 'Buyer concession should be explained in the transcript.');
  } else if (scenario.id === 'job-offer') {
    const candidateTurns = turns.filter((turn) => turn.agentId === 'candidate-ai-lead');
    assert.ok((firstAmount(candidateTurns[1], /base/i) || 0) < (firstAmount(candidateTurns[0], /base/i) || 0), 'Candidate should make a measured base-salary concession.');
  } else {
    const allocationRoles: [string, RegExp][] = [['product-lead', /budget/i], ['infra-lead', /budget/i]];
    for (const [agentId, label] of allocationRoles) {
      const roleTurns = turns.filter((turn) => turn.agentId === agentId);
      assert.ok((firstAmount(roleTurns[1], label) || 0) < (firstAmount(roleTurns[0], label) || 0), `${agentId} should make a measured allocation concession.`);
    }
  }
  console.log(`PASS ${scenarioName}: ${turns.length} turns, ${outcome.status}, score ${outcome.agreementScore}`);
}

const vendorScenario = PREBUILT_SCENARIOS.find((scenario) => scenario.id === 'vendor-pricing')!;
const shortDeadline = { ...vendorScenario, orchestrator: { ...vendorScenario.orchestrator, maxRounds: 2 } };
const rejectedRun = simulateAutonomousNegotiation(shortDeadline, shortDeadline.defaultAgents);
assert.equal(rejectedRun.outcome.status, 'impasse', 'A missed deadline should end in an impasse.');
assert.equal(rejectedRun.turns.at(-1)?.decision, 'reject', 'The final role should explicitly reject an unresolved offer.');
console.log('PASS Rejection path: explicit reject and impasse at the round limit');

const stalledTurns = [1, 2, 3].map((round) => ({
  id: `stalled-${round}`,
  round,
  timestamp: '10:00',
  agentId: 'buyer',
  agentName: 'Buyer',
  roleTitle: 'Procurement',
  personality: 'Collaborative' as const,
  speechText: 'Our position remains unchanged.',
  offeredTerms: [{ label: 'Price', value: '₹800,000' }],
  sentiment: 'assertive' as const,
  leverageScore: 50,
  decision: 'reject' as const,
}));
const deadlock = detectDeadlock(stalledTurns, 3, 3, { unchangedOfferLimit: 3, repeatedRejectionLimit: 2, repeatedPositionLimit: 2 });
assert.equal(deadlock.isDeadlocked, true, 'Stalled offers should be detected.');
assert.ok(deadlock.reasons.includes('no_meaningful_offer_change'), 'Unchanged offers should be identified.');
assert.ok(deadlock.reasons.includes('repeated_rejection'), 'Repeated rejections should be identified.');
assert.ok(deadlock.reasons.includes('repeated_position'), 'Repeated positions should be identified.');
assert.ok(deadlock.reasons.includes('maximum_rounds_reached'), 'Round limits should be identified.');
assert.equal(deadlock.resolution, 'compromise_proposal', 'First intervention should be a compromise proposal.');
console.log('PASS Deadlock detector: unchanged offers, rejections, repeated positions, and round limit');
