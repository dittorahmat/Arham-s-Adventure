import test from 'node:test';
import assert from 'node:assert/strict';
import { createCourseLayout, createInitialRacers } from './courseData';
import { selectRaceQuestions } from './questions';
import {
  computeAiInput,
  computeProgressPct,
  computeRaceStandings,
  findSupportingPlatform,
  getActiveQuizGate,
  PhysicsEvent,
  stepRacerPhysics,
} from './physics';
import { InputState } from './types';

const IDLE_INPUT: InputState = {
  moveX: 0,
  moveZ: 0,
  jumpHeld: false,
  jumpJustPressed: false,
  jumpJustReleased: false,
  diveJustPressed: false,
};

test('Player survives first seconds on start plaza with zero input', () => {
  const course = createCourseLayout(selectRaceQuestions('semua', 5, 7));
  const [arham] = createInitialRacers();
  const events: PhysicsEvent[] = [];

  for (let i = 0; i < 180; i++) {
    stepRacerPhysics(arham, IDLE_INPUT, course, 1 / 60, i / 60, events);
  }

  assert.equal(arham.grounded, true);
  assert.equal(arham.y, 0);
  assert.equal(events.filter((e) => e.type === 'respawn').length, 0);
});

test('Jump buffering, variable jump cut, and dive boost behave accurately', () => {
  const course = createCourseLayout(selectRaceQuestions('semua', 5, 7));
  const [arham] = createInitialRacers();
  const events: PhysicsEvent[] = [];

  stepRacerPhysics(
    arham,
    { ...IDLE_INPUT, jumpHeld: true, jumpJustPressed: true },
    course,
    0.016,
    0.016,
    events,
  );
  assert.equal(arham.grounded, false);
  assert.ok(arham.vy > 10, 'jump should apply strong upward velocity');
  assert.ok(events.some((e) => e.type === 'jump'));

  const preCutVy = arham.vy;
  stepRacerPhysics(
    arham,
    { ...IDLE_INPUT, jumpJustReleased: true },
    course,
    0.016,
    0.032,
    events,
  );
  assert.ok(arham.vy < preCutVy * 0.65, 'early release should cut upward velocity');

  // Dive impulse pushes racer forward along -Z
  stepRacerPhysics(
    arham,
    { ...IDLE_INPUT, moveZ: -1, diveJustPressed: true },
    course,
    0.016,
    0.048,
    events,
  );
  assert.ok(arham.vz < -12, 'dive should propel racer forward');
  assert.ok(arham.diveCooldown > 0.8, 'dive should enter cooldown');
});

test('Quiz gate shatters on correct door and bounces player back on wrong door', () => {
  const course = createCourseLayout(selectRaceQuestions('matematika', 5, 11));
  const gate0 = course.quizGates[0];
  const wrongIdx = ((gate0.question.correctIndex + 1) % 3) as 0 | 1 | 2;
  const correctIdx = gate0.question.correctIndex;

  // Test wrong door bounce
  const [arham] = createInitialRacers();
  arham.x = gate0.doors[wrongIdx].x;
  arham.y = gate0.y;
  arham.z = gate0.z + 0.5;
  arham.vz = -10;
  const events: PhysicsEvent[] = [];

  stepRacerPhysics(arham, { ...IDLE_INPUT, moveZ: -1 }, course, 0.03, 1.0, events);
  assert.ok(events.some((e) => e.type === 'quiz_wrong'), 'wrong door should trigger bounce event');
  assert.equal(gate0.doors[wrongIdx].wrongRevealed, true);
  assert.ok(arham.z > gate0.z + 0.9, 'wrong door should bounce player backward');

  // Now run through the correct door
  arham.stunTimer = 0;
  arham.x = gate0.doors[correctIdx].x;
  arham.y = gate0.y;
  arham.z = gate0.z + 0.4;
  arham.vz = -10;
  stepRacerPhysics(arham, { ...IDLE_INPUT, moveZ: -1 }, course, 0.03, 1.5, events);

  assert.ok(events.some((e) => e.type === 'quiz_correct'), 'correct door should clear gate');
  assert.equal(gate0.doors[correctIdx].opened, true);
  assert.equal(gate0.playerCleared, true);
  assert.equal(arham.checkpointZ, gate0.z - 2.2);
});

test('Active quiz gate prompt appears ahead of gate and standings rank racers properly', () => {
  const course = createCourseLayout(selectRaceQuestions('semua', 5, 5));
  const racers = createInitialRacers();

  // Approaching gate 0 (z = -39, promptStartZ = -1)
  assert.equal(getActiveQuizGate(0, course), null);
  assert.equal(getActiveQuizGate(-5, course)?.gateIndex, 0);

  // Move racer 2 ahead of Arham and verify rankings
  racers[0].z = -40;
  racers[1].z = -65;
  racers[2].z = -246;
  racers[2].finished = true;
  racers[2].finishTime = 42.5;

  const standings = computeRaceStandings(racers);
  assert.equal(standings[0].id, racers[2].id);
  assert.equal(standings[1].id, racers[1].id);
  assert.equal(standings[2].id, racers[0].id);

  assert.equal(computeProgressPct(0, course.startZ, course.finishZ), 0);
  assert.equal(computeProgressPct(-245, course.startZ, course.finishZ), 100);
});

test('AI classmates generate valid forward steering and moving platform lookup works', () => {
  const course = createCourseLayout(selectRaceQuestions('semua', 5, 21));
  const racers = createInitialRacers();
  const aiInput = computeAiInput(racers[1], course, 2.0);
  assert.ok(aiInput.moveZ < 0, 'AI must steer forward along -Z');

  const hit = findSupportingPlatform(0, 0, 0.1, -5, course, 0);
  assert.ok(hit !== null && hit.platform?.id === 'plat-start');
});
