export type ParticleKind = 'confetti' | 'spark' | 'debris';

export type HurdleKind = 'bumper' | 'sweeper' | 'wrong_door';

export interface ParticleSlot {
  active: boolean;
  kind: ParticleKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  spinX: number;
  spinY: number;
  spinZ: number;
  gravity: number;
  drag: number;
  bounceFloorY: number | null;
  life: number;
  maxLife: number;
  scale: number;
}

export interface ShockwaveSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vertical: boolean; // true = faces Z (quiz gate portal), false = flat on ground/impact
  startRadius: number;
  endRadius: number;
  thickness: number;
  life: number;
  maxLife: number;
}

export interface ParticleLayerRecipe {
  kind: ParticleKind;
  count: number;
  colors: number[];
  speedMin: number;
  speedMax: number;
  vyMin: number;
  vyMax: number;
  spreadXZ: number;
  spreadY: number;
  gravity: number;
  drag: number;
  lifeMin: number;
  lifeMax: number;
  scaleMin: number;
  scaleMax: number;
  bounceFloor: boolean;
}

export interface ShockwaveRecipe {
  color: number;
  vertical: boolean;
  offsetY: number;
  startRadius: number;
  endRadius: number;
  thickness: number;
  duration: number;
}

export interface BurstEffectSpec {
  layers: ParticleLayerRecipe[];
  shockwaves: ShockwaveRecipe[];
}

export function getQuizGateBurstSpec(firstTry: boolean): BurstEffectSpec {
  const scaleBoost = firstTry ? 1.15 : 0.95;
  return {
    layers: [
      {
        kind: 'confetti',
        count: firstTry ? 38 : 26,
        colors: [0x4ade80, 0xfacc15, 0x38bdf8, 0xf472b6, 0xa855f7, 0xffffff],
        speedMin: 3.5,
        speedMax: 10.5,
        vyMin: 6.2,
        vyMax: 13.8,
        spreadXZ: 1.5,
        spreadY: 1.2,
        gravity: 7.2,
        drag: 2.3,
        lifeMin: 0.85,
        lifeMax: 1.55,
        scaleMin: 0.9 * scaleBoost,
        scaleMax: 1.45 * scaleBoost,
        bounceFloor: false,
      },
      {
        kind: 'spark',
        count: firstTry ? 20 : 14,
        colors: [0xfef08a, 0x4ade80, 0x38bdf8, 0xffffff],
        speedMin: 6.5,
        speedMax: 13.0,
        vyMin: 2.5,
        vyMax: 8.5,
        spreadXZ: 0.8,
        spreadY: 0.8,
        gravity: 11.0,
        drag: 1.4,
        lifeMin: 0.45,
        lifeMax: 0.85,
        scaleMin: 0.85 * scaleBoost,
        scaleMax: 1.4 * scaleBoost,
        bounceFloor: false,
      },
      {
        kind: 'debris',
        count: 10,
        colors: [0xffffff, 0x86efac, 0xfde047],
        speedMin: 4.0,
        speedMax: 8.5,
        vyMin: 3.2,
        vyMax: 7.2,
        spreadXZ: 1.1,
        spreadY: 0.9,
        gravity: 21.0,
        drag: 0.4,
        lifeMin: 0.55,
        lifeMax: 0.95,
        scaleMin: 0.75,
        scaleMax: 1.25,
        bounceFloor: true,
      },
    ],
    shockwaves: [
      {
        color: 0x4ade80,
        vertical: true,
        offsetY: 1.35,
        startRadius: 0.65,
        endRadius: firstTry ? 4.4 : 3.6,
        thickness: 0.24,
        duration: 0.48,
      },
      {
        color: 0xfacc15,
        vertical: false,
        offsetY: 0.18,
        startRadius: 0.5,
        endRadius: firstTry ? 4.8 : 3.9,
        thickness: 0.2,
        duration: 0.55,
      },
    ],
  };
}

