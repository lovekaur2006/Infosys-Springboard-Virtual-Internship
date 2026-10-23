// @ts-ignore Express types may not be installed in this environment.
import express from 'express';
import { initDb, pool } from './db.ts';

const app = express();
app.use(express.json({ limit: '2mb' }));

// Liveness: process is up. Readiness: database is reachable.
app.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok' }));
app.get('/api/ready', async (_req: any, res: any) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'database unavailable' });
  }
});

// Save a finished negotiation
app.post('/api/negotiations', async (req: any, res: any) => {
  const { userEmail, scenarioId, scenarioTitle, agents, turns, settlement } = req.body ?? {};
  if (!userEmail || !scenarioId || !scenarioTitle || !agents || !turns || !settlement) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO negotiations
         (user_email, scenario_id, scenario_title, status, agreement_score, agents, turns, settlement)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, created_at`,
      [
        userEmail,
        scenarioId,
        scenarioTitle,
        settlement.status,
        Math.round(settlement.agreementScore ?? 0),
        JSON.stringify(agents),
        JSON.stringify(turns),
        JSON.stringify(settlement),
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save negotiation' });
  }
});

// List a user's negotiation history (summary only)
app.get('/api/negotiations', async (req, res) => {
  const email = String(req.query.email || '');
  if (!email) return res.status(400).json({ error: 'email query param is required' });
  try {
    const { rows } = await pool.query(
      `SELECT id, scenario_id, scenario_title, status, agreement_score, created_at
         FROM negotiations WHERE user_email = $1
         ORDER BY created_at DESC LIMIT 50`,
      [email]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load negotiations' });
  }
});

// Full record (transcript + settlement)
app.get('/api/negotiations/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM negotiations WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch {
    res.status(400).json({ error: 'Invalid id' });
  }
});

const port = Number(process.env.PORT || 3001);
initDb()
  .then(() => app.listen(port, '0.0.0.0', () => console.log(`API listening on :${port}`)))
  .catch((err) => {
    console.error('Failed to initialise database', err);
    process.exit(1);
  });
