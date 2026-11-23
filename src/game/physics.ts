import {
  computeTileFallAiGuidance,
  findSupportingTile,
  triggerTileStep,
} from './tileFall';
import {
  BumperDef,
  CourseLayout,
  FallingTileDef,
  InputState,
  PlatformDef,
  QuizGateDef,
  RacerState,
} from './types';

export const PHYSICS_CONSTANTS = {
  gravity: 32,
  maxRunSpeed: 11.6,
  boostRunSpeed: 16.8,
  groundAccel: 52,
  airAccel: 26,
  groundFriction: 14,
  jumpVelocity: 11.8,
  jumpCutMultiplier: 0.48,
  coyoteDuration: 0.12,
  jumpBufferDuration: 0.12,
  diveSpeed: 15.8,
  diveLift: 4.8,
  diveDuration: 0.4,
  diveCooldown: 1.05,
  racerRadius: 0.56,
  racerHeight: 1.45,
  respawnY: -9.5,
} as const;

export type PhysicsEvent =
  | { type: 'jump'; isPlayer: boolean; x: number; y: number; z: number }
  | { type: 'land'; isPlayer: boolean; x: number; y: number; z: number; impact: number }
  | { type: 'dive'; isPlayer: boolean; x: number; y: number; z: number }
  | { type: 'bumper'; isPlayer: boolean; x: number; y: number; z: number; bumperId: string }
  | { type: 'sweeper'; isPlayer: boolean; x: number; y: number; z: number }
  | { type: 'speedpad'; isPlayer: boolean; x: number; y: number; z: number }
  | { type: 'star'; isPlayer: boolean; starId: string; x: number; y: number; z: number }
  | {
      type: 'quiz_correct';
      isPlayer: boolean;
      gateIndex: number;
      doorIndex: number;
      x: number;
      y: number;
      z: number;
      firstTry: boolean;
    }
  | {
      type: 'quiz_wrong';
      isPlayer: boolean;
      gateIndex: number;
      doorIndex: number;
      x: number;
      y: number;
      z: number;
    }
  | { type: 'tile_safe'; isPlayer: boolean; tileId: string; x: number; y: number; z: number }
  | { type: 'tile_fake'; isPlayer: boolean; tileId: string; x: number; y: number; z: number }
  | { type: 'respawn'; isPlayer: boolean; x: number; y: number; z: number }
  | { type: 'finish'; isPlayer: boolean; racerId: string; finishTime: number };

export function getPlatformDynamicState(platform: PlatformDef, time: number): { x: number; vx: number } {
  if (platform.moveAxis === 'x' && platform.moveAmp && platform.moveSpeed) {
    const angle = time * platform.moveSpeed + (platform.movePhase ?? 0);
    return {
      x: platform.x + Math.sin(angle) * platform.moveAmp,
      vx: Math.cos(angle) * platform.moveAmp * platform.moveSpeed,
    };
  }
  return { x: platform.x, vx: 0 };
}

export function getBumperDynamicX(bumper: BumperDef, time: number): number {
  if (bumper.moveAmp && bumper.moveSpeed) {
    return bumper.x + Math.sin(time * bumper.moveSpeed + (bumper.movePhase ?? 0)) * bumper.moveAmp;
  }
  return bumper.x;
}

export function getSweeperAngle(speed: number, phase: number, time: number): number {
  return time * speed + phase;
}

export interface GroundHit {
  surfaceY: number;
  carryVx: number;
  platform?: PlatformDef;
  tile?: FallingTileDef;
}

export function findSupportingPlatform(
  x: number,
  y: number,
  prevY: number,
  z: number,
  course: CourseLayout,
  time: number,
): GroundHit | null {
  const margin = PHYSICS_CONSTANTS.racerRadius * 0.65;
  let best: GroundHit | null = null;

  for (const plat of course.platforms) {
    const dyn = getPlatformDynamicState(plat, time);
    const halfW = plat.width * 0.5 + margin;
    const halfL = plat.length * 0.5 + margin;

    if (Math.abs(x - dyn.x) <= halfW && Math.abs(z - plat.z) <= halfL) {
      const topY = plat.y;
      // Allow landing if feet crossed topY from above or are within step-up tolerance
      if (prevY >= topY - 0.45 && y <= topY + 0.14) {
        if (!best || topY > best.surfaceY) {
          best = { surfaceY: topY, carryVx: dyn.vx, platform: plat };
        }
      }
    }
  }

  if (course.fallingTiles.length > 0) {
    const tileHit = findSupportingTile(x, y, prevY, z, course.fallingTiles, margin * 0.7);
    if (tileHit && (!best || tileHit.baseY >= best.surfaceY)) {
      best = { surfaceY: tileHit.baseY, carryVx: 0, tile: tileHit };
    }
  }

  return best;
}

