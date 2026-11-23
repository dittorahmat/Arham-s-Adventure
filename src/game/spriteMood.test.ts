import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpriteFrameDurationMs, resolveHudSpriteMood } from './spriteMood';

test('resolveHudSpriteMood maps live quiz feedback and streak states accurately', () => {
  assert.equal(resolveHudSpriteMood({ feedback: null, streak: 0, rank: 3 }), 'run');
  assert.equal(resolveHudSpriteMood({ feedback: null, streak: 2, rank: 2 }), 'run');
  assert.equal(resolveHudSpriteMood({ feedback: null, streak: 3, rank: 1 }), 'celebrate');
  assert.equal(
    resolveHudSpriteMood({
      feedback: { kind: 'correct', headline: 'Benar!', detail: 'Ok', timer: 2 },
      streak: 1,
      rank: 2,
    }),
    'celebrate',
  );
  assert.equal(
    resolveHudSpriteMood({
      feedback: { kind: 'wrong', headline: 'Ups!', detail: 'Coba lagi', timer: 2 },
      streak: 5,
      rank: 1,
    }),
    'bonk',
  );
});

test('getSpriteFrameDurationMs returns positive durations for all moods', () => {
  for (const mood of ['idle-cheer', 'run', 'celebrate', 'bonk'] as const) {
    const ms = getSpriteFrameDurationMs(mood);
    assert.ok(ms >= 350 && ms <= 1000, `unexpected duration for ${mood}: ${ms}`);
  }
});
