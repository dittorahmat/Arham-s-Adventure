import { GradeLevel, SubjectFilter } from './types';

export interface LeaderboardEntry {
  id: string;
  lapTimeSeconds: number;
  score: number;
  rank: number;
  correctCount: number;
  totalGates: number;
  subject: SubjectFilter;
  grade?: GradeLevel;
  achievedAt: string;
}

export interface LapSubmission {
  lapTimeSeconds: number;
  score: number;
  rank: number;
  correctCount: number;
  totalGates: number;
  subject: SubjectFilter;
  grade?: GradeLevel;
  achievedAt?: string;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const LEADERBOARD_STORAGE_KEY = 'arham_adventure_top_laps_v1';
export const MAX_LEADERBOARD_ENTRIES = 5;

const VALID_SUBJECTS: readonly SubjectFilter[] = ['semua', 'matematika', 'ipa', 'ips', 'bahasa'];
const VALID_GRADES: readonly GradeLevel[] = [1, 2, 3, 4, 5, 6];

function sanitizeGrade(value: unknown): GradeLevel | undefined {
  const n = Number(value);
  return VALID_GRADES.includes(n as GradeLevel) ? (n as GradeLevel) : undefined;
}

function roundTenth(value: number): number {
  return Math.max(0.1, Math.round(value * 10) / 10);
}

export function sortLeaderboardEntries(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (a.lapTimeSeconds !== b.lapTimeSeconds) {
      return a.lapTimeSeconds - b.lapTimeSeconds;
    }
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    return a.achievedAt.localeCompare(b.achievedAt);
  });
}

export function recordFastestLap(
  existing: readonly LeaderboardEntry[],
  submission: LapSubmission,
  maxEntries = MAX_LEADERBOARD_ENTRIES,
): { entries: LeaderboardEntry[]; insertedIndex: number; madeLeaderboard: boolean } {
  const achievedAt = submission.achievedAt ?? new Date().toISOString();
  const lapTimeSeconds = roundTenth(submission.lapTimeSeconds);
  const grade = sanitizeGrade(submission.grade);
  const newEntry: LeaderboardEntry = {
    id: `${achievedAt}-${lapTimeSeconds}-${Math.round(submission.score)}-${Math.random().toString(36).slice(2, 6)}`,
    lapTimeSeconds,
    score: Math.max(0, Math.round(submission.score)),
    rank: Math.max(1, Math.round(submission.rank)),
    correctCount: Math.max(0, Math.round(submission.correctCount)),
    totalGates: Math.max(1, Math.round(submission.totalGates)),
    subject: VALID_SUBJECTS.includes(submission.subject) ? submission.subject : 'semua',
    ...(grade !== undefined ? { grade } : {}),
    achievedAt,
  };

  const sorted = sortLeaderboardEntries([...existing, newEntry]).slice(0, maxEntries);
  const insertedIndex = sorted.findIndex((item) => item.id === newEntry.id);

  return {
    entries: sorted,
    insertedIndex,
    madeLeaderboard: insertedIndex !== -1,
  };
}

export function formatLapTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  if (safe < 60) {
    return `${safe.toFixed(1)} dtk`;
  }
  const mins = Math.floor(safe / 60);
  const rem = safe - mins * 60;
  const remStr = rem < 10 ? `0${rem.toFixed(1)}` : rem.toFixed(1);
  return `${mins}m ${remStr}d`;
}

function getDefaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadLeaderboard(storage?: StorageLike | null): LeaderboardEntry[] {
  const store = storage !== undefined ? storage : getDefaultStorage();
  if (!store) return [];

  try {
    const raw = store.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const sanitized: LeaderboardEntry[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== 'object') continue;
      const lap = Number(item.lapTimeSeconds);
      const score = Number(item.score);
      if (!Number.isFinite(lap) || lap <= 0 || !Number.isFinite(score)) continue;

      const subject: SubjectFilter = VALID_SUBJECTS.includes(item.subject)
        ? item.subject
        : 'semua';
      const grade = sanitizeGrade(item.grade);

      sanitized.push({
        id: typeof item.id === 'string' && item.id ? item.id : `lap-${sanitized.length}-${lap}`,
        lapTimeSeconds: roundTenth(lap),
        score: Math.max(0, Math.round(score)),
        rank: Number.isFinite(Number(item.rank)) ? Math.max(1, Math.round(Number(item.rank))) : 1,
        correctCount: Number.isFinite(Number(item.correctCount))
          ? Math.max(0, Math.round(Number(item.correctCount)))
          : 0,
        totalGates: Number.isFinite(Number(item.totalGates))
          ? Math.max(1, Math.round(Number(item.totalGates)))
          : 5,
        subject,
        ...(grade !== undefined ? { grade } : {}),
        achievedAt: typeof item.achievedAt === 'string' ? item.achievedAt : new Date(0).toISOString(),
      });
    }

    return sortLeaderboardEntries(sanitized).slice(0, MAX_LEADERBOARD_ENTRIES);
  } catch {
    return [];
  }
}

export function saveLeaderboard(entries: readonly LeaderboardEntry[], storage?: StorageLike | null): void {
  const store = storage !== undefined ? storage : getDefaultStorage();
  if (!store) return;
  try {
    const clean = sortLeaderboardEntries(entries).slice(0, MAX_LEADERBOARD_ENTRIES);
    store.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Ignore storage quota or restricted-mode errors
  }
}

export function clearLeaderboard(storage?: StorageLike | null): void {
  const store = storage !== undefined ? storage : getDefaultStorage();
  if (!store) return;
  try {
    store.removeItem(LEADERBOARD_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
