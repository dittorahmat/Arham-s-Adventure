-- Migration: 0001_players.sql
-- Stores anonymous Guest Player profiles for Arham's Adventure multiplayer.

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  grade INTEGER NOT NULL DEFAULT 5 CHECK (grade >= 1 AND grade <= 6),
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_players_token ON players(token);
