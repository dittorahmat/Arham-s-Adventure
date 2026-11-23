import {
  AiPolicy,
  BumperDef,
  CourseLayout,
  PlatformDef,
  QuizGateDef,
  QuizQuestion,
  RacerState,
  SpeedPadDef,
  StarPickupDef,
  SweeperDef,
} from './types';

export interface RacerPalette {
  name: string;
  policy: AiPolicy;
  shirtHex: number;
  vestHex: number;
  capHex: number;
  backpackHex: number;
  skinHex: number;
}

export const RACER_ROSTER: readonly RacerPalette[] = [
  {
    name: 'Arham',
    policy: 'quizwhiz',
    shirtHex: 0xffffff,
    vestHex: 0xef4444, // Seragam SD merah-putih sporty
    capHex: 0x2563eb,
    backpackHex: 0xfacc15,
    skinHex: 0xf1c29b,
  },
  {
    name: 'Sari',
    policy: 'quizwhiz',
    shirtHex: 0xffffff,
    vestHex: 0xec4899,
    capHex: 0xf97316,
    backpackHex: 0x38bdf8,
    skinHex: 0xf5cba7,
  },
  {
    name: 'Budi',
    policy: 'speedster',
    shirtHex: 0xffffff,
    vestHex: 0x10b981,
    capHex: 0x16a34a,
    backpackHex: 0xf43f5e,
    skinHex: 0xe5b288,
  },
  {
    name: 'Raka',
    policy: 'speedster',
    shirtHex: 0xffffff,
    vestHex: 0x3b82f6,
    capHex: 0xfacc15,
    backpackHex: 0xa855f7,
    skinHex: 0xdca47a,
  },
  {
    name: 'Nisa',
    policy: 'cautious',
    shirtHex: 0xffffff,
    vestHex: 0x8b5cf6,
    capHex: 0xec4899,
    backpackHex: 0x22c55e,
    skinHex: 0xf3c6a0,
  },
  {
    name: 'Dino',
    policy: 'cautious',
    shirtHex: 0xffffff,
    vestHex: 0xf59e0b,
    capHex: 0x0ea5e9,
    backpackHex: 0xef4444,
    skinHex: 0xe7b58d,
  },
];

export const GATE_DOOR_X: readonly [number, number, number] = [-4.6, 0, 4.6];
export const GATE_DOOR_WIDTH = 4.1;

function createQuizGate(
  gateIndex: number,
  z: number,
  y: number,
  question: QuizQuestion,
): QuizGateDef {
  return {
    id: `gate-${gateIndex}`,
    gateIndex,
    z,
    y,
    promptStartZ: gateIndex === 0 ? z + 38 : z + 35, // Generous reading window while approaching each gate
    question,
    doors: [
      { index: 0, x: GATE_DOOR_X[0], width: GATE_DOOR_WIDTH, opened: false, wrongRevealed: false },
      { index: 1, x: GATE_DOOR_X[1], width: GATE_DOOR_WIDTH, opened: false, wrongRevealed: false },
      { index: 2, x: GATE_DOOR_X[2], width: GATE_DOOR_WIDTH, opened: false, wrongRevealed: false },
    ],
    playerCleared: false,
    playerMissedOnce: false,
  };
}

