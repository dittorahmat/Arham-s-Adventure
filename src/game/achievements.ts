import {
  AchievementBadgeView,
  AchievementIconKind,
  AchievementId,
  AchievementProfile,
} from './types';

export const ACHIEVEMENTS_STORAGE_KEY = 'arham_adventure_achievements_v1';
export const FASTEST_LAP_TARGET_SECONDS = 50;
export const STREAK_TARGET = 10;
export const STAR_RUN_TARGET = 8;
export const STAR_LIFETIME_TARGET = 25;

interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;
  icon: AchievementIconKind;
  accentHex: string;
}

export const ACHIEVEMENT_DEFS: readonly AchievementDef[] = [
  {
    id: 'streak_10',
    title: '10 Benar Beruntun',
    description: 'Jawab 10 soal kuis benar berturut-turut tanpa salah pintu',
    icon: 'streak',
    accentHex: '#f59e0b',
  },
  {
    id: 'fastest_lap',
    title: 'Putaran Tercepat',
    description: `Capai garis finis dalam waktu ≤ ${FASTEST_LAP_TARGET_SECONDS} detik`,
    icon: 'stopwatch',
    accentHex: '#0ea5e9',
  },
  {
    id: 'champion_1',
    title: 'Juara #1 SD',
    description: 'Finis di peringkat pertama mengalahkan semua teman',
    icon: 'trophy',
    accentHex: '#eab308',
  },
  {
    id: 'perfect_quiz',
    title: 'Bintang Kuis Sempurna',
    description: 'Jawab semua gerbang kuis benar pada percobaan pertama',
    icon: 'perfect',
    accentHex: '#16a34a',
  },
  {
    id: 'star_collector',
    title: 'Kolektor Bintang',
    description: `Kumpulkan ${STAR_RUN_TARGET}+ bintang dalam 1 balapan atau ${STAR_LIFETIME_TARGET} total`,
    icon: 'star',
    accentHex: '#ec4899',
  },
  {
    id: 'first_finish',
    title: 'Penjelajah Langit',
    description: 'Selesaikan lintasan Arham\'s Adventure pertamamu',
    icon: 'flag',
    accentHex: '#6366f1',
  },
];

export function createDefaultAchievementProfile(): AchievementProfile {
  return {
    unlockedIds: [],
    currentAnswerStreak: 0,
    bestAnswerStreak: 0,
    fastestLapSeconds: null,
    totalWins: 0,
    totalRacesCompleted: 0,
    totalStarsCollected: 0,
  };
}

export function loadAchievementProfile(): AchievementProfile {
  if (typeof localStorage === 'undefined') {
    return createDefaultAchievementProfile();
  }
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return createDefaultAchievementProfile();
    const parsed = JSON.parse(raw) as Partial<AchievementProfile>;
    return {
      unlockedIds: Array.isArray(parsed.unlockedIds) ? parsed.unlockedIds : [],
      currentAnswerStreak: Number(parsed.currentAnswerStreak) || 0,
      bestAnswerStreak: Number(parsed.bestAnswerStreak) || 0,
      fastestLapSeconds:
        typeof parsed.fastestLapSeconds === 'number' && Number.isFinite(parsed.fastestLapSeconds)
          ? parsed.fastestLapSeconds
          : null,
      totalWins: Number(parsed.totalWins) || 0,
      totalRacesCompleted: Number(parsed.totalRacesCompleted) || 0,
      totalStarsCollected: Number(parsed.totalStarsCollected) || 0,
    };
  } catch {
    return createDefaultAchievementProfile();
  }
}

export function saveAchievementProfile(profile: AchievementProfile): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Updates persistent answer streak live during gameplay so streaks carry over across races.
 * Returns whether 'streak_10' was newly unlocked right now.
 */
export function recordAnswerAttempt(
  profile: AchievementProfile,
  firstTryCorrect: boolean,
): { nextProfile: AchievementProfile; unlockedStreak10Now: boolean } {
  const nextStreak = firstTryCorrect ? profile.currentAnswerStreak + 1 : 0;
  const nextBest = Math.max(profile.bestAnswerStreak, nextStreak);
  const alreadyUnlocked = profile.unlockedIds.includes('streak_10');
  const unlockedStreak10Now = !alreadyUnlocked && nextBest >= STREAK_TARGET;

  return {
    nextProfile: {
      ...profile,
      currentAnswerStreak: nextStreak,
      bestAnswerStreak: nextBest,
      unlockedIds: unlockedStreak10Now
        ? [...profile.unlockedIds, 'streak_10']
        : [...profile.unlockedIds],
    },
    unlockedStreak10Now,
  };
}

export interface RunAchievementInput {
  outcome: 'victory' | 'timeout';
  rank: number;
  clearTime: number;
  correctCount: number;
  totalGates: number;
  starsCollected: number;
  /** IDs already unlocked mid-run (e.g. 'streak_10') that should still display as newly unlocked on Game Over */
  midRunUnlockedIds?: AchievementId[];
}

