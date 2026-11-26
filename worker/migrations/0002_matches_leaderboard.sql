-- Migration: 0002_matches_leaderboard.sql
-- Stores finished multiplayer Match summaries and participant standings for the global D1 leaderboard.

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL,
  mode TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  subject TEXT NOT NULL,
  seed INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS match_participants (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  lap_time_seconds REAL NOT NULL,
  grade INTEGER NOT NULL DEFAULT 5 CHECK (grade >= 1 AND grade <= 6),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_matches_mode_difficulty ON matches(mode, difficulty);
CREATE INDEX IF NOT EXISTS idx_match_participants_leaderboard ON match_participants(lap_time_seconds ASC, score DESC);
