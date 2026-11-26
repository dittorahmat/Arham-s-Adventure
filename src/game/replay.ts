import { GradeLevel, PlayableGameMode, RacerState } from './types';

export const REPLAY_DURATION_SECONDS = 5.0;
export const REPLAY_RECORD_INTERVAL = 1 / 30;
export const REPLAY_PRE_FINISH_SECONDS = 1.15;
export const REPLAY_POST_FINISH_SECONDS = 0.85;
export const REPLAY_BUFFER_MAX_SECONDS = 2.6;

export interface ReplayRacerPose {
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  facingYaw: number;
  grounded: boolean;
  diveTimer: number;
  stunTimer: number;
  squashX: number;
  squashY: number;
  walkDistance: number;
}

export interface ReplayFrame {
  raceTime: number;
  racers: ReplayRacerPose[];
}

export interface FinishReplayClip {
  frames: ReplayFrame[];
  startRaceTime: number;
  crossRaceTime: number;
  endRaceTime: number;
  finishZ: number;
  finishY: number;
  playbackDuration: number;
}

export interface ReplayPlaybackSample {
  normalized: number;
  sourceRaceTime: number;
  effectiveSpeedFactor: number;
  crossedFinish: boolean;
  finished: boolean;
}

export interface ReplayCameraPose {
  posX: number;
  posY: number;
  posZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  fov: number;
}

export interface ReplayHudSnapshot {
  elapsedSeconds: number;
  durationSeconds: number;
  progressPct: number;
  crossMarkerPct: number;
  speedFactor: number;
  crossedFinish: boolean;
  rank: number;
  totalRacers: number;
  clearTime: number;
  mode: PlayableGameMode;
  grade: GradeLevel;
  score: number;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function snapshotRacerPose(racer: RacerState): ReplayRacerPose {
  return {
    x: racer.x,
    y: racer.y,
    z: racer.z,
    vx: racer.vx,
    vz: racer.vz,
    facingYaw: racer.facingYaw,
    grounded: racer.grounded,
    diveTimer: racer.diveTimer,
    stunTimer: racer.stunTimer,
    squashX: racer.squashX,
    squashY: racer.squashY,
    walkDistance: racer.walkDistance,
  };
}

/**
 * Lightweight rolling ring-buffer recorder that captures ~2.6s of recent racer poses
 * at ~30Hz during gameplay so crossing the finish line immediately produces a smooth
 * 5-second slow-motion broadcast replay clip.
 */
export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private lastCaptureTime = -Infinity;

  public reset(): void {
    this.frames = [];
    this.lastCaptureTime = -Infinity;
  }

  public getFrameCount(): number {
    return this.frames.length;
  }

  public capture(raceTime: number, racers: readonly RacerState[], force = false): void {
    if (!force && raceTime - this.lastCaptureTime < REPLAY_RECORD_INTERVAL - 0.0001) {
      return;
    }
    this.lastCaptureTime = raceTime;
    this.frames.push({
      raceTime,
      racers: racers.map(snapshotRacerPose),
    });

    const cutoff = raceTime - REPLAY_BUFFER_MAX_SECONDS;
    while (this.frames.length > 2 && this.frames[0].raceTime < cutoff) {
      this.frames.shift();
    }
  }

