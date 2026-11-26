import type { GradeLevel } from './types';

export interface GuestSession {
  playerId: string;
  nickname: string;
  grade: GradeLevel;
  token: string;
  offline: boolean;
}

export interface NicknameValidationResult {
  valid: boolean;
  nickname: string;
  error?: string;
}

const SESSION_STORAGE_KEY = 'arham_adventure_guest_session_v1';
const MIN_NICKNAME_LEN = 2;
const MAX_NICKNAME_LEN = 16;

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}${crypto.randomUUID()}`;
  }
  return `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Validates and normalizes a Guest Player's nickname (2-16 characters).
 */
export function validateNickname(raw: string): NicknameValidationResult {
  const normalized = raw.trim().replace(/\s+/g, ' ');
  if (normalized.length < MIN_NICKNAME_LEN) {
    return {
      valid: false,
      nickname: normalized,
      error: `Nama panggilan minimal ${MIN_NICKNAME_LEN} karakter.`,
    };
  }
  if (normalized.length > MAX_NICKNAME_LEN) {
    return {
      valid: false,
      nickname: normalized,
      error: `Nama panggilan maksimal ${MAX_NICKNAME_LEN} karakter.`,
    };
  }
  return { valid: true, nickname: normalized };
}

/**
 * Validates and normalizes a GradeLevel (1-6), defaulting to 5.
 */
export function validateGrade(grade: unknown): GradeLevel {
  const n = typeof grade === 'number' ? grade : Number(grade);
  if (Number.isInteger(n) && n >= 1 && n <= 6) {
    return n as GradeLevel;
  }
  return 5;
}

/**
 * Loads the persisted GuestSession from localStorage, returning null on missing or corrupted data.
 */
export function loadGuestSession(storage?: Storage): GuestSession | null {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!store) return null;
    const raw = store.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GuestSession>;
    if (
      typeof parsed.playerId === 'string' &&
      typeof parsed.nickname === 'string' &&
      typeof parsed.token === 'string' &&
      parsed.playerId.length > 0 &&
      parsed.token.length > 0
    ) {
      return {
        playerId: parsed.playerId,
        nickname: parsed.nickname,
        grade: validateGrade(parsed.grade),
        token: parsed.token,
        offline: Boolean(parsed.offline),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persists a GuestSession to localStorage safely.
 */
export function saveGuestSession(session: GuestSession, storage?: Storage): void {
  try {
    const store = storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    if (!store) return;
    store.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota or private mode errors
  }
}

/**
 * Creates a local-only GuestSession when the backend is unreachable.
 */
export function createOfflineGuestSession(nickname: string, grade: GradeLevel): GuestSession {
  const validGrade = validateGrade(grade);
  const check = validateNickname(nickname);
  const safeName = check.valid ? check.nickname : 'Arham';
  return {
    playerId: generateId('local_'),
    nickname: safeName,
    grade: validGrade,
    token: generateId('offline_'),
    offline: true,
  };
}

/**
 * Creates or updates a GuestSession via POST /api/session, falling back to offline mode on network failure.
 */
export async function syncGuestSession(
  nickname: string,
  grade: GradeLevel,
  fetcher: typeof fetch = fetch,
  storage?: Storage
): Promise<GuestSession> {
  const check = validateNickname(nickname);
  const safeName = check.valid ? check.nickname : 'Arham';
  const validGrade = validateGrade(grade);
  const existing = loadGuestSession(storage);

  try {
    const response = await fetcher('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: safeName,
        grade: validGrade,
        token: existing && !existing.offline ? existing.token : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      playerId: string;
      nickname: string;
      grade: number;
      token: string;
    };

    const session: GuestSession = {
      playerId: data.playerId,
      nickname: data.nickname,
      grade: validateGrade(data.grade),
      token: data.token,
      offline: false,
    };
    saveGuestSession(session, storage);
    return session;
  } catch {
    const fallback = createOfflineGuestSession(safeName, validGrade);
    saveGuestSession(fallback, storage);
    return fallback;
  }
}
