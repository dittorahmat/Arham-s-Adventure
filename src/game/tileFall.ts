import { FallingTileDef, GameMode, RacerState } from './types';

export interface GameModeMeta {
  id: GameMode;
  label: string;
  shortTag: string;
  subtitle: string;
}

export const GAME_MODE_LIST: readonly GameMode[] = ['classic', 'tile_fall'];

export const GAME_MODE_META: Record<GameMode, GameModeMeta> = {
  classic: {
    id: 'classic',
    label: 'Balap Klasik',
    shortTag: 'Klasik',
    subtitle: 'Bumper, Pensil Putar & 5 Kuis',
  },
  tile_fall: {
    id: 'tile_fall',
    label: 'Lantai Jebakan',
    shortTag: 'Tile Fall',
    subtitle: 'Ubin Palsu Jatuh ala Stumble!',
  },
};

export const TILE_FALL_CONSTANTS = {
  tileSize: 2.72,
  tileSpacing: 3.0,
  shakeDuration: 0.14,
  fallGravity: 34,
  goneDropDistance: 22,
} as const;

export interface TileGridConfig {
  gridIndex: number;
  rows: number;
  cols: number;
  startZ: number;
  y: number;
  seed: number;
  tileSize?: number;
  tileSpacing?: number;
}

function createSeededRng(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates a Stumble Guys-style Tile Fall / Tip Toe floating tile grid with a
 * mathematically guaranteed 4-connected safe path from row 0 to row (rows - 1).
 */
export function generateTileGrid(config: TileGridConfig): FallingTileDef[] {
  const {
    gridIndex,
    rows,
    cols,
    startZ,
    y,
    seed,
    tileSize = TILE_FALL_CONSTANTS.tileSize,
    tileSpacing = TILE_FALL_CONSTANTS.tileSpacing,
  } = config;

  const rng = createSeededRng(seed);
  const safeMatrix: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => false),
  );

  // Start near center columns on row 0 so the entry feels welcoming
  const minStartCol = cols >= 3 ? 1 : 0;
  const maxStartCol = cols >= 3 ? cols - 2 : cols - 1;
  let col = minStartCol + Math.floor(rng() * (maxStartCol - minStartCol + 1));
  safeMatrix[0][col] = true;

  for (let row = 0; row < rows; row++) {
    safeMatrix[row][col] = true;

    // Occasionally zig-zag horizontally 1..2 steps on this row before advancing
    if (row < rows - 1 && cols > 1) {
      const roll = rng();
      const lateralSteps = roll < 0.34 ? 0 : roll < 0.78 ? 1 : 2;
      if (lateralSteps > 0) {
        const canLeft = col > 0;
        const canRight = col < cols - 1;
        let dir = 0;
        if (canLeft && canRight) {
          dir = rng() < 0.5 ? -1 : 1;
        } else if (canLeft) {
          dir = -1;
        } else if (canRight) {
          dir = 1;
        }

        for (let s = 0; s < lateralSteps && dir !== 0; s++) {
          const nextCol = col + dir;
          if (nextCol < 0 || nextCol >= cols) break;
          col = nextCol;
          safeMatrix[row][col] = true;
        }
      }
      // Step directly forward into next row to guarantee 4-connectivity
      safeMatrix[row + 1][col] = true;
    }
  }

  // Ensure row 0 has 1 helpful second safe entry tile beside the main entry so the crowd spreads cleanly
  if (cols >= 3) {
    const entryCols = safeMatrix[0]
      .map((isSafe, idx) => (isSafe ? idx : -1))
      .filter((idx) => idx >= 0);
    const anchor = entryCols[0] ?? 1;
    const neighbor = anchor + 1 < cols ? anchor + 1 : anchor - 1;
    if (neighbor >= 0 && neighbor < cols) {
      safeMatrix[0][neighbor] = true;
    }
  }

  const tiles: FallingTileDef[] = [];
  const halfWidthOffset = ((cols - 1) * tileSpacing) * 0.5;

  for (let row = 0; row < rows; row++) {
    const z = startZ - row * tileSpacing;
    for (let c = 0; c < cols; c++) {
      const x = c * tileSpacing - halfWidthOffset;
      const isSafe = safeMatrix[row][c];
      tiles.push({
        id: `tile-${gridIndex}-${row}-${c}`,
        gridIndex,
        row,
        col: c,
        x,
        baseY: y,
        y,
        z,
        size: tileSize,
        isSafe,
        state: 'hidden',
        shakeTimer: 0,
        fallVy: 0,
        rotX: 0,
        rotZ: 0,
        spinX: ((rng() - 0.5) * 6.5) || 2.1,
        spinZ: ((rng() - 0.5) * 6.5) || -1.9,
        revealPop: 0,
        hintPhase: rng() * Math.PI * 2,
      });
    }
  }

  return tiles;
}

/**
 * Pure BFS solvability check: verifies a 4-connected path of safe tiles exists
 * from row 0 to row (rows - 1).
 */
export function isTileGridSolvable(
  tiles: readonly FallingTileDef[],
  rows: number,
  cols: number,
): boolean {
  const safeMap = new Map<string, boolean>();
  for (const t of tiles) {
    safeMap.set(`${t.row}:${t.col}`, t.isSafe);
  }

  const visited = new Set<string>();
  const queue: Array<[number, number]> = [];

  for (let c = 0; c < cols; c++) {
    const key = `0:${c}`;
    if (safeMap.get(key)) {
      visited.add(key);
      queue.push([0, c]);
    }
  }

  const dirs: ReadonlyArray<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === rows - 1) return true;
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      const key = `${nr}:${nc}`;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key) && safeMap.get(key)) {
        visited.add(key);
        queue.push([nr, nc]);
      }
    }
  }

  return false;
}

