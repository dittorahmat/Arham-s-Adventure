import { generateHoneyHexGrid } from './gameModes';
import { generateTileGrid } from './tileFall';
import {
  AiPolicy,
  BumperDef,
  CourseLayout,
  FallingTileDef,
  LaserBarrierDef,
  PlatformDef,
  PlayableGameMode,
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

export function createCourseLayout(
  questions: QuizQuestion[],
  mode: PlayableGameMode = 'classic',
  seed = Date.now(),
): CourseLayout {
  if (mode === 'tile_fall') {
    return createTileFallCourseLayout(questions, seed);
  }
  if (mode === 'ice_slide') {
    return createIceSlideCourseLayout(questions);
  }
  if (mode === 'laser_dash') {
    return createLaserDashCourseLayout(questions);
  }
  if (mode === 'honey_drop') {
    return createHoneyDropCourseLayout(questions, seed);
  }

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
    mode: 'classic',
    platforms,
    fallingTiles: [],
    sweepers,
    lasers: [],
    bumpers,
    speedPads,
    stars,
    quizGates,
    startZ: 0,
    finishZ: -245,
    timeLimitSeconds: 180,
  };
}

function createTileFallCourseLayout(questions: QuizQuestion[], seed: number): CourseLayout {
  if (questions.length < 3) {
    throw new Error('Tile Fall layout requires at least 3 quiz questions.');
  }

  const platforms: PlatformDef[] = [
    // Start Plaza (z: +6.0 to -8.8) — racers face directly onto Tile Grid 1!
    {
      id: 'tf-start',
      x: 0,
      y: 0,
      z: -1.4,
      width: 16,
      height: 2.4,
      length: 14.8,
      kind: 'start',
      colorHex: 0x0ea5e9,
    },
    // Checkpoint Plaza 1 after Grid 1 (z: -26.8 to -40.4)
    {
      id: 'tf-plaza-1',
      x: 0,
      y: 0,
      z: -33.6,
      width: 16,
      height: 2.4,
      length: 13.6,
      kind: 'quiz_plaza',
      colorHex: 0x10b981,
    },
    // Checkpoint Plaza 2 after Grid 2 (z: -64.6 to -78.4)
    {
      id: 'tf-plaza-2',
      x: 0,
      y: 0.2,
      z: -71.5,
      width: 16,
      height: 2.4,
      length: 13.8,
      kind: 'quiz_plaza',
      colorHex: 0x10b981,
    },
    // Final Quiz & Finish Podium after Grid 3 (z: -108.4 to -142.4)
    {
      id: 'tf-finish',
      x: 0,
      y: 0.5,
      z: -125.4,
      width: 17,
      height: 2.8,
      length: 34,
      kind: 'finish',
      colorHex: 0x0ea5e9,
    },
  ];

  // 3 Floating Stumble-Style Tile Fall Grids (6 + 8 + 10 = 24 rows x 5 cols = 120 tiles)
  const grid1 = generateTileGrid({
    gridIndex: 0,
    rows: 6,
    cols: 5,
    startZ: -10.4,
    y: 0,
    seed: seed ^ 0x1a2b3c,
  });
  const grid2 = generateTileGrid({
    gridIndex: 1,
    rows: 8,
    cols: 5,
    startZ: -42.0,
    y: 0.2,
    seed: seed ^ 0x4d5e6f,
  });
  const grid3 = generateTileGrid({
    gridIndex: 2,
    rows: 10,
    cols: 5,
    startZ: -80.0,
    y: 0.5,
    seed: seed ^ 0x7a8b9c,
  });

  const fallingTiles: FallingTileDef[] = [...grid1, ...grid2, ...grid3];

  // Place Golden Stars above safe tiles along each grid so players get rewarded for reading the path!
  const pickSafeStar = (grid: FallingTileDef[], row: number, id: string): StarPickupDef => {
    const safeInRow = grid.filter((t) => t.row === row && t.isSafe);
    const target = safeInRow[Math.floor(safeInRow.length / 2)] ?? grid[0];
    return {
      id,
      x: target.x,
      y: target.baseY + 1.15,
      z: target.z,
      collected: false,
    };
  };

  const stars: StarPickupDef[] = [
    pickSafeStar(grid1, 1, 'tf-star-1'),
    pickSafeStar(grid1, 3, 'tf-star-2'),
    pickSafeStar(grid1, 5, 'tf-star-3'),
    pickSafeStar(grid2, 1, 'tf-star-4'),
    pickSafeStar(grid2, 4, 'tf-star-5'),
    pickSafeStar(grid2, 7, 'tf-star-6'),
    pickSafeStar(grid3, 2, 'tf-star-7'),
    pickSafeStar(grid3, 5, 'tf-star-8'),
    pickSafeStar(grid3, 8, 'tf-star-9'),
    { id: 'tf-star-10', x: 0, y: 1.75, z: -125.5, collected: false },
  ];

  const speedPads: SpeedPadDef[] = [
    { id: 'tf-pad-1', x: 0, y: 0.5, z: -112.5, width: 4.2, length: 4.5 },
    { id: 'tf-pad-2', x: 0, y: 0.5, z: -126.0, width: 4.8, length: 4.8 },
  ];

  const quizGates: QuizGateDef[] = [
    { ...createQuizGate(0, -34.0, 0, questions[0]), promptStartZ: -16 },
    { ...createQuizGate(1, -72.0, 0.2, questions[1]), promptStartZ: -52 },
    { ...createQuizGate(2, -119.5, 0.5, questions[2]), promptStartZ: -96 },
  ];

  return {
    mode: 'tile_fall',
    platforms,
    fallingTiles,
    sweepers: [],
    lasers: [],
    bumpers: [],
    speedPads,
    stars,
    quizGates,
    startZ: 0,
    finishZ: -132,
    timeLimitSeconds: 150,
  };
}

