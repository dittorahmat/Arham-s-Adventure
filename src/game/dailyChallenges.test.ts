import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDailyChallengeEvent,
  createDailyChallengesForDate,
  DAILY_CHALLENGES_STORAGE_KEY,
  formatIndonesianDateKey,
  loadDailyChallenges,
  saveDailyChallenges,
} from './dailyChallenges';
import { StorageLike } from './leaderboard';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

test('createDailyChallengesForDate always includes Get 5 Correct Answers plus 2 rotating daily objectives', () => {
  const state = createDailyChallengesForDate('2026-11-22');
  assert.equal(state.dateKey, '2026-11-22');
  assert.equal(state.challenges.length, 3);
  assert.equal(state.challenges[0].kind, 'correct_answers');
  assert.equal(state.challenges[0].target, 5);
  assert.equal(state.challenges[0].bonusPoints, 250);
  assert.equal(state.totalBonusEarnedToday, 0);
});

test('applyDailyChallengeEvent tracks quiz answers, awards bonus once, and prevents duplicate rewards', () => {
  let state = createDailyChallengesForDate('2026-11-22');

  // 4 correct answers -> not completed yet
  for (let i = 0; i < 4; i++) {
    const res = applyDailyChallengeEvent(state, { type: 'quiz_correct', firstTry: false });
    state = res.nextState;
    assert.equal(res.bonusPointsAwarded, 0);
    assert.equal(res.newlyCompleted.length, 0);
  }
  assert.equal(state.challenges[0].progress, 4);
  assert.equal(state.challenges[0].completed, false);

  // 5th correct answer -> completes and awards +250 bonus points
  const fifth = applyDailyChallengeEvent(state, { type: 'quiz_correct', firstTry: false });
  state = fifth.nextState;
  assert.equal(fifth.newlyCompleted.length, 1);
  assert.equal(fifth.newlyCompleted[0].id, 'daily_correct_5');
  assert.equal(fifth.bonusPointsAwarded, 250);
  assert.equal(state.challenges[0].progress, 5);
  assert.equal(state.challenges[0].completed, true);
  assert.equal(state.totalBonusEarnedToday, 250);

  // 6th correct answer -> idempotent, zero extra bonus
  const sixth = applyDailyChallengeEvent(state, { type: 'quiz_correct', firstTry: false });
  assert.equal(sixth.bonusPointsAwarded, 0);
  assert.equal(sixth.newlyCompleted.length, 0);
  assert.equal(sixth.nextState.totalBonusEarnedToday, 250);
});

test('applyDailyChallengeEvent handles stars and fast race win conditions cleanly', () => {
  // Find a date that includes collect_stars and win_race or test with synthetic state
  let state = createDailyChallengesForDate('2026-11-22');
  // Test all 3 challenges completing via star + quiz + fast #1 race finish
  for (let i = 0; i < 5; i++) {
    state = applyDailyChallengeEvent(state, { type: 'quiz_correct', firstTry: true }).nextState;
  }
  state = applyDailyChallengeEvent(state, { type: 'star_collected', count: 8 }).nextState;
  const finishRes = applyDailyChallengeEvent(state, {
    type: 'race_finished',
    rank: 1,
    clearTimeSeconds: 42,
  });
  state = finishRes.nextState;

  assert.ok(state.challenges.every((c) => c.completed && c.rewardAwarded));
  const expectedTotal = state.challenges.reduce((sum, c) => sum + c.bonusPoints, 0);
  assert.equal(state.totalBonusEarnedToday, expectedTotal);
});

test('loadDailyChallenges persists within the same day, resets on a new day, and recovers from corrupt storage', () => {
  const store = createMemoryStorage();
  let state = loadDailyChallenges('2026-11-22', store);

  for (let i = 0; i < 3; i++) {
    state = applyDailyChallengeEvent(state, { type: 'quiz_correct', firstTry: false }).nextState;
  }
  saveDailyChallenges(state, store);

  // Reload same day -> preserves progress 3/5
  const sameDay = loadDailyChallenges('2026-11-22', store);
  assert.equal(sameDay.challenges[0].progress, 3);
  assert.equal(sameDay.challenges[0].completed, false);

  // Next day -> fresh reset to 0/5
  const nextDay = loadDailyChallenges('2026-11-23', store);
  assert.equal(nextDay.dateKey, '2026-11-23');
  assert.equal(nextDay.challenges[0].progress, 0);
  assert.equal(nextDay.totalBonusEarnedToday, 0);

  // Corrupt JSON -> safe fallback
  store.setItem(DAILY_CHALLENGES_STORAGE_KEY, '{not-valid-json');
  const recovered = loadDailyChallenges('2026-11-22', store);
  assert.equal(recovered.challenges.length, 3);
  assert.equal(recovered.challenges[0].progress, 0);
});

test('formatIndonesianDateKey formats YYYY-MM-DD readably', () => {
  assert.equal(formatIndonesianDateKey('2026-11-22'), '22 Nov 2026');
  assert.equal(formatIndonesianDateKey('2026-05-03'), '3 Mei 2026');
});
