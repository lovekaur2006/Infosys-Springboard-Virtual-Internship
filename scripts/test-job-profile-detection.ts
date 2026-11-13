/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import assert from 'node:assert/strict';
import { PREBUILT_SCENARIOS } from '../src/data/scenarios.ts';
import {
  detectJobProfile,
  generateJobOfferConfig,
  STANDARD_JOB_ROLES,
  STANDARD_JOB_LEVELS,
} from '../src/services/jobProfileDetector.ts';
import { generateAIResponseToUserInput } from '../src/services/negotiationEngine.ts';
import { evaluateCounteroffer } from '../src/services/counterofferEvaluation.ts';

console.log('================================================================');
console.log('  TESTING AI JOB ROLE PROFILE DETECTION & AUTO-CONFIGURATION');
console.log('================================================================\n');

const jobScenario = PREBUILT_SCENARIOS.find((s) => s.id === 'job-offer')!;
assert.ok(jobScenario, 'Job offer scenario must exist');

// ----------------------------------------------------------------------------
// SUITE 1: Natural Language & Structured Profile Detection
// ----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: Profile Detection from Structured & Free-Text Inputs ---');

{
  // Test 1.1: Structured selection
  const profile = detectJobProfile({ role: 'Data Scientist', level: 'Senior' });
  assert.equal(profile.role, 'Data Scientist');
  assert.equal(profile.level, 'Senior');
  assert.equal(profile.fullTitle, 'Senior Data Scientist');
  assert.equal(profile.department, 'AI & Data Intelligence');
  assert.ok(profile.benchmarks.candidateFloor > 900000, 'Senior Data Scientist floor should reflect market benchmark');
  assert.ok(profile.benchmarks.recruiterMax >= profile.benchmarks.candidateFloor, 'Recruiter max should overlap candidate floor');
  console.log('✔ Test 1.1 Passed: Structured profile detection accurately resolves Senior Data Scientist.');
}

{
  // Test 1.2: Free-text natural language detection for junior role
  const text = 'Looking for an entry-level frontend developer with React knowledge';
  const profile = detectJobProfile(text);
  assert.equal(profile.level, 'Entry-level');
  assert.equal(profile.role, 'Software Engineer');
  assert.equal(profile.fullTitle, 'Entry-level Software Engineer');
  assert.ok(profile.benchmarks.candidateTarget < 800000, 'Entry level compensation should be calibrated below mid/senior');
  console.log('✔ Test 1.2 Passed: Natural language parser extracts Entry-level Software Engineer.');
}

{
  // Test 1.3: Free-text detection for executive / leadership role
  const text = 'We need a Vice President of Cybersecurity to oversee our SOC operations';
  const profile = detectJobProfile(text);
  assert.equal(profile.level, 'Vice President');
  assert.equal(profile.role, 'Cybersecurity Analyst');
  assert.equal(profile.fullTitle, 'Vice President Cybersecurity Analyst');
  assert.ok(profile.benchmarks.candidateFloor >= 2000000, 'VP level floor should exceed ₹20,00,000');
  console.log('✔ Test 1.3 Passed: Natural language parser extracts VP of Cybersecurity with executive benchmarks.');
}

{
  // Test 1.4: Intern role detection
  const text = 'Summer Intern for Product Management';
  const profile = detectJobProfile(text);
  assert.equal(profile.level, 'Intern');
  assert.equal(profile.role, 'Product Manager');
  assert.ok(profile.benchmarks.candidateFloor <= 400000, 'Intern compensation should be calibrated appropriately');
  console.log('✔ Test 1.4 Passed: Intern profile accurately calibrated with stipend-level benchmarks.');
}

// ----------------------------------------------------------------------------
// SUITE 2: Automatic Agent & Scenario Configuration
// ----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Automatic Configuration of Agents & Negotiation Context ---');

{
  // Test 2.1: Auto-configure Lead / Principal Software Engineer
  const profile = detectJobProfile({ role: 'Software Engineer', level: 'Lead / Principal' });
  const { scenario: updatedScenario, agents: updatedAgents } = generateJobOfferConfig(
    jobScenario,
    jobScenario.defaultAgents,
    profile
  );

  const candidate = updatedAgents.find((a) => a.id === 'candidate-ai-lead')!;
  const recruiter = updatedAgents.find((a) => a.id === 'employer-vp-eng')!;

  assert.equal(candidate.roleTitle, 'Lead / Principal Software Engineer');
  assert.ok(candidate.primaryGoal.includes('Lead / Principal Software Engineer') || candidate.primaryGoal.includes('Secure competitive'));
  assert.ok(candidate.targetMetric.includes(profile.benchmarks.candidateFloor.toLocaleString('en-IN')), 'Candidate metric must include calibrated floor');
  assert.ok(candidate.keyConstraints.some((c) => c.includes(profile.benchmarks.candidateFloor.toLocaleString('en-IN'))), 'Candidate constraints must enforce calibrated floor');
  assert.ok(candidate.openingStance && candidate.openingStance.includes('Lead / Principal Software Engineer'), 'Candidate opening stance must reflect full title');

  assert.ok(recruiter.primaryGoal.includes('Lead / Principal Software Engineer'), 'Recruiter goal must target the specific role');
  assert.ok(recruiter.targetMetric.includes(profile.benchmarks.recruiterMax.toLocaleString('en-IN')), 'Recruiter metric must include calibrated ceiling');
  assert.ok(recruiter.keyConstraints.some((c) => c.includes(profile.benchmarks.recruiterMax.toLocaleString('en-IN'))), 'Recruiter constraints must enforce calibrated ceiling');
  assert.ok(recruiter.openingStance && recruiter.openingStance.includes('Lead / Principal Software Engineer'), 'Recruiter opening stance must reflect full title');

  assert.ok(updatedScenario.detailedContext.includes('Lead / Principal Software Engineer'), 'Scenario context must update');
  assert.ok(updatedScenario.agentRolesText && updatedScenario.agentRolesText.includes('Lead / Principal Software Engineer'), 'Scenario agent roles must update');
  assert.ok(updatedScenario.orchestrator.arbitrationRules.some((r) => r.includes(profile.benchmarks.recruiterMax.toLocaleString('en-IN'))), 'Arbitration rules must enforce calibrated ceiling');

  console.log('✔ Test 2.1 Passed: Both Candidate and Recruiter agents are fully auto-configured for Lead / Principal.');
}

