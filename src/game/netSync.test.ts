import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSeededRng,
  computeObstaclePhaseOffset,
  computeDeterministicElapsedSec,
  validatePlayerPoseUpdate,
  interpolateRemotePose,
  recordFinishOrder,
} from './netSync';

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
