import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clearLeaderboard,
  formatLapTime,
  LEADERBOARD_STORAGE_KEY,
  loadLeaderboard,
  recordFastestLap,
  saveLeaderboard,
  StorageLike,
} from './leaderboard';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

test('recordFastestLap keeps strictly the top 5 fastest lap times in ascending order', () => {
  let entries = recordFastestLap([], {
    lapTimeSeconds: 54.3,
    score: 900,
    rank: 2,
    correctCount: 4,
    totalGates: 5,
    subject: 'semua',
    achievedAt: '2026-11-22T10:00:00.000Z',
  }).entries;

  const times = [42.6, 61.1, 35.8, 49.0, 39.2];
  times.forEach((t, idx) => {
    entries = recordFastestLap(entries, {
      lapTimeSeconds: t,
      score: 1000 + idx * 50,
      rank: 1,
      correctCount: 5,
      totalGates: 5,
      subject: 'matematika',
      achievedAt: `2026-11-22T10:0${idx + 1}:00.000Z`,
    }).entries;
  });

  assert.equal(entries.length, 5);
  assert.deepEqual(
    entries.map((e) => e.lapTimeSeconds),
    [35.8, 39.2, 42.6, 49.0, 54.3],
  );

  // Slower 6th lap should not displace top 5
  const slowAttempt = recordFastestLap(entries, {
    lapTimeSeconds: 70.5,
    score: 1500,
    rank: 1,
    correctCount: 5,
    totalGates: 5,
    subject: 'ipa',
  });
  assert.equal(slowAttempt.madeLeaderboard, false);
  assert.equal(slowAttempt.insertedIndex, -1);
  assert.equal(slowAttempt.entries.length, 5);
});

test('recordFastestLap tie-breaks identical lap times by higher score', () => {
  const first = recordFastestLap([], {
    lapTimeSeconds: 41.0,
    score: 1100,
    rank: 2,
    correctCount: 4,
    totalGates: 5,
    subject: 'ips',
    achievedAt: '2026-11-22T10:00:00.000Z',
  }).entries;

  const second = recordFastestLap(first, {
    lapTimeSeconds: 41.0,
    score: 1450,
    rank: 1,
    correctCount: 5,
    totalGates: 5,
    subject: 'semua',
    achievedAt: '2026-11-22T10:05:00.000Z',
  });

  assert.equal(second.madeLeaderboard, true);
  assert.equal(second.insertedIndex, 0);
  assert.equal(second.entries[0].score, 1450);
  assert.equal(second.entries[1].score, 1100);
});

test('loadLeaderboard, saveLeaderboard, and clearLeaderboard persist cleanly and handle corrupt data', () => {
  const store = createMemoryStorage();
  assert.deepEqual(loadLeaderboard(store), []);

  // Corrupt JSON fails safely
  store.setItem(LEADERBOARD_STORAGE_KEY, '{bad-json');
  assert.deepEqual(loadLeaderboard(store), []);

  // Save valid entries and reload
  const built = recordFastestLap([], {
    lapTimeSeconds: 38.4,
    score: 1320,
    rank: 1,
    correctCount: 5,
    totalGates: 5,
    subject: 'bahasa',
    achievedAt: '2026-11-22T11:00:00.000Z',
  }).entries;
  saveLeaderboard(built, store);

  const reloaded = loadLeaderboard(store);
  assert.equal(reloaded.length, 1);
  assert.equal(reloaded[0].lapTimeSeconds, 38.4);
  assert.equal(reloaded[0].subject, 'bahasa');

  clearLeaderboard(store);
  assert.deepEqual(loadLeaderboard(store), []);
});

test('formatLapTime formats seconds and minute-plus lap times clearly', () => {
  assert.equal(formatLapTime(41.2), '41.2 dtk');
  assert.equal(formatLapTime(65.4), '1m 05.4d');
  assert.equal(formatLapTime(124.0), '2m 04.0d');
});
