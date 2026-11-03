/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comprehensive Test Suite for Human vs AI Practice Mode
 * Validates:
 * 1. All three predefined negotiation scenarios (Vendor Pricing, Job Offer, Budget Allocation)
 * 2. Different types of human offers and counteroffers (full terms, partial, speech-only, counteroffers)
 * 3. AI agents responding according to assigned roles and objectives
 * 4. Non-generic, dynamic responses reflecting human figures and context
 * 5. Influence of previous negotiation context across turns
 * 6. Cooperative, aggressive, unreasonable, and changing human strategies
 * 7. Deadlock detection and resolution triggering
 * 8. Logical consistency of negotiation outcomes (settled vs impasse)
 */

import assert from 'node:assert/strict';
import { PREBUILT_SCENARIOS } from '../src/data/scenarios.ts';
import {
  generateAIResponseToUserInput,
  generateSettlementSummary,
} from '../src/services/negotiationEngine.ts';
import { buildImpasse } from '../src/services/autonomousNegotiation.ts';
import { detectDeadlock } from '../src/services/deadlockDetector.ts';
import { NegotiationTurn } from '../src/types.ts';

console.log('================================================================');
console.log('  RUNNING HUMAN VS AI PRACTICE MODE VALIDATION TEST SUITE');
console.log('================================================================\n');

// Retrieve all 3 prebuilt scenarios
const vendorScenario = PREBUILT_SCENARIOS.find((s) => s.id === 'vendor-pricing')!;
const jobScenario = PREBUILT_SCENARIOS.find((s) => s.id === 'job-offer')!;
const budgetScenario = PREBUILT_SCENARIOS.find((s) => s.id === 'budget-allocation')!;

assert.ok(vendorScenario, 'Scenario 1 (Vendor Pricing) must exist');
assert.ok(jobScenario, 'Scenario 2 (Job Offer) must exist');
assert.ok(budgetScenario, 'Scenario 3 (Budget Allocation) must exist');

