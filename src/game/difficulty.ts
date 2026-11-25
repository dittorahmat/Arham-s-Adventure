import { StorageLike } from './leaderboard';
import { CourseLayout, DifficultyLevel, QuizQuestion } from './types';

export const DIFFICULTY_STORAGE_KEY = 'arham_adventure_difficulty_v1';

export const DEFAULT_DIFFICULTY: DifficultyLevel = 'medium';

export const DIFFICULTY_LEVELS: readonly DifficultyLevel[] = ['easy', 'medium', 'hard'] as const;

export interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  shortLabel: string;
  subtitle: string;
  accentHex: string;
  obstacleSpeedMultiplier: number;
  honeyCrumbleMultiplier: number;
  timeLimitMultiplier: number;
  scoreMultiplier: number;
}

export const DIFFICULTY_CATALOG: Record<DifficultyLevel, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Mudah',
    shortLabel: 'Mudah',
    subtitle: 'Rintangan santai · Soal dasar',
    accentHex: '#16a34a',
    obstacleSpeedMultiplier: 0.72,
    honeyCrumbleMultiplier: 1.35,
    timeLimitMultiplier: 1.15,
    scoreMultiplier: 1.0,
  },
  medium: {
    id: 'medium',
    label: 'Sedang',
    shortLabel: 'Sedang',
    subtitle: 'Kecepatan standar · Soal seimbang',
    accentHex: '#d97706',
    obstacleSpeedMultiplier: 1.0,
    honeyCrumbleMultiplier: 1.0,
    timeLimitMultiplier: 1.0,
    scoreMultiplier: 1.0,
  },
  hard: {
    id: 'hard',
    label: 'Sulit',
    shortLabel: 'Sulit',
    subtitle: 'Rintangan ngebut · Soal menantang',
    accentHex: '#dc2626',
    obstacleSpeedMultiplier: 1.42,
    honeyCrumbleMultiplier: 0.72,
    timeLimitMultiplier: 0.85,
    scoreMultiplier: 1.25,
  },
};

export function isDifficultyLevel(value: string): value is DifficultyLevel {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

/**
 * Parses a URL `?difficulty=` parameter (supports English & Bahasa Indonesia aliases).
 * Returns null when missing or unrecognized.
 */
export function parseDifficultyParam(param: string | null | undefined): DifficultyLevel | null {
  if (!param) return null;
  const normalized = param.trim().toLowerCase();
  if (normalized === 'easy' || normalized === 'mudah') return 'easy';
  if (normalized === 'medium' || normalized === 'sedang' || normalized === 'normal') return 'medium';
  if (normalized === 'hard' || normalized === 'sulit') return 'hard';
  return null;
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }
  return null;
}

export function loadDifficulty(storage: StorageLike | null = getDefaultStorage()): DifficultyLevel {
  if (!storage) return DEFAULT_DIFFICULTY;
  try {
    const raw = storage.getItem(DIFFICULTY_STORAGE_KEY);
    if (!raw) return DEFAULT_DIFFICULTY;
    const parsed = parseDifficultyParam(raw);
    return parsed ?? DEFAULT_DIFFICULTY;
  } catch {
    return DEFAULT_DIFFICULTY;
  }
}

export function saveDifficulty(
  difficulty: DifficultyLevel,
  storage: StorageLike | null = getDefaultStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
  } catch {
    // Ignore quota / private-mode storage errors
  }
}

const HARD_REASONING_REGEX =
  /jika|sisa|selisih|volume|keliling|luas|rata-rata|perbandingan|persen|%|×|÷|\^|²|³|mengapa|penyebab|akibat|hubungan|perbedaan|urutan|proses|fungsi utama|simbiosis|fotosintesis|gravitasi|revolusi|proklamasi|konstitusi|eksplanasi/i;

/**
 * Computes a deterministic numeric complexity score for a quiz question.
 * Higher values represent harder, multi-step, or higher-grade curriculum questions.
 */
export function scoreQuestionComplexity(question: QuizQuestion): number {
  let score = question.grade * 10;

  if (question.difficultyTier === 'easy') {
    score -= 8;
  } else if (question.difficultyTier === 'hard') {
    score += 12;
  }

  // Longer stems & multi-step wording increase cognitive load
  const wordCount = question.question.trim().split(/\s+/).length;
  score += Math.min(8, Math.max(0, wordCount - 6) * 0.65);

  // Presence of analytical / quantitative reasoning cues
  if (HARD_REASONING_REGEX.test(question.question)) {
    score += 4.5;
  }

  // Multi-digit numbers or fractions in math/science prompts
  const numericTokens = question.question.match(/\d+/g);
  if (numericTokens) {
    const maxNum = numericTokens.reduce((best, tok) => Math.max(best, Number(tok) || 0), 0);
    if (maxNum >= 100) score += 3.5;
    else if (maxNum >= 20) score += 1.8;
    if (numericTokens.length >= 3) score += 2.2;
  }

  // Longer option text increases reading/discrimination effort
  const avgOptionLen =
    question.options.reduce((sum, opt) => sum + opt.length, 0) / question.options.length;
  score += Math.min(3, avgOptionLen * 0.14);

  return Math.round(score * 10) / 10;
}

/**
 * Scales obstacle speeds, honey-tile crumble timers, and time limit on a CourseLayout
 * according to the selected DifficultyLevel. Returns a new CourseLayout without mutating
 * the input arrays.
 */
export function applyDifficultyToCourseLayout(
  layout: CourseLayout,
  difficulty: DifficultyLevel,
): CourseLayout {
  const cfg = DIFFICULTY_CATALOG[difficulty];
  if (
    cfg.obstacleSpeedMultiplier === 1 &&
    cfg.honeyCrumbleMultiplier === 1 &&
    cfg.timeLimitMultiplier === 1
  ) {
    return layout;
  }

  const speedMul = cfg.obstacleSpeedMultiplier;
  const honeyMul = cfg.honeyCrumbleMultiplier;

  return {
    ...layout,
    platforms: layout.platforms.map((plat) =>
      plat.moveSpeed !== undefined
        ? { ...plat, moveSpeed: Number((plat.moveSpeed * speedMul).toFixed(3)) }
        : plat,
    ),
    sweepers: layout.sweepers.map((sw) => ({
      ...sw,
      speed: Number((sw.speed * speedMul).toFixed(3)),
    })),
    lasers: layout.lasers.map((laser) => ({
      ...laser,
      speed: Number((laser.speed * speedMul).toFixed(3)),
    })),
    bumpers: layout.bumpers.map((bumper) =>
      bumper.moveSpeed !== undefined
        ? { ...bumper, moveSpeed: Number((bumper.moveSpeed * speedMul).toFixed(3)) }
        : bumper,
    ),
    fallingTiles: layout.fallingTiles.map((tile) =>
      tile.crumbleDuration !== undefined
        ? {
            ...tile,
            crumbleDuration: Number(Math.max(0.24, tile.crumbleDuration * honeyMul).toFixed(3)),
          }
        : tile,
    ),
    timeLimitSeconds: Math.max(
      60,
      Math.round((layout.timeLimitSeconds * cfg.timeLimitMultiplier) / 5) * 5,
    ),
  };
}
