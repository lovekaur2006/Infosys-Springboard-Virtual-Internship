/**
 * Task 5 - Post-Interaction Summary Agent tests.
 * Run: npm run test:post-summary
 */
import assert from 'node:assert/strict';
import { PREBUILT_SCENARIOS } from '../src/data/scenarios.ts';
import {
  buildSentimentJourney,
  computeCooperationTrend,
  computeResolutionScore,
  generatePostInteractionSummary,
  gradeForScore,
  SCORE_WEIGHTS,
  SentimentPoint,
} from '../src/services/postInteractionSummary.ts';
import { buildImpasse } from '../src/services/autonomousNegotiation.ts';
import { runAutonomousSession, runPracticeSession, withPersonalities } from '../src/services/demoDataGenerator.ts';
import { detectDeadlock } from '../src/services/deadlockDetector.ts';
import { createSuite } from './testHarness.ts';

const suite = createSuite('Post-Interaction Summary Agent');
const { test } = suite;

const summarise = (s: ReturnType<typeof runAutonomousSession>) =>
  generatePostInteractionSummary(s.scenario, s.agents, s.turns, s.settlement, s.deadlock, s.mode);

for (const scenario of PREBUILT_SCENARIOS) {
  const session = runAutonomousSession(scenario, scenario.defaultAgents);
  const summary = summarise(session);

  test(`${scenario.title}: summary has required sections`, () => {
    assert.equal(summary.scenarioId, scenario.id);
    assert.equal(summary.mode, 'auto');
    assert.ok(summary.narrative.length > 40, 'narrative should be a real sentence');
    assert.equal(summary.agentReviews.length, scenario.defaultAgents.length, 'one review per agent');
    assert.ok(summary.concessionTimeline.length > 0, 'settled negotiation should list concessions');
  });

  test(`${scenario.title}: sentiment journey has one point per turn, values in range`, () => {
    assert.equal(summary.sentimentJourney.length, session.turns.length);
    summary.sentimentJourney.forEach((p, i) => {
      assert.equal(p.turnIndex, i);
      assert.ok(p.cooperation >= 0 && p.cooperation <= 100);
      assert.ok(p.leverage >= 0 && p.leverage <= 100);
    });
  });

  test(`${scenario.title}: resolution score is 0-100, graded and reproducible from its breakdown`, () => {
    assert.ok(summary.resolutionScore >= 0 && summary.resolutionScore <= 100);
    assert.equal(summary.resolutionGrade, gradeForScore(summary.resolutionScore));
    const b = summary.scoreBreakdown;
    const recomputed =
      SCORE_WEIGHTS.agreement * b.agreement + SCORE_WEIGHTS.goals * b.goals +
      SCORE_WEIGHTS.balance * b.balance + SCORE_WEIGHTS.efficiency * b.efficiency - b.deadlockPenalty;
    assert.ok(Math.abs(recomputed - summary.resolutionScore) <= 1, `expected ~${recomputed}, got ${summary.resolutionScore}`);
  });

  test(`${scenario.title}: every agent gets strengths, weaknesses and recommendations`, () => {
    for (const review of summary.agentReviews) {
      assert.ok(review.strengths.length && review.weaknesses.length && review.improvements.length, review.agentName);
      assert.ok(review.goalAchievement >= 0 && review.goalAchievement <= 100);
    }
  });

  test(`${scenario.title}: impasse scores lower than settlement`, () => {
    const impasseSession = runAutonomousSession(
      { ...scenario, orchestrator: { ...scenario.orchestrator, maxRounds: 1 } }, scenario.defaultAgents,
    );
    const impasse = summarise(impasseSession);
    assert.equal(impasse.status, 'impasse');
    assert.ok(impasse.resolutionScore < summary.resolutionScore, `${impasse.resolutionScore} !< ${summary.resolutionScore}`);
    assert.equal(impasse.scoreBreakdown.agreement, 0);
    assert.ok(impasse.mediatorInterventions > 0 && impasse.scoreBreakdown.deadlockPenalty === Math.min(15, impasse.mediatorInterventions * 5));
    assert.ok(impasse.deadlockReasons.length > 0, 'deadlock reasons must be recorded for analytics');
  });

  test(`${scenario.title}: Practice Mode (human flexible) is summarised with the (You) suffix removed`, () => {
    const practice = runPracticeSession(scenario, withPersonalities(scenario.defaultAgents, ['Collaborative', 'Collaborative']), 'flexible');
    const s = summarise(practice);
    assert.equal(s.mode, 'interactive');
    assert.ok(s.sentimentJourney.every((p) => !p.agentName.includes('(You)')));
    assert.ok(s.resolutionScore >= 0 && s.resolutionScore <= 100);
  });
}