// ============================================================================
// SUITE 1: SCENARIO 1 - VENDOR PRICING NEGOTIATION
// ============================================================================
console.log('--- TEST GROUP 1: Vendor Pricing Negotiation (Human Buyer vs AI Vendor) ---');
{
  const buyer = vendorScenario.defaultAgents.find((a) => a.id === 'buyer-procurement')!;
  const vendor = vendorScenario.defaultAgents.find((a) => a.id === 'seller-account-exec')!;
  const maxRounds = vendorScenario.orchestrator.maxRounds;

  // TEST 1.1: Aggressive Human Strategy -> AI Vendor stands firm on margin floor
  {
    const history: NegotiationTurn[] = [];
    const aggressiveMsg = 'We demand ₹7,20,000 per year or we walk away immediately. Take it or leave it.';
    const terms = [{ label: 'Proposed Price', value: '₹7,20,000' }];

    const aiResponse = generateAIResponseToUserInput(
      vendorScenario,
      vendorScenario.defaultAgents,
      vendor.id,
      aggressiveMsg,
      terms,
      1,
      history
    );

    assert.equal(aiResponse.agentId, vendor.id, 'AI respondent must be Vendor');
    assert.equal(aiResponse.decision, 'counter', 'Vendor should counter aggressive under-floor offer');
    assert.ok(aiResponse.sentiment === 'assertive' || aiResponse.sentiment === 'defensive', 'Sentiment must be assertive or defensive');
    assert.ok(aiResponse.speechText.includes('8,00,000') || aiResponse.speechText.includes('floor') || aiResponse.speechText.includes('7,20,000'), 'AI response must cite margin floor or human offer amount');
    assert.ok(aiResponse.offeredTerms && aiResponse.offeredTerms.length > 0, 'AI must return structured counter terms');
    console.log('✔ Test 1.1 Passed: AI Vendor firmly defends ₹8,00,000 floor against aggressive human down-pricing.');
  }

  // TEST 1.2: Unreasonable Human Strategy -> Gross violation of floor
  {
    const history: NegotiationTurn[] = [];
    const unreasonableMsg = 'Our final offer is ₹4,00,000 per year for 5 years.';
    const terms = [{ label: 'Proposed Price', value: '₹4,00,000' }];

    const aiResponse = generateAIResponseToUserInput(
      vendorScenario,
      vendorScenario.defaultAgents,
      vendor.id,
      unreasonableMsg,
      terms,
      1,
      history
    );

    assert.equal(aiResponse.decision, 'counter', 'Vendor should counter in round 1 flagging violation');
    assert.ok(aiResponse.evaluationScore !== undefined && aiResponse.evaluationScore < 65, 'Evaluation score should be low for gross violation');
    assert.ok(aiResponse.speechText.toLowerCase().includes('below') || aiResponse.speechText.toLowerCase().includes('floor'), 'Speech must explicitly flag violation of operational floor');
    console.log('✔ Test 1.2 Passed: AI Vendor correctly detects unreasonable offer and explains boundary violation.');
  }

  // TEST 1.3: Changing / Backtracking Strategy -> AI Vendor notes reversal of progress
  {
    const history: NegotiationTurn[] = [
      {
        id: 'turn-user-1',
        round: 1,
        timestamp: '10:00',
        agentId: buyer.id,
        agentName: 'Buyer Agent (You)',
        roleTitle: buyer.roleTitle,
        personality: buyer.personality,
        speechText: 'We can offer ₹7,90,000.',
        offeredTerms: [{ label: 'Price', value: '₹7,90,000' }],
        sentiment: 'collaborative',
        leverageScore: 75,
      },
      {
        id: 'turn-ai-1',
        round: 1,
        timestamp: '10:01',
        agentId: vendor.id,
        agentName: vendor.name,
        roleTitle: vendor.roleTitle,
        personality: vendor.personality,
        speechText: 'We can meet at ₹8,20,000.',
        offeredTerms: [{ label: 'Revised Price', value: '₹8,20,000' }],
        sentiment: 'collaborative',
        leverageScore: 78,
      },
    ];

    // User backtracks from 7,90,000 to 7,40,000
    const backtrackingMsg = 'Actually, our CFO reduced our budget to ₹7,40,000.';
    const backtrackingTerms = [{ label: 'Price', value: '₹7,40,000' }];

    const aiResponse = generateAIResponseToUserInput(
      vendorScenario,
      vendorScenario.defaultAgents,
      vendor.id,
      backtrackingMsg,
      backtrackingTerms,
      2,
      history
    );

    assert.equal(aiResponse.decision, 'counter');
    assert.ok(aiResponse.speechText.includes('7,40,000') || aiResponse.speechText.toLowerCase().includes('back') || aiResponse.speechText.toLowerCase().includes('previous'), 'Speech must reference user shift or prior offer');
    console.log('✔ Test 1.3 Passed: AI Vendor identifies human backtracking from previous concession.');
  }

  // TEST 1.4: Cooperative Strategy -> AI Vendor agrees to fair terms within deal zone
  {
    const history: NegotiationTurn[] = [
      {
        id: 'turn-user-1',
        round: 1,
        timestamp: '10:00',
        agentId: buyer.id,
        agentName: 'Buyer Agent (You)',
        roleTitle: buyer.roleTitle,
        personality: buyer.personality,
        speechText: 'We propose ₹7,80,000 for 2 years.',
        offeredTerms: [{ label: 'Price', value: '₹7,80,000' }],
        sentiment: 'collaborative',
        leverageScore: 75,
      },
    ];

    const cooperativeMsg = 'We want to find a win-win partnership. We agree to ₹8,00,000/year on a 2-year agreement with 1-year warranty and Net-45 payment terms.';
    const terms = [
      { label: 'Proposed Price', value: '₹8,00,000/yr' },
      { label: 'Contract Term', value: '2 Years' },
      { label: 'Warranty & Support', value: '1 Year Full Warranty' },
    ];

    const aiResponse = generateAIResponseToUserInput(
      vendorScenario,
      vendorScenario.defaultAgents,
      vendor.id,
      cooperativeMsg,
      terms,
      2,
      history
    );

    assert.equal(aiResponse.decision, 'accept', 'Vendor should accept compliant offer meeting ₹8,00,000 floor and 2-yr commitment');
    assert.equal(aiResponse.sentiment, 'collaborative');
    assert.ok(aiResponse.speechText.toLowerCase().includes('constructiv') || aiResponse.speechText.toLowerCase().includes('alignment') || aiResponse.speechText.toLowerCase().includes('agreement'), 'Speech must confirm agreement');
    assert.ok(aiResponse.offeredTerms?.some((t) => t.value === 'ACCEPTED' || t.label.includes('Agreed')), 'Counter terms must confirm deal acceptance');
    console.log('✔ Test 1.4 Passed: AI Vendor successfully accepts cooperative human offer meeting core objectives.');
  }
}

