import type { DifficultyLevel, GameModeSelection, GradeLevel } from './types';

export const ROOM_MAX_SLOTS = 6;
export const ROOM_CODE_LENGTH = 6;

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;

export type RoomStatus = 'lobby' | 'countdown' | 'playing' | 'finished';

export interface RoomParticipant {
  id: string;
  nickname: string;
  grade: GradeLevel;
  isHost: boolean;
  isReady: boolean;
  isAi: boolean;
  slotIndex: number;
}

export interface RoomSettings {
  mode: GameModeSelection;
  difficulty: DifficultyLevel;
  lockedGrade: GradeLevel | null;
}

export interface RoomState {
  code: string;
  status: RoomStatus;
  hostId: string;
  settings: RoomSettings;
  participants: RoomParticipant[];
  createdAt: number;
  seed?: number;
  matchStartTime?: number;
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_REGEX.test(normalizeRoomCode(code));
}

export function generateRoomCode(rng: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const idx = Math.floor(rng() * ROOM_CODE_ALPHABET.length) % ROOM_CODE_ALPHABET.length;
    out += ROOM_CODE_ALPHABET[idx];
  }
  return out;
}

const AI_CLASSMATE_NAMES = ['Siti', 'Budi', 'Dewi', 'Rizky', 'Putri', 'Fajar'];

export type RoomActionResult =
  | { ok: true; state: RoomState }
  | { ok: false; state: RoomState; error: string };

export function createRoomState(params: {
  code: string;
  hostId: string;
  hostNickname: string;
  hostGrade: GradeLevel;
  settings?: Partial<RoomSettings>;
  now?: number;
}): RoomState {
  const lockedGrade = params.settings?.lockedGrade ?? null;
  const effectiveGrade = lockedGrade ?? params.hostGrade;
  return {
    code: normalizeRoomCode(params.code),
    status: 'lobby',
    hostId: params.hostId,
    settings: {
      mode: params.settings?.mode ?? 'random',
      difficulty: params.settings?.difficulty ?? 'medium',
      lockedGrade,
    },
    participants: [
      {
        id: params.hostId,
        nickname: params.hostNickname,
        grade: effectiveGrade,
        isHost: true,
        isReady: true,
        isAi: false,
        slotIndex: 0,
      },
    ],
    createdAt: params.now ?? Date.now(),
  };
}

export function joinRoom(
  state: RoomState,
  player: { id: string; nickname: string; grade: GradeLevel }
): RoomActionResult {
  if (state.status !== 'lobby') {
    return { ok: false, state, error: 'Match already started' };
  }

  const existing = state.participants.find((p) => p.id === player.id);
  const effectiveGrade = state.settings.lockedGrade ?? player.grade;

  if (existing) {
    return {
      ok: true,
      state: {
        ...state,
        participants: state.participants.map((p) =>
          p.id === player.id ? { ...p, nickname: player.nickname, grade: effectiveGrade } : p
        ),
      },
    };
  }

  if (state.participants.length >= ROOM_MAX_SLOTS) {
    return { ok: false, state, error: 'Room is full' };
  }

  const nextParticipant: RoomParticipant = {
    id: player.id,
    nickname: player.nickname,
    grade: effectiveGrade,
    isHost: false,
    isReady: false,
    isAi: false,
    slotIndex: state.participants.length,
  };

  return {
    ok: true,
    state: {
      ...state,
      participants: [...state.participants, nextParticipant],
    },
  };
}

export function leaveRoom(state: RoomState, playerId: string): RoomState {
  const remaining = state.participants
    .filter((p) => p.id !== playerId)
    .map((p, idx) => ({ ...p, slotIndex: idx }));

  if (remaining.length === 0) {
    return { ...state, participants: [] };
  }

  let hostId = state.hostId;
  if (hostId === playerId) {
    const nextHuman = remaining.find((p) => !p.isAi) ?? remaining[0];
    hostId = nextHuman.id;
  }

  return {
    ...state,
    hostId,
    participants: remaining.map((p) => ({
      ...p,
      isHost: p.id === hostId,
    })),
  };
}

export function updateRoomSettings(
  state: RoomState,
  requesterId: string,
  patch: Partial<RoomSettings>
): RoomActionResult {
  if (state.status !== 'lobby') {
    return { ok: false, state, error: 'Cannot change settings after match starts' };
  }
  if (state.hostId !== requesterId) {
    return { ok: false, state, error: 'Only host can update room settings' };
  }

  const nextSettings: RoomSettings = {
    mode: patch.mode ?? state.settings.mode,
    difficulty: patch.difficulty ?? state.settings.difficulty,
    lockedGrade: patch.lockedGrade !== undefined ? patch.lockedGrade : state.settings.lockedGrade,
  };

  const participants =
    nextSettings.lockedGrade !== null
      ? state.participants.map((p) => ({ ...p, grade: nextSettings.lockedGrade! }))
      : state.participants;

  return {
    ok: true,
    state: {
      ...state,
      settings: nextSettings,
      participants,
    },
  };
}

export function setParticipantReady(state: RoomState, playerId: string, isReady: boolean): RoomState {
  return {
    ...state,
    participants: state.participants.map((p) => (p.id === playerId ? { ...p, isReady } : p)),
  };
}

export function startRoomMatch(
  state: RoomState,
  requesterId: string,
  now: number = Date.now(),
  seed: number = Math.floor(Math.random() * 1_000_000)
): RoomActionResult {
  if (state.status !== 'lobby') {
    return { ok: false, state, error: 'Match already started' };
  }
  if (state.hostId !== requesterId) {
    return { ok: false, state, error: 'Only host can start the match' };
  }

  const filled = [...state.participants];
  let aiIdx = 0;
  while (filled.length < ROOM_MAX_SLOTS) {
    const slotIndex = filled.length;
    const name = AI_CLASSMATE_NAMES[aiIdx % AI_CLASSMATE_NAMES.length];
    aiIdx++;
    filled.push({
      id: `ai_${slotIndex}`,
      nickname: `${name} (Bot)`,
      grade: state.settings.lockedGrade ?? 5,
      isHost: false,
      isReady: true,
      isAi: true,
      slotIndex,
    });
  }

  return {
    ok: true,
    state: {
      ...state,
      status: 'playing',
      matchStartTime: now,
      seed,
      participants: filled,
    },
  };
}