test('gradeForScore boundaries', () => {
  assert.equal(gradeForScore(100), 'Excellent');
  assert.equal(gradeForScore(80), 'Excellent');
  assert.equal(gradeForScore(79), 'Good');
  assert.equal(gradeForScore(60), 'Good');
  assert.equal(gradeForScore(59), 'Fair');
  assert.equal(gradeForScore(40), 'Fair');
  assert.equal(gradeForScore(39), 'Poor');
  assert.equal(gradeForScore(0), 'Poor');
});

const point = (turnIndex: number, cooperation: number, isMediator = false): SentimentPoint => ({
  turnIndex, round: 1, agentId: 'a', agentName: 'A', sentiment: 'assertive', cooperation, leverage: 50, isMediator,
});

test('cooperation trend: improving, deteriorating, stable, too-short', () => {
  assert.equal(computeCooperationTrend([25, 25, 80, 80].map((c, i) => point(i, c))), 'improving');
  assert.equal(computeCooperationTrend([80, 80, 25, 25].map((c, i) => point(i, c))), 'deteriorating');
  assert.equal(computeCooperationTrend([45, 45, 45, 45].map((c, i) => point(i, c))), 'stable');
  assert.equal(computeCooperationTrend([25, 80].map((c, i) => point(i, c))), 'stable');
  assert.equal(computeCooperationTrend([point(0, 10, true), point(1, 10, true), point(2, 90, true), point(3, 90, true)]), 'stable', 'mediator turns are ignored');
});

test('edge case: empty transcript does not crash', () => {
  const scenario = PREBUILT_SCENARIOS[0];
  const settlement = buildImpasse(scenario, scenario.defaultAgents, []);
  const deadlock = detectDeadlock([], 1, scenario.orchestrator.maxRounds, scenario.orchestrator.deadlockConfig);
  const s = generatePostInteractionSummary(scenario, scenario.defaultAgents, [], settlement, deadlock, 'auto');
  assert.equal(s.sentimentJourney.length, 0);
  assert.equal(s.status, 'impasse');
  assert.ok(s.resolutionScore >= 0 && s.resolutionScore <= 100);
  assert.equal(s.roundsUsed, 1);
});

test('edge case: no agents / null deadlock does not crash', () => {
  const scenario = PREBUILT_SCENARIOS[0];
  const settlement = buildImpasse(scenario, [], []);
  const s = generatePostInteractionSummary(scenario, [], [], settlement, null, 'interactive');
  assert.equal(s.agentReviews.length, 0);
  assert.deepEqual(s.deadlockReasons, []);
});

test('score components: balance penalises lopsided outcomes', () => {
  const scenario = PREBUILT_SCENARIOS[0];
  const session = runAutonomousSession(scenario, scenario.defaultAgents);
  const base = summarise(session).agentReviews;
  const even = base.map((r) => ({ ...r, goalAchievement: 80 }));
  const lopsided = base.map((r, i) => ({ ...r, goalAchievement: i === 0 ? 100 : 40 }));
  const a = computeResolutionScore(even, session.settlement, 2, 4, 0);
  const b = computeResolutionScore(lopsided, session.settlement, 2, 4, 0);
  assert.ok(b.breakdown.balance < a.breakdown.balance);
});

test('score components: deadlock penalty is capped at 15 and efficiency falls with rounds', () => {
  const scenario = PREBUILT_SCENARIOS[0];
  const session = runAutonomousSession(scenario, scenario.defaultAgents);
  const reviews = summarise(session).agentReviews;
  assert.equal(computeResolutionScore(reviews, session.settlement, 1, 4, 10).breakdown.deadlockPenalty, 15);
  assert.ok(computeResolutionScore(reviews, session.settlement, 4, 4, 0).breakdown.efficiency < computeResolutionScore(reviews, session.settlement, 1, 4, 0).breakdown.efficiency);
});

test('buildSentimentJourney labels mediator turns', () => {
  const scenario = PREBUILT_SCENARIOS[0];
  const impasse = runAutonomousSession({ ...scenario, orchestrator: { ...scenario.orchestrator, maxRounds: 1 } }, scenario.defaultAgents);
  const journey = buildSentimentJourney(impasse.turns);
  assert.ok(journey.some((p) => p.isMediator), 'expected a mediator point');
});

suite.finish();
