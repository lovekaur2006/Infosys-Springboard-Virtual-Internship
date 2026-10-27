/**
 * Unit tests for Counteroffer Evaluation & Concession Module
 */

import assert from 'node:assert/strict';
import { PREBUILT_SCENARIOS } from '../src/data/scenarios.ts';
import {
  evaluateCounteroffer,
  evaluateObjectives,
  evaluateConstraints,
  generateConcession,
  calculateConcessionMetrics,
  getRoleConcessionHistory,
} from '../src/services/counterofferEvaluation.ts';
import { NegotiationTurn } from '../src/types.ts';

console.log('Testing Counteroffer Evaluation & Concession Module...\n');

const vendorScenario = PREBUILT_SCENARIOS.find((s) => s.id === 'vendor-pricing')!;
const buyerAgent = vendorScenario.defaultAgents.find((a) => a.id === 'buyer-procurement')!;
const vendorAgent = vendorScenario.defaultAgents.find((a) => a.id === 'seller-account-exec')!;

const jobScenario = PREBUILT_SCENARIOS.find((s) => s.id === 'job-offer')!;
const candidateAgent = jobScenario.defaultAgents.find((a) => a.id === 'candidate-ai-lead')!;
const recruiterAgent = jobScenario.defaultAgents.find((a) => a.id === 'employer-vp-eng')!;

// TEST 1: Decision = 'counter' when offer has potential but requires modification
{
  const openingTurn: NegotiationTurn = {
    id: 'turn-1',
    round: 1,
    timestamp: '10:00',
    agentId: 'seller-account-exec',
    agentName: 'Vendor Agent',
    roleTitle: 'Supplier',
    personality: 'Aggressive',
    speechText: 'We propose ₹8,40,000 for a 2-year agreement.',
    offeredTerms: [
      { label: 'Proposed Price', value: '₹8,40,000/yr' },
      { label: 'Term Length', value: '2-Year Agreement' },
    ],
    sentiment: 'collaborative',
    leverageScore: 75,
  };

  const evalBuyer = evaluateCounteroffer(buyerAgent, openingTurn, { round: 1, maxRounds: 4 });
  assert.equal(evalBuyer.decision, 'counter', 'Buyer should counter an offer that exceeds budget ceiling in round 1');
  assert.ok(evalBuyer.score > 0, 'Score should be positive');
  assert.ok(['Workable', 'Risky'].includes(evalBuyer.label), 'Label should indicate counter potential');
  assert.ok(evalBuyer.decisionRationale.length > 10, 'Decision rationale should be detailed');
  assert.ok(evalBuyer.concessionRecommendation, 'Concession recommendation should be generated');
  assert.ok(evalBuyer.concessionRecommendation.suggestedTerms.length > 0, 'Suggested counteroffer terms should be provided');
  console.log('✔ Test 1 Passed: Correctly decides to COUNTER when terms need modification.');
}

// TEST 2: Decision = 'accept' when offer sufficiently satisfies objectives & constraints
{
  const compliantTurn: NegotiationTurn = {
    id: 'turn-3',
    round: 3,
    timestamp: '10:15',
    agentId: 'buyer-procurement',
    agentName: 'Buyer Agent',
    roleTitle: 'Procurement Manager',
    personality: 'Risk-Averse',
    speechText: 'OmniTrans can finalize at ₹8,00,000/year on a 2-year agreement with 1-year warranty and 99.99% SLA.',
    offeredTerms: [
      { label: 'Final Price', value: '₹8,00,000/yr' },
      { label: 'Duration', value: '2 Years' },
      { label: 'Warranty & Support', value: '1-Year Warranty Included' },
    ],
    sentiment: 'collaborative',
    leverageScore: 85,
  };

  // Vendor has price floor ₹8,00,000 and wants 2-year contract minimum
  const evalVendor = evaluateCounteroffer(vendorAgent, compliantTurn, { round: 3, maxRounds: 4 });
  assert.equal(evalVendor.decision, 'accept', 'Vendor should accept an offer meeting price floor and contract duration');
  assert.ok(evalVendor.score >= 70, 'Evaluation score should be favorable');
  assert.equal(evalVendor.label, 'Favorable');
  assert.ok(evalVendor.signals.every((s) => s.state === 'met'), 'All constraints should be met');
  console.log('✔ Test 2 Passed: Correctly decides to ACCEPT when objectives and constraints are satisfied.');
}

// TEST 3: Decision = 'reject' when offer is unacceptable or violates hard limits at round limit
{
  const unacceptableTurn: NegotiationTurn = {
    id: 'turn-final',
    round: 4,
    timestamp: '10:30',
    agentId: 'seller-account-exec',
    agentName: 'Vendor Agent',
    roleTitle: 'Supplier',
    personality: 'Aggressive',
    speechText: 'Our final and non-negotiable price is ₹9,20,000 with no warranty.',
    offeredTerms: [
      { label: 'Final Price', value: '₹9,20,000/yr' },
      { label: 'Warranty', value: 'Excluded' },
    ],
    sentiment: 'assertive',
    leverageScore: 60,
  };

  const evalBuyer = evaluateCounteroffer(buyerAgent, unacceptableTurn, { round: 4, maxRounds: 4, isFinalRound: true });
  assert.equal(evalBuyer.decision, 'reject', 'Buyer should reject an offer exceeding budget limit and omitting warranty at deadline');
  assert.equal(evalBuyer.label, 'Unacceptable');
  assert.ok(evalBuyer.decisionRationale.includes('violates') || evalBuyer.decisionRationale.includes('limit'), 'Rationale should cite violation or deadline');
  console.log('✔ Test 3 Passed: Correctly decides to REJECT when offer is unacceptable at deadline.');
}