// ============================================================================
// SUITE 2: SCENARIO 2 - JOB OFFER NEGOTIATION
// ============================================================================
console.log('\n--- TEST GROUP 2: Job Offer Negotiation (Human Candidate vs AI Recruiter) ---');
{
  const candidate = jobScenario.defaultAgents.find((a) => a.id === 'candidate-ai-lead')!;
  const recruiter = jobScenario.defaultAgents.find((a) => a.id === 'employer-vp-eng')!;
  const maxRounds = jobScenario.orchestrator.maxRounds;

  // TEST 2.1: Unreasonable Human Demand -> Exceeds Grade L6 salary band cap
  {
    const history: NegotiationTurn[] = [];
    const extremeSalaryMsg = 'My expected base salary is ₹14,00,000 non-negotiable.';
    const terms = [{ label: 'Expected Base', value: '₹14,00,000' }];

    const aiResponse = generateAIResponseToUserInput(
      jobScenario,
      jobScenario.defaultAgents,
      recruiter.id,
      extremeSalaryMsg,
      terms,
      1,
      history
    );

    assert.equal(aiResponse.agentId, recruiter.id, 'AI respondent must be Recruiter');
    assert.equal(aiResponse.decision, 'counter', 'Recruiter should counter to protect band ceiling in round 1');
    assert.ok(aiResponse.speechText.includes('9,00,000') || aiResponse.speechText.toLowerCase().includes('band') || aiResponse.speechText.toLowerCase().includes('ceiling'), 'Recruiter must cite salary band ceiling');
    assert.ok(aiResponse.offeredTerms?.some((t) => t.label.includes('Base') || t.label.includes('Signing Bonus')), 'Recruiter must offer alternative incentives');
    console.log('✔ Test 2.1 Passed: AI Recruiter defends corporate compensation band against excessive human salary demand.');
  }

  // TEST 2.2: Speech-only Offer -> Extracts amount and responds dynamically
  {
    const history: NegotiationTurn[] = [];
    // User provides text without setting separate terms fields
    const speechOnlyMsg = 'I am looking for ₹8,80,000 with remote flexibility.';

    const aiResponse = generateAIResponseToUserInput(
      jobScenario,
      jobScenario.defaultAgents,
      recruiter.id,
      speechOnlyMsg,
      undefined, // No structured terms
      1,
      history
    );

    assert.ok(aiResponse.evaluationScore !== undefined && aiResponse.evaluationScore > 0, 'Evaluation score must be computed from speech amounts');
    assert.ok(aiResponse.speechText.length > 30, 'Response must be substantial');
    assert.ok(aiResponse.offeredTerms && aiResponse.offeredTerms.length > 0, 'AI must formulate structured terms even when human only provided speech');
    console.log('✔ Test 2.2 Passed: AI correctly parses speech-only human proposal and synthesizes structured response.');
  }

  // TEST 2.3: Final Round Rejection on Unresolved Over-Band Demand
  {
    const history: NegotiationTurn[] = [
      {
        id: 'turn-1',
        round: 1,
        timestamp: '10:00',
        agentId: candidate.id,
        agentName: 'Candidate (You)',
        roleTitle: candidate.roleTitle,
        personality: candidate.personality,
        speechText: 'I demand ₹12,00,000.',
        offeredTerms: [{ label: 'Salary', value: '₹12,00,000' }],
        sentiment: 'assertive',
        leverageScore: 70,
      },
      {
        id: 'turn-2',
        round: 2,
        timestamp: '10:05',
        agentId: candidate.id,
        agentName: 'Candidate (You)',
        roleTitle: candidate.roleTitle,
        personality: candidate.personality,
        speechText: 'Still ₹12,00,000 or I walk.',
        offeredTerms: [{ label: 'Salary', value: '₹12,00,000' }],
        sentiment: 'assertive',
        leverageScore: 70,
      },
    ];

    const finalUnreasonableMsg = 'Final round: ₹12,00,000 base salary, no compromise.';
    const terms = [{ label: 'Salary', value: '₹12,00,000' }];

    const aiResponse = generateAIResponseToUserInput(
      jobScenario,
      jobScenario.defaultAgents,
      recruiter.id,
      finalUnreasonableMsg,
      terms,
      maxRounds, // Final round
      history
    );

    assert.equal(aiResponse.decision, 'reject', 'Recruiter must reject over-band demand at final round limit');
    assert.ok(aiResponse.speechText.toLowerCase().includes('reject') || aiResponse.speechText.toLowerCase().includes('decline') || aiResponse.speechText.toLowerCase().includes('withdraw'), 'Speech must confirm rejection');
    console.log('✔ Test 2.3 Passed: AI Recruiter enforces band boundaries and rejects unviable offer at deadline.');
  }

  // TEST 2.4: Cooperative Agreement Reached Within Band
  {
    const history: NegotiationTurn[] = [];
    const cooperativeMsg = 'I appreciate your constraints. Let us agree on ₹8,60,000 base salary with ₹40,000 signing bonus and 2 days remote flexibility.';
    const terms = [
      { label: 'Base Salary', value: '₹8,60,000' },
      { label: 'Signing Bonus', value: '₹40,000' },
      { label: 'Work Model', value: 'Hybrid (2 Days WFH)' },
    ];

    const aiResponse = generateAIResponseToUserInput(
      jobScenario,
      jobScenario.defaultAgents,
      recruiter.id,
      cooperativeMsg,
      terms,
      2,
      history
    );

    assert.equal(aiResponse.decision, 'accept', 'Recruiter should accept candidate terms matching band guidelines');
    assert.ok(aiResponse.speechText.includes('welcome') || aiResponse.speechText.includes('agreement') || aiResponse.speechText.includes('formalizing'), 'Speech must be welcoming and confirm offer acceptance');
    console.log('✔ Test 2.4 Passed: AI Recruiter accepts balanced compensation package within corporate guidelines.');
  }
}