export function findSupportingTile(
  x: number,
  y: number,
  prevY: number,
  z: number,
  tiles: readonly FallingTileDef[],
  racerMargin: number,
): FallingTileDef | null {
  let best: FallingTileDef | null = null;
  for (const tile of tiles) {
    if (tile.state === 'falling' || tile.state === 'gone') continue;
    const half = tile.size * 0.5 + racerMargin;
    if (Math.abs(x - tile.x) <= half && Math.abs(z - tile.z) <= half) {
      const topY = tile.baseY;
      if (prevY >= topY - 0.48 && y <= topY + 0.16) {
        if (!best || topY > best.baseY) {
          best = tile;
        }
      }
    }
  }
  return best;
}

export type TileStepOutcome = 'none' | 'safe_revealed' | 'fake_triggered';

export function triggerTileStep(tile: FallingTileDef): TileStepOutcome {
  if (tile.state !== 'hidden') return 'none';
  if (tile.isSafe) {
    tile.state = 'safe_revealed';
    tile.revealPop = 1;
    return 'safe_revealed';
  }
  tile.state = 'shaking';
  tile.shakeTimer = TILE_FALL_CONSTANTS.shakeDuration;
  return 'fake_triggered';
}

export interface TileFallStepResult {
  newlyFallenTiles: FallingTileDef[];
}

export function stepFallingTiles(tiles: FallingTileDef[], dt: number): TileFallStepResult {
  const clampedDt = Math.min(dt, 0.05);
  const newlyFallenTiles: FallingTileDef[] = [];

  for (const tile of tiles) {
    if (tile.revealPop > 0) {
      tile.revealPop = Math.max(0, tile.revealPop - clampedDt * 4.2);
    }

    if (tile.state === 'shaking') {
      tile.shakeTimer -= clampedDt;
      if (tile.shakeTimer <= 0) {
        tile.state = 'falling';
        tile.fallVy = -2.4;
        newlyFallenTiles.push(tile);
      }
    } else if (tile.state === 'falling') {
      tile.fallVy -= TILE_FALL_CONSTANTS.fallGravity * clampedDt;
      tile.y += tile.fallVy * clampedDt;
      tile.rotX += tile.spinX * clampedDt;
      tile.rotZ += tile.spinZ * clampedDt;
      if (tile.y < tile.baseY - TILE_FALL_CONSTANTS.goneDropDistance) {
        tile.state = 'gone';
      }
    }
  }

  return { newlyFallenTiles };
}

/**
 * Computes steering target X and speed factor for AI classmates crossing a Tile Fall grid.
 * - Speedsters boldly scout unrevealed tiles (sometimes triggering fake tiles for comedy!).
 * - Cautious & QuizWhiz racers prioritize revealed emerald safe tiles and dodge fallen gaps.
 */
export function computeTileFallAiGuidance(
  racer: RacerState,
  tiles: readonly FallingTileDef[],
): { targetX: number; speedFactor: number; wantJump: boolean } | null {
  if (tiles.length === 0) return null;

  // Find tiles slightly ahead of racer (within 4.8m in -Z)
  let closestRowZ = -Infinity;
  const aheadTiles: FallingTileDef[] = [];

  for (const tile of tiles) {
    const dz = racer.z - tile.z;
    if (dz >= 0.4 && dz <= 4.8) {
      aheadTiles.push(tile);
      if (tile.z > closestRowZ) {
        closestRowZ = tile.z;
      }
    }
  }

  if (aheadTiles.length === 0) return null;

  // Filter to the immediate next row ahead
  const nextRowTiles = aheadTiles.filter((t) => Math.abs(t.z - closestRowZ) <= 1.2);
  const intact = nextRowTiles.filter((t) => t.state === 'hidden' || t.state === 'safe_revealed');
  if (intact.length === 0) {
    // Entire row ahead is gone — jump over the gap!
    return { targetX: racer.x, speedFactor: 0.9, wantJump: true };
  }

  const revealed = intact.filter((t) => t.state === 'safe_revealed');
  const pool =
    revealed.length > 0 && (racer.policy !== 'speedster' || Math.abs(revealed[0].x - racer.x) < 4.5)
      ? revealed
      : intact;

  // Pick tile closest to current X (with deterministic personality offset so bots fan out)
  const nameBias = ((racer.name.charCodeAt(0) % 3) - 1) * 0.9;
  let best = pool[0];
  let bestScore = Infinity;
  for (const candidate of pool) {
    let score = Math.abs(candidate.x - (racer.x + nameBias));
    // QuizWhiz reads subtle tells slightly better (slight preference for truly safe tiles)
    if (racer.policy === 'quizwhiz' && candidate.isSafe) {
      score -= 1.6;
    }
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  const baseSpeed =
    racer.policy === 'speedster' ? 0.86 : racer.policy === 'quizwhiz' ? 0.78 : 0.72;
  // Slow slightly when stepping onto an unrevealed tile like cautious Tip Toe players
  const speedFactor = best.state === 'safe_revealed' ? baseSpeed : baseSpeed * 0.86;
  const needLateralLeap = Math.abs(best.x - racer.x) > 2.4;

  return {
    targetX: best.x,
    speedFactor,
    wantJump: needLateralLeap,
  };
}
