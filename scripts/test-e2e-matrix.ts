/**
 * Task 5 - End-to-end validation matrix.
 *
 * Exercises the full pipeline (Orchestrator -> Agent reasoning -> Counteroffer evaluation ->
 * Deadlock detection -> Post-interaction summary -> Analytics) across:
 *   - Simulation Mode: 3 scenarios x 9 personality pairs x {normal, 1-round limit}
 *   - Practice Mode:   3 scenarios x 3 AI personalities x {flexible, stubborn human}
 *   - Edge cases
 *
 * Run: npm run test:e2e
 * Write a Markdown results table for the project report:  npm run test:e2e -- --write-report
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PREBUILT_SCENARIOS } from '../src/data/scenarios.ts';
import { PersonalityType } from '../src/types.ts';
import {
  CompletedSession, PERSONALITIES, runAutonomousSession, runPracticeSession, toSessionRecord, withPersonalities,
} from '../src/services/demoDataGenerator.ts';
import { generatePostInteractionSummary } from '../src/services/postInteractionSummary.ts';
import { buildAnalytics } from '../src/services/analyticsEngine.ts';
import { buildImpasse } from '../src/services/autonomousNegotiation.ts';
import { detectDeadlock } from '../src/services/deadlockDetector.ts';
import { createSuite } from './testHarness.ts';

const suite = createSuite('End-to-end matrix');
const { test } = suite;
const records: ReturnType<typeof toSessionRecord>[] = [];
let counter = 0;

function validate(session: CompletedSession, label: string) {
  const { scenario, agents, turns, settlement, deadlock, mode } = session;
  assert.ok(turns.length > 0, `${label}: transcript must not be empty`);
  assert.ok(['settled', 'impasse'].includes(settlement.status));
  assert.ok(settlement.agreementScore >= 0 && settlement.agreementScore <= 100);
  turns.forEach((t) => {
    assert.ok(t.speechText.trim().length > 0, `${label}: empty speech text`);
    assert.ok(['assertive', 'collaborative', 'defensive', 'mediating'].includes(t.sentiment));
  });
  const summary = generatePostInteractionSummary(scenario, agents, turns, settlement, deadlock, mode);
  assert.equal(summary.status, settlement.status);
  assert.equal(summary.sentimentJourney.length, turns.length);
  assert.equal(summary.agentReviews.length, agents.length);
  assert.ok(summary.resolutionScore >= 0 && summary.resolutionScore <= 100);
  if (settlement.status === 'impasse') assert.equal(summary.scoreBreakdown.agreement, 0);
  records.push(toSessionRecord(session, `e2e-${++counter}`, new Date(Date.UTC(2026, 10, 1, counter))));
  return summary;
}

// ---------------------------------------------------------------- Simulation Mode
for (const scenario of PREBUILT_SCENARIOS) {
  for (const a of PERSONALITIES) {
    for (const b of PERSONALITIES) {
      const agents = withPersonalities(scenario.defaultAgents, [a, b]);
      test(`Simulation | ${scenario.id} | ${a} vs ${b} | full rounds reaches agreement`, () => {
        const session = runAutonomousSession(scenario, agents);
        const summary = validate(session, `${scenario.id} ${a}/${b}`);
        assert.equal(session.settlement.status, 'settled');
        assert.equal(session.turns[0].decision, 'opening');
        assert.equal(session.turns.at(-1)?.decision, 'accept');
        assert.ok(summary.resolutionScore >= 50, `expected a reasonable score, got ${summary.resolutionScore}`);
      });
      test(`Simulation | ${scenario.id} | ${a} vs ${b} | 1-round limit -> deadlock detected, impasse reported`, () => {
        const tight = { ...scenario, orchestrator: { ...scenario.orchestrator, maxRounds: 1 } };
        const session = runAutonomousSession(tight, agents);
        const summary = validate(session, `${scenario.id} ${a}/${b} tight`);
        assert.equal(session.settlement.status, 'impasse');
        assert.ok(session.deadlock.isDeadlocked, 'deadlock detector should flag the stalled negotiation');
        assert.ok(summary.deadlockReasons.length > 0);
        assert.ok(summary.mediatorInterventions >= 1, 'orchestrator should intervene before breakdown');
      });
    }
  }
}

// ---------------------------------------------------------------- Practice Mode
for (const scenario of PREBUILT_SCENARIOS) {
  for (const aiPersonality of PERSONALITIES) {
    for (const style of ['flexible', 'stubborn'] as const) {
      test(`Practice | ${scenario.id} | AI ${aiPersonality} | ${style} human`, () => {
        const agents = withPersonalities(scenario.defaultAgents, ['Collaborative', aiPersonality] as PersonalityType[]);
        const session = runPracticeSession(scenario, agents, style);
        const summary = validate(session, `practice ${scenario.id} ${aiPersonality} ${style}`);
        const humanTurns = session.turns.filter((t) => t.agentName.endsWith('(You)'));
        const aiTurns = session.turns.filter((t) => !t.agentName.endsWith('(You)'));
        assert.ok(humanTurns.length >= 1 && aiTurns.length === humanTurns.length, 'AI must answer every human turn');
        aiTurns.forEach((t) => assert.ok(['accept', 'counter', 'reject'].includes(t.decision || ''), 'AI decision missing'));
        assert.equal(summary.mode, 'interactive');
        assert.ok(summary.sentimentJourney.every((p) => !p.agentName.includes('(You)')));
      });
    }
  }
}

// ---------------------------------------------------------------- Edge cases
test('Edge | zero agents: impasse + summary without crashing', () => {
  const s = PREBUILT_SCENARIOS[0];
  const settlement = buildImpasse(s, [], []);
  const summary = generatePostInteractionSummary(s, [], [], settlement, detectDeadlock([], 1, 4), 'auto');
  assert.equal(summary.status, 'impasse');
});

test('Edge | human never improves (stubborn) is no better than a flexible human', () => {
  for (const scenario of PREBUILT_SCENARIOS) {
    const agents = withPersonalities(scenario.defaultAgents, ['Collaborative', 'Collaborative']);
    const flexible = validate(runPracticeSession(scenario, agents, 'flexible'), 'flex');
    const stubborn = validate(runPracticeSession(scenario, agents, 'stubborn'), 'stub');
    assert.ok(stubborn.resolutionScore <= flexible.resolutionScore + 1, `${scenario.id}: ${stubborn.resolutionScore} > ${flexible.resolutionScore}`);
  }
});

test('Edge | maxRounds = 1 in Practice Mode ends the session in one round', () => {
  const s = PREBUILT_SCENARIOS[0];
  const tight = { ...s, orchestrator: { ...s.orchestrator, maxRounds: 1 } };
  const session = runPracticeSession(tight, s.defaultAgents, 'stubborn');
  assert.equal(session.turns.length, 2);
  validate(session, 'practice 1 round');
});

test('Edge | summary generation is deterministic apart from the timestamp', () => {
  const s = PREBUILT_SCENARIOS[1];
  const run = () => {
    const sess = runAutonomousSession(s, s.defaultAgents);
    const { generatedAt, ...rest } = generatePostInteractionSummary(s, sess.agents, sess.turns, sess.settlement, sess.deadlock, 'auto');
    return JSON.stringify(rest);
  };
  assert.equal(run(), run());
});

// ---------------------------------------------------------------- Integration with analytics
test('Integration | analytics over the whole matrix is consistent', () => {
  const report = buildAnalytics(records);
  assert.equal(report.totals.sessions, records.length);
  assert.equal(report.totals.settled + report.totals.impasse, records.length);
  assert.equal(report.byScenario.length, PREBUILT_SCENARIOS.length);
  assert.equal(report.byMode.length, 2);
  assert.ok(report.deadlockTriggers.length > 0);
  assert.ok(report.insights.length > 0);
});

if (process.argv.includes('--write-report')) {
  const rows = suite.results.map((r) => `| ${r.name.replace(/\|/g, '/')} | ${r.passed ? 'PASS' : 'FAIL'} |`);
  const passed = suite.results.filter((r) => r.passed).length;
  const md = [
    '# End-to-end test results',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `**${passed}/${suite.results.length} cases passed.**`,
    '',
    '| Test case | Result |',
    '|---|---|',
    ...rows,
    '',
  ].join('\n');
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/E2E_TEST_RESULTS.md', md);
  console.log('Wrote docs/E2E_TEST_RESULTS.md');
}

suite.finish();