export function computeProgressPct(z: number, startZ: number, finishZ: number): number {
  const span = startZ - finishZ;
  if (span <= 0) return 0;
  const pct = ((startZ - z) / span) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function computeRaceStandings(racers: readonly RacerState[]): RacerState[] {
  return [...racers].sort((a, b) => {
    if (a.finished && b.finished) {
      return (a.finishTime ?? 9999) - (b.finishTime ?? 9999);
    }
    if (a.finished) return -1;
    if (b.finished) return 1;
    // Lower Z means further forward toward finishZ (-245)
    return a.z - b.z;
  });
}

export function getActiveQuizGate(playerZ: number, course: CourseLayout): QuizGateDef | null {
  for (const gate of course.quizGates) {
    if (playerZ <= gate.promptStartZ && playerZ >= gate.z - 4.5 && !gate.playerCleared) {
      return gate;
    }
  }
  return null;
}

export function stepRacerPhysics(
  racer: RacerState,
  input: InputState,
  course: CourseLayout,
  dt: number,
  elapsedTime: number,
  events: PhysicsEvent[],
): void {
  const clampedDt = Math.min(dt, 0.05);

  if (racer.finished) {
    // Celebrate gently on finish plaza
    racer.vx *= Math.exp(-8 * clampedDt);
    racer.vz *= Math.exp(-8 * clampedDt);
    racer.x += racer.vx * clampedDt;
    racer.z += racer.vz * clampedDt;
    return;
  }

  // Timers
  racer.coyoteTimer = racer.grounded
    ? PHYSICS_CONSTANTS.coyoteDuration
    : Math.max(0, racer.coyoteTimer - clampedDt);

  if (input.jumpJustPressed) {
    racer.jumpBufferTimer = PHYSICS_CONSTANTS.jumpBufferDuration;
  } else {
    racer.jumpBufferTimer = Math.max(0, racer.jumpBufferTimer - clampedDt);
  }

  racer.diveTimer = Math.max(0, racer.diveTimer - clampedDt);
  racer.diveCooldown = Math.max(0, racer.diveCooldown - clampedDt);
  racer.stunTimer = Math.max(0, racer.stunTimer - clampedDt);
  racer.boostTimer = Math.max(0, racer.boostTimer - clampedDt);
  racer.hitFlashTimer = Math.max(0, racer.hitFlashTimer - clampedDt);

  // Relax squash & stretch smoothly
  const squashRate = 1 - Math.exp(-14 * clampedDt);
  racer.squashX += (1 - racer.squashX) * squashRate;
  racer.squashY += (1 - racer.squashY) * squashRate;

  // Normalize directional input
  let ix = input.moveX;
  let iz = input.moveZ;
  const inputLen = Math.hypot(ix, iz);
  if (inputLen > 1) {
    ix /= inputLen;
    iz /= inputLen;
  }

  const maxSpeed =
    racer.boostTimer > 0 ? PHYSICS_CONSTANTS.boostRunSpeed : PHYSICS_CONSTANTS.maxRunSpeed;

  // Horizontal steering (reduced control while diving or briefly stunned)
  if (racer.stunTimer <= 0 && racer.diveTimer <= 0) {
    const accel = racer.grounded ? PHYSICS_CONSTANTS.groundAccel : PHYSICS_CONSTANTS.airAccel;
    if (inputLen > 0.05) {
      const targetVx = ix * maxSpeed;
      const targetVz = iz * maxSpeed;
      const step = Math.min(1, (accel * clampedDt) / Math.max(1, maxSpeed));
      racer.vx += (targetVx - racer.vx) * step;
      racer.vz += (targetVz - racer.vz) * step;
      racer.facingYaw = Math.atan2(ix, iz);
    } else if (racer.grounded) {
      const damp = Math.exp(-PHYSICS_CONSTANTS.groundFriction * clampedDt);
      racer.vx *= damp;
      racer.vz *= damp;
    }
  } else {
    const drag = Math.exp(-3.2 * clampedDt);
    racer.vx *= drag;
    racer.vz *= drag;
  }

  // Jump with coyote time & jump buffering
  if (racer.jumpBufferTimer > 0 && racer.coyoteTimer > 0 && racer.stunTimer <= 0) {
    racer.vy = PHYSICS_CONSTANTS.jumpVelocity;
    racer.grounded = false;
    racer.coyoteTimer = 0;
    racer.jumpBufferTimer = 0;
    racer.squashX = 0.82;
    racer.squashY = 1.24;
    events.push({ type: 'jump', isPlayer: racer.isPlayer, x: racer.x, y: racer.y, z: racer.z });
  }

  // Variable jump height cut when jump is released early while rising
  if (input.jumpJustReleased && racer.vy > 3.5) {
    racer.vy *= PHYSICS_CONSTANTS.jumpCutMultiplier;
  }

  // Stumble Dive / Terjang action
  if (input.diveJustPressed && racer.diveCooldown <= 0 && racer.stunTimer <= 0) {
    const dirX = inputLen > 0.1 ? ix : Math.sin(racer.facingYaw);
    const dirZ = inputLen > 0.1 ? iz : Math.cos(racer.facingYaw);
    const len = Math.hypot(dirX, dirZ) || 1;
    racer.vx = (dirX / len) * PHYSICS_CONSTANTS.diveSpeed;
    racer.vz = (dirZ / len) * PHYSICS_CONSTANTS.diveSpeed;
    racer.vy = Math.max(racer.vy, PHYSICS_CONSTANTS.diveLift);
    racer.grounded = false;
    racer.diveTimer = PHYSICS_CONSTANTS.diveDuration;
    racer.diveCooldown = PHYSICS_CONSTANTS.diveCooldown;
    racer.facingYaw = Math.atan2(dirX, dirZ);
    racer.squashX = 1.22;
    racer.squashY = 0.78;
    events.push({ type: 'dive', isPlayer: racer.isPlayer, x: racer.x, y: racer.y, z: racer.z });
  }

  // Gravity & integration
  const prevY = racer.y;
  const prevZ = racer.z;
  racer.vy -= PHYSICS_CONSTANTS.gravity * clampedDt;
  racer.x += racer.vx * clampedDt;
  racer.y += racer.vy * clampedDt;
  racer.z += racer.vz * clampedDt;

  // Walk cycle synced to actual ground travel distance
  if (racer.grounded && racer.stunTimer <= 0) {
    racer.walkDistance += Math.hypot(racer.vx, racer.vz) * clampedDt;
  }

  // Platform landing & moving bridge carry
  const groundHit =
    racer.vy <= 0.1
      ? findSupportingPlatform(racer.x, racer.y, prevY, racer.z, course, elapsedTime)
      : null;

  if (groundHit) {
    const wasAirborne = !racer.grounded;
    const impact = Math.abs(racer.vy);
    racer.y = groundHit.surfaceY;
    racer.vy = 0;
    racer.grounded = true;
    racer.x += groundHit.carryVx * clampedDt;

    if (groundHit.tile) {
      const outcome = triggerTileStep(groundHit.tile);
      if (outcome === 'safe_revealed') {
        events.push({
          type: 'tile_safe',
          isPlayer: racer.isPlayer,
          tileId: groundHit.tile.id,
          x: groundHit.tile.x,
          y: groundHit.tile.baseY + 0.1,
          z: groundHit.tile.z,
        });
      } else if (outcome === 'fake_triggered') {
        events.push({
          type: 'tile_fake',
          isPlayer: racer.isPlayer,
          tileId: groundHit.tile.id,
          x: groundHit.tile.x,
          y: groundHit.tile.baseY + 0.1,
          z: groundHit.tile.z,
        });
      }
    }

    if (wasAirborne && impact > 4.5) {
      racer.squashX = 1.24;
      racer.squashY = 0.76;
      events.push({
        type: 'land',
        isPlayer: racer.isPlayer,
        x: racer.x,
        y: racer.y,
        z: racer.z,
        impact,
      });
    }
  } else {
    racer.grounded = false;
  }

  // Speed Boost Pads
  for (const pad of course.speedPads) {
    if (
      Math.abs(racer.x - pad.x) <= pad.width * 0.5 + 0.3 &&
      Math.abs(racer.z - pad.z) <= pad.length * 0.5 + 0.3 &&
      Math.abs(racer.y - pad.y) <= 0.8
    ) {
      if (racer.boostTimer < 0.9) {
        events.push({ type: 'speedpad', isPlayer: racer.isPlayer, x: racer.x, y: racer.y, z: racer.z });
      }
      racer.boostTimer = 1.35;
      racer.vz = Math.min(racer.vz, -PHYSICS_CONSTANTS.boostRunSpeed);
    }
  }

  // Bouncing Eraser Bumpers
  for (const bumper of course.bumpers) {
    const bx = getBumperDynamicX(bumper, elapsedTime);
    const dx = racer.x - bx;
    const dz = racer.z - bumper.z;
    const dist = Math.hypot(dx, dz);
    const minDist = bumper.radius + PHYSICS_CONSTANTS.racerRadius;
    if (dist < minDist && racer.y < bumper.y + 1.55 && racer.y > bumper.y - 0.6) {
      const nx = dist > 0.001 ? dx / dist : 0;
      const nz = dist > 0.001 ? dz / dist : 1;
      racer.x = bx + nx * (minDist + 0.05);
      racer.z = bumper.z + nz * (minDist + 0.05);
      racer.vx = nx * 13.5;
      racer.vz = nz * 13.5;
      racer.vy = Math.max(racer.vy, 5.5);
      racer.stunTimer = 0.28;
      racer.hitFlashTimer = 0.14;
      racer.squashX = 1.3;
      racer.squashY = 0.72;
      events.push({
        type: 'bumper',
        isPlayer: racer.isPlayer,
        x: racer.x,
        y: racer.y + 0.6,
        z: racer.z,
        bumperId: bumper.id,
      });
    }
  }

  // Rotating Pencil Sweepers
  for (const sweeper of course.sweepers) {
    const relX = racer.x - sweeper.x;
    const relZ = racer.z - sweeper.z;
    const distFromHub = Math.hypot(relX, relZ);
    if (distFromHub < sweeper.armLength + 0.45 && racer.y < sweeper.y + sweeper.barHeight + 0.52 && racer.y > sweeper.y - 0.5) {
      const angle = getSweeperAngle(sweeper.speed, sweeper.phase, elapsedTime);
      const dirX = Math.cos(angle);
      const dirZ = Math.sin(angle);
      // Closest distance to double-ended pencil bar passing through hub
      const proj = relX * dirX + relZ * dirZ;
      if (Math.abs(proj) <= sweeper.armLength) {
        const perpX = relX - proj * dirX;
        const perpZ = relZ - proj * dirZ;
        const perpDist = Math.hypot(perpX, perpZ);
        if (perpDist < 0.78 && racer.stunTimer <= 0.05) {
          // Tangential knockback in the sweep direction!
          const sign = sweeper.speed >= 0 ? 1 : -1;
          const tanX = -dirZ * sign * (proj >= 0 ? 1 : -1);
          const tanZ = dirX * sign * (proj >= 0 ? 1 : -1);
          racer.vx = tanX * 14.5;
          racer.vz = tanZ * 10.5 + 3.5;
          racer.vy = 6.8;
          racer.grounded = false;
          racer.stunTimer = 0.42;
          racer.hitFlashTimer = 0.18;
          racer.squashX = 1.32;
          racer.squashY = 0.7;
          events.push({ type: 'sweeper', isPlayer: racer.isPlayer, x: racer.x, y: racer.y + 0.7, z: racer.z });
        }
      }
    }
  }

  // Quiz Gate Door Collisions (3 physical doors A, B, C across track)
  for (const gate of course.quizGates) {
    const crossingPlane =
      Math.abs(racer.z - gate.z) < 0.95 || (prevZ > gate.z && racer.z <= gate.z);

    if (crossingPlane && racer.y < gate.y + 3.2 && racer.y > gate.y - 0.6) {
      // Prevent sidestepping outside the pillars
      if (Math.abs(racer.x) > 6.9) {
        racer.x = Math.sign(racer.x) * 6.9;
      }

      // Determine closest door (0, 1, or 2)
      let hitDoor = gate.doors[0];
      let bestDx = Math.abs(racer.x - gate.doors[0].x);
      for (let i = 1; i < 3; i++) {
        const d = Math.abs(racer.x - gate.doors[i].x);
        if (d < bestDx) {
          bestDx = d;
          hitDoor = gate.doors[i];
        }
      }

      const isCorrect = hitDoor.index === gate.question.correctIndex;

      if (isCorrect) {
        const justOpened = !hitDoor.opened;
        hitDoor.opened = true;

        if (racer.isPlayer && !gate.playerCleared) {
          gate.playerCleared = true;
          racer.checkpointX = 0;
          racer.checkpointY = gate.y;
          racer.checkpointZ = gate.z - 2.2;
          racer.boostTimer = 1.5;
          racer.vz = Math.min(racer.vz, -PHYSICS_CONSTANTS.boostRunSpeed * 0.92);
          events.push({
            type: 'quiz_correct',
            isPlayer: true,
            gateIndex: gate.gateIndex,
            doorIndex: hitDoor.index,
            x: hitDoor.x,
            y: gate.y + 1.2,
            z: gate.z,
            firstTry: !gate.playerMissedOnce,
          });
        } else if (!racer.isPlayer && justOpened) {
          racer.checkpointX = 0;
          racer.checkpointY = gate.y;
          racer.checkpointZ = gate.z - 2.2;
          events.push({
            type: 'quiz_correct',
            isPlayer: false,
            gateIndex: gate.gateIndex,
            doorIndex: hitDoor.index,
            x: hitDoor.x,
            y: gate.y + 1.2,
            z: gate.z,
            firstTry: true,
          });
        } else if (!racer.isPlayer) {
          racer.checkpointX = 0;
          racer.checkpointY = gate.y;
          racer.checkpointZ = gate.z - 2.2;
        }
      } else {
        // Wrong door is solid & bouncy!
        racer.z = gate.z + 1.15;
        racer.vz = 10.5;
        racer.vy = 4.6;
        racer.grounded = false;
        racer.stunTimer = 0.36;
        racer.hitFlashTimer = 0.16;
        racer.squashX = 1.28;
        racer.squashY = 0.72;
        hitDoor.wrongRevealed = true;
        if (racer.isPlayer) {
          gate.playerMissedOnce = true;
        } else {
          // AI learns from bounce and switches target to the correct door
          racer.aiChosenDoor = gate.question.correctIndex;
        }
        events.push({
          type: 'quiz_wrong',
          isPlayer: racer.isPlayer,
          gateIndex: gate.gateIndex,
          doorIndex: hitDoor.index,
          x: hitDoor.x,
          y: gate.y + 1.1,
          z: gate.z,
        });
      }
    }
  }

  // Golden Star Collectibles (Player collects for score!)
  if (racer.isPlayer) {
    for (const star of course.stars) {
      if (star.collected) continue;
      const dx = racer.x - star.x;
      const dy = racer.y + 0.7 - star.y;
      const dz = racer.z - star.z;
      if (dx * dx + dy * dy + dz * dz < 1.55 * 1.55) {
        star.collected = true;
        events.push({
          type: 'star',
          isPlayer: true,
          starId: star.id,
          x: star.x,
          y: star.y,
          z: star.z,
        });
      }
    }
  }

  // Fall off sky island -> smooth respawn at last safe checkpoint
  if (racer.y < PHYSICS_CONSTANTS.respawnY) {
    racer.x = racer.checkpointX;
    racer.y = racer.checkpointY + 1.5;
    racer.z = racer.checkpointZ;
    racer.vx = 0;
    racer.vy = 0;
    racer.vz = 0;
    racer.stunTimer = 0.2;
    racer.grounded = false;
    events.push({
      type: 'respawn',
      isPlayer: racer.isPlayer,
      x: racer.x,
      y: racer.y,
      z: racer.z,
    });
  }

  // Finish Line check
  if (racer.z <= course.finishZ) {
    racer.finished = true;
    racer.finishTime = elapsedTime;
    events.push({
      type: 'finish',
      isPlayer: racer.isPlayer,
      racerId: racer.id,
      finishTime: elapsedTime,
    });
  }
}

/**
 * 3 distinct AI classmate racing policies:
 * - 'speedster': Aggressive center-line runner, dives across gaps, occasionally guesses wrong doors!
 * - 'cautious': Carefully tracks moving ruler bridges and leaps early over pencil sweepers.
 * - 'quizwhiz': High quiz accuracy (aims for correct doors quickly), steady obstacle pace.
 */
export function computeAiInput(
  racer: RacerState,
  course: CourseLayout,
  elapsedTime: number,
): InputState {
  if (racer.finished) {
    return {
      moveX: 0,
      moveZ: 0,
      jumpHeld: false,
      jumpJustPressed: false,
      jumpJustReleased: false,
      diveJustPressed: false,
    };
  }

  let targetX = racer.aiTargetX;
  let speedFactor =
    racer.policy === 'speedster' ? 0.91 : racer.policy === 'quizwhiz' ? 0.86 : 0.82;
  let wantJump = false;
  let wantDive = false;

  // 1. Check upcoming Quiz Gate within 15m (or 24m in classic mode)
  const gateLookahead = course.mode === 'tile_fall' ? 11.5 : 24;
  const nextGate = course.quizGates.find((g) => g.z < racer.z + 1.0 && racer.z - g.z < gateLookahead);
  if (nextGate) {
    if (racer.aiDecisionGate !== nextGate.gateIndex) {
      racer.aiDecisionGate = nextGate.gateIndex;
      // Deterministic pseudo-choice based on policy & racer name hash
      const hash = (racer.name.charCodeAt(0) * 13 + nextGate.gateIndex * 7) % 10;
      const correctChance =
        racer.policy === 'quizwhiz' ? 9 : racer.policy === 'cautious' ? 7 : 5;
      if (hash < correctChance || nextGate.doors[nextGate.question.correctIndex].opened) {
        racer.aiChosenDoor = nextGate.question.correctIndex;
      } else {
        racer.aiChosenDoor = (nextGate.question.correctIndex + 1 + (hash % 2)) % 3;
      }
    }
    const chosenDoor = nextGate.doors[racer.aiChosenDoor] ?? nextGate.doors[nextGate.question.correctIndex];
    targetX = chosenDoor.x;
  } else if (course.fallingTiles.length > 0) {
    // 2a. Tile Fall AI guidance: read revealed safe tiles or boldly scout ahead
    const tileGuide = computeTileFallAiGuidance(racer, course.fallingTiles);
    if (tileGuide) {
      targetX = tileGuide.targetX;
      speedFactor = tileGuide.speedFactor;
      if (tileGuide.wantJump && racer.grounded) {
        wantJump = true;
      }
    } else {
      targetX = ((racer.name.charCodeAt(0) % 5) - 2) * 1.4;
    }
  } else {
    // 2b. Align with moving ruler bridges if ahead
    const upcomingBridge = course.platforms.find(
      (p) =>
        p.kind === 'ruler_bridge' &&
        racer.z > p.z - p.length * 0.5 &&
        racer.z - (p.z + p.length * 0.5) < 11,
    );
    if (upcomingBridge) {
      const dyn = getPlatformDynamicState(upcomingBridge, elapsedTime + 0.35);
      targetX = dyn.x;
      if (racer.policy === 'cautious') speedFactor *= 0.92;
    } else {
      // Weave gently around nearby bumpers
      const laneOffset = ((racer.name.charCodeAt(0) % 5) - 2) * 1.4;
      targetX = laneOffset;
      for (const b of course.bumpers) {
        if (b.z < racer.z && racer.z - b.z < 5.2) {
          const bx = getBumperDynamicX(b, elapsedTime);
          if (Math.abs(racer.x - bx) < b.radius + 1.2) {
            targetX = racer.x >= bx ? bx + b.radius + 1.8 : bx - b.radius - 1.8;
          }
        }
      }
    }
  }

  // 3. Jump over gaps (look 1.6m ahead)
  const lookAheadZ = racer.z - 1.65;
  const aheadGround = findSupportingPlatform(
    racer.x,
    racer.y,
    racer.y + 0.5,
    lookAheadZ,
    course,
    elapsedTime,
  );
  if (racer.grounded && !aheadGround) {
    wantJump = true;
    if (racer.policy === 'speedster' && racer.diveCooldown <= 0) {
      wantDive = true;
    }
  }

  // 4. Jump over approaching Pencil Sweepers
  for (const s of course.sweepers) {
    const distZ = Math.abs(racer.z - s.z);
    if (distZ < 2.2 && racer.grounded) {
      wantJump = true;
    }
  }

  const dx = targetX - racer.x;
  const moveX = Math.max(-1, Math.min(1, dx * 0.65));

  return {
    moveX,
    moveZ: -speedFactor,
    jumpHeld: wantJump,
    jumpJustPressed: wantJump,
    jumpJustReleased: false,
    diveJustPressed: wantDive,
  };
}
