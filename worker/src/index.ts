import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { generateRoomCode, isValidRoomCode, normalizeRoomCode, RoomSettings } from '../../src/game/room';
import { validateGrade, validateNickname } from '../../src/game/session';
export { MatchmakerDurableObject } from './MatchmakerDurableObject';
export { RoomDurableObject } from './RoomDurableObject';

export interface Env {
  DB: D1Database;
  ROOM_DO: DurableObjectNamespace;
  MATCHMAKER_DO: DurableObjectNamespace;
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

/**
 * POST /api/rooms
 * Creates a new Private Room in a Durable Object and returns its 6-character code.
 */
app.post('/api/rooms', async (c) => {
  let body: {
    hostId?: unknown;
    hostNickname?: unknown;
    hostGrade?: unknown;
    settings?: Partial<RoomSettings>;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const rawNickname = typeof body.hostNickname === 'string' ? body.hostNickname : '';
  const nickCheck = validateNickname(rawNickname);
  if (!nickCheck.valid) {
    return c.json({ error: nickCheck.error ?? 'Invalid nickname' }, 400);
  }

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
  let body: {
    playerId?: unknown;
    nickname?: unknown;
    grade?: unknown;
    settings?: Partial<RoomSettings>;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const rawNickname = typeof body.nickname === 'string' ? body.nickname : '';
  const nickCheck = validateNickname(rawNickname);
  if (!nickCheck.valid) {
    return c.json({ error: nickCheck.error ?? 'Invalid nickname' }, 400);
  }

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

export default app;