// ============================================================================
// SUITE 3: SCENARIO 3 - PROJECT BUDGET ALLOCATION
// ============================================================================
console.log('\n--- TEST GROUP 3: Project Budget Allocation (Human Product Lead vs AI CFO) ---');
{
  const productLead = budgetScenario.defaultAgents.find((a) => a.id === 'product-lead')!;
  const cfo = budgetScenario.defaultAgents.find((a) => a.id === 'cfo-finance')!;
  const infraLead = budgetScenario.defaultAgents.find((a) => a.id === 'infra-lead')!;
  const maxRounds = budgetScenario.orchestrator.maxRounds;

  // TEST 3.1: Excessive Budget Request -> CFO defends aggregate ceiling & buffer
  {
    const history: NegotiationTurn[] = [];
    const excessiveMsg = 'Product Innovation requires ₹12,00,000 upfront for immediate full rollout.';
    const terms = [{ label: 'Product Allocation', value: '₹12,00,000' }];

    const aiResponse = generateAIResponseToUserInput(
      budgetScenario,
      budgetScenario.defaultAgents,
      cfo.id,
      excessiveMsg,
      terms,
      1,
      history
    );

    assert.equal(aiResponse.agentId, cfo.id, 'AI respondent must be CFO');
    console.log('DEBUG Test 3.1:', { speech: aiResponse.speechText, terms: aiResponse.offeredTerms, decision: aiResponse.decision });
    assert.equal(aiResponse.decision, 'counter', 'CFO should counter excessive single-department request');
    assert.ok(aiResponse.speechText.includes('14,00,000') || aiResponse.speechText.includes('pool') || aiResponse.speechText.includes('buffer'), 'CFO must cite total capex pool or reserve buffer');
    console.log('✔ Test 3.1 Passed: AI CFO defends aggregate capex ceiling and contingency reserve.');
  }

  // TEST 3.2: Balanced Tripartite Compromise -> CFO Approves Allocation Decree
  {
    const history: NegotiationTurn[] = [];
    const balancedMsg = 'We propose ₹7,50,000 for Product Innovation and ₹6,50,000 for Infrastructure, preserving the ₹1,00,000 reserve buffer.';
    const terms = [
      { label: 'Product Allocation', value: '₹7,50,000' },
      { label: 'Infra Allocation', value: '₹6,50,000' },
      { label: 'Total Allocation', value: '₹14,00,000' },
    ];

    const aiResponse = generateAIResponseToUserInput(
      budgetScenario,
      budgetScenario.defaultAgents,
      cfo.id,
      balancedMsg,
      terms,
      2,
      history
    );

    assert.equal(aiResponse.decision, 'accept', 'CFO must approve allocation staying within ₹14,00,000 capex pool');
    assert.ok(aiResponse.speechText.toLowerCase().includes('decree') || aiResponse.speechText.toLowerCase().includes('approval') || aiResponse.speechText.toLowerCase().includes('reserve'), 'CFO must decree allocation approval');
    assert.ok(aiResponse.offeredTerms?.some((t) => t.value.includes('APPROVED') || t.label.includes('Total Capex')), 'Terms must confirm approved capex');
    console.log('✔ Test 3.2 Passed: AI CFO approves balanced multi-department allocation.');
  }
}

