import assert from 'node:assert/strict';
import test from 'node:test';
import { createCourseLayout, createInitialRacers } from './courseData';
import {
  GAME_MODE_CATALOG,
  GAME_MODE_SELECTIONS,
  generateHoneyHexGrid,
  getLaserBarrierZ,
  HONEY_DROP_CONSTANTS,
  isRacerHitByLaser,
  parseGameModeParam,
  PLAYABLE_GAME_MODES,
  resolveGameMode,
} from './gameModes';
import { computeAiInput, PhysicsEvent, stepRacerPhysics } from './physics';
import { selectRaceQuestions } from './questions';
import { findSupportingTile, stepFallingTiles, triggerTileStep } from './tileFall';

test('parseGameModeParam defaults to random and accepts all 6 mode options', () => {
  assert.equal(parseGameModeParam(null), 'random');
  assert.equal(parseGameModeParam(undefined), 'random');
  assert.equal(parseGameModeParam(''), 'random');
  assert.equal(parseGameModeParam('invalid_mode'), 'random');

  for (const selection of GAME_MODE_SELECTIONS) {
    assert.equal(parseGameModeParam(selection), selection);
    assert.equal(parseGameModeParam(selection.toUpperCase()), selection);
    assert.ok(GAME_MODE_CATALOG[selection].label.length > 0);
  }
});

test('resolveGameMode honors explicit modes and rolls variety without immediate repeats in random mode', () => {
  for (const mode of PLAYABLE_GAME_MODES) {
    assert.equal(resolveGameMode(mode, mode, () => 0), mode);
  }

  // Random mode covers all playable modes across [0, 1)
  const seen = new Set<string>();
  for (let i = 0; i < PLAYABLE_GAME_MODES.length; i++) {
    const rolled = resolveGameMode('random', null, () => (i + 0.1) / PLAYABLE_GAME_MODES.length);
    seen.add(rolled);
  }
  assert.equal(seen.size, PLAYABLE_GAME_MODES.length);

  // When lastPlayed is passed, random mode avoids immediate repetition across full RNG range
  for (const last of PLAYABLE_GAME_MODES) {
    for (const r of [0, 0.24, 0.5, 0.75, 0.999999]) {
      const next = resolveGameMode('random', last, () => r);
      assert.notEqual(next, last, `Random mode should not immediately repeat ${last}`);
      assert.ok(PLAYABLE_GAME_MODES.includes(next));
    }
  }
});

test('createCourseLayout constructs valid finite courses for all 5 playable modes', () => {
  const questions = selectRaceQuestions('semua', 5);

  for (const mode of PLAYABLE_GAME_MODES) {
    const course = createCourseLayout(questions, mode, 1337);
    assert.equal(course.mode, mode);
    assert.ok(course.platforms.length >= 4, `${mode} needs platforms`);
    assert.ok(course.quizGates.length >= 3, `${mode} needs quiz gates`);
    assert.ok(course.finishZ < course.startZ, `${mode} finish must be ahead of start`);
    assert.ok(Number.isFinite(course.timeLimitSeconds) && course.timeLimitSeconds > 0);

    if (mode === 'ice_slide') {
      assert.ok(
        course.platforms.every((p) => p.surface === 'ice'),
        'Ice Slide decks should have ice surface',
      );
      assert.equal(course.quizGates.length, 4);
    } else if (mode === 'laser_dash') {
      assert.ok(course.lasers.length >= 8, 'Laser Dash should spawn sweeping laser barriers');
      assert.ok(
        course.platforms.every((p) => p.surface === 'neon'),
        'Laser Dash decks should have neon surface',
      );
      assert.equal(course.quizGates.length, 4);
    } else if (mode === 'honey_drop') {
      assert.ok(course.fallingTiles.length >= 80, 'Honey Drop needs 3 hexagonal honeycomb arenas');
      assert.ok(
        course.fallingTiles.every((t) => t.shape === 'hex' && t.crumbleDuration === HONEY_DROP_CONSTANTS.crumbleDuration),
        'Honey Drop tiles must be hex crumble tiles',
      );
      assert.equal(course.quizGates.length, 3);
    }
  }
});