  /**
   * Trims the rolling buffer to the final approach window before finishZ,
   * guarantees a readable pre-finish run even on synthetic/short captures,
   * and appends a graceful celebratory follow-through past the finish line.
   */
  public finalizeFinishClip(
    finishZ: number,
    finishY: number,
    crossRaceTime: number,
    currentRacers: readonly RacerState[],
  ): FinishReplayClip {
    const crossFrame: ReplayFrame = {
      raceTime: crossRaceTime,
      racers: currentRacers.map(snapshotRacerPose),
    };

    const windowStart = crossRaceTime - REPLAY_PRE_FINISH_SECONDS;
    let selected = this.frames.filter(
      (f) => f.raceTime >= windowStart && f.raceTime < crossRaceTime - 0.002,
    );
    selected.push(crossFrame);

    // If too few pre-finish frames exist (e.g., instant preview or very brief capture),
    // backfill a smooth sprint approach toward the finish line so the 5s clip always shines.
    if (selected.length < 10 || crossRaceTime - selected[0].raceTime < 0.75) {
      selected = buildBackfilledApproachFrames(
        crossFrame,
        finishZ,
        finishY,
        REPLAY_PRE_FINISH_SECONDS,
      );
    }

    // Append deterministic celebratory follow-through past the finish arch
    const followSteps = 18;
    const stepDt = REPLAY_POST_FINISH_SECONDS / followSteps;
    const baseRacers = crossFrame.racers;

    for (let s = 1; s <= followSteps; s++) {
      const elapsedPost = s * stepDt;
      const frac = s / followSteps;
      const tRace = crossRaceTime + elapsedPost;

      const nextRacers: ReplayRacerPose[] = baseRacers.map((r, idx) => {
        const isPlayer = idx === 0;
        const speedZ = Math.min(-7.2, Math.max(-14.5, r.vz || -10.5));
        const decelFactor = 1 - frac * 0.42;
        const avgVz = speedZ * (1 - frac * 0.21);
        const avgVx = (r.vx || 0) * (1 - frac * 0.5);

        const nextZ = r.z + avgVz * elapsedPost;
        const nextX = clamp(r.x + avgVx * elapsedPost, -6.4, 6.4);

        // Joyful victory hop for the player right after crossing the checkered line!
        const hopPhase = clamp((frac - 0.12) / 0.72, 0, 1);
        const hopY = isPlayer ? Math.sin(hopPhase * Math.PI) * 1.45 : Math.max(0, r.y - finishY) * (1 - frac);
        const nextY = finishY + hopY;
        const grounded = isPlayer ? hopPhase <= 0.02 || hopPhase >= 0.98 : true;

        const squashY = isPlayer && !grounded ? 1.12 - Math.abs(hopPhase - 0.5) * 0.18 : 1;
        const squashX = 1 / Math.sqrt(squashY);

        return {
          x: nextX,
          y: nextY,
          z: nextZ,
          vx: avgVx * decelFactor,
          vz: speedZ * decelFactor,
          facingYaw: isPlayer ? lerpAngle(r.facingYaw, Math.PI, smoothstep(0, 0.45, frac)) : r.facingYaw,
          grounded,
          diveTimer: Math.max(0, r.diveTimer - elapsedPost * 1.8),
          stunTimer: 0,
          squashX,
          squashY,
          walkDistance: r.walkDistance + Math.hypot(avgVx, avgVz) * elapsedPost,
        };
      });

      selected.push({
        raceTime: tRace,
        racers: nextRacers,
      });
    }

    return {
      frames: selected,
      startRaceTime: selected[0].raceTime,
      crossRaceTime,
      endRaceTime: selected[selected.length - 1].raceTime,
      finishZ,
      finishY,
      playbackDuration: REPLAY_DURATION_SECONDS,
    };
  }
}