export function createCourseLayout(questions: QuizQuestion[]): CourseLayout {
  if (questions.length < 5) {
    throw new Error('Course layout requires at least 5 quiz questions.');
  }

  const platforms: PlatformDef[] = [
    // Section 1: Start Plaza -> Bouncy Intro -> Quiz Plaza 1 (continuous forgiving opening)
    {
      id: 'plat-start',
      x: 0,
      y: 0,
      z: -21,
      width: 16,
      height: 2.4,
      length: 54, // z: +6 to -48
      kind: 'start',
      colorHex: 0x38bdf8,
    },
    // Section 2: Spinning Pencil Gauntlet -> Quiz Plaza 2
    {
      id: 'plat-sweeper-zone',
      x: 0,
      y: 0,
      z: -71.5,
      width: 15.5,
      height: 2.4,
      length: 43, // z: -50 to -93 (2m easy hop at -48..-50)
      kind: 'track',
      colorHex: 0x6366f1,
    },
    // Section 3: Moving Wooden Ruler Bridges over sky gap
    {
      id: 'plat-ruler-1',
      x: -2.2,
      y: 0,
      z: -100.5,
      width: 7.4,
      height: 1.2,
      length: 10.5, // z: -95.25 to -105.75
      kind: 'ruler_bridge',
      colorHex: 0xf59e0b,
      moveAxis: 'x',
      moveAmp: 3.4,
      moveSpeed: 1.35,
      movePhase: 0,
    },
    {
      id: 'plat-ruler-2',
      x: 2.2,
      y: 0.2,
      z: -113,
      width: 7.4,
      height: 1.2,
      length: 10.5, // z: -107.75 to -118.25
      kind: 'ruler_bridge',
      colorHex: 0xfbbf24,
      moveAxis: 'x',
      moveAmp: 3.4,
      moveSpeed: 1.45,
      movePhase: Math.PI,
    },
    // Quiz Plaza 3
    {
      id: 'plat-quiz-3',
      x: 0,
      y: 0.2,
      z: -131.5,
      width: 16,
      height: 2.4,
      length: 23, // z: -120 to -143
      kind: 'quiz_plaza',
      colorHex: 0x10b981,
    },
    // Section 4: Bumper & Sweeper Mega Track -> Quiz Plaza 4
    {
      id: 'plat-gauntlet-4',
      x: 0,
      y: 0.2,
      z: -166.5,
      width: 15.5,
      height: 2.4,
      length: 43, // z: -145 to -188 (2m hop at -143..-145)
      kind: 'track',
      colorHex: 0xec4899,
    },
    // Section 5: Stepping Ruler Ascent -> Final Quiz Plaza 5
    {
      id: 'plat-ruler-3',
      x: 0,
      y: 0.55,
      z: -195.5,
      width: 8.2,
      height: 1.2,
      length: 10.5, // z: -190.25 to -200.75
      kind: 'ruler_bridge',
      colorHex: 0xf59e0b,
      moveAxis: 'x',
      moveAmp: 3.6,
      moveSpeed: 1.6,
      movePhase: 0.7,
    },
    {
      id: 'plat-ruler-4',
      x: 0,
      y: 0.9,
      z: -208,
      width: 8.2,
      height: 1.2,
      length: 10.5, // z: -202.75 to -213.25
      kind: 'ruler_bridge',
      colorHex: 0xfbbf24,
      moveAxis: 'x',
      moveAmp: 3.6,
      moveSpeed: 1.75,
      movePhase: 3.8,
    },
    // Final Quiz Plaza 5 + Finish Podium
    {
      id: 'plat-finish',
      x: 0,
      y: 1.1,
      z: -237,
      width: 17,
      height: 2.8,
      length: 44, // z: -215 to -259
      kind: 'finish',
      colorHex: 0x0ea5e9,
    },
  ];

  const sweepers: SweeperDef[] = [
    {
      id: 'sweeper-1',
      x: 0,
      y: 0,
      z: -60,
      armLength: 6.4,
      barHeight: 0.72,
      speed: 1.45,
      phase: 0.2,
    },
    {
      id: 'sweeper-2',
      x: 0,
      y: 0,
      z: -72,
      armLength: 6.4,
      barHeight: 0.72,
      speed: -1.65,
      phase: 1.5,
    },
    {
      id: 'sweeper-3',
      x: 0,
      y: 0.2,
      z: -165,
      armLength: 6.6,
      barHeight: 0.72,
      speed: 1.9,
      phase: 0.8,
    },
  ];

  const bumpers: BumperDef[] = [
    // Opening playful bumpers (easy to dodge or bounce off)
    { id: 'bump-1', x: -3.4, y: 0, z: -15, radius: 1.25, colorHex: 0xfb7185 },
    { id: 'bump-2', x: 3.4, y: 0, z: -15, radius: 1.25, colorHex: 0x2dd4bf },
    { id: 'bump-3', x: 0, y: 0, z: -23, radius: 1.35, colorHex: 0xfbbf24, moveAmp: 3.6, moveSpeed: 1.5, movePhase: 0 },
    // Section 4 bumper maze
    { id: 'bump-4', x: -4.2, y: 0.2, z: -153, radius: 1.3, colorHex: 0xfb7185 },
    { id: 'bump-5', x: 0, y: 0.2, z: -153, radius: 1.3, colorHex: 0x38bdf8 },
    { id: 'bump-6', x: 4.2, y: 0.2, z: -153, radius: 1.3, colorHex: 0xfb7185 },
    { id: 'bump-7', x: -2.4, y: 0.2, z: -158.5, radius: 1.25, colorHex: 0xfacc15, moveAmp: 2.2, moveSpeed: 2.0, movePhase: 0.5 },
    { id: 'bump-8', x: 2.4, y: 0.2, z: -158.5, radius: 1.25, colorHex: 0x34d399, moveAmp: 2.2, moveSpeed: 2.0, movePhase: 3.6 },
  ];

  const speedPads: SpeedPadDef[] = [
    { id: 'pad-1', x: 0, y: 0, z: -9, width: 3.6, length: 4.5 },
    { id: 'pad-2', x: 0, y: 0, z: -53, width: 3.6, length: 4.5 },
    { id: 'pad-3', x: 0, y: 0.2, z: -148, width: 3.8, length: 4.5 },
    { id: 'pad-4', x: 0, y: 1.1, z: -236, width: 4.8, length: 5.0 },
  ];

  const stars: StarPickupDef[] = [
    { id: 'star-1', x: 0, y: 1.1, z: -15, collected: false },
    { id: 'star-2', x: -4.5, y: 1.1, z: -28, collected: false },
    { id: 'star-3', x: 4.5, y: 1.1, z: -28, collected: false },
    { id: 'star-4', x: 0, y: 2.1, z: -60, collected: false },
    { id: 'star-5', x: 0, y: 2.1, z: -72, collected: false },
    { id: 'star-6', x: 0, y: 1.3, z: -100.5, collected: false },
    { id: 'star-7', x: 0, y: 1.5, z: -113, collected: false },
    { id: 'star-8', x: -3.5, y: 1.4, z: -156, collected: false },
    { id: 'star-9', x: 3.5, y: 1.4, z: -156, collected: false },
    { id: 'star-10', x: 0, y: 2.2, z: -165, collected: false },
    { id: 'star-11', x: 0, y: 1.8, z: -195.5, collected: false },
    { id: 'star-12', x: 0, y: 2.1, z: -208, collected: false },
  ];

  const quizGates: QuizGateDef[] = [
    createQuizGate(0, -39, 0, questions[0]),
    createQuizGate(1, -85, 0, questions[1]),
    createQuizGate(2, -134, 0.2, questions[2]),
    createQuizGate(3, -180, 0.2, questions[3]),
    createQuizGate(4, -225, 1.1, questions[4]),
  ];

  return {
    platforms,
    sweepers,
    bumpers,
    speedPads,
    stars,
    quizGates,
    startZ: 0,
    finishZ: -245,
    timeLimitSeconds: 180,
  };
}

