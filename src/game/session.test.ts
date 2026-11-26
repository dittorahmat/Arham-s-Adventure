import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateNickname,
  validateGrade,
  createOfflineGuestSession,
  loadGuestSession,
  saveGuestSession,
  syncGuestSession,
  type GuestSession,
} from './session';

test('validateNickname trims whitespace and accepts valid 2-16 char nicknames', () => {
  const res = validateNickname('  Arham  ');
  assert.equal(res.valid, true);
  assert.equal(res.nickname, 'Arham');
  assert.equal(res.error, undefined);
});

test('validateNickname rejects empty or too-short nicknames', () => {
  const empty = validateNickname('   ');
  assert.equal(empty.valid, false);
  assert.ok(empty.error);

  const short = validateNickname('A');
  assert.equal(short.valid, false);
  assert.ok(short.error);
});

test('validateNickname rejects nicknames longer than 16 characters', () => {
  const long = validateNickname('ArhamSiJuaraKelasLima');
  assert.equal(long.valid, false);
  assert.ok(long.error);
});

test('validateGrade clamps or defaults invalid grades to 5', () => {
  assert.equal(validateGrade(1), 1);
  assert.equal(validateGrade(6), 6);
  assert.equal(validateGrade(0), 5);
  assert.equal(validateGrade(7), 5);
  assert.equal(validateGrade('abc'), 5);
});

test('saveGuestSession and loadGuestSession persist and recover safely', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  } as unknown as Storage;

  const session: GuestSession = {
    playerId: 'p-123',
    nickname: 'Arham',
    grade: 5,
    token: 'tok-abc',
    offline: false,
  };

  saveGuestSession(session, mockStorage);
  const loaded = loadGuestSession(mockStorage);
  assert.deepEqual(loaded, session);
});

test('loadGuestSession returns null on corrupted JSON', () => {
  const mockStorage = {
    getItem: () => '{bad json',
    setItem: () => {},
  } as unknown as Storage;

  assert.equal(loadGuestSession(mockStorage), null);
});

test('createOfflineGuestSession creates a valid offline session', () => {
  const session = createOfflineGuestSession('Budi', 4);
  assert.equal(session.nickname, 'Budi');
  assert.equal(session.grade, 4);
  assert.equal(session.offline, true);
  assert.ok(session.token.startsWith('offline_'));
  assert.ok(session.playerId.length > 0);
});

test('syncGuestSession uses server response when POST /api/session succeeds', async () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  } as unknown as Storage;

  const mockFetch = async () =>
    new Response(
      JSON.stringify({
        playerId: 'srv-1',
        nickname: 'Arham',
        grade: 5,
        token: 'srv-token-1',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  const session = await syncGuestSession('Arham', 5, mockFetch as typeof fetch, mockStorage);
  assert.equal(session.playerId, 'srv-1');
  assert.equal(session.token, 'srv-token-1');
  assert.equal(session.offline, false);
  assert.deepEqual(loadGuestSession(mockStorage), session);
});

test('syncGuestSession falls back to offline session when fetch fails', async () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  } as unknown as Storage;

  const failingFetch = async () => {
    throw new Error('Network error');
  };

  const session = await syncGuestSession('Siti', 3, failingFetch as typeof fetch, mockStorage);
  assert.equal(session.nickname, 'Siti');
  assert.equal(session.grade, 3);
  assert.equal(session.offline, true);
  assert.ok(session.token.startsWith('offline_'));
  assert.deepEqual(loadGuestSession(mockStorage), session);
});
