import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode, RoomSettings } from '../../src/game/room';
import { parseReplayClip } from '../../src/game/replay';
import { validateGrade, validateNickname } from '../../src/game/session';
export { MatchmakerDurableObject } from './MatchmakerDurableObject';
export { RoomDurableObject } from './RoomDurableObject';

export interface Env {
  DB: D1Database;
  ROOM_DO: DurableObjectNamespace;
  MATCHMAKER_DO: DurableObjectNamespace;
  REPLAY_BUCKET: R2Bucket;
}

const app = new Hono<{ Bindings: Env }>();

app.use('/api/*', cors());

app.get('/api/health', (c) => c.json({ ok: true }));

type NicknameParseResult<T extends Record<string, unknown>> =
  | { ok: true; body: T; nickname: string }
  | { ok: false; error: string };

async function parseJsonWithNickname<T extends Record<string, unknown>>(
  req: { json: () => Promise<unknown> },
  field: keyof T = 'nickname' as keyof T
): Promise<NicknameParseResult<T>> {
  let body: T;
  try {
    body = (await req.json()) as T;
  } catch {
    return { ok: false, error: 'Invalid JSON body' };
  }
  const raw = typeof body[field] === 'string' ? (body[field] as string) : '';
  const check = validateNickname(raw);
  if (!check.valid) {
    return { ok: false, error: check.error ?? 'Invalid nickname' };
  }
  return { ok: true, body, nickname: check.nickname };
}

/**
 * POST /api/session
 * Creates or updates an anonymous Guest Player in D1 and returns their session token.
 */
app.post('/api/session', async (c) => {
  const parsed = await parseJsonWithNickname<{
    nickname?: unknown;
    grade?: unknown;
    token?: unknown;
  }>(c.req);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }
  const { body, nickname } = parsed;
  const check = { nickname };

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

/**
 * POST /api/rooms
 * Creates a new Private Room in a Durable Object and returns its 6-character code.
 */
app.post('/api/rooms', async (c) => {
  const parsed = await parseJsonWithNickname<{
    hostId?: unknown;
    hostNickname?: unknown;
    hostGrade?: unknown;
    settings?: Partial<RoomSettings>;
  }>(c.req, 'hostNickname');
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }
  const { body, nickname } = parsed;
  const nickCheck = { nickname };

  const hostId =
    typeof body.hostId === 'string' && body.hostId.length > 0
      ? body.hostId
      : crypto.randomUUID();
  const hostGrade = validateGrade(body.hostGrade);
  const code = generateRoomCode();

  const id = c.env.ROOM_DO.idFromName(code);
  const stub = c.env.ROOM_DO.get(id);

  const initRes = await stub.fetch('https://room/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      hostId,
      hostNickname: nickCheck.nickname,
      hostGrade,
      settings: body.settings,
    }),
  });

  const data = (await initRes.json()) as { state: unknown };
  return c.json({ code, state: data.state }, 201);
});

/**
 * GET /api/rooms/:code/ws
 * Upgrades to a WebSocket connection handled by the Room's Durable Object.
 */
app.get('/api/rooms/:code/ws', async (c) => {
  const code = normalizeRoomCode(c.req.param('code'));
  if (!isValidRoomCode(code)) {
    return c.json({ error: 'Invalid room code' }, 400);
  }

  if (c.req.header('Upgrade')?.toLowerCase() !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);
  }

  const id = c.env.ROOM_DO.idFromName(code);
  const stub = c.env.ROOM_DO.get(id);
  return stub.fetch(c.req.raw);
});

/**
 * POST /api/quickplay
 * Finds an open public Room or creates a new one via MatchmakerDurableObject.
 */
