/**
 * Task 5 - Seed the PostgreSQL database with realistic multi-session data so the
 * Performance Analytics dashboard has trends to show during the demo.
 *
 * Usage (API must be running, e.g. `npm run dev:stack` or `docker compose up -d db api`):
 *   npm run seed:demo -- you@gmail.com
 *   API_URL=http://localhost:3001 npm run seed:demo -- you@gmail.com
 *
 * Use the same email you sign in with (demo sign-in users have their own email, check the sidebar).
 */
import { generateDemoCompletedSessions, toSessionRecord, demoSessionDate } from '../src/services/demoDataGenerator.ts';

const email = process.argv[2];
const apiUrl = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');
if (!email) {
  console.error('Usage: npm run seed:demo -- <user-email>');
  process.exit(1);
}

const sessions = generateDemoCompletedSessions();
let saved = 0;
for (let i = 0; i < sessions.length; i += 1) {
  const s = sessions[i];
  const id = crypto.randomUUID();
  const record = toSessionRecord(s, id, demoSessionDate(i, sessions.length));
  const res = await fetch(`${apiUrl}/api/negotiations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      userEmail: email,
      scenarioId: s.scenario.id,
      scenarioTitle: s.scenario.title,
      agents: s.agents,
      turns: s.turns,
      settlement: s.settlement,
      mode: s.mode,
      summary: record.summary,
    }),
  });
  if (!res.ok) {
    console.error(`Session ${i + 1} failed: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  saved += 1;
}
console.log(`Seeded ${saved} sessions for ${email} via ${apiUrl}`);