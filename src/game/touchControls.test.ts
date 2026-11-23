import assert from 'node:assert/strict';
import test from 'node:test';
import {
  combineJoystickWithAutoRun,
  computeJoystickVector,
  HAPTIC_PATTERNS,
  resolveTouchControlsVisible,
  triggerHapticFeedback,
} from './touchControls';

test('computeJoystickVector ignores tiny jitter inside the deadzone', () => {
  const vec = computeJoystickVector(3, -4, 50, 0.14); // dist = 5 -> ratio 0.10 <= 0.14
  assert.equal(vec.active, false);
  assert.equal(vec.moveX, 0);
  assert.equal(vec.moveZ, 0);
  assert.equal(vec.magnitude, 0);
  assert.equal(vec.knobX, 3);
  assert.equal(vec.knobY, -4);
});

test('computeJoystickVector maps cardinal directions and clamps beyond maxRadius', () => {
  const up = computeJoystickVector(0, -120, 48);
  assert.equal(up.active, true);
  assert.ok(Math.abs(up.moveX) < 1e-6);
  assert.ok(Math.abs(up.moveZ - -1) < 1e-6);
  assert.ok(Math.abs(up.knobY - -48) < 1e-6);

  const right = computeJoystickVector(90, 0, 48);
  assert.equal(right.active, true);
  assert.ok(Math.abs(right.moveX - 1) < 1e-6);
  assert.ok(Math.abs(right.moveZ) < 1e-6);
  assert.ok(Math.abs(right.knobX - 48) < 1e-6);
});

test('computeJoystickVector clamps diagonals to unit circle and scales smoothly', () => {
  const diagFull = computeJoystickVector(100, -100, 48);
  const len = Math.hypot(diagFull.moveX, diagFull.moveZ);
  assert.ok(Math.abs(len - 1) < 1e-6);
  assert.ok(Math.hypot(diagFull.knobX, diagFull.knobY) <= 48 + 1e-6);

  const mid = computeJoystickVector(28.5, 0, 50, 0.14); // ratio 0.57 -> scaled 0.5
  assert.equal(mid.active, true);
  assert.ok(Math.abs(mid.moveX - 0.5) < 0.01);
});

test('combineJoystickWithAutoRun drives forward when idle and allows reverse braking', () => {
  const idleAuto = combineJoystickWithAutoRun({ moveX: 0, moveZ: 0 }, true);
  assert.equal(idleAuto.moveX, 0);
  assert.equal(idleAuto.moveZ, -1);

  const steerRightAuto = combineJoystickWithAutoRun({ moveX: 0.9, moveZ: 0 }, true);
  assert.equal(steerRightAuto.moveX, 0.9);
  assert.ok(steerRightAuto.moveZ < -0.7);

  const brakeAuto = combineJoystickWithAutoRun({ moveX: 0, moveZ: 0.8 }, true);
  assert.equal(brakeAuto.moveZ, 0.8);

  const manualIdle = combineJoystickWithAutoRun({ moveX: 0, moveZ: 0 }, false);
  assert.equal(manualIdle.moveX, 0);
  assert.equal(manualIdle.moveZ, 0);
});

test('resolveTouchControlsVisible detects mobile/tablet/touch and honors explicit overrides', () => {
  assert.equal(
    resolveTouchControlsVisible('auto', { viewportWidth: 390, hasCoarsePointer: false, maxTouchPoints: 0 }),
    true,
  );
  assert.equal(
    resolveTouchControlsVisible('auto', { viewportWidth: 1366, hasCoarsePointer: true, maxTouchPoints: 5 }),
    true,
  );
  assert.equal(
    resolveTouchControlsVisible('auto', { viewportWidth: 1440, hasCoarsePointer: false, maxTouchPoints: 0 }),
    false,
  );
  assert.equal(
    resolveTouchControlsVisible('on', { viewportWidth: 1440, hasCoarsePointer: false, maxTouchPoints: 0 }),
    true,
  );
  assert.equal(
    resolveTouchControlsVisible('off', { viewportWidth: 390, hasCoarsePointer: true, maxTouchPoints: 5 }),
    false,
  );
});

test('triggerHapticFeedback invokes navigator.vibrate with distinct Jump and Dive patterns', () => {
  const calls: Array<number | number[]> = [];
  const mockNav = {
    vibrate: (pattern: VibratePattern) => {
      calls.push(pattern as number | number[]);
      return true;
    },
  };

  assert.equal(triggerHapticFeedback('jump', mockNav), true);
  assert.equal(triggerHapticFeedback('dive', mockNav), true);
  assert.deepEqual(calls, [HAPTIC_PATTERNS.jump, HAPTIC_PATTERNS.dive]);
});

test('triggerHapticFeedback fails safely when navigator.vibrate is unsupported or throws', () => {
  assert.equal(triggerHapticFeedback('jump', null), false);
  assert.equal(triggerHapticFeedback('dive', {}), false);
  assert.equal(
    triggerHapticFeedback('jump', {
      vibrate: () => {
        throw new Error('Blocked by browser policy');
      },
    }),
    false,
  );
});