/**
 * Seluncur Es (Icy Heights / Super Slide):
 * Low-friction crystalline ice runways, boost slides, frosted snow bumpers,
 * sliding ice bridges, and 4 SD Quiz Gates where early drift aiming shines!
 */
function createIceSlideCourseLayout(questions: QuizQuestion[]): CourseLayout {
  if (questions.length < 4) {
    throw new Error('Ice Slide layout requires at least 4 quiz questions.');
  }

  const platforms: PlatformDef[] = [
    // Frosted Start Plaza -> First Slippery Drift Runway (z: +6 to -48)
    {
      id: 'ice-start',
      x: 0,
      y: 0,
      z: -21,
      width: 16.5,
      height: 2.4,
      length: 54,
      kind: 'start',
      surface: 'ice',
      colorHex: 0x38bdf8,
    },
    // Long Super-Slide Ice Track with Snow Bumpers (z: -50 to -102)
    {
      id: 'ice-slide-1',
      x: 0,
      y: -0.25,
      z: -76,
      width: 15.8,
      height: 2.4,
      length: 52,
      kind: 'track',
      surface: 'ice',
      colorHex: 0x0ea5e9,
    },
    // Sliding Glacial Ice Bridges over Chasm
    {
      id: 'ice-bridge-1',
      x: -2.4,
      y: -0.2,
      z: -109.5,
      width: 7.8,
      height: 1.2,
      length: 11,
      kind: 'ruler_bridge',
      surface: 'ice',
      colorHex: 0x7dd3fc,
      moveAxis: 'x',
      moveAmp: 3.4,
      moveSpeed: 1.3,
      movePhase: 0.2,
    },
    {
      id: 'ice-bridge-2',
      x: 2.4,
      y: -0.1,
      z: -122.5,
      width: 7.8,
      height: 1.2,
      length: 11,
      kind: 'ruler_bridge',
      surface: 'ice',
      colorHex: 0x7dd3fc,
      moveAxis: 'x',
      moveAmp: 3.4,
      moveSpeed: 1.4,
      movePhase: Math.PI + 0.2,
    },
    // Frosted Quiz Plaza 3 -> Glacier Slalom Track (z: -130 to -186)
    {
      id: 'ice-slalom-2',
      x: 0,
      y: 0,
      z: -158,
      width: 16,
      height: 2.4,
      length: 56,
      kind: 'track',
      surface: 'ice',
      colorHex: 0x0284c7,
    },
    // Final Ice Sprint + Finish Podium (z: -188 to -234)
    {
      id: 'ice-finish',
      x: 0,
      y: 0.2,
      z: -211,
      width: 17,
      height: 2.8,
      length: 46,
      kind: 'finish',
      surface: 'ice',
      colorHex: 0x38bdf8,
    },
  ];

  const bumpers: BumperDef[] = [
    { id: 'ice-bump-1', x: -3.8, y: 0, z: -17, radius: 1.3, colorHex: 0x67e8f9 },
    { id: 'ice-bump-2', x: 3.8, y: 0, z: -17, radius: 1.3, colorHex: 0x67e8f9 },
    { id: 'ice-bump-3', x: 0, y: 0, z: -26, radius: 1.35, colorHex: 0x38bdf8, moveAmp: 4.0, moveSpeed: 1.45, movePhase: 0 },
    { id: 'ice-bump-4', x: -4.2, y: -0.25, z: -61, radius: 1.35, colorHex: 0xa5f3fc },
    { id: 'ice-bump-5', x: 0, y: -0.25, z: -69, radius: 1.4, colorHex: 0x22d3ee, moveAmp: 4.2, moveSpeed: 1.75, movePhase: 1.2 },
    { id: 'ice-bump-6', x: 4.2, y: -0.25, z: -78, radius: 1.35, colorHex: 0xa5f3fc },
    { id: 'ice-bump-7', x: -3.2, y: 0, z: -154, radius: 1.35, colorHex: 0x67e8f9, moveAmp: 2.4, moveSpeed: 1.85, movePhase: 0.4 },
    { id: 'ice-bump-8', x: 3.2, y: 0, z: -162, radius: 1.35, colorHex: 0x22d3ee, moveAmp: 2.4, moveSpeed: 1.85, movePhase: 3.5 },
  ];

  const sweepers: SweeperDef[] = [
    {
      id: 'ice-sweeper-1',
      x: 0,
      y: 0,
      z: -168,
      armLength: 6.4,
      barHeight: 0.72,
      speed: 1.5,
      phase: 0.4,
    },
  ];

  const speedPads: SpeedPadDef[] = [
    { id: 'ice-pad-1', x: 0, y: 0, z: -9, width: 4.4, length: 5.0 },
    { id: 'ice-pad-2', x: 0, y: -0.25, z: -55, width: 4.6, length: 5.2 },
    { id: 'ice-pad-3', x: 0, y: -0.25, z: -83, width: 4.4, length: 5.0 },
    { id: 'ice-pad-4', x: 0, y: 0, z: -146, width: 4.6, length: 5.2 },
    { id: 'ice-pad-5', x: 0, y: 0.2, z: -210, width: 5.0, length: 5.4 },
  ];

  const stars: StarPickupDef[] = [
    { id: 'ice-star-1', x: 0, y: 1.1, z: -17, collected: false },
    { id: 'ice-star-2', x: -4.2, y: 1.1, z: -29, collected: false },
    { id: 'ice-star-3', x: 4.2, y: 1.1, z: -29, collected: false },
    { id: 'ice-star-4', x: 0, y: 0.9, z: -61, collected: false },
    { id: 'ice-star-5', x: -3.8, y: 0.9, z: -78, collected: false },
    { id: 'ice-star-6', x: 0, y: 1.1, z: -109.5, collected: false },
    { id: 'ice-star-7', x: 0, y: 1.2, z: -122.5, collected: false },
    { id: 'ice-star-8', x: 0, y: 1.1, z: -158, collected: false },
    { id: 'ice-star-9', x: 0, y: 2.0, z: -168, collected: false },
    { id: 'ice-star-10', x: 0, y: 1.4, z: -212, collected: false },
  ];

  const quizGates: QuizGateDef[] = [
    createQuizGate(0, -40, 0, questions[0]),
    createQuizGate(1, -93, -0.25, questions[1]),
    createQuizGate(2, -138, 0, questions[2]),
    createQuizGate(3, -198, 0.2, questions[3]),
  ];

  return {
    mode: 'ice_slide',
    platforms,
    fallingTiles: [],
    sweepers,
    lasers: [],
    bumpers,
    speedPads,
    stars,
    quizGates,
    startZ: 0,
    finishZ: -222,
    timeLimitSeconds: 165,
  };
}