export function getHurdleImpactSpec(kind: HurdleKind): BurstEffectSpec {
  if (kind === 'sweeper') {
    return {
      layers: [
        {
          kind: 'spark',
          count: 24,
          colors: [0xfacc15, 0xf97316, 0xf43f5e, 0xffffff],
          speedMin: 7.5,
          speedMax: 14.5,
          vyMin: 3.0,
          vyMax: 9.5,
          spreadXZ: 0.55,
          spreadY: 0.45,
          gravity: 14.5,
          drag: 1.5,
          lifeMin: 0.35,
          lifeMax: 0.72,
          scaleMin: 0.9,
          scaleMax: 1.55,
          bounceFloor: false,
        },
        {
          kind: 'debris',
          count: 14,
          colors: [0xfde047, 0xf472b6, 0xfffbeb],
          speedMin: 4.5,
          speedMax: 9.5,
          vyMin: 3.5,
          vyMax: 8.2,
          spreadXZ: 0.6,
          spreadY: 0.4,
          gravity: 22.0,
          drag: 0.45,
          lifeMin: 0.48,
          lifeMax: 0.85,
          scaleMin: 0.75,
          scaleMax: 1.3,
          bounceFloor: true,
        },
      ],
      shockwaves: [
        {
          color: 0xf97316,
          vertical: false,
          offsetY: 0.55,
          startRadius: 0.45,
          endRadius: 3.6,
          thickness: 0.22,
          duration: 0.36,
        },
      ],
    };
  }

  if (kind === 'wrong_door') {
    return {
      layers: [
        {
          kind: 'spark',
          count: 20,
          colors: [0xef4444, 0xfca5a5, 0xfacc15, 0xffffff],
          speedMin: 6.0,
          speedMax: 12.0,
          vyMin: 2.4,
          vyMax: 7.8,
          spreadXZ: 0.8,
          spreadY: 0.7,
          gravity: 15.0,
          drag: 1.6,
          lifeMin: 0.34,
          lifeMax: 0.65,
          scaleMin: 0.85,
          scaleMax: 1.4,
          bounceFloor: false,
        },
        {
          kind: 'debris',
          count: 12,
          colors: [0xdc2626, 0xfee2e2, 0x991b1b],
          speedMin: 3.5,
          speedMax: 7.5,
          vyMin: 2.8,
          vyMax: 6.5,
          spreadXZ: 0.7,
          spreadY: 0.5,
          gravity: 21.0,
          drag: 0.5,
          lifeMin: 0.42,
          lifeMax: 0.78,
          scaleMin: 0.7,
          scaleMax: 1.2,
          bounceFloor: true,
        },
      ],
      shockwaves: [
        {
          color: 0xef4444,
          vertical: true,
          offsetY: 1.1,
          startRadius: 0.45,
          endRadius: 3.2,
          thickness: 0.2,
          duration: 0.34,
        },
      ],
    };
  }

  // Springy eraser bumper collision
  return {
    layers: [
      {
        kind: 'spark',
        count: 22,
        colors: [0xfb7185, 0xfacc15, 0x38bdf8, 0xffffff],
        speedMin: 7.0,
        speedMax: 13.5,
        vyMin: 3.2,
        vyMax: 8.8,
        spreadXZ: 0.6,
        spreadY: 0.45,
        gravity: 14.0,
        drag: 1.5,
        lifeMin: 0.36,
        lifeMax: 0.72,
        scaleMin: 0.9,
        scaleMax: 1.5,
        bounceFloor: false,
      },
      {
        kind: 'debris',
        count: 12,
        colors: [0xfda4af, 0xfef08a, 0xffffff],
        speedMin: 4.0,
        speedMax: 8.5,
        vyMin: 3.4,
        vyMax: 7.4,
        spreadXZ: 0.55,
        spreadY: 0.35,
        gravity: 21.5,
        drag: 0.45,
        lifeMin: 0.46,
        lifeMax: 0.82,
        scaleMin: 0.75,
        scaleMax: 1.25,
        bounceFloor: true,
      },
    ],
    shockwaves: [
      {
        color: 0xfb7185,
        vertical: false,
        offsetY: 0.6,
        startRadius: 0.5,
        endRadius: 3.4,
        thickness: 0.22,
        duration: 0.35,
      },
    ],
  };
}

export function stepParticleSlot(slot: ParticleSlot, dt: number): boolean {
  if (!slot.active) return false;
  slot.life -= dt;
  if (slot.life <= 0) {
    slot.active = false;
    return false;
  }

  const dragFactor = slot.drag > 0 ? Math.exp(-slot.drag * dt) : 1;
  slot.vx *= dragFactor;
  slot.vz *= dragFactor;
  slot.vy -= slot.gravity * dt;
  if (slot.kind === 'confetti') {
    // Gentle air-resistance terminal velocity so confetti ribbons flutter gracefully
    slot.vy = Math.max(-2.6, slot.vy * Math.exp(-1.15 * dt));
  }

  slot.x += slot.vx * dt;
  slot.y += slot.vy * dt;
  slot.z += slot.vz * dt;

  if (slot.bounceFloorY !== null && slot.y < slot.bounceFloorY && slot.vy < 0) {
    slot.y = slot.bounceFloorY;
    slot.vy = -slot.vy * 0.45;
    slot.vx *= 0.72;
    slot.vz *= 0.72;
  }

  slot.rx += slot.spinX * dt;
  slot.ry += slot.spinY * dt;
  slot.rz += slot.spinZ * dt;

  return true;
}

export function stepShockwaveSlot(
  ring: ShockwaveSlot,
  dt: number,
): { alive: boolean; radius: number; thicknessScale: number } {
  if (!ring.active) {
    return { alive: false, radius: 0, thicknessScale: 0 };
  }

  ring.life -= dt;
  if (ring.life <= 0) {
    ring.active = false;
    return { alive: false, radius: 0, thicknessScale: 0 };
  }

  const progress = 1 - ring.life / Math.max(0.001, ring.maxLife);
  // Fast ease-out expansion for crisp impact punch
  const eased = 1 - Math.pow(1 - progress, 2.4);
  const radius = ring.startRadius + (ring.endRadius - ring.startRadius) * eased;
  const thicknessScale = Math.max(0.06, (1 - progress) * ring.thickness * 5);

  return { alive: true, radius, thicknessScale };
}
