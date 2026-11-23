import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultAchievementProfile,
  evaluateRunAchievements,
  recordAnswerAttempt,
} from './achievements';

test('10 Correct Answers in a Row accumulates across multiple races and resets on wrong door', () => {
  let profile = createDefaultAchievementProfile();

  // First 5-gate race: all 5 correct
  for (let i = 0; i < 5; i++) {
    const res = recordAnswerAttempt(profile, true);
    profile = res.nextProfile;
    assert.equal(res.unlockedStreak10Now, false);
  }
  assert.equal(profile.currentAnswerStreak, 5);
  assert.equal(profile.bestAnswerStreak, 5);

  // Second 5-gate race: 5 more correct -> hits 10!
  let unlockedOnTenth = false;
  for (let i = 0; i < 5; i++) {
    const res = recordAnswerAttempt(profile, true);
    profile = res.nextProfile;
    if (i === 4) unlockedOnTenth = res.unlockedStreak10Now;
  }
  assert.equal(unlockedOnTenth, true);
  assert.equal(profile.currentAnswerStreak, 10);
  assert.ok(profile.unlockedIds.includes('streak_10'));

  // Wrong answer resets current streak but keeps best streak & unlocked badge
  const miss = recordAnswerAttempt(profile, false);
  assert.equal(miss.nextProfile.currentAnswerStreak, 0);
  assert.equal(miss.nextProfile.bestAnswerStreak, 10);
  assert.ok(miss.nextProfile.unlockedIds.includes('streak_10'));
});

test('Fastest Lap unlocks under target time and tracks personal record accurately', () => {
  const start = createDefaultAchievementProfile();

  // First victory at 58s: sets fastest lap record (58s), does not unlock <=50s badge yet
  const run1 = evaluateRunAchievements(start, {
    outcome: 'victory',
    rank: 2,
    clearTime: 58,
    correctCount: 4,
    totalGates: 5,
    starsCollected: 5,
  });
  assert.equal(run1.isNewFastestLap, true);
  assert.equal(run1.nextProfile.fastestLapSeconds, 58);
  assert.equal(run1.newlyUnlockedIds.includes('first_finish'), true);
  assert.equal(run1.newlyUnlockedIds.includes('fastest_lap'), false);

  // Second victory at 42s: beats record AND unlocks Fastest Lap + Champion #1 + Perfect Quiz + Star Collector!
  const run2 = evaluateRunAchievements(run1.nextProfile, {
    outcome: 'victory',
    rank: 1,
    clearTime: 42,
    correctCount: 5,
    totalGates: 5,
    starsCollected: 9,
  });
  assert.equal(run2.isNewFastestLap, true);
  assert.equal(run2.nextProfile.fastestLapSeconds, 42);
  assert.equal(run2.newlyUnlockedIds.includes('fastest_lap'), true);
  assert.equal(run2.newlyUnlockedIds.includes('champion_1'), true);
  assert.equal(run2.newlyUnlockedIds.includes('perfect_quiz'), true);
  assert.equal(run2.newlyUnlockedIds.includes('star_collector'), true);
  assert.equal(run2.newlyUnlockedIds.includes('first_finish'), false); // Already unlocked in run 1

  // Third run slower (49s): does not overwrite 42s record and does not re-flag newlyUnlocked
  const run3 = evaluateRunAchievements(run2.nextProfile, {
    outcome: 'victory',
    rank: 1,
    clearTime: 49,
    correctCount: 5,
    totalGates: 5,
    starsCollected: 4,
  });
  assert.equal(run3.isNewFastestLap, false);
  assert.equal(run3.nextProfile.fastestLapSeconds, 42);
  assert.equal(run3.newlyUnlockedIds.length, 0);
});

test('Timeout run preserves mid-run streak_10 unlock and does not set fastest lap', () => {
  let profile = createDefaultAchievementProfile();
  profile.currentAnswerStreak = 9;
  profile.bestAnswerStreak = 9;

  const tenth = recordAnswerAttempt(profile, true);
  assert.equal(tenth.unlockedStreak10Now, true);

  const evalRes = evaluateRunAchievements(tenth.nextProfile, {
    outcome: 'timeout',
    rank: 6,
    clearTime: 180,
    correctCount: 3,
    totalGates: 5,
    starsCollected: 2,
    midRunUnlockedIds: ['streak_10'],
  });

  assert.equal(evalRes.isNewFastestLap, false);
  assert.equal(evalRes.nextProfile.fastestLapSeconds, null);
  assert.equal(evalRes.newlyUnlockedIds.includes('streak_10'), true);
  const streakBadge = evalRes.badges.find((b) => b.id === 'streak_10');
  assert.ok(streakBadge && streakBadge.unlocked && streakBadge.newlyUnlocked);
});
