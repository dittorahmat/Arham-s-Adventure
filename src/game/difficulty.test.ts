import assert from 'node:assert/strict';
import test from 'node:test';
import { createCourseLayout } from './courseData';
import {
  applyDifficultyToCourseLayout,
  DEFAULT_DIFFICULTY,
  DIFFICULTY_CATALOG,
  DIFFICULTY_STORAGE_KEY,
  loadDifficulty,
  parseDifficultyParam,
  saveDifficulty,
  scoreQuestionComplexity,
} from './difficulty';
import { StorageLike } from './leaderboard';
import { GRADE_LEVELS, selectRaceQuestions } from './questions';
import { PLAYABLE_GAME_MODES } from './gameModes';

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

test('difficulty persistence saves, loads, and safely handles invalid/corrupt values', () => {
  const store = createMemoryStorage();
  assert.equal(loadDifficulty(store), DEFAULT_DIFFICULTY);

  saveDifficulty('hard', store);
  assert.equal(loadDifficulty(store), 'hard');

  saveDifficulty('easy', store);
  assert.equal(loadDifficulty(store), 'easy');

  store.setItem(DIFFICULTY_STORAGE_KEY, 'unknown_level');
  assert.equal(loadDifficulty(store), DEFAULT_DIFFICULTY);

  assert.equal(parseDifficultyParam('easy'), 'easy');
  assert.equal(parseDifficultyParam('mudah'), 'easy');
  assert.equal(parseDifficultyParam('MEDIUM'), 'medium');
  assert.equal(parseDifficultyParam('sedang'), 'medium');
  assert.equal(parseDifficultyParam('hard'), 'hard');
  assert.equal(parseDifficultyParam('Sulit'), 'hard');
  assert.equal(parseDifficultyParam('invalid'), null);
  assert.equal(parseDifficultyParam(null), null);
});

test('applyDifficultyToCourseLayout scales obstacle speeds, crumble timers, and time limits across all modes', () => {
  assert.ok(
    DIFFICULTY_CATALOG.easy.obstacleSpeedMultiplier <
      DIFFICULTY_CATALOG.medium.obstacleSpeedMultiplier,
  );
  assert.ok(
    DIFFICULTY_CATALOG.medium.obstacleSpeedMultiplier <
      DIFFICULTY_CATALOG.hard.obstacleSpeedMultiplier,
  );

  for (const mode of PLAYABLE_GAME_MODES) {
    const questions = selectRaceQuestions('semua', 5, 42, 5, 'medium');
    const easyCourse = createCourseLayout(questions, mode, 100, 'easy');
    const medCourse = createCourseLayout(questions, mode, 100, 'medium');
    const hardCourse = createCourseLayout(questions, mode, 100, 'hard');

    // Time limit is more generous on Easy and tighter on Hard
    assert.ok(
      easyCourse.timeLimitSeconds > medCourse.timeLimitSeconds,
      `${mode}: easy timeLimit should exceed medium`,
    );
    assert.ok(
      hardCourse.timeLimitSeconds < medCourse.timeLimitSeconds,
      `${mode}: hard timeLimit should be tighter than medium`,
    );

    // Sweeper speed scales monotonically
    for (let i = 0; i < medCourse.sweepers.length; i++) {
      assert.ok(Math.abs(easyCourse.sweepers[i].speed) < Math.abs(medCourse.sweepers[i].speed));
      assert.ok(Math.abs(hardCourse.sweepers[i].speed) > Math.abs(medCourse.sweepers[i].speed));
    }

    // Laser speed scales monotonically
    for (let i = 0; i < medCourse.lasers.length; i++) {
      assert.ok(easyCourse.lasers[i].speed < medCourse.lasers[i].speed);
      assert.ok(hardCourse.lasers[i].speed > medCourse.lasers[i].speed);
    }

    // Moving platforms scale monotonically
    for (let i = 0; i < medCourse.platforms.length; i++) {
      const mSpeed = medCourse.platforms[i].moveSpeed;
      if (mSpeed !== undefined) {
        assert.ok((easyCourse.platforms[i].moveSpeed ?? 0) < mSpeed);
        assert.ok((hardCourse.platforms[i].moveSpeed ?? 0) > mSpeed);
      }
    }

    // Moving bumpers scale monotonically
    for (let i = 0; i < medCourse.bumpers.length; i++) {
      const mSpeed = medCourse.bumpers[i].moveSpeed;
      if (mSpeed !== undefined) {
        assert.ok((easyCourse.bumpers[i].moveSpeed ?? 0) < mSpeed);
        assert.ok((hardCourse.bumpers[i].moveSpeed ?? 0) > mSpeed);
      }
    }

    // Honey drop crumble timers are longer (easier) on Easy and shorter (harder) on Hard
    for (let i = 0; i < medCourse.fallingTiles.length; i++) {
      const mCrumble = medCourse.fallingTiles[i].crumbleDuration;
      if (mCrumble !== undefined) {
        assert.ok((easyCourse.fallingTiles[i].crumbleDuration ?? 0) > mCrumble);
        assert.ok((hardCourse.fallingTiles[i].crumbleDuration ?? 0) < mCrumble);
      }
    }
  }

  // Verify applyDifficultyToCourseLayout does not mutate original layout
  const qs = selectRaceQuestions('semua', 5, 7, 5, 'medium');
  const base = createCourseLayout(qs, 'classic', 100, 'medium');
  const baseSpeed = base.sweepers[0].speed;
  const hard = applyDifficultyToCourseLayout(base, 'hard');
  assert.equal(base.sweepers[0].speed, baseSpeed);
  assert.notEqual(hard.sweepers[0].speed, baseSpeed);
});

test('selectRaceQuestions adjusts quiz complexity across Easy, Medium, and Hard for all grades 1–6', () => {
  const avgComplexity = (qs: ReturnType<typeof selectRaceQuestions>) =>
    qs.reduce((sum, q) => sum + scoreQuestionComplexity(q), 0) / qs.length;

  for (const grade of GRADE_LEVELS) {
    const easyQs = selectRaceQuestions('semua', 5, 303 + grade, grade, 'easy');
    const medQs = selectRaceQuestions('semua', 5, 303 + grade, grade, 'medium');
    const hardQs = selectRaceQuestions('semua', 5, 303 + grade, grade, 'hard');

    assert.equal(easyQs.length, 5);
    assert.equal(medQs.length, 5);
    assert.equal(hardQs.length, 5);

    const easyAvg = avgComplexity(easyQs);
    const medAvg = avgComplexity(medQs);
    const hardAvg = avgComplexity(hardQs);

    assert.ok(
      easyAvg < hardAvg,
      `Kelas ${grade} SD: easy complexity (${easyAvg.toFixed(1)}) should be lower than hard (${hardAvg.toFixed(1)})`,
    );
    assert.ok(
      easyAvg <= medAvg + 0.5 && medAvg <= hardAvg + 0.5,
      `Kelas ${grade} SD: expected progressive complexity easy(${easyAvg.toFixed(1)}) <= med(${medAvg.toFixed(1)}) <= hard(${hardAvg.toFixed(1)})`,
    );
  }
});