test('Ice Slide low-friction surface lets racers glide significantly farther after releasing movement', () => {
  const questions = selectRaceQuestions('semua', 5);
  const normalCourse = createCourseLayout(questions, 'classic');
  const iceCourse = createCourseLayout(questions, 'ice_slide');

  const normalRacer = createInitialRacers()[0];
  const iceRacer = createInitialRacers()[0];
  normalRacer.vz = -10;
  iceRacer.vz = -10;

  const idleInput = {
    moveX: 0,
    moveZ: 0,
    jumpHeld: false,
    jumpJustPressed: false,
    jumpJustReleased: false,
    diveJustPressed: false,
  };

  const events: PhysicsEvent[] = [];
  for (let i = 0; i < 12; i++) {
    stepRacerPhysics(normalRacer, idleInput, normalCourse, 0.03, i * 0.03, events);
    stepRacerPhysics(iceRacer, idleInput, iceCourse, 0.03, i * 0.03, events);
  }

  assert.ok(
    Math.abs(iceRacer.vz) > Math.abs(normalRacer.vz) * 3,
    `Ice racer (${iceRacer.vz.toFixed(2)}) must retain much more glide velocity than normal (${normalRacer.vz.toFixed(2)})`,
  );
  assert.ok(
    iceRacer.z < normalRacer.z - 1.0,
    'Ice racer should slide visibly farther after coasting',
  );
});

test('Laser Dash sweeping barrier hits grounded racers, clears jumping racers, and triggers AI jumps', () => {
  const questions = selectRaceQuestions('semua', 5);
  const laserCourse = createCourseLayout(questions, 'laser_dash');
  const laser = laserCourse.lasers[0];

  const laserZ = getLaserBarrierZ(laser, 1.0);
  assert.ok(laserZ >= laser.zMin - 1e-6 && laserZ <= laser.zMax + 1e-6);

  // Grounded racer directly on beam gets hit
  assert.equal(isRacerHitByLaser(0, laser.y, laserZ, laser, 1.0), true);
  // Jumping racer well above barHeight clears the beam cleanly
  assert.equal(isRacerHitByLaser(0, laser.y + laser.barHeight + 0.6, laserZ, laser, 1.0), false);

  // Physics collision emits laser_hit event and applies stun + knockback
  const racer = createInitialRacers()[0];
  racer.x = 0;
  racer.y = laser.y;
  racer.z = laserZ;
  const events: PhysicsEvent[] = [];
  stepRacerPhysics(
    racer,
    { moveX: 0, moveZ: 0, jumpHeld: false, jumpJustPressed: false, jumpJustReleased: false, diveJustPressed: false },
    laserCourse,
    0.016,
    1.0,
    events,
  );
  assert.ok(events.some((e) => e.type === 'laser_hit'), 'Must emit laser_hit event on collision');
  assert.ok(racer.stunTimer > 0.2 && racer.vy > 4);

  // AI jumps when approaching a sweeping laser
  const aiRacer = createInitialRacers()[1];
  aiRacer.x = 0;
  aiRacer.y = laser.y;
  aiRacer.z = laserZ + 1.5;
  aiRacer.grounded = true;
  const aiInput = computeAiInput(aiRacer, laserCourse, 1.0);
  assert.equal(aiInput.jumpJustPressed, true, 'AI must jump over approaching low laser beam');
});

test('Honey Drop hexagonal tiles hold briefly after stepping (0.48s) then crumble and drop', () => {
  const hexes = generateHoneyHexGrid({
    gridIndex: 0,
    rows: 4,
    cols: 5,
    startZ: -10,
    y: 0,
    seed: 99,
  });

  // 2 even rows (5 cols) + 2 odd rows (4 cols) = 18 staggered hexes
  assert.equal(hexes.length, 18);
  const tile = hexes[0];
  assert.equal(tile.shape, 'hex');
  assert.equal(tile.state, 'hidden');

  // Stepping starts crumble countdown (0.48s) while still supporting briefly
  assert.equal(triggerTileStep(tile), 'fake_triggered');
  assert.equal(tile.state, 'shaking');
  assert.equal(tile.shakeTimer, HONEY_DROP_CONSTANTS.crumbleDuration);

  // After 0.25s (5 frames of 0.05s), hex is still shaking & supporting
  for (let i = 0; i < 5; i++) {
    stepFallingTiles(hexes, 0.05);
  }
  assert.equal(tile.state, 'shaking');
  assert.ok(findSupportingTile(tile.x, 0, 0.1, tile.z, hexes, 0.3));

  // After another 0.30s (6 frames of 0.05s), hex crumbles and drops!
  const fallen = [];
  for (let i = 0; i < 6; i++) {
    fallen.push(...stepFallingTiles(hexes, 0.05).newlyFallenTiles);
  }
  assert.equal(fallen.length, 1);
  assert.equal(tile.state, 'falling');
  assert.equal(findSupportingTile(tile.x, 0, 0.1, tile.z, hexes, 0.3), null);
});
