import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getHurdleImpactSpec,
  getQuizGateBurstSpec,
  ParticleSlot,
  ShockwaveSlot,
  stepParticleSlot,
  stepShockwaveSlot,
} from './particlePresets';

test('getQuizGateBurstSpec emits confetti, sparks, debris, and dual shockwave rings', () => {
  const firstTry = getQuizGateBurstSpec(true);
  const retry = getQuizGateBurstSpec(false);

  const kinds = firstTry.layers.map((l) => l.kind);
  assert.deepEqual(kinds, ['confetti', 'spark', 'debris']);
  assert.equal(firstTry.shockwaves.length, 2);
  assert.ok(firstTry.layers[0].count > retry.layers[0].count);
  assert.equal(firstTry.shockwaves[0].vertical, true);
  assert.equal(firstTry.shockwaves[1].vertical, false);
});

test('getHurdleImpactSpec produces tailored sparks, debris, and shockwaves for every hurdle type', () => {
  const bumper = getHurdleImpactSpec('bumper');
  const sweeper = getHurdleImpactSpec('sweeper');
  const wrongDoor = getHurdleImpactSpec('wrong_door');

  for (const spec of [bumper, sweeper, wrongDoor]) {
    assert.ok(spec.layers.some((l) => l.kind === 'spark' && l.count >= 20));
    assert.ok(spec.layers.some((l) => l.kind === 'debris' && l.count >= 12));
    assert.equal(spec.shockwaves.length, 1);
  }
  assert.equal(wrongDoor.shockwaves[0].vertical, true);
  assert.equal(bumper.shockwaves[0].vertical, false);
});

test('stepParticleSlot applies gravity, flutter terminal speed, floor bounce, and expiry', () => {
  const debris: ParticleSlot = {
    active: true,
    kind: 'debris',
    x: 0,
    y: 0.2,
    z: 0,
    vx: 4,
    vy: -6,
    vz: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    spinX: 5,
    spinY: 4,
    spinZ: 3,
    gravity: 20,
    drag: 0,
    bounceFloorY: 0.14,
    life: 0.5,
    maxLife: 0.5,
    scale: 1,
  };

  assert.equal(stepParticleSlot(debris, 0.05), true);
  assert.equal(debris.y, 0.14);
  assert.ok(debris.vy > 0, 'Debris should bounce upward after hitting the floor');

  // Expire particle
  assert.equal(stepParticleSlot(debris, 0.6), false);
  assert.equal(debris.active, false);
});

test('stepShockwaveSlot expands monotonically and thins out before expiring', () => {
  const ring: ShockwaveSlot = {
    active: true,
    x: 0,
    y: 1,
    z: -10,
    vertical: true,
    startRadius: 0.5,
    endRadius: 4.5,
    thickness: 0.22,
    life: 0.5,
    maxLife: 0.5,
  };

  const early = stepShockwaveSlot(ring, 0.1);
  const mid = stepShockwaveSlot(ring, 0.2);
  const late = stepShockwaveSlot(ring, 0.15);

  assert.equal(early.alive, true);
  assert.ok(mid.radius > early.radius);
  assert.ok(late.radius > mid.radius);
  assert.ok(late.thicknessScale < early.thicknessScale);

  const expired = stepShockwaveSlot(ring, 0.1);
  assert.equal(expired.alive, false);
  assert.equal(ring.active, false);
});
