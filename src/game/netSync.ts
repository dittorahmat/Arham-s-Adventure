/**
 * Pure deterministic synchronization, anti-cheat validation, interpolation,
 * and finish-order ranking helpers for multiplayer races.
 * Zero React / DOM / Three.js dependencies.
 */

export interface PlayerPose {
  playerId: string;
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  rotY?: number;
  seq?: number;
  timestamp: number;
}

export interface InterpolatedPose {
  x: number;
  y: number;
  z: number;
  rotY: number;
}

export interface FinishStanding {
  playerId: string;
  nickname?: string;
  finishTimeMs: number;
  rank: number;
}

/**
 * Mulberry32 deterministic PRNG returning values in [0, 1).
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Computes a deterministic phase offset in [0, 2*PI) for a given obstacle index.
 */
export function computeObstaclePhaseOffset(seed: number, obstacleIndex: number): number {
  const mixed = (seed ^ Math.imul(obstacleIndex + 1, 0x9e3779b1)) >>> 0;
  const rng = createSeededRng(mixed);
  return rng() * Math.PI * 2;
}

/**
 * Computes non-negative elapsed seconds since matchStartTime.
 */
export function computeDeterministicElapsedSec(matchStartTime: number, nowMs: number): number {
  return Math.max(0, (nowMs - matchStartTime) / 1000);
}

export interface PoseValidationResult {
  valid: boolean;
  clampedPose: PlayerPose;
  reason?: string;
}

/**
 * Validates horizontal speed between two consecutive player pose updates.
 * If the speed exceeds maxSpeedPerSec, clamps the horizontal displacement.
 */
export function validatePlayerPoseUpdate(
  prev: PlayerPose | null,
  next: PlayerPose,
  maxSpeedPerSec = 24
): PoseValidationResult {
  if (!prev) {
    return { valid: true, clampedPose: next };
  }
  const dtSec = (next.timestamp - prev.timestamp) / 1000;
  if (dtSec <= 0) {
    return {
      valid: false,
      clampedPose: { ...prev, seq: next.seq },
      reason: 'non_positive_dt',
    };
  }
  const dx = next.x - prev.x;
  const dz = next.z - prev.z;
  const dist = Math.hypot(dx, dz);
  const maxDist = maxSpeedPerSec * dtSec;
  if (dist <= maxDist) {
    return { valid: true, clampedPose: next };
  }
  const scale = dist > 0 ? maxDist / dist : 0;
  return {
    valid: false,
    clampedPose: {
      ...next,
      x: prev.x + dx * scale,
      z: prev.z + dz * scale,
    },
    reason: 'speed_limit_exceeded',
  };
}

/**
 * Zero-GC interpolation of remote player poses into a pre-allocated output object.
 */
export function interpolateRemotePose(
  prev: PlayerPose,
  next: PlayerPose,
  alpha: number,
  out: InterpolatedPose
): InterpolatedPose {
  const t = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
  out.x = prev.x + (next.x - prev.x) * t;
  out.y = prev.y + (next.y - prev.y) * t;
  out.z = prev.z + (next.z - prev.z) * t;

  const a0 = prev.rotY ?? 0;
  const a1 = next.rotY ?? 0;
  let diff = (a1 - a0) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  out.rotY = a0 + diff * t;
  return out;
}

/**
 * Records a player's official finish time, ignores duplicates, and returns
 * standings sorted by finishTimeMs ascending with 1-based rank.
 */
export function recordFinishOrder(
  standings: readonly FinishStanding[],
  playerId: string,
  finishTimeMs: number,
  nickname?: string
): FinishStanding[] {
  if (standings.some((s) => s.playerId === playerId)) {
    return [...standings];
  }
  const next = [
    ...standings,
    {
      playerId,
      nickname,
      finishTimeMs: Math.max(0, finishTimeMs),
      rank: 0,
    },
  ].sort((a, b) => a.finishTimeMs - b.finishTimeMs);

  return next.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}
