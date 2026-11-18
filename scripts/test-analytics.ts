/**
 * Task 5 - Performance Analytics Module tests.
 * Run: npm run test:analytics
 */
import assert from 'node:assert/strict';
import { analyticsToMarkdown, buildAnalytics, sessionsToCsv, SessionRecord } from '../src/services/analyticsEngine.ts';
import { generateDemoSessions } from '../src/services/demoDataGenerator.ts';
import { clearLocalSessions, loadLocalSessions, mergeSessions, saveLocalSession } from '../src/services/sessionStore.ts';
import { createSuite } from './testHarness.ts';

const suite = createSuite('Performance Analytics Module');
const { test } = suite;

const demo = generateDemoSessions(new Date('2026-11-18T00:00:00Z'));
const report = buildAnalytics(demo);

test('empty history: zero totals and a helpful recommendation, no crash', () => {
  const r = buildAnalytics([]);
  assert.equal(r.totals.sessions, 0);
  assert.equal(r.totals.agreementRate, 0);
  assert.equal(r.insights.length, 1);
  assert.equal(r.insights[0].type, 'recommendation');
});

test('single session works', () => {
  const r = buildAnalytics([demo[0]]);
  assert.equal(r.totals.sessions, 1);
  assert.equal(r.trend.length, 1);
  assert.equal(r.byScenario.length, 1);
});

test('demo data covers 3 scenarios x both modes (33 sessions)', () => {
  assert.equal(demo.length, 33);
  assert.equal(report.byScenario.length, 3);
  assert.equal(report.byMode.length, 2);
  assert.equal(report.byPersonalityPair.length, 6, '6 unordered personality pairings');
});

test('agreement-rate maths is correct', () => {
  const settled = demo.filter((s) => s.status === 'settled').length;
  assert.equal(report.totals.settled, settled);
  assert.equal(report.totals.impasse, demo.length - settled);
  assert.equal(report.totals.agreementRate, Math.round((settled / demo.length) * 100));
});

test('group stats add up to the total number of sessions', () => {
  assert.equal(report.byScenario.reduce((n, g) => n + g.sessions, 0), demo.length);
  assert.equal(report.byMode.reduce((n, g) => n + g.sessions, 0), demo.length);
});

test('trend is chronological and one point per session', () => {
  assert.equal(report.trend.length, demo.length);
  for (let i = 1; i < report.trend.length; i += 1) {
    assert.ok(+new Date(report.trend[i].date) >= +new Date(report.trend[i - 1].date));
    assert.equal(report.trend[i].index, i + 1);
  }
});

test('deadlock triggers are counted per session and sorted by frequency', () => {
  assert.ok(report.deadlockTriggers.length > 0, 'demo data must include deadlocks');
  report.deadlockTriggers.forEach((d) => assert.ok(d.count <= demo.length && d.label.length > 0));
  const counts = report.deadlockTriggers.map((d) => d.count);
  assert.deepEqual(counts, [...counts].sort((a, b) => b - a));
  const impasses = demo.filter((s) => s.status === 'impasse').length;
  const roundLimit = report.deadlockTriggers.find((d) => d.reason === 'maximum_rounds_reached');
  assert.ok(roundLimit && roundLimit.count >= impasses - 1);
});

test('per-personality stats cover all three personalities with sane ranges', () => {
  assert.deepEqual(report.byPersonality.map((p) => p.personality).sort(), ['Aggressive', 'Collaborative', 'Risk-Averse']);
  report.byPersonality.forEach((p) => {
    assert.ok(p.avgGoalAchievement >= 0 && p.avgGoalAchievement <= 100);
    assert.ok(p.avgCooperation >= 0 && p.avgCooperation <= 100);
  });
});

test('insights mention concrete problems when the data has impasses', () => {
  assert.ok(report.insights.length >= 2);
  assert.ok(report.insights.some((i) => i.type === 'challenge'));
  assert.ok(report.insights.some((i) => /deadlock|pairing|scenario/i.test(i.text)));
});

test('legacy rows without a summary or mode are tolerated', () => {
  const legacy: SessionRecord = {
    id: 'legacy-1', scenarioId: 'vendor-pricing', scenarioTitle: 'Vendor Pricing Negotiation',
    status: 'settled', agreementScore: 90, mode: null, createdAt: '2026-01-01T00:00:00Z', summary: null,
  };
  const r = buildAnalytics([legacy, ...demo.slice(0, 3)]);
  assert.equal(r.totals.sessions, 4);
  assert.ok(r.byMode.some((m) => m.key === 'unknown'));
});

test('CSV export: header + one row per session, quotes escaped', () => {
  const tricky = { ...demo[0], id: 'q', scenarioTitle: 'Say "hello", world' };
  const lines = sessionsToCsv([tricky, demo[1]]).split('\n');
  assert.equal(lines.length, 3);
  assert.ok(lines[1].includes('"Say ""hello"", world"'));
});

test('markdown report contains the key sections', () => {
  const md = analyticsToMarkdown(report);
  for (const heading of ['## Summary', '## By scenario', '## Deadlock triggers', '## Insights']) assert.ok(md.includes(heading), heading);
});

test('mergeSessions removes duplicate ids and keeps the first copy', () => {
  const a = { ...demo[0], agreementScore: 1 };
  const b = { ...demo[0], agreementScore: 2 };
  const merged = mergeSessions([a], [b, demo[1]]);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((s) => s.id === a.id)!.agreementScore, 1);
});

test('session store is safe without a browser (no localStorage)', () => {
  assert.deepEqual(loadLocalSessions(), []);
  saveLocalSession(demo[0]);
  clearLocalSessions();
  assert.deepEqual(loadLocalSessions(), []);
});

suite.finish();