// ============================================================================
// SUITE 4: DEADLOCK DETECTION & RESOLUTION IN PRACTICE MODE
// ============================================================================
console.log('\n--- TEST GROUP 4: Deadlock Detection & Resolution in Practice Mode ---');
{
  // TEST 4.1: Stagnation Detection (3 consecutive unchanged human offers)
  {
    const repeatedTurns: NegotiationTurn[] = [
      {
        id: 'turn-h-1',
        round: 1,
        timestamp: '10:00',
        agentId: 'buyer-procurement',
        agentName: 'Buyer (You)',
        roleTitle: 'Procurement',
        personality: 'Aggressive',
        speechText: 'Our price is ₹7,50,000.',
        offeredTerms: [{ label: 'Price', value: '₹7,50,000' }],
        sentiment: 'assertive',
        leverageScore: 70,
      },
      {
        id: 'turn-ai-1',
        round: 1,
        timestamp: '10:01',
        agentId: 'seller-account-exec',
        agentName: 'Vendor Agent',
        roleTitle: 'Supplier',
        personality: 'Aggressive',
        speechText: 'Our price is ₹8,40,000.',
        offeredTerms: [{ label: 'Price', value: '₹8,40,000' }],
        sentiment: 'assertive',
        leverageScore: 70,
      },
      {
        id: 'turn-h-2',
        round: 2,
        timestamp: '10:02',
        agentId: 'buyer-procurement',
        agentName: 'Buyer (You)',
        roleTitle: 'Procurement',
        personality: 'Aggressive',
        speechText: 'No change, still ₹7,50,000.',
        offeredTerms: [{ label: 'Price', value: '₹7,50,000' }],
        sentiment: 'assertive',
        leverageScore: 70,
      },
      {
        id: 'turn-h-3',
        round: 3,
        timestamp: '10:04',
        agentId: 'buyer-procurement',
        agentName: 'Buyer (You)',
        roleTitle: 'Procurement',
        personality: 'Aggressive',
        speechText: 'Still ₹7,50,000.',
        offeredTerms: [{ label: 'Price', value: '₹7,50,000' }],
        sentiment: 'assertive',
        leverageScore: 70,
      },
    ];

    // Detect deadlock with unchangedOfferLimit = 3
    const deadlockStatus = detectDeadlock(repeatedTurns, 3, 4, { unchangedOfferLimit: 3 });
    assert.equal(deadlockStatus.isDeadlocked, true, 'Deadlock should trigger on 3 unchanged offers');
    assert.ok(deadlockStatus.reasons.includes('repeated_position') || deadlockStatus.reasons.includes('no_meaningful_offer_change'), 'Reason must identify stagnation or repeated position');
    assert.ok(['compromise_proposal', 'modify_stance'].includes(deadlockStatus.resolution), 'Resolution must escalate to compromise or stance modification');
    console.log('✔ Test 4.1 Passed: Deadlock detector correctly identifies repeated offers and triggers resolution strategy.');
  }

  // TEST 4.2: Repeated Rejections -> Trigger stance modification or final round
  {
    const rejectionTurns: NegotiationTurn[] = [
      {
        id: 'turn-1',
        round: 1,
        timestamp: '10:00',
        agentId: 'buyer',
        agentName: 'Buyer (You)',
        roleTitle: 'Procurement',
        personality: 'Aggressive',
        speechText: 'Rejected.',
        offeredTerms: [{ label: 'Price', value: '₹7,00,000' }],
        sentiment: 'assertive',
        leverageScore: 60,
        decision: 'reject',
      },
      {
        id: 'turn-2',
        round: 2,
        timestamp: '10:02',
        agentId: 'buyer',
        agentName: 'Buyer (You)',
        roleTitle: 'Procurement',
        personality: 'Aggressive',
        speechText: 'Rejected again.',
        offeredTerms: [{ label: 'Price', value: '₹7,00,000' }],
        sentiment: 'assertive',
        leverageScore: 60,
        decision: 'reject',
      },
    ];

    const deadlockStatus = detectDeadlock(rejectionTurns, 2, 4, { repeatedRejectionLimit: 2 });
    assert.equal(deadlockStatus.isDeadlocked, true, 'Deadlock should trigger on repeated rejections');
    assert.ok(deadlockStatus.reasons.includes('repeated_rejection'), 'Reason must include repeated_rejection');
    console.log('✔ Test 4.2 Passed: Repeated proposal rejections trigger mediator intervention.');
  }

  // TEST 4.3: Round Limit Reached -> Triggers maximum_rounds_reached
  {
    const finalRoundTurns: NegotiationTurn[] = [
      {
        id: 'turn-1',
        round: 4,
        timestamp: '10:00',
        agentId: 'buyer',
        agentName: 'Buyer',
        roleTitle: 'Procurement',
        personality: 'Collaborative',
        speechText: 'At round 4.',
        offeredTerms: [{ label: 'Price', value: '₹8,00,000' }],
        sentiment: 'collaborative',
        leverageScore: 80,
      },
    ];

    const deadlockStatus = detectDeadlock(finalRoundTurns, 4, 4);
    assert.equal(deadlockStatus.isDeadlocked, true, 'Deadlock should trigger at maximum allowed rounds');
    assert.ok(deadlockStatus.reasons.includes('maximum_rounds_reached'), 'Reason must include maximum_rounds_reached');
    console.log('✔ Test 4.3 Passed: Maximum allowed rounds reached triggers timeout resolution.');
  }
}

