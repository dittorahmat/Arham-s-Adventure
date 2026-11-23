export interface JoystickVector {
  moveX: number;
  moveZ: number;
  knobX: number;
  knobY: number;
  magnitude: number;
  active: boolean;
}

export type TouchControlsPreference = 'auto' | 'on' | 'off';

export interface TouchEnvironment {
  viewportWidth: number;
  hasCoarsePointer: boolean;
  maxTouchPoints: number;
}

export const TOUCH_PREF_STORAGE_KEY = 'arham_touch_controls_pref_v1';

export function computeJoystickVector(
  dx: number,
  dy: number,
  maxRadius: number,
  deadzoneRatio = 0.14,
): JoystickVector {
  if (maxRadius <= 0 || !Number.isFinite(dx) || !Number.isFinite(dy)) {
    return { moveX: 0, moveZ: 0, knobX: 0, knobY: 0, magnitude: 0, active: false };
  }

  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) {
    return { moveX: 0, moveZ: 0, knobX: 0, knobY: 0, magnitude: 0, active: false };
  }

  const clampedDist = Math.min(dist, maxRadius);
  const nx = dx / dist;
  const ny = dy / dist;
  const knobX = nx * clampedDist;
  const knobY = ny * clampedDist;

  const rawRatio = clampedDist / maxRadius;
  const safeDeadzone = Math.max(0, Math.min(0.8, deadzoneRatio));

  if (rawRatio <= safeDeadzone) {
    return { moveX: 0, moveZ: 0, knobX, knobY, magnitude: 0, active: false };
  }

  const magnitude = Math.min(1, (rawRatio - safeDeadzone) / (1 - safeDeadzone));
  return {
    moveX: nx * magnitude,
    moveZ: ny * magnitude,
    knobX,
    knobY,
    magnitude,
    active: true,
  };
}

export function combineJoystickWithAutoRun(
  vec: Pick<JoystickVector, 'moveX' | 'moveZ'>,
  autoRun: boolean,
): { moveX: number; moveZ: number } {
  if (!autoRun) {
    return { moveX: vec.moveX, moveZ: vec.moveZ };
  }

  // Let the player brake or step back intentionally by pulling downward on the stick
  if (vec.moveZ > 0.25) {
    return { moveX: vec.moveX, moveZ: vec.moveZ };
  }

  // When steering hard sideways, soften forward push slightly for crisp lane changes to Doors A/B/C
  const absX = Math.abs(vec.moveX);
  const defaultForwardZ = absX > 0.3 ? -0.78 : -1;
  const moveZ = vec.moveZ < defaultForwardZ ? vec.moveZ : defaultForwardZ;

  return {
    moveX: vec.moveX,
    moveZ,
  };
}

export function resolveTouchControlsVisible(
  preference: TouchControlsPreference,
  env: TouchEnvironment,
): boolean {
  if (preference === 'on') return true;
  if (preference === 'off') return false;
  return env.hasCoarsePointer || env.maxTouchPoints > 0 || env.viewportWidth < 1024;
}

export function detectTouchEnvironment(): TouchEnvironment {
  if (typeof window === 'undefined') {
    return { viewportWidth: 1440, hasCoarsePointer: false, maxTouchPoints: 0 };
  }
  const hasCoarsePointer =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(pointer: coarse)').matches
      : false;
  const maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints || 0 : 0;
  return {
    viewportWidth: window.innerWidth,
    hasCoarsePointer,
    maxTouchPoints,
  };
}

export function loadTouchControlsPreference(): TouchControlsPreference {
  try {
    const saved = localStorage.getItem(TOUCH_PREF_STORAGE_KEY);
    if (saved === 'on' || saved === 'off' || saved === 'auto') {
      return saved;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return 'auto';
}

export function saveTouchControlsPreference(pref: TouchControlsPreference): void {
  try {
    localStorage.setItem(TOUCH_PREF_STORAGE_KEY, pref);
  } catch {
    // Ignore storage errors
  }
}

export type HapticAction = 'jump' | 'dive';

export const HAPTIC_PATTERNS: Record<HapticAction, number | number[]> = {
  jump: 18,
  dive: [22, 28, 35],
};

export interface VibratorLike {
  vibrate?: (pattern: number | number[]) => boolean;
}

export function triggerHapticFeedback(
  action: HapticAction,
  nav?: VibratorLike | null,
): boolean {
  const target = nav !== undefined ? nav : typeof navigator !== 'undefined' ? navigator : null;
  if (!target || typeof target.vibrate !== 'function') {
    return false;
  }
  try {
    return Boolean(target.vibrate(HAPTIC_PATTERNS[action]));
  } catch {
    return false;
  }
}
