import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { validateGrade, validateNickname } from '../../src/game/session';

export interface Env {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors());

app.get('/api/health', (c) => c.json({ ok: true }));

/**
 * POST /api/session
 * Creates or updates an anonymous Guest Player in D1 and returns their session token.
 */
app.post('/api/session', async (c) => {
  let body: { nickname?: unknown; grade?: unknown; token?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const rawNickname = typeof body.nickname === 'string' ? body.nickname : '';
  const check = validateNickname(rawNickname);
  if (!check.valid) {
    return c.json({ error: check.error ?? 'Invalid nickname' }, 400);
  }

  const grade = validateGrade(body.grade);
  const existingToken = typeof body.token === 'string' && body.token.length > 0 ? body.token : null;

  if (existingToken) {
    const existing = await c.env.DB.prepare(
      'SELECT id FROM players WHERE token = ?'
    )
      .bind(existingToken)
      .first<{ id: string }>();

    if (existing) {
      await c.env.DB.prepare(
        "UPDATE players SET nickname = ?, grade = ?, updated_at = datetime('now') WHERE id = ?"
      )
        .bind(check.nickname, grade, existing.id)
        .run();

      return c.json({
        playerId: existing.id,
        nickname: check.nickname,
        grade,
        token: existingToken,
      });
    }
  }

  const playerId = crypto.randomUUID();
  const token = crypto.randomUUID();

  await c.env.DB.prepare(
    'INSERT INTO players (id, nickname, grade, token) VALUES (?, ?, ?, ?)'
  )
    .bind(playerId, check.nickname, grade, token)
    .run();

  return c.json(
    {
      playerId,
      nickname: check.nickname,
      grade,
      token,
    },
    201
  );
});

export default app;