// ============================================================================
// SUITE 5: LOGICAL CONSISTENCY OF OUTCOMES
// ============================================================================
console.log('\n--- TEST GROUP 5: Logical Consistency of Negotiation Outcomes ---');
{
  // TEST 5.1: Agreement Reached -> Settlement summary has status 'settled' & high score
  {
    const settled = generateSettlementSummary(vendorScenario, vendorScenario.defaultAgents);
    assert.equal(settled.status, 'settled', 'Settlement summary must have settled status');
    assert.ok(settled.agreementScore >= 85, 'Settled agreement score must be high (>= 85)');
    assert.ok(settled.keyTerms.length >= 3, 'Key terms must be documented');
    assert.ok(settled.constraintCompliance.every((c) => c.compliant), 'All agents must be compliant in settled agreement');
    console.log('✔ Test 5.1 Passed: Settled agreement produces high agreement score and full constraint compliance.');
  }

  // TEST 5.2: Impasse / Breakdown Reached -> Impasse summary has status 'impasse' & score 0
  {
    const failedTurns: NegotiationTurn[] = [
      {
        id: 'turn-unresolved',
        round: 4,
        timestamp: '10:00',
        agentId: 'buyer-procurement',
        agentName: 'Buyer Agent',
        roleTitle: 'Procurement',
        personality: 'Aggressive',
        speechText: 'Non-negotiable offer: ₹7,00,000.',
        offeredTerms: [{ label: 'Price', value: '₹7,00,000' }],
        sentiment: 'assertive',
        leverageScore: 50,
        decision: 'reject',
      },
    ];

    const impasse = buildImpasse(vendorScenario, vendorScenario.defaultAgents, failedTurns);
    assert.equal(impasse.status, 'impasse', 'Failed negotiation must have status impasse');
    assert.equal(impasse.agreementScore, 0, 'Impasse agreement score must be 0');
    assert.ok(impasse.title.toLowerCase().includes('no agreement'), 'Impasse title must state no agreement reached');
    assert.ok(impasse.constraintCompliance.every((c) => !c.compliant), 'Constraint compliance must reflect non-compliance on impasse');
    console.log('✔ Test 5.2 Passed: Impasse consistently records failed agreement, 0 score, and non-compliance.');
  }
}

console.log('\n================================================================');
console.log('  ALL HUMAN VS AI PRACTICE MODE VALIDATION TESTS PASSED! 🎉');
console.log('================================================================');
