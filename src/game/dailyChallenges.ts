import { StorageLike } from './leaderboard';

export type DailyChallengeKind =
  | 'correct_answers'
  | 'first_try_answers'
  | 'collect_stars'
  | 'finish_race'
  | 'win_race'
  | 'fast_finish';

export type DailyChallengeIcon = 'quiz' | 'star' | 'bolt' | 'flag' | 'trophy' | 'stopwatch';

export interface DailyChallengeItem {
  id: string;
  kind: DailyChallengeKind;
  title: string;
  description: string;
  target: number;
  progress: number;
  bonusPoints: number;
  completed: boolean;
  rewardAwarded: boolean;
  icon: DailyChallengeIcon;
}

export interface DailyChallengesState {
  dateKey: string;
  challenges: DailyChallengeItem[];
  totalBonusEarnedToday: number;
}

export type DailyChallengeEvent =
  | { type: 'quiz_correct'; firstTry: boolean }
  | { type: 'star_collected'; count?: number }
  | { type: 'race_finished'; rank: number; clearTimeSeconds: number };

interface ChallengeTemplate {
  id: string;
  kind: DailyChallengeKind;
  title: string;
  description: string;
  target: number;
  bonusPoints: number;
  icon: DailyChallengeIcon;
}

export const DAILY_CHALLENGES_STORAGE_KEY = 'arham_adventure_daily_challenges_v1';

const CORE_QUIZ_CHALLENGE: ChallengeTemplate = {
  id: 'daily_correct_5',
  kind: 'correct_answers',
  title: 'Jawab 5 Kuis Benar',
  description: 'Buka 5 pintu jawaban benar di lintasan hari ini.',
  target: 5,
  bonusPoints: 250,
  icon: 'quiz',
};

const SLOT_TWO_POOL: readonly ChallengeTemplate[] = [
  {
    id: 'daily_stars_8',
    kind: 'collect_stars',
    title: 'Kumpulkan 8 Bintang',
    description: 'Ambil 8 bintang emas yang berkilau di lintasan langit.',
    target: 8,
    bonusPoints: 200,
    icon: 'star',
  },
  {
    id: 'daily_first_try_3',
    kind: 'first_try_answers',
    title: '3 Jawaban Sekali Coba',
    description: 'Jawab benar 3 gerbang kuis langsung pada percobaan pertama.',
    target: 3,
    bonusPoints: 225,
    icon: 'bolt',
  },
];

