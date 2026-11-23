import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BASS_PATTERN,
  computeMusicDynamics,
  HARMONY_PATTERN,
  MELODY_PATTERN,
  midiToFreq,
  MUSIC_CONSTANTS,
} from './musicTempo';

test('computeMusicDynamics increases BPM monotonically as remaining race time drops', () => {
  const start = computeMusicDynamics(180, 180);
  const mid = computeMusicDynamics(90, 180);
  const hurry = computeMusicDynamics(30, 180);
  const final20 = computeMusicDynamics(20, 180);
  const final5 = computeMusicDynamics(5, 180);
  const final0 = computeMusicDynamics(0, 180);

  assert.equal(start.bpm, MUSIC_CONSTANTS.baseBpm);
  assert.equal(start.tensionLevel, 'normal');
  assert.equal(start.pitchMultiplier, 1);

  assert.ok(mid.bpm > start.bpm);
  assert.equal(mid.tensionLevel, 'normal');

  assert.ok(hurry.bpm > mid.bpm);
  assert.equal(hurry.tensionLevel, 'hurry');
  assert.equal(hurry.pitchMultiplier, 1);

  assert.ok(final20.bpm > hurry.bpm);
  assert.equal(final20.tensionLevel, 'final');
  assert.ok(final20.pitchMultiplier > 1.05);

  assert.ok(final5.bpm > final20.bpm);
  assert.ok(final0.bpm >= final5.bpm);
  assert.equal(final0.bpm, MUSIC_CONSTANTS.maxBpm);
  assert.ok(final0.stepSeconds < start.stepSeconds);
});

test('computeMusicDynamics clamps out-of-range inputs safely', () => {
  const negative = computeMusicDynamics(-10, 180);
  assert.equal(negative.bpm, MUSIC_CONSTANTS.maxBpm);
  assert.equal(negative.tensionLevel, 'final');

  const overLimit = computeMusicDynamics(999, 180);
  assert.equal(overLimit.bpm, MUSIC_CONSTANTS.baseBpm);
  assert.equal(overLimit.tensionLevel, 'normal');
});

test('music pattern tables align to 32-step loop and midiToFreq converts A4 accurately', () => {
  assert.equal(MELODY_PATTERN.length, MUSIC_CONSTANTS.stepsPerLoop);
  assert.equal(BASS_PATTERN.length, MUSIC_CONSTANTS.stepsPerLoop);
  assert.equal(HARMONY_PATTERN.length, MUSIC_CONSTANTS.stepsPerLoop);
  assert.ok(Math.abs(midiToFreq(69) - 440) < 1e-6);
  assert.ok(Math.abs(midiToFreq(81) - 880) < 1e-6);
});