app.post('/api/quickplay', async (c) => {
  const parsed = await parseJsonWithNickname<{
    playerId?: unknown;
    nickname?: unknown;
    grade?: unknown;
    settings?: Partial<RoomSettings>;
  }>(c.req);
  if (!parsed.ok) {
    return c.json({ error: parsed.error }, 400);
  }
  const { body, nickname } = parsed;
  const nickCheck = { nickname };

  const playerId =
    typeof body.playerId === 'string' && body.playerId.length > 0
      ? body.playerId
      : crypto.randomUUID();
  const grade = validateGrade(body.grade);

  const id = c.env.MATCHMAKER_DO.idFromName('global');
  const stub = c.env.MATCHMAKER_DO.get(id);
  const res = await stub.fetch('https://matchmaker/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playerId,
      nickname: nickCheck.nickname,
      grade,
      settings: body.settings,
    }),
  });

  const data = (await res.json()) as { code: string; isNew: boolean };
  return c.json(data, res.status as 200 | 201);
});

/**
 * GET /api/leaderboard
 * Returns top global scores from D1, optionally filtered by mode and difficulty.
 */
app.get('/api/leaderboard', async (c) => {
  const mode = c.req.query('mode');
  const difficulty = c.req.query('difficulty');
  const rawLimit = Number(c.req.query('limit') ?? 20);
  const limit = Number.isFinite(rawLimit) ? Math.min(50, Math.max(1, Math.round(rawLimit))) : 20;

  const conditions: string[] = [];
  const bindings: unknown[] = [];

  if (mode && mode !== 'all' && mode !== 'random') {
    conditions.push('m.mode = ?');
    bindings.push(mode);
  }
  if (difficulty && difficulty !== 'all') {
    conditions.push('m.difficulty = ?');
    bindings.push(difficulty);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT
      mp.id AS id,
      mp.player_id AS playerId,
      mp.nickname AS nickname,
      mp.rank AS rank,
      mp.score AS score,
      mp.lap_time_seconds AS lapTimeSeconds,
      mp.grade AS grade,
      m.mode AS mode,
      m.difficulty AS difficulty,
      m.subject AS subject,
      m.finished_at AS achievedAt
    FROM match_participants mp
    INNER JOIN matches m ON m.id = mp.match_id
    ${whereClause}
    ORDER BY mp.lap_time_seconds ASC, mp.score DESC, m.finished_at ASC
    LIMIT ?
  `;
  bindings.push(limit);

  const result = await c.env.DB.prepare(sql)
    .bind(...bindings)
    .all();

  return c.json({ entries: result.results ?? [] });
});

/**
 * POST /api/replays/:matchId
 * Validates and stores a FinishReplayClip JSON in R2 and records replay_key on the match in D1.
 */
app.post('/api/replays/:matchId', async (c) => {
  const matchId = c.req.param('matchId')?.trim();
  if (!matchId) {
    return c.json({ error: 'matchId is required' }, 400);
  }

  const rawBody = await c.req.text();
  const clip = parseReplayClip(rawBody);
  if (!clip) {
    return c.json({ error: 'Invalid replay clip payload' }, 400);
  }

  const replayKey = `replays/${matchId}.json`;
  await c.env.REPLAY_BUCKET.put(replayKey, rawBody, {
    httpMetadata: { contentType: 'application/json' },
  });

  await c.env.DB.prepare('UPDATE matches SET replay_key = ? WHERE id = ?')
    .bind(replayKey, matchId)
    .run();

  return c.json({ ok: true, replayKey }, 201);
});

/**
 * GET /api/replays/:matchId
 * Fetches a stored FinishReplayClip JSON from R2.
 */
app.get('/api/replays/:matchId', async (c) => {
  const matchId = c.req.param('matchId')?.trim();
  if (!matchId) {
    return c.json({ error: 'matchId is required' }, 400);
  }

  const replayKey = `replays/${matchId}.json`;
  const object = await c.env.REPLAY_BUCKET.get(replayKey);
  if (!object) {
    return c.json({ error: 'Replay not found' }, 404);
  }

  const body = await object.text();
  return c.text(body, 200, { 'Content-Type': 'application/json' });
});

export default app;
