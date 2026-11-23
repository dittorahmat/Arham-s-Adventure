import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeTileFallAiGuidance,
  findSupportingTile,
  generateTileGrid,
  isTileGridSolvable,
  stepFallingTiles,
  triggerTileStep,
} from './tileFall';
import { createCourseLayout, createInitialRacers } from './courseData';
import { selectRaceQuestions } from './questions';

test('generateTileGrid guarantees a 4-connected safe path across 25 seeds', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const rows = 8;
    const cols = 5;
    const tiles = generateTileGrid({
      gridIndex: 0,
      rows,
      cols,
      startZ: -12,
      y: 0,
      seed: seed * 97 + 13,
    });

    assert.equal(tiles.length, rows * cols);
    assert.equal(isTileGridSolvable(tiles, rows, cols), true, `Seed ${seed} must be solvable`);

    const safeCount = tiles.filter((t) => t.isSafe).length;
    const fakeCount = tiles.length - safeCount;
    assert.ok(safeCount >= rows, 'At least one safe tile per row');
    assert.ok(fakeCount >= rows, 'Must include meaningful fake trap tiles');
  }
});

test('triggerTileStep reveals safe tiles and triggers shake -> fall -> gone on fake tiles', () => {
  const tiles = generateTileGrid({
    gridIndex: 0,
    rows: 5,
    cols: 5,
    startZ: -10,
    y: 0,
    seed: 42,
  });

  const safeTile = tiles.find((t) => t.isSafe)!;
  const fakeTile = tiles.find((t) => !t.isSafe)!;

  // Safe tile turns green and stays solid forever
  assert.equal(triggerTileStep(safeTile), 'safe_revealed');
  assert.equal(safeTile.state, 'safe_revealed');
  assert.equal(triggerTileStep(safeTile), 'none');
  assert.ok(findSupportingTile(safeTile.x, 0, 0.1, safeTile.z, tiles, 0.35));

  // Fake tile shakes briefly, then drops and loses support
  assert.equal(triggerTileStep(fakeTile), 'fake_triggered');
  assert.equal(fakeTile.state, 'shaking');
  assert.ok(
    findSupportingTile(fakeTile.x, 0, 0.1, fakeTile.z, tiles, 0.35),
    'Shaking tile still briefly supports during telegraph window',
  );

  // Advance realistic clamped simulation frames past shakeDuration (0.14s) -> falls!
  const fallenCollected = [];
  for (let i = 0; i < 4; i++) {
    fallenCollected.push(...stepFallingTiles(tiles, 0.05).newlyFallenTiles);
  }
  assert.equal(fallenCollected.length, 1);
  assert.equal(fallenCollected[0].id, fakeTile.id);
  assert.equal(fakeTile.state, 'falling');
  assert.equal(
    findSupportingTile(fakeTile.x, 0, 0.1, fakeTile.z, tiles, 0.35),
    null,
    'Falling tile must no longer support racers',
  );

  // Advance physics until tile reaches gone threshold
  for (let i = 0; i < 60; i++) {
    stepFallingTiles(tiles, 0.04);
  }
  assert.equal(fakeTile.state, 'gone');
  assert.ok(fakeTile.y < fakeTile.baseY - 20);
});

test('createCourseLayout supports tile_fall mode with 3 tile grids and quiz checkpoints', () => {
  const questions = selectRaceQuestions('semua', 5);
  const classic = createCourseLayout(questions, 'classic');
  const tileFall = createCourseLayout(questions, 'tile_fall');

  assert.equal(classic.mode, 'classic');
  assert.equal(classic.fallingTiles.length, 0);
  assert.equal(classic.quizGates.length, 5);

  assert.equal(tileFall.mode, 'tile_fall');
  assert.equal(tileFall.fallingTiles.length, (6 + 8 + 10) * 5);
  assert.equal(tileFall.quizGates.length, 3);
  assert.ok(tileFall.platforms.length >= 4);

  // Verify every grid in tileFall mode is independently solvable
  const gridRowCounts = [6, 8, 10];
  gridRowCounts.forEach((rows, gridIdx) => {
    const subset = tileFall.fallingTiles.filter((t) => t.gridIndex === gridIdx);
    assert.equal(subset.length, rows * 5);
    assert.equal(isTileGridSolvable(subset, rows, 5), true);
  });
});

test('computeTileFallAiGuidance guides cautious racers toward revealed safe tiles', () => {
  const tiles = generateTileGrid({
    gridIndex: 0,
    rows: 4,
    cols: 5,
    startZ: -10,
    y: 0,
    seed: 123,
  });
  // Reveal one safe tile on row 0
  const row0Safe = tiles.find((t) => t.row === 0 && t.isSafe)!;
  triggerTileStep(row0Safe);

  const racers = createInitialRacers();
  const cautiousBot = racers.find((r) => r.policy === 'cautious')!;
  cautiousBot.x = 0;
  cautiousBot.z = -7.5;

  const guidance = computeTileFallAiGuidance(cautiousBot, tiles);
  assert.ok(guidance !== null);
  assert.equal(guidance.targetX, row0Safe.x);
});