export interface RunAchievementEvaluation {
  nextProfile: AchievementProfile;
  badges: AchievementBadgeView[];
  newlyUnlockedIds: AchievementId[];
  isNewFastestLap: boolean;
}

export function evaluateRunAchievements(
  prevProfile: AchievementProfile,
  run: RunAchievementInput,
): RunAchievementEvaluation {
  const previouslyUnlocked = new Set<AchievementId>(prevProfile.unlockedIds);
  const midRunSet = new Set<AchievementId>(run.midRunUnlockedIds ?? []);

  const isVictory = run.outcome === 'victory';
  const prevFastest = prevProfile.fastestLapSeconds;
  const isNewFastestLap =
    isVictory && (prevFastest === null || run.clearTime < prevFastest);

  const nextFastest = isNewFastestLap ? run.clearTime : prevFastest;
  const nextTotalWins = prevProfile.totalWins + (isVictory && run.rank === 1 ? 1 : 0);
  const nextRacesCompleted = prevProfile.totalRacesCompleted + (isVictory ? 1 : 0);
  const nextTotalStars = prevProfile.totalStarsCollected + run.starsCollected;

  const unlockedSet = new Set<AchievementId>(previouslyUnlocked);

  if (prevProfile.bestAnswerStreak >= STREAK_TARGET) {
    unlockedSet.add('streak_10');
  }
  if (isVictory) {
    unlockedSet.add('first_finish');
    if (run.rank === 1) {
      unlockedSet.add('champion_1');
    }
    if (run.clearTime <= FASTEST_LAP_TARGET_SECONDS) {
      unlockedSet.add('fastest_lap');
    }
  }
  if (run.totalGates > 0 && run.correctCount >= run.totalGates) {
    unlockedSet.add('perfect_quiz');
  }
  if (run.starsCollected >= STAR_RUN_TARGET || nextTotalStars >= STAR_LIFETIME_TARGET) {
    unlockedSet.add('star_collector');
  }

  const newlyUnlockedIds: AchievementId[] = [];
  for (const id of unlockedSet) {
    if (!previouslyUnlocked.has(id) || midRunSet.has(id)) {
      newlyUnlockedIds.push(id);
    }
  }

  const nextProfile: AchievementProfile = {
    ...prevProfile,
    unlockedIds: [...unlockedSet],
    fastestLapSeconds: nextFastest,
    totalWins: nextTotalWins,
    totalRacesCompleted: nextRacesCompleted,
    totalStarsCollected: nextTotalStars,
  };

  const newlySet = new Set<AchievementId>(newlyUnlockedIds);

  const badges: AchievementBadgeView[] = ACHIEVEMENT_DEFS.map((def) => {
    const unlocked = unlockedSet.has(def.id);
    const newlyUnlocked = newlySet.has(def.id);

    let progressText = '';
    switch (def.id) {
      case 'streak_10':
        progressText = `${Math.min(STREAK_TARGET, nextProfile.bestAnswerStreak)}/${STREAK_TARGET} beruntun`;
        break;
      case 'fastest_lap':
        if (nextFastest !== null) {
          progressText = isNewFastestLap
            ? `Rekor baru: ${nextFastest} dtk`
            : `Tercepat: ${nextFastest} dtk`;
        } else {
          progressText = `Target ≤ ${FASTEST_LAP_TARGET_SECONDS} dtk`;
        }
        break;
      case 'champion_1':
        progressText =
          nextTotalWins > 0 ? `${nextTotalWins}× Juara #1` : `Peringkat #${run.rank}`;
        break;
      case 'perfect_quiz':
        progressText = unlocked ? '100% Sempurna' : `${run.correctCount}/${run.totalGates} kuis`;
        break;
      case 'star_collector':
        progressText = unlocked
          ? `${nextTotalStars} bintang total`
          : `${run.starsCollected}/${STAR_RUN_TARGET} sesi · ${nextTotalStars}/${STAR_LIFETIME_TARGET} total`;
        break;
      case 'first_finish':
        progressText =
          nextRacesCompleted > 0 ? `${nextRacesCompleted}× finis` : 'Belum finis';
        break;
    }

    return {
      ...def,
      unlocked,
      newlyUnlocked,
      progressText,
    };
  });

  // Sort newly unlocked first, then unlocked, then locked for clean visual hierarchy
  badges.sort((a, b) => {
    const scoreA = (a.newlyUnlocked ? 2 : 0) + (a.unlocked ? 1 : 0);
    const scoreB = (b.newlyUnlocked ? 2 : 0) + (b.unlocked ? 1 : 0);
    return scoreB - scoreA;
  });

  return {
    nextProfile,
    badges,
    newlyUnlockedIds,
    isNewFastestLap,
  };
}
