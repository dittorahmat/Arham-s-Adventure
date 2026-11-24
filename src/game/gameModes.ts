import {
  FallingTileDef,
  GameModeSelection,
  LaserBarrierDef,
  PlayableGameMode,
} from './types';

export interface GameModeCatalogEntry {
  id: GameModeSelection;
  label: string;
  shortTag: string;
  subtitle: string;
  accentHex: string;
  iconBgHex: string;
  gateSummary: string;
  introHeadline: string;
  introDetail: string;
}

export const PLAYABLE_GAME_MODES: readonly PlayableGameMode[] = [
  'classic',
  'tile_fall',
  'ice_slide',
  'laser_dash',
  'honey_drop',
] as const;

export const GAME_MODE_SELECTIONS: readonly GameModeSelection[] = [
  'random',
  ...PLAYABLE_GAME_MODES,
] as const;

export const GAME_MODE_CATALOG: Record<GameModeSelection, GameModeCatalogEntry> = {
  random: {
    id: 'random',
    label: 'Mode Acak',
    shortTag: 'Acak',
    subtitle: 'Arena dipilih otomatis!',
    accentHex: '#db2777',
    iconBgHex: '#fbcfe8',
    gateSummary: 'Arena acak · 3–5 Kuis',
    introHeadline: 'Mode Acak Terpilih!',
    introDetail: 'Siap-siap hadapi arena kejutan Kelas 5 SD!',
  },
  classic: {
    id: 'classic',
    label: 'Balap Klasik',
    shortTag: 'Klasik',
    subtitle: 'Bumper, Pensil Putar & Jembatan',
    accentHex: '#2563eb',
    iconBgHex: '#bae6fd',
    gateSummary: '5 Gerbang Kuis · Balap Klasik',
    introHeadline: 'Mode Balap Klasik!',
    introDetail: 'Hindari bumper & pensil putar menuju Garis Finis!',
  },
  tile_fall: {
    id: 'tile_fall',
    label: 'Lantai Jebakan',
    shortTag: 'Tile Fall',
    subtitle: 'Cari ubin hijau, hindari jebakan!',
    accentHex: '#7c3aed',
    iconBgHex: '#fde047',
    gateSummary: '3 Cekpoin Kuis · 120 Ubin',
    introHeadline: 'Mode Lantai Jebakan (Tile Fall)!',
    introDetail: 'Cari ubin hijau yang aman — hati-hati ubin palsu jatuh!',
  },
  ice_slide: {
    id: 'ice_slide',
    label: 'Seluncur Es',
    shortTag: 'Seluncur Es',
    subtitle: 'Trek es licin & drift ngebut!',
    accentHex: '#0284c7',
    iconBgHex: '#cffafe',
    gateSummary: '4 Gerbang Kuis · Trek Es Licin',
    introHeadline: 'Mode Seluncur Es (Icy Heights)!',
    introDetail: 'Lantai es super licin! Arahkan luncuranmu sejak jauh!',
  },
  laser_dash: {
    id: 'laser_dash',
    label: 'Lari Laser',
    shortTag: 'Lari Laser',
    subtitle: 'Lompati sinar laser neon!',
    accentHex: '#e11d48',
    iconBgHex: '#fecdd3',
    gateSummary: '4 Gerbang Kuis · Sinar Laser',
    introHeadline: 'Mode Lari Laser (Laser Dash)!',
    introDetail: 'Lompati sinar laser yang menyapu lintasan neon!',
  },
  honey_drop: {
    id: 'honey_drop',
    label: 'Jatuh Madu',
    shortTag: 'Jatuh Madu',
    subtitle: 'Heksagon madu runtuh usai diinjak!',
    accentHex: '#d97706',
    iconBgHex: '#fef08a',
    gateSummary: '3 Cekpoin Kuis · Heksagon Madu',
    introHeadline: 'Mode Jatuh Madu (Honey Drop)!',
    introDetail: 'Terus berlari! Setiap ubin madu runtuh setelah diinjak!',
  },
};

export function isPlayableGameMode(value: string): value is PlayableGameMode {
  return (PLAYABLE_GAME_MODES as readonly string[]).includes(value);
}

/**
 * Parses a URL `?mode=` query parameter into a valid GameModeSelection.
 * Defaults to `'random'` when absent or unrecognized.
 */
export function parseGameModeParam(param: string | null | undefined): GameModeSelection {
  if (!param) return 'random';
  const normalized = param.trim().toLowerCase();
  if (normalized === 'random') return 'random';
  if (isPlayableGameMode(normalized)) return normalized;
  return 'random';
}

