import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createRoomState,
  generateRoomCode,
  isValidRoomCode,
  joinRoom,
  leaveRoom,
  normalizeRoomCode,
  ROOM_CODE_LENGTH,
  ROOM_MAX_SLOTS,
  startRoomMatch,
  updateRoomSettings,
} from './room';

test('generateRoomCode creates a valid 6-character uppercase code and isValidRoomCode validates format', () => {
  const code = generateRoomCode();
  assert.equal(code.length, ROOM_CODE_LENGTH);
  assert.equal(isValidRoomCode(code), true);
  assert.equal(normalizeRoomCode(' ab12cd '), 'AB12CD');
  assert.equal(isValidRoomCode('AB12CD'), true);
  assert.equal(isValidRoomCode('abc'), false);
  assert.equal(isValidRoomCode('AB12C!'), false);
});

test('createRoomState initializes lobby with host at slot 0 and default settings', () => {
  const room = createRoomState({
    code: 'AB12CD',
    hostId: 'p1',
    hostNickname: 'Arham',
    hostGrade: 5,
    now: 1000,
  });

  assert.equal(room.code, 'AB12CD');
  assert.equal(room.status, 'lobby');
  assert.equal(room.hostId, 'p1');
  assert.equal(room.participants.length, 1);
  assert.deepEqual(room.participants[0], {
    id: 'p1',
    nickname: 'Arham',
    grade: 5,
    isHost: true,
    isReady: true,
    isAi: false,
    slotIndex: 0,
  });
  assert.deepEqual(room.settings, {
    mode: 'random',
    difficulty: 'medium',
    lockedGrade: null,
  });
});

test('joinRoom adds players up to 6 slots and rejects when full or not in lobby', () => {
  let room = createRoomState({
    code: 'AB12CD',
    hostId: 'p1',
    hostNickname: 'Host',
    hostGrade: 5,
  });

  for (let i = 2; i <= ROOM_MAX_SLOTS; i++) {
    const res = joinRoom(room, { id: `p${i}`, nickname: `Player ${i}`, grade: 4 });
    assert.equal(res.ok, true);
    room = res.state;
  }

  assert.equal(room.participants.length, ROOM_MAX_SLOTS);
  const fullRes = joinRoom(room, { id: 'p7', nickname: 'Player 7', grade: 3 });
  assert.equal(fullRes.ok, false);
});

test('leaveRoom removes participant and promotes next human to host if host leaves', () => {
  let room = createRoomState({
    code: 'AB12CD',
    hostId: 'p1',
    hostNickname: 'Host',
    hostGrade: 5,
  });
  room = joinRoom(room, { id: 'p2', nickname: 'Budi', grade: 4 }).state;

  const afterHostLeave = leaveRoom(room, 'p1');
  assert.equal(afterHostLeave.participants.length, 1);
  assert.equal(afterHostLeave.hostId, 'p2');
  assert.equal(afterHostLeave.participants[0].isHost, true);
  assert.equal(afterHostLeave.participants[0].slotIndex, 0);
});

test('updateRoomSettings restricts updates to host and enforces lockedGrade', () => {
  let room = createRoomState({
    code: 'AB12CD',
    hostId: 'p1',
    hostNickname: 'Host',
    hostGrade: 5,
  });
  room = joinRoom(room, { id: 'p2', nickname: 'Budi', grade: 3 }).state;

  const nonHostRes = updateRoomSettings(room, 'p2', { difficulty: 'hard' });
  assert.equal(nonHostRes.ok, false);

  const hostRes = updateRoomSettings(room, 'p1', {
    mode: 'tile_fall',
    difficulty: 'hard',
    lockedGrade: 6,
  });
  assert.equal(hostRes.ok, true);
  assert.equal(hostRes.state.settings.mode, 'tile_fall');
  assert.equal(hostRes.state.settings.difficulty, 'hard');
  assert.equal(hostRes.state.settings.lockedGrade, 6);
  assert.equal(hostRes.state.participants[1].grade, 6);
});

test('startRoomMatch fills remaining slots with AI classmates and transitions to playing', () => {
  let room = createRoomState({
    code: 'AB12CD',
    hostId: 'p1',
    hostNickname: 'Host',
    hostGrade: 5,
  });
  room = joinRoom(room, { id: 'p2', nickname: 'Budi', grade: 4 }).state;

  const nonHostStart = startRoomMatch(room, 'p2', 5000, 12345);
  assert.equal(nonHostStart.ok, false);

  const hostStart = startRoomMatch(room, 'p1', 5000, 12345);
  assert.equal(hostStart.ok, true);
  assert.equal(hostStart.state.status, 'playing');
  assert.equal(hostStart.state.matchStartTime, 5000);
  assert.equal(hostStart.state.seed, 12345);
  assert.equal(hostStart.state.participants.length, ROOM_MAX_SLOTS);
  assert.equal(hostStart.state.participants.filter((p) => p.isAi).length, 4);
});