// TEST 4: Objective evaluation reflects target metrics and primary goals
{
  const terms = [
    { label: 'Offered Base Salary', value: '₹9,20,000' },
    { label: 'Signing Bonus', value: '₹50,000' },
    { label: 'Work Arrangement', value: 'Full Remote' },
  ];
  const objEval = evaluateObjectives(candidateAgent, terms, 'We offer full remote flexibility and signing bonus.');
  assert.ok(objEval.score >= 80, 'Candidate should have high objective score for ₹9,20,000 + bonus + remote');
  assert.ok(objEval.signals.some((s) => s.status === 'satisfied'), 'Target metric should be marked satisfied');
  console.log('✔ Test 4 Passed: Objective evaluation accurately scores financial metrics and goal alignment.');
}

// TEST 5: Constraint evaluation distinguishes between met, at-risk, and violated
{
  const termsMet = [
    { label: 'Price', value: '₹7,80,000' },
    { label: 'Warranty', value: '1 Year Warranty Included' },
    { label: 'Support', value: '1 Year Full Support' },
  ];
  const constrEvalMet = evaluateConstraints(buyerAgent, termsMet, 'Warranty included', false);
  assert.equal(constrEvalMet.hasViolation, false, 'Should have no violations');
  assert.ok(constrEvalMet.signals.some((s) => s.constraint.includes('budget') && s.state === 'met'), 'Budget ceiling should be met');

  const termsGrossViolation = [
    { label: 'Price', value: '₹14,00,000' }, // 75% above ₹8,00,000
  ];
  const constrEvalViolated = evaluateConstraints(buyerAgent, termsGrossViolation, '', false);
  assert.equal(constrEvalViolated.hasViolation, true, 'Gross overage should be flagged as violation');
  console.log('✔ Test 5 Passed: Constraint signals accurately detect met, at-risk, and violated states.');
}

// TEST 6: Concession module generates personality-tailored recommendations
{
  const incomingOffer: NegotiationTurn = {
    id: 'turn-test',
    round: 1,
    timestamp: '10:00',
    agentId: 'seller',
    agentName: 'Seller',
    roleTitle: 'Vendor',
    personality: 'Aggressive',
    speechText: 'Price is ₹9,00,000.',
    offeredTerms: [{ label: 'Price', value: '₹9,00,000' }],
    sentiment: 'assertive',
    leverageScore: 70,
  };

  const evalMock: any = {};
  const aggressiveConcession = generateConcession(vendorAgent, incomingOffer, evalMock, 1, 4);
  assert.equal(aggressiveConcession.recommendedConcessionPercent, 5, 'Aggressive negotiator should recommend small concession');
  assert.ok(aggressiveConcession.tactic.includes('Anchored'), 'Aggressive tactic should be anchored');

  const collaborativeConcession = generateConcession(candidateAgent, incomingOffer, evalMock, 1, 4);
  assert.equal(collaborativeConcession.recommendedConcessionPercent, 15, 'Collaborative negotiator should recommend moderate concession');
  assert.ok(collaborativeConcession.tactic.includes('Integrative'), 'Collaborative tactic should be integrative');

  const riskAverseConcession = generateConcession(recruiterAgent, incomingOffer, evalMock, 1, 4);
  assert.equal(riskAverseConcession.recommendedConcessionPercent, 8, 'Risk-averse negotiator should recommend cautious concession');
  assert.ok(riskAverseConcession.tactic.includes('Safeguard'), 'Risk-averse tactic should prioritize safeguards');

  console.log('✔ Test 6 Passed: Concession engine tailors recommendations to personality matrices.');
}

// TEST 7: Concession tracking and reciprocity metrics
{
  const mockTurns: NegotiationTurn[] = [
    {
      id: 'turn-1',
      round: 1,
      timestamp: '10:00',
      agentId: 'buyer-procurement',
      agentName: 'Buyer',
      roleTitle: 'Procurement',
      personality: 'Risk-Averse',
      speechText: 'Open at 750,000',
      offeredTerms: [{ label: 'Price', value: '₹7,50,000' }],
      concessionNote: 'Initial opening anchor',
      sentiment: 'collaborative',
      leverageScore: 75,
    },
    {
      id: 'turn-2',
      round: 1,
      timestamp: '10:02',
      agentId: 'seller-account-exec',
      agentName: 'Vendor',
      roleTitle: 'Supplier',
      personality: 'Aggressive',
      speechText: 'Counter at 900,000',
      offeredTerms: [{ label: 'Price', value: '₹9,00,000' }],
      concessionNote: 'Defending margin',
      sentiment: 'assertive',
      leverageScore: 75,
    },
    {
      id: 'turn-3',
      round: 2,
      timestamp: '10:05',
      agentId: 'buyer-procurement',
      agentName: 'Buyer',
      roleTitle: 'Procurement',
      personality: 'Risk-Averse',
      speechText: 'Move to 800,000',
      offeredTerms: [{ label: 'Price', value: '₹8,00,000' }],
      concessionNote: 'Increased price by ₹50,000',
      sentiment: 'collaborative',
      leverageScore: 80,
    },
  ];

  const history = getRoleConcessionHistory(buyerAgent, mockTurns);
  assert.equal(history.length, 2, 'Should record 2 moves for buyer');
  assert.equal(history[1].deltaFromPrevious, 50000, 'Should measure delta of ₹50,000');

  const metrics = calculateConcessionMetrics(buyerAgent, mockTurns);
  assert.equal(metrics.totalConcessionsMade, 2);
  assert.ok(metrics.reciprocityRatio >= 0, 'Reciprocity ratio should be computed');
  console.log('✔ Test 7 Passed: Concession history and reciprocity metrics properly calculated.');
}

console.log('\nAll Counteroffer Evaluation & Concession Module tests passed successfully! 🎉');