/**
 * Resolves a GameModeSelection into a concrete PlayableGameMode.
 * When `selection === 'random'`, picks uniformly across all playable modes,
 * avoiding immediate repetition of `lastPlayed` whenever possible.
 */
export function resolveGameMode(
  selection: GameModeSelection,
  lastPlayed?: PlayableGameMode | null,
  rng: () => number = Math.random,
): PlayableGameMode {
  if (selection !== 'random') {
    return selection;
  }

  const candidates =
    lastPlayed && PLAYABLE_GAME_MODES.length > 1
      ? PLAYABLE_GAME_MODES.filter((m) => m !== lastPlayed)
      : PLAYABLE_GAME_MODES;

  const raw = rng();
  const clamped = Number.isFinite(raw) ? Math.min(0.9999999, Math.max(0, raw)) : 0;
  const idx = Math.floor(clamped * candidates.length);
  return candidates[idx] ?? PLAYABLE_GAME_MODES[0];
}

/**
 * Computes the sweeping Z position of a Laser Dash energy barrier at `time`.
 * Oscillates smoothly between `laser.zMin` and `laser.zMax`.
 */
export function getLaserBarrierZ(laser: LaserBarrierDef, time: number): number {
  const mid = (laser.zMin + laser.zMax) * 0.5;
  const halfSpan = Math.abs(laser.zMax - laser.zMin) * 0.5;
  return mid + Math.sin(time * laser.speed + laser.phase) * halfSpan;
}

/**
 * Returns true if a racer's bounding volume collides with a sweeping laser beam.
 * Jumping cleanly over a low laser clears the beam safely.
 */
export function isRacerHitByLaser(
  racerX: number,
  racerY: number,
  racerZ: number,
  laser: LaserBarrierDef,
  time: number,
): boolean {
  if (Math.abs(racerX) > laser.width * 0.5 + 0.35) return false;
  const laserZ = getLaserBarrierZ(laser, time);
  if (Math.abs(racerZ - laserZ) > 0.52) return false;

  const beamCenterY = laser.y + laser.barHeight;
  const beamHalfThickness = 0.28;
  const racerBottom = racerY;
  const racerTop = racerY + 1.35;

  return racerBottom <= beamCenterY + beamHalfThickness && racerTop >= beamCenterY - beamHalfThickness;
}

export const HONEY_DROP_CONSTANTS = {
  hexRadius: 1.58,
  tileSize: 2.74,
  colSpacing: 2.92,
  rowSpacing: 2.62,
  crumbleDuration: 0.48,
} as const;

export interface HoneyGridConfig {
  gridIndex: number;
  rows: number;
  cols: number;
  startZ: number;
  y: number;
  seed: number;
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
 * Generates a staggered golden Honeycomb Hex Arena for Honey Drop mode.
 * Every hexagonal tile starts solid and crumbles 0.48s after ANY racer touches it!
 */
export function generateHoneyHexGrid(config: HoneyGridConfig): FallingTileDef[] {
  const { gridIndex, rows, cols, startZ, y, seed } = config;
  const rng = createSeededRng(seed);
  const tiles: FallingTileDef[] = [];

  for (let row = 0; row < rows; row++) {
    const isOddRow = row % 2 === 1;
    const rowCols = isOddRow ? cols - 1 : cols;
    const halfWidthOffset = ((rowCols - 1) * HONEY_DROP_CONSTANTS.colSpacing) * 0.5;
    const z = startZ - row * HONEY_DROP_CONSTANTS.rowSpacing;

    for (let col = 0; col < rowCols; col++) {
      const x = col * HONEY_DROP_CONSTANTS.colSpacing - halfWidthOffset;
      tiles.push({
        id: `honey-${gridIndex}-${row}-${col}`,
        gridIndex,
        row,
        col,
        x,
        baseY: y,
        y,
        z,
        size: HONEY_DROP_CONSTANTS.tileSize,
        shape: 'hex',
        crumbleDuration: HONEY_DROP_CONSTANTS.crumbleDuration,
        isSafe: false,
        state: 'hidden',
        shakeTimer: 0,
        fallVy: 0,
        rotX: 0,
        rotZ: 0,
        spinX: ((rng() - 0.5) * 5.8) || 2.0,
        spinZ: ((rng() - 0.5) * 5.8) || -1.8,
        revealPop: 0,
        hintPhase: rng() * Math.PI * 2,
      });
    }
  }

  return tiles;
}
