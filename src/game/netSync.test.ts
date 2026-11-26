import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySharedTileStep,
  createSeededRng,
  computeObstaclePhaseOffset,
  computeDeterministicElapsedSec,
  validatePlayerPoseUpdate,
  interpolateRemotePose,
  recordFinishOrder,
  validateQuizCheckpointAnswer,
} from './netSync';
import type { FallingTileDef } from './types';

test('createSeededRng produces identical deterministic sequences for the same seed', () => {
  const rngA = createSeededRng(123456);
  const rngB = createSeededRng(123456);
  const rngC = createSeededRng(654321);

  const seqA = [rngA(), rngA(), rngA(), rngA()];
  const seqB = [rngB(), rngB(), rngB(), rngB()];
  const seqC = [rngC(), rngC(), rngC(), rngC()];

  assert.deepEqual(seqA, seqB);
  assert.notDeepEqual(seqA, seqC);
  for (const val of seqA) {
    assert.ok(val >= 0 && val < 1, `Expected [0, 1), got ${val}`);
  }
});

test('computeObstaclePhaseOffset returns deterministic phase in [0, 2*PI) and computeDeterministicElapsedSec clamps >= 0', () => {
  const p1 = computeObstaclePhaseOffset(42, 3);
  const p2 = computeObstaclePhaseOffset(42, 3);
  assert.equal(p1, p2);
  assert.ok(p1 >= 0 && p1 < Math.PI * 2);

  assert.equal(computeDeterministicElapsedSec(1000, 3500), 2.5);
  assert.equal(computeDeterministicElapsedSec(5000, 3500), 0);
});

test('validatePlayerPoseUpdate accepts normal movement and clamps speed-hacked jumps', () => {
  const prev = { playerId: 'p1', x: 0, y: 0, z: 0, timestamp: 1000 };
  const normalNext = { playerId: 'p1', x: 0, y: 0, z: 1.0, timestamp: 1050 }; // 20 u/s
  const ok = validatePlayerPoseUpdate(prev, normalNext, 24);
  assert.equal(ok.valid, true);
  assert.equal(ok.clampedPose.z, 1.0);

  const hackedNext = { playerId: 'p1', x: 0, y: 0, z: 50.0, timestamp: 1050 }; // 1000 u/s
  const clamped = validatePlayerPoseUpdate(prev, hackedNext, 24);
  assert.equal(clamped.valid, false);
  assert.ok(Math.abs(clamped.clampedPose.z - 1.2) < 1e-6); // 24 * 0.05s = 1.2
});

test('interpolateRemotePose interpolates position and wrapped rotY into out object without allocating', () => {
  const prev = { playerId: 'p2', x: 0, y: 1, z: 10, rotY: Math.PI - 0.1, timestamp: 1000 };
  const next = { playerId: 'p2', x: 4, y: 3, z: 20, rotY: -Math.PI + 0.1, timestamp: 1050 };
  const out = { x: 0, y: 0, z: 0, rotY: 0 };

  const res = interpolateRemotePose(prev, next, 0.5, out);
  assert.equal(res, out);
  assert.equal(out.x, 2);
  assert.equal(out.y, 2);
  assert.equal(out.z, 15);
  assert.ok(Math.abs(Math.abs(out.rotY) - Math.PI) < 1e-5);
});

test('recordFinishOrder ranks finishers by finishTimeMs ascending and ignores duplicates', () => {
  let standings = recordFinishOrder([], 'p2', 42500, 'Budi');
  standings = recordFinishOrder(standings, 'p1', 39800, 'Arham');
  standings = recordFinishOrder(standings, 'p1', 35000, 'Arham'); // duplicate ignored

  assert.equal(standings.length, 2);
  assert.deepEqual(
    standings.map((s) => ({ playerId: s.playerId, rank: s.rank })),
    [
      { playerId: 'p1', rank: 1 },
      { playerId: 'p2', rank: 2 },
    ]
  );
});

test('applySharedTileStep reveals safe tiles, shakes fake tiles, and ignores unknown/already-triggered tiles', () => {
  const tiles: FallingTileDef[] = [
    {
      id: 't_safe',
      row: 0,
      col: 0,
      x: 0,
      y: 0,
      z: 0,
      width: 2,
      depth: 2,
      isSafe: true,
      state: 'hidden',
      shakeTimer: 0,
      fallY: 0,
      fallVelY: 0,
      revealPop: 0,
    },
    {
      id: 't_fake',
      row: 0,
      col: 1,
      x: 2,
      y: 0,
      z: 0,
      width: 2,
      depth: 2,
      isSafe: false,
      state: 'hidden',
      shakeTimer: 0,
      fallY: 0,
      fallVelY: 0,
      revealPop: 0,
    },
  ];

  const safeRes = applySharedTileStep(tiles, 't_safe');
  assert.equal(safeRes.updated, true);
  assert.equal(safeRes.tile?.state, 'safe_revealed');
  assert.equal(tiles[0].state, 'safe_revealed');

  // Stepping again on an already-revealed tile is a no-op
  const repeatRes = applySharedTileStep(tiles, 't_safe');
  assert.equal(repeatRes.updated, false);

  const fakeRes = applySharedTileStep(tiles, 't_fake');
  assert.equal(fakeRes.updated, true);
  assert.equal(fakeRes.tile?.state, 'shaking');
  assert.equal(tiles[1].state, 'shaking');

  const missingRes = applySharedTileStep(tiles, 'non_existent');
  assert.equal(missingRes.updated, false);
});

test('validateQuizCheckpointAnswer returns boost and score on correct answer and stun penalty on wrong answer', () => {
  const correct = validateQuizCheckpointAnswer({
    checkpointIndex: 0,
    selectedOption: 2,
    correctOption: 2,
  });
  assert.equal(correct.isCorrect, true);
  assert.ok(correct.scoreDelta > 0);
  assert.ok(correct.speedBoostSec > 0);
  assert.equal(correct.stunSec, 0);

  const wrong = validateQuizCheckpointAnswer({
    checkpointIndex: 0,
    selectedOption: 1,
    correctOption: 2,
  });
  assert.equal(wrong.isCorrect, false);
  assert.equal(wrong.scoreDelta, 0);
  assert.equal(wrong.speedBoostSec, 0);
  assert.ok(wrong.stunSec > 0);
});