function buildBackfilledApproachFrames(
  crossFrame: ReplayFrame,
  finishZ: number,
  finishY: number,
  approachDuration: number,
): ReplayFrame[] {
  const steps = 42;
  const frames: ReplayFrame[] = [];
  const crossTime = crossFrame.raceTime;

  for (let i = 0; i <= steps; i++) {
    const frac = i / steps; // 0 = start of approach, 1 = finish crossing
    const timeBeforeCross = (1 - frac) * approachDuration;
    const tRace = Math.max(0, crossTime - timeBeforeCross);

    const racers: ReplayRacerPose[] = crossFrame.racers.map((target, idx) => {
      const isPlayer = idx === 0;
      const runSpeed = isPlayer ? 11.4 : 10.2 - (idx % 3) * 0.45;
      const targetZ = isPlayer ? finishZ : finishZ + 1.4 + idx * 1.35;
      const targetX = isPlayer ? clamp(target.x, -2.2, 2.2) : clamp(target.x, -5.6, 5.6);
      const startOffsetX = isPlayer ? Math.sin(frac * Math.PI) * 0.85 : 0;
      const z = targetZ + timeBeforeCross * runSpeed;
      const x = clamp(targetX + startOffsetX, -6.2, 6.2);

      // Dramatic final leap/dive right before crossing the finish line for player
      const leapPhase = isPlayer ? clamp((frac - 0.72) / 0.28, 0, 1) : 0;
      const leapY = isPlayer ? Math.sin(leapPhase * Math.PI) * 0.95 : 0;
      const isDiving = isPlayer && frac >= 0.84;

      return {
        x,
        y: finishY + leapY,
        z,
        vx: isPlayer ? Math.cos(frac * Math.PI) * 1.4 : 0,
        vz: -runSpeed,
        facingYaw: Math.PI,
        grounded: leapY < 0.06,
        diveTimer: isDiving ? 0.22 : 0,
        stunTimer: 0,
        squashX: isDiving ? 0.9 : 1,
        squashY: isDiving ? 1.12 : 1,
        walkDistance: Math.max(0, target.walkDistance - timeBeforeCross * runSpeed),
      };
    });

    frames.push({ raceTime: tRace, racers });
  }

  return frames;
}

/**
 * Generates a synthetic finish-line replay clip for preview hooks (?preview_replay=1 / ?preview_gameover=1).
 */
export function createSyntheticFinishReplayClip(
  finishZ: number,
  finishY: number,
  clearTimeSeconds: number,
  racers: readonly RacerState[],
): FinishReplayClip {
  const cloned: RacerState[] = racers.map((r, idx) => ({
    ...r,
    x: idx === 0 ? 0.25 : clamp((idx - 3) * 2.1, -5.6, 5.6),
    y: finishY,
    z: idx === 0 ? finishZ : finishZ + 1.6 + idx * 1.45,
    vx: 0,
    vy: 0,
    vz: idx === 0 ? -11.6 : -10.3 + idx * 0.12,
    facingYaw: Math.PI,
    grounded: true,
    diveTimer: idx === 0 ? 0.16 : 0,
    stunTimer: 0,
    squashX: 0.94,
    squashY: 1.08,
    walkDistance: 210 - idx * 4,
  }));

  const recorder = new ReplayRecorder();
  return recorder.finalizeFinishClip(finishZ, finishY, clearTimeSeconds, cloned);
}

/**
 * Maps 0..5.0s replay playback time to source race time using a cinematic slow-motion
 * speed-ramp curve: brisk slow-mo on approach (~0.48x), ultra-slow-mo right through
 * the finish-line threshold (~0.24x), and graceful slow-mo follow-through (~0.42x).
 */
export function mapReplayPlaybackTime(
  playbackElapsed: number,
  clip: FinishReplayClip,
): ReplayPlaybackSample {
  const duration = Math.max(0.1, clip.playbackDuration);
  const clamped = clamp(playbackElapsed, 0, duration);
  const u = clamped / duration; // 0..1

  const totalSpan = Math.max(0.05, clip.endRaceTime - clip.startRaceTime);
  const crossFrac = clamp((clip.crossRaceTime - clip.startRaceTime) / totalSpan, 0.2, 0.88);

  // Smooth speed-ramp integral: dips lowest around u = 0.56 (crossing moment)
  // f(u) = u - 0.085 * sin(2 * PI * u) -> strictly monotonic since f'(u) = 1 - 0.085*2*PI*cos(2*PI*u)
  // Wait: min derivative is 1 - 0.534 = 0.466 > 0! Let's place the slowest dip right near the crossing point (u = 0.62).
  // Use a piecewise smooth warp where speed slows dramatically around the crossing window.
  const warp = (t: number): number => {
    // Base ramp centered around crossing at uCross = 0.62
    const dip = Math.sin(Math.PI * t); // 0 at ends, 1 in middle
    // Slow down around t = 0.55..0.72 by subtracting a smooth S-wave that keeps derivative > 0.42
    const wave = 0.075 * Math.sin(2 * Math.PI * (t - 0.08));
    // Re-normalize endpoints so warp(0) = 0 and warp(1) = 1 exactly
    const w0 = 0.075 * Math.sin(2 * Math.PI * -0.08);
    const w1 = 0.075 * Math.sin(2 * Math.PI * 0.92);
    const raw = t + wave - lerp(w0, w1, t) - 0.02 * dip * (t - 0.5);
    return clamp(raw, 0, 1);
  };

  const progress = warp(u);
  const eps = 0.004;
  const du = Math.min(1, u + eps) - Math.max(0, u - eps);
  const dp = warp(Math.min(1, u + eps)) - warp(Math.max(0, u - eps));
  const localDeriv = du > 0 ? dp / du : 1;

  const sourceRaceTime = clip.startRaceTime + progress * totalSpan;
  const effectiveSpeedFactor = clamp((localDeriv * totalSpan) / duration, 0.15, 0.85);

  return {
    normalized: u,
    sourceRaceTime,
    effectiveSpeedFactor,
    crossedFinish: progress >= crossFrac || sourceRaceTime >= clip.crossRaceTime,
    finished: playbackElapsed >= duration,
  };
}