/**
 * Lari Laser (Laser Dash / Block Dash):
 * Cyber-neon sprint deck featuring rhythmic sweeping horizontal Laser Beams
 * that players and AI must leap cleanly over, paired with 4 SD Quiz Gates!
 */
function createLaserDashCourseLayout(questions: QuizQuestion[]): CourseLayout {
  if (questions.length < 4) {
    throw new Error('Laser Dash layout requires at least 4 quiz questions.');
  }

  const platforms: PlatformDef[] = [
    // Corridor 1: Start Plaza -> First Laser Beams -> Quiz Gate 1 (z: +6 to -48)
    {
      id: 'ld-deck-1',
      x: 0,
      y: 0,
      z: -21,
      width: 16,
      height: 2.4,
      length: 54,
      kind: 'start',
      surface: 'neon',
      colorHex: 0x0f172a,
    },
    // Corridor 2: Twin Counter-Sweeping Laser Gauntlet -> Quiz Gate 2 (z: -50 to -104)
    {
      id: 'ld-deck-2',
      x: 0,
      y: 0,
      z: -77,
      width: 16,
      height: 2.4,
      length: 54,
      kind: 'track',
      surface: 'neon',
      colorHex: 0x1e1b4b,
    },
    // Corridor 3: High-Tempo Triple Laser Zone -> Quiz Gate 3 (z: -106 to -160)
    {
      id: 'ld-deck-3',
      x: 0,
      y: 0.2,
      z: -133,
      width: 16,
      height: 2.4,
      length: 54,
      kind: 'track',
      surface: 'neon',
      colorHex: 0x0f172a,
    },
    // Final Neon Dash + Quiz Gate 4 + Finish Podium (z: -162 to -212)
    {
      id: 'ld-finish',
      x: 0,
      y: 0.4,
      z: -187,
      width: 17,
      height: 2.8,
      length: 50,
      kind: 'finish',
      surface: 'neon',
      colorHex: 0x1e1b4b,
    },
  ];

  const lasers: LaserBarrierDef[] = [
    // Corridor 1: Welcoming rhythm lasers
    { id: 'laser-1', zMin: -28, zMax: -11, y: 0, barHeight: 0.68, width: 15.2, speed: 1.25, phase: 0.2, colorHex: 0xf43f5e },
    { id: 'laser-2', zMin: -33, zMax: -16, y: 0, barHeight: 0.68, width: 15.2, speed: 1.25, phase: Math.PI + 0.2, colorHex: 0x22d3ee },
    // Corridor 2: Dual staggered sweepers
    { id: 'laser-3', zMin: -72, zMax: -54, y: 0, barHeight: 0.68, width: 15.2, speed: 1.55, phase: 0.5, colorHex: 0xe879f9 },
    { id: 'laser-4', zMin: -86, zMax: -66, y: 0, barHeight: 0.68, width: 15.2, speed: 1.7, phase: 2.1, colorHex: 0xf43f5e },
    { id: 'laser-5', zMin: -89, zMax: -70, y: 0, barHeight: 0.68, width: 15.2, speed: 1.4, phase: 4.3, colorHex: 0x22d3ee },
    // Corridor 3: High-tempo triple neon wave
    { id: 'laser-6', zMin: -125, zMax: -110, y: 0.2, barHeight: 0.68, width: 15.2, speed: 1.85, phase: 0, colorHex: 0xf43f5e },
    { id: 'laser-7', zMin: -138, zMax: -121, y: 0.2, barHeight: 0.68, width: 15.2, speed: 1.95, phase: 1.9, colorHex: 0x22d3ee },
    { id: 'laser-8', zMin: -146, zMax: -131, y: 0.2, barHeight: 0.68, width: 15.2, speed: 1.8, phase: 3.9, colorHex: 0xe879f9 },
    // Final sprint laser before last quiz gate
    { id: 'laser-9', zMin: -178, zMax: -165, y: 0.4, barHeight: 0.68, width: 15.8, speed: 2.0, phase: 0.8, colorHex: 0xf43f5e },
  ];

  const speedPads: SpeedPadDef[] = [
    { id: 'ld-pad-1', x: 0, y: 0, z: -8, width: 3.8, length: 4.5 },
    { id: 'ld-pad-2', x: 0, y: 0, z: -53, width: 3.8, length: 4.5 },
    { id: 'ld-pad-3', x: 0, y: 0.2, z: -109, width: 3.8, length: 4.5 },
    { id: 'ld-pad-4', x: 0, y: 0.4, z: -195, width: 4.8, length: 5.0 },
  ];

  const stars: StarPickupDef[] = [
    { id: 'ld-star-1', x: -3.2, y: 1.85, z: -19, collected: false },
    { id: 'ld-star-2', x: 3.2, y: 1.85, z: -26, collected: false },
    { id: 'ld-star-3', x: 0, y: 1.95, z: -63, collected: false },
    { id: 'ld-star-4', x: -3.8, y: 1.95, z: -76, collected: false },
    { id: 'ld-star-5', x: 3.8, y: 1.95, z: -83, collected: false },
    { id: 'ld-star-6', x: 0, y: 2.1, z: -118, collected: false },
    { id: 'ld-star-7', x: -3.5, y: 2.1, z: -130, collected: false },
    { id: 'ld-star-8', x: 3.5, y: 2.1, z: -140, collected: false },
    { id: 'ld-star-9', x: 0, y: 2.2, z: -171, collected: false },
    { id: 'ld-star-10', x: 0, y: 1.6, z: -195, collected: false },
  ];

  const quizGates: QuizGateDef[] = [
    createQuizGate(0, -40, 0, questions[0]),
    createQuizGate(1, -96, 0, questions[1]),
    createQuizGate(2, -153, 0.2, questions[2]),
    createQuizGate(3, -186, 0.4, questions[3]),
  ];

  return {
    mode: 'laser_dash',
    platforms,
    fallingTiles: [],
    sweepers: [],
    lasers,
    bumpers: [],
    speedPads,
    stars,
    quizGates,
    startZ: 0,
    finishZ: -203,
    timeLimitSeconds: 165,
  };
}