{
  // Test 2.2: Auto-configure Intern Data Scientist
  const profile = detectJobProfile({ role: 'Data Scientist', level: 'Intern' });
  const { agents: updatedAgents } = generateJobOfferConfig(
    jobScenario,
    jobScenario.defaultAgents,
    profile
  );

  const candidate = updatedAgents.find((a) => a.id === 'candidate-ai-lead')!;
  const recruiter = updatedAgents.find((a) => a.id === 'employer-vp-eng')!;

  assert.equal(candidate.roleTitle, 'Intern Data Scientist');
  assert.ok(candidate.keyConstraints.some((c) => c.includes(profile.benchmarks.candidateFloor.toLocaleString('en-IN'))));
  assert.ok(recruiter.keyConstraints.some((c) => c.includes(profile.benchmarks.recruiterMax.toLocaleString('en-IN'))));
  console.log('✔ Test 2.2 Passed: Intern Data Scientist auto-configures candidate and recruiter constraints.');
}

// ----------------------------------------------------------------------------
// SUITE 3: Negotiation Engine Interoperability with Auto-Configured Agents
// ----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Negotiation Engine Behavior with Calibrated Configuration ---');

{
  // Test 3.1: Auto-configured Principal Engineer negotiation behavior
  const profile = detectJobProfile({ role: 'Software Engineer', level: 'Lead / Principal' });
  const { scenario: updatedScenario, agents: updatedAgents } = generateJobOfferConfig(
    jobScenario,
    jobScenario.defaultAgents,
    profile
  );

  const recruiter = updatedAgents.find((a) => a.id === 'employer-vp-eng')!;

  // Human candidate offers ₹14,00,000, which is well within the Principal band (₹12.5L - ₹16.0L)
  const reasonableOfferMsg = 'We propose ₹14,00,000 base salary with hybrid remote flexibility.';
  const terms = [{ label: 'Proposed Base', value: '₹14,00,000' }];

  const aiResponse = generateAIResponseToUserInput(
    updatedScenario,
    updatedAgents,
    recruiter.id,
    reasonableOfferMsg,
    terms,
    1,
    []
  );

  assert.equal(aiResponse.agentId, recruiter.id);
  assert.equal(aiResponse.decision, 'counter', 'Recruiter counters collaboratively within the calibrated principal band');
  assert.ok(aiResponse.evaluationScore !== undefined && aiResponse.evaluationScore >= 60, 'Evaluation score should be favorable as ₹14,00,000 is within calibrated band');
  console.log('✔ Test 3.1 Passed: AI Recruiter recognizes ₹14,00,000 as workable for auto-configured Lead / Principal.');
}

{
  // Test 3.2: Auto-configured Intern negotiation behavior
  const profile = detectJobProfile({ role: 'Software Engineer', level: 'Intern' });
  const { scenario: updatedScenario, agents: updatedAgents } = generateJobOfferConfig(
    jobScenario,
    jobScenario.defaultAgents,
    profile
  );

  const recruiter = updatedAgents.find((a) => a.id === 'employer-vp-eng')!;

  // For an intern (cap ~₹4.2L), an offer of ₹10,00,000 is a gross violation
  const extremeOfferMsg = 'I demand ₹10,00,000 base for the summer internship.';
  const terms = [{ label: 'Proposed Base', value: '₹10,00,000' }];

  const aiResponse = generateAIResponseToUserInput(
    updatedScenario,
    updatedAgents,
    recruiter.id,
    extremeOfferMsg,
    terms,
    1,
    []
  );

  assert.equal(aiResponse.decision, 'counter');
  assert.ok(aiResponse.speechText.includes('ceiling') || aiResponse.speechText.includes('exceeds') || aiResponse.speechText.includes('band'), 'Recruiter must cite ceiling violation');
  console.log('✔ Test 3.2 Passed: AI Recruiter detects gross violation when demand exceeds auto-configured Intern cap.');
}

console.log('\n================================================================');
console.log('  ALL JOB PROFILE DETECTION & AUTO-CONFIGURATION TESTS PASSED! 🎉');
console.log('================================================================');