/**
 * Computes the percentage along the 5-second timeline where Arham crosses the finish line
 * (for drawing the golden finish-line marker on the replay progress bar).
 */
export function getReplayCrossMarkerPct(clip: FinishReplayClip): number {
  const duration = Math.max(0.1, clip.playbackDuration);
  // Binary search u in [0, 1] where mapReplayPlaybackTime crosses finish
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) * 0.5;
    const sample = mapReplayPlaybackTime(mid * duration, clip);
    if (sample.crossedFinish) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return Math.round(((lo + hi) * 0.5) * 100);
}

/**
 * Smoothly interpolates all racer poses at any arbitrary sourceRaceTime inside the clip.
 */
export function sampleReplayFrame(clip: FinishReplayClip, sourceRaceTime: number): ReplayFrame {
  const { frames } = clip;
  if (frames.length === 0) {
    return { raceTime: sourceRaceTime, racers: [] };
  }
  if (sourceRaceTime <= frames[0].raceTime || frames.length === 1) {
    return frames[0];
  }
  const last = frames[frames.length - 1];
  if (sourceRaceTime >= last.raceTime) {
    return last;
  }

  // Binary search for bracketing frames
  let lo = 0;
  let hi = frames.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].raceTime <= sourceRaceTime) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const fA = frames[lo];
  const fB = frames[hi];
  const span = Math.max(0.00001, fB.raceTime - fA.raceTime);
  const alpha = clamp((sourceRaceTime - fA.raceTime) / span, 0, 1);

  const racers: ReplayRacerPose[] = fA.racers.map((a, idx) => {
    const b = fB.racers[idx] ?? a;
    return {
      x: lerp(a.x, b.x, alpha),
      y: lerp(a.y, b.y, alpha),
      z: lerp(a.z, b.z, alpha),
      vx: lerp(a.vx, b.vx, alpha),
      vz: lerp(a.vz, b.vz, alpha),
      facingYaw: lerpAngle(a.facingYaw, b.facingYaw, alpha),
      grounded: alpha < 0.5 ? a.grounded : b.grounded,
      diveTimer: lerp(a.diveTimer, b.diveTimer, alpha),
      stunTimer: lerp(a.stunTimer, b.stunTimer, alpha),
      squashX: lerp(a.squashX, b.squashX, alpha),
      squashY: lerp(a.squashY, b.squashY, alpha),
      walkDistance: lerp(a.walkDistance, b.walkDistance, alpha),
    };
  });

  return {
    raceTime: sourceRaceTime,
    racers,
  };
}

/**
 * Computes a dramatic 5-second broadcast finish-line camera sweep:
 * - 0.0 -> 0.45: Wide hero three-quarter chase angle framing Arham charging toward the giant checkered Finish Arch & Golden Trophy
 * - 0.45 -> 0.72: Broadcast photo-finish lateral dolly right across the checkered line with subtle telephoto zoom
 * - 0.72 -> 1.0: Wide front-side celebration orbit framing Arham's victory leap beneath the glowing arch & trophy
 */