/**
 * Jatuh Madu (Honey Drop / Hex-A-Gone Race):
 * Every golden hexagonal honeycomb tile starts solid and crumbles 0.48s after ANY racer touches it!
 * Keep hopping across 3 golden Hex Honeycomb Arenas separated by 3 Quiz Checkpoint Plazas.
 */
function createHoneyDropCourseLayout(questions: QuizQuestion[], seed: number): CourseLayout {
  if (questions.length < 3) {
    throw new Error('Honey Drop layout requires at least 3 quiz questions.');
  }

  const platforms: PlatformDef[] = [
    // Start Plaza (z: +6.0 to -8.6)
    {
      id: 'hd-start',
      x: 0,
      y: 0,
      z: -1.3,
      width: 16,
      height: 2.4,
      length: 14.6,
      kind: 'start',
      colorHex: 0xf59e0b,
    },
    // Checkpoint Plaza 1 after Hex Arena 1 (z: -24.5 to -38.1)
    {
      id: 'hd-plaza-1',
      x: 0,
      y: 0,
      z: -31.3,
      width: 16,
      height: 2.4,
      length: 13.6,
      kind: 'quiz_plaza',
      colorHex: 0x10b981,
    },
    // Checkpoint Plaza 2 after Hex Arena 2 (z: -56.4 to -70.0)
    {
      id: 'hd-plaza-2',
      x: 0,
      y: 0.2,
      z: -63.2,
      width: 16,
      height: 2.4,
      length: 13.6,
      kind: 'quiz_plaza',
      colorHex: 0x10b981,
    },
    // Final Quiz & Finish Podium after Hex Arena 3 (z: -91.0 to -125.0)
    {
      id: 'hd-finish',
      x: 0,
      y: 0.5,
      z: -108.0,
      width: 17,
      height: 2.8,
      length: 34,
      kind: 'finish',
      colorHex: 0xf59e0b,
    },
  ];

  // 3 Golden Hexagonal Honeycomb Arenas (5 + 6 + 7 rows)
  const hex1 = generateHoneyHexGrid({
    gridIndex: 0,
    rows: 5,
    cols: 6,
    startZ: -10.6,
    y: 0,
    seed: seed ^ 0x2b4d6f,
  });
  const hex2 = generateHoneyHexGrid({
    gridIndex: 1,
    rows: 6,
    cols: 6,
    startZ: -40.2,
    y: 0.2,
    seed: seed ^ 0x5c7e9a,
  });
  const hex3 = generateHoneyHexGrid({
    gridIndex: 2,
    rows: 7,
    cols: 6,
    startZ: -72.2,
    y: 0.5,
    seed: seed ^ 0x8d1f3b,
  });

  const fallingTiles: FallingTileDef[] = [...hex1, ...hex2, ...hex3];

  const pickHexStar = (grid: FallingTileDef[], row: number, colOffset: number, id: string): StarPickupDef => {
    const inRow = grid.filter((t) => t.row === row);
    const idx = Math.max(0, Math.min(inRow.length - 1, Math.floor(inRow.length / 2) + colOffset));
    const target = inRow[idx] ?? grid[0];
    return {
      id,
      x: target.x,
      y: target.baseY + 1.2,
      z: target.z,
      collected: false,
    };
  };

  const stars: StarPickupDef[] = [
    pickHexStar(hex1, 1, -1, 'hd-star-1'),
    pickHexStar(hex1, 3, 1, 'hd-star-2'),
    pickHexStar(hex2, 1, 1, 'hd-star-3'),
    pickHexStar(hex2, 3, 0, 'hd-star-4'),
    pickHexStar(hex2, 5, -1, 'hd-star-5'),
    pickHexStar(hex3, 1, -1, 'hd-star-6'),
    pickHexStar(hex3, 3, 1, 'hd-star-7'),
    pickHexStar(hex3, 5, 0, 'hd-star-8'),
    { id: 'hd-star-9', x: 0, y: 1.75, z: -109.0, collected: false },
  ];

  const speedPads: SpeedPadDef[] = [
    { id: 'hd-pad-1', x: 0, y: 0.5, z: -95.0, width: 4.2, length: 4.5 },
    { id: 'hd-pad-2', x: 0, y: 0.5, z: -109.0, width: 4.8, length: 4.8 },
  ];

  const quizGates: QuizGateDef[] = [
    { ...createQuizGate(0, -31.8, 0, questions[0]), promptStartZ: -14 },
    { ...createQuizGate(1, -63.8, 0.2, questions[1]), promptStartZ: -46 },
    { ...createQuizGate(2, -102.0, 0.5, questions[2]), promptStartZ: -80 },
  ];

  return {
    mode: 'honey_drop',
    platforms,
    fallingTiles,
    sweepers: [],
    lasers: [],
    bumpers: [],
    speedPads,
    stars,
    quizGates,
    startZ: 0,
    finishZ: -115,
    timeLimitSeconds: 150,
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