export function createInitialRacers(): RacerState[] {
  // Spawn all 6 racers in a clean wide formation on the starting plaza facing -Z
  const spawnSlots: Array<[number, number]> = [
    [0, 0], // Arham front-center
    [-3.6, -0.4],
    [3.6, -0.4],
    [-5.4, 2.0],
    [0, 2.2],
    [5.4, 2.0],
  ];

  return RACER_ROSTER.map((entry, idx) => {
    const [sx, sz] = spawnSlots[idx];
    return {
      id: idx === 0 ? 'player' : `ai-${idx}`,
      name: entry.name,
      isPlayer: idx === 0,
      policy: entry.policy,
      x: sx,
      y: 0,
      z: sz,
      vx: 0,
      vy: 0,
      vz: 0,
      facingYaw: Math.PI, // Facing -Z
      grounded: true,
      coyoteTimer: 0.12,
      jumpBufferTimer: 0,
      diveTimer: 0,
      diveCooldown: 0,
      stunTimer: 0,
      boostTimer: 0,
      hitFlashTimer: 0,
      squashX: 1,
      squashY: 1,
      walkDistance: 0,
      checkpointX: sx,
      checkpointY: 0,
      checkpointZ: sz,
      finished: false,
      finishTime: null,
      aiTargetX: sx,
      aiDecisionGate: -1,
      aiChosenDoor: -1,
    };
  });
}