export function computeReplayCameraPose(
  normalizedT: number,
  playerPose: ReplayRacerPose,
  finishZ: number,
  finishY: number,
): ReplayCameraPose {
  const t = clamp(normalizedT, 0, 1);
  // Smooth broadcast orbit from behind-right (+0.78 rad) past photo-finish side to front-right hero (-0.68 rad)
  const sweep = smoothstep(0, 1, t);
  const angle = lerp(0.78, -0.68, sweep);

  // Wide enough to frame the full Finish Arch + Golden Trophy AND clear of the ±8.0 arch columns
  const radius = lerp(11.2, 9.6, Math.sin(t * Math.PI));
  const offsetX = Math.cos(angle) * radius * 0.62;
  const offsetZ = Math.sin(angle) * radius;
  const elevation = lerp(3.4, 2.8, Math.sin(t * Math.PI)) + smoothstep(0.6, 1, t) * 0.85;

  // Anchor smoothly toward finish arch so both Arham and the checkered arch remain heroically framed
  const anchorZ = lerp(playerPose.z, finishZ - 1.2, 0.34);

  // Subtle telephoto zoom-in right at the crossing climax (t ≈ 0.56) while keeping arch banner in frame
  const climaxZoom = Math.exp(-Math.pow((t - 0.56) / 0.25, 2));
  const fov = 56 - climaxZoom * 6.5;

  return {
    posX: clamp(playerPose.x * 0.45 + offsetX, -6.4, 6.4),
    posY: Math.max(finishY + 2.4, playerPose.y + elevation),
    posZ: anchorZ + offsetZ,
    lookX: playerPose.x * 0.55,
    lookY: Math.max(finishY + 2.45, playerPose.y + 2.25),
    lookZ: lerp(playerPose.z - 0.8, finishZ - 1.5, 0.45),
    fov,
  };
}

/**
 * Serializes a FinishReplayClip into a compact JSON string for R2 storage.
 */
export function serializeReplayClip(clip: FinishReplayClip): string {
  return JSON.stringify(clip);
}

/**
 * Parses and validates a FinishReplayClip JSON string. Returns null if invalid.
 */
export function parseReplayClip(raw: string): FinishReplayClip | null {
  try {
    const data = JSON.parse(raw) as Partial<FinishReplayClip>;
    if (
      !data ||
      typeof data !== 'object' ||
      !Array.isArray(data.frames) ||
      data.frames.length === 0 ||
      typeof data.startRaceTime !== 'number' ||
      typeof data.crossRaceTime !== 'number' ||
      typeof data.endRaceTime !== 'number' ||
      typeof data.finishZ !== 'number' ||
      typeof data.finishY !== 'number' ||
      typeof data.playbackDuration !== 'number'
    ) {
      return null;
    }
    return data as FinishReplayClip;
  } catch {
    return null;
  }
}

export interface UploadReplayResult {
  ok: boolean;
  replayKey?: string;
  error?: string;
}

/**
 * Uploads a FinishReplayClip to the Worker R2 endpoint for a given matchId.
 */
export async function uploadMatchReplay(
  matchId: string,
  clip: FinishReplayClip,
  apiBase = '',
  fetchImpl: typeof fetch = fetch,
): Promise<UploadReplayResult> {
  try {
    const res = await fetchImpl(`${apiBase}/api/replays/${encodeURIComponent(matchId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: serializeReplayClip(clip),
    });
    const data = (await res.json().catch(() => ({}))) as { replayKey?: string; error?: string };
    if (!res.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: true, replayKey: data.replayKey };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

/**
 * Fetches a stored FinishReplayClip from the Worker R2 endpoint for a given matchId.
 */
export async function fetchMatchReplay(
  matchId: string,
  apiBase = '',
  fetchImpl: typeof fetch = fetch,
): Promise<FinishReplayClip | null> {
  try {
    const res = await fetchImpl(`${apiBase}/api/replays/${encodeURIComponent(matchId)}`);
    if (!res.ok) return null;
    const text = await res.text();
    return parseReplayClip(text);
  } catch {
    return null;
  }
}
