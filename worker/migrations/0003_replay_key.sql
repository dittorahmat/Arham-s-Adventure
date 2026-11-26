-- Migration: 0003_replay_key.sql
-- Adds optional R2 replay object key to finished multiplayer matches.

ALTER TABLE matches ADD COLUMN replay_key TEXT;