const SLOT_THREE_POOL: readonly ChallengeTemplate[] = [
  {
    id: 'daily_finish_1',
    kind: 'finish_race',
    title: 'Selesaikan 1 Balapan',
    description: 'Capai garis finis lintasan langit hari ini.',
    target: 1,
    bonusPoints: 200,
    icon: 'flag',
  },
  {
    id: 'daily_win_1',
    kind: 'win_race',
    title: 'Raih Juara #1',
    description: 'Finis di peringkat #1 mengalahkan teman sekelas.',
    target: 1,
    bonusPoints: 300,
    icon: 'trophy',
  },
  {
    id: 'daily_fast_60',
    kind: 'fast_finish',
    title: 'Finis di Bawah 60 Detik',
    description: 'Tuntaskan seluruh lintasan langit kurang dari 60 detik.',
    target: 1,
    bonusPoints: 300,
    icon: 'stopwatch',
  },
];

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hashDateKey(dateKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    h ^= dateKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function instantiateTemplate(tpl: ChallengeTemplate): DailyChallengeItem {
  return {
    ...tpl,
    progress: 0,
    completed: false,
    rewardAwarded: false,
  };
}

export function createDailyChallengesForDate(dateKey: string): DailyChallengesState {
  const seed = hashDateKey(dateKey);
  const slot2 = SLOT_TWO_POOL[seed % SLOT_TWO_POOL.length];
  const slot3 = SLOT_THREE_POOL[Math.floor(seed / 3) % SLOT_THREE_POOL.length];

  return {
    dateKey,
    challenges: [
      instantiateTemplate(CORE_QUIZ_CHALLENGE),
      instantiateTemplate(slot2),
      instantiateTemplate(slot3),
    ],
    totalBonusEarnedToday: 0,
  };
}

export function applyDailyChallengeEvent(
  state: DailyChallengesState,
  event: DailyChallengeEvent,
): {
  nextState: DailyChallengesState;
  newlyCompleted: DailyChallengeItem[];
  bonusPointsAwarded: number;
} {
  const newlyCompleted: DailyChallengeItem[] = [];
  let bonusPointsAwarded = 0;

  const updatedChallenges = state.challenges.map((challenge) => {
    if (challenge.completed && challenge.rewardAwarded) {
      return challenge;
    }

    let delta = 0;
    if (event.type === 'quiz_correct') {
      if (challenge.kind === 'correct_answers') {
        delta = 1;
      } else if (challenge.kind === 'first_try_answers' && event.firstTry) {
        delta = 1;
      }
    } else if (event.type === 'star_collected') {
      if (challenge.kind === 'collect_stars') {
        delta = Math.max(1, Math.round(event.count ?? 1));
      }
    } else if (event.type === 'race_finished') {
      if (challenge.kind === 'finish_race') {
        delta = 1;
      } else if (challenge.kind === 'win_race' && event.rank === 1) {
        delta = 1;
      } else if (challenge.kind === 'fast_finish' && event.clearTimeSeconds <= 60) {
        delta = 1;
      }
    }

    if (delta === 0) {
      return challenge;
    }

    const nextProgress = Math.min(challenge.target, challenge.progress + delta);
    const nowCompleted = nextProgress >= challenge.target;
    const awardNow = nowCompleted && !challenge.rewardAwarded;

    const updated: DailyChallengeItem = {
      ...challenge,
      progress: nextProgress,
      completed: nowCompleted,
      rewardAwarded: challenge.rewardAwarded || awardNow,
    };

    if (awardNow) {
      newlyCompleted.push(updated);
      bonusPointsAwarded += challenge.bonusPoints;
    }

    return updated;
  });

  return {
    nextState: {
      dateKey: state.dateKey,
      challenges: updatedChallenges,
      totalBonusEarnedToday: state.totalBonusEarnedToday + bonusPointsAwarded,
    },
    newlyCompleted,
    bonusPointsAwarded,
  };
}

function getDefaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

export function loadDailyChallenges(
  dateKey: string = getLocalDateKey(),
  storage?: StorageLike | null,
): DailyChallengesState {
  const fresh = createDailyChallengesForDate(dateKey);
  const store = storage !== undefined ? storage : getDefaultStorage();
  if (!store) return fresh;

  try {
    const raw = store.getItem(DAILY_CHALLENGES_STORAGE_KEY);
    if (!raw) return fresh;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || parsed.dateKey !== dateKey || !Array.isArray(parsed.challenges)) {
      return fresh;
    }

    const byId = new Map<string, Partial<DailyChallengeItem>>();
    for (const item of parsed.challenges) {
      if (item && typeof item === 'object' && typeof item.id === 'string') {
        byId.set(item.id, item as Partial<DailyChallengeItem>);
      }
    }

    let computedBonus = 0;
    const mergedChallenges = fresh.challenges.map((base) => {
      const saved = byId.get(base.id);
      if (!saved) return base;
      const rawProgress = Number(saved.progress);
      const progress = Number.isFinite(rawProgress)
        ? Math.max(0, Math.min(base.target, Math.floor(rawProgress)))
        : 0;
      const completed = progress >= base.target || Boolean(saved.completed);
      const rewardAwarded = completed && Boolean(saved.rewardAwarded ?? true);
      if (rewardAwarded) {
        computedBonus += base.bonusPoints;
      }
      return {
        ...base,
        progress: completed ? base.target : progress,
        completed,
        rewardAwarded,
      };
    });

    const savedTotal = Number(parsed.totalBonusEarnedToday);
    return {
      dateKey,
      challenges: mergedChallenges,
      totalBonusEarnedToday: Number.isFinite(savedTotal) ? Math.max(computedBonus, Math.round(savedTotal)) : computedBonus,
    };
  } catch {
    return fresh;
  }
}

export function saveDailyChallenges(
  state: DailyChallengesState,
  storage?: StorageLike | null,
): void {
  const store = storage !== undefined ? storage : getDefaultStorage();
  if (!store) return;
  try {
    store.setItem(DAILY_CHALLENGES_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or restricted-mode errors
  }
}

export function formatIndonesianDateKey(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return dateKey;
  }
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  const [y, m, d] = parts;
  const monthLabel = months[Math.max(0, Math.min(11, m - 1))];
  return `${d} ${monthLabel} ${y}`;
}
