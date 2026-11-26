import {
  completePublicCountdown,
  createRoomState,
  joinRoom,
  leaveRoom,
  PUBLIC_COUNTDOWN_MS,
  ROOM_MAX_SLOTS,
  RoomSettings,
  RoomState,
  setParticipantReady,
  startPublicCountdown,
  startRoomMatch,
  updateRoomSettings,
} from '../../src/game/room';
import { validateGrade } from '../../src/game/session';
import type { GradeLevel, TileState } from '../../src/game/types';
import {
  FinishStanding,
  PlayerPose,
  recordFinishOrder,
  validatePlayerPoseUpdate,
  validateQuizCheckpointAnswer,
} from '../../src/game/netSync';
import { TILE_FALL_CONSTANTS } from '../../src/game/tileFall';

type ClientMessage =
  | { type: 'update_settings'; settings: Partial<RoomSettings> }
  | { type: 'set_ready'; isReady: boolean }
  | { type: 'start_match' }
  | { type: 'player_pose'; pose: Omit<PlayerPose, 'playerId'> }
  | { type: 'player_finish'; finishTimeMs: number }
  | { type: 'tile_step'; tileId: string; isSafe: boolean }
  | {
      type: 'quiz_answer';
      checkpointIndex: number;
      selectedOption: number;
      correctOption: number;
    }
  | { type: 'leave' };

export class RoomDurableObject implements DurableObject {
  private roomState: RoomState | null = null;
  private sessions = new Map<string, WebSocket>();
  private tileStates = new Map<
    string,
    { state: TileState; shakeTimer: number; revealPop: number }
  >();
  private quizScores = new Map<string, number>();
  private matchSeed: number | null = null;
  private matchStartTime: number | null = null;
  private latestPoses = new Map<string, PlayerPose>();
  private finishStandings: FinishStanding[] = [];
  private matchPersisted = false;

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env?: { DB?: D1Database }
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname.endsWith('/init')) {
      const body = (await request.json()) as {
        code: string;
        hostId: string;
        hostNickname: string;
        hostGrade: GradeLevel;
        isPublic?: boolean;
        settings?: Partial<RoomSettings>;
      };

      let state = createRoomState({
        code: body.code,
        hostId: body.hostId,
        hostNickname: body.hostNickname,
        hostGrade: validateGrade(body.hostGrade),
        isPublic: body.isPublic,
        settings: body.settings,
      });

      if (body.isPublic) {
        const countdownRes = startPublicCountdown(state, { durationMs: PUBLIC_COUNTDOWN_MS });
        if (countdownRes.ok) {
          state = countdownRes.state;
          if (state.countdownEndsAt) {
            await this.ctx.storage.setAlarm(state.countdownEndsAt);
          }
        }
      }

      this.roomState = state;
      return Response.json({ state: this.roomState }, { status: 201 });
    }

    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      if (!this.roomState) {
        return Response.json({ error: 'Room not found' }, { status: 404 });
      }

      const playerId = url.searchParams.get('playerId') || crypto.randomUUID();
      const nickname = url.searchParams.get('nickname') || 'Pemain';
      const grade = validateGrade(Number(url.searchParams.get('grade')));

      const joinRes = joinRoom(this.roomState, { id: playerId, nickname, grade });
      if (!joinRes.ok) {
        return Response.json({ error: joinRes.error }, { status: 409 });
      }
      this.roomState = joinRes.state;

      if (
        this.roomState.isPublic &&
        this.roomState.status === 'countdown' &&
        this.roomState.participants.length >= ROOM_MAX_SLOTS
      ) {
        const completeRes = completePublicCountdown(this.roomState);
        if (completeRes.ok) {
          this.roomState = completeRes.state;
        }
      }

      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();

      this.sessions.set(playerId, server);
      this.broadcastState();

      server.addEventListener('message', (event) => {
        if (!this.roomState) return;
        try {
          const msg = JSON.parse(String(event.data)) as ClientMessage;
          this.handleMessage(playerId, msg, server);
        } catch {
          server.send(JSON.stringify({ type: 'error', error: 'Invalid message format' }));
        }
      });

      server.addEventListener('close', () => {
        this.sessions.delete(playerId);
        if (
          this.roomState &&
          (this.roomState.status === 'lobby' || this.roomState.status === 'countdown')
        ) {
          this.roomState = leaveRoom(this.roomState, playerId);
          this.broadcastState();
        }
      });

      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.method === 'GET' && url.pathname.endsWith('/state')) {
      if (!this.roomState) {
        return Response.json({ error: 'Room not found' }, { status: 404 });
      }
      return Response.json({ state: this.roomState });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  private handleMessage(playerId: string, msg: ClientMessage, socket: WebSocket): void {
    if (!this.roomState) return;

    switch (msg.type) {
      case 'update_settings': {
        const res = updateRoomSettings(this.roomState, playerId, msg.settings);
        if (!res.ok) {
          socket.send(JSON.stringify({ type: 'error', error: res.error }));
          return;
        }
        this.roomState = res.state;
        this.broadcastState();
        this.startSyncedMatch();
        break;
      }
      case 'player_pose': {
        if (!this.roomState || this.roomState.status !== 'playing') return;
        const incoming: PlayerPose = {
          ...msg.pose,
          playerId,
        };
        const prev = this.latestPoses.get(playerId) ?? null;
        const validated = validatePlayerPoseUpdate(prev, incoming);
        this.latestPoses.set(playerId, validated.clampedPose);
        this.broadcastExcept(
          playerId,
          JSON.stringify({
            type: 'race_snapshot',
            poses: [validated.clampedPose],
          })
        );
        break;
      }
      case 'player_finish': {
        if (!this.roomState || this.roomState.status !== 'playing') return;
        const participant = this.roomState.participants.find((p) => p.id === playerId);
        const finishTimeMs = Number.isFinite(msg.finishTimeMs)
          ? Math.max(0, msg.finishTimeMs)
          : Math.max(0, Date.now() - (this.matchStartTime ?? Date.now()));
        this.finishStandings = recordFinishOrder(
          this.finishStandings,
          playerId,
          finishTimeMs,
          participant?.nickname
        );
        this.broadcastAll(
          JSON.stringify({
            type: 'finish_standings',
            standings: this.finishStandings,
          })
        );
        if (
          !this.matchPersisted &&
          this.finishStandings.length >= this.roomState.participants.length
        ) {
          this.matchPersisted = true;
          this.ctx.waitUntil(this.persistMatchToD1());
        }
        break;
      }
      case 'tile_step': {
        if (!this.roomState || this.roomState.status !== 'playing') return;
        if (!msg.tileId || this.tileStates.has(msg.tileId)) return;
        const nextState = msg.isSafe
          ? { state: 'safe_revealed' as TileState, shakeTimer: 0, revealPop: 1 }
          : {
              state: 'shaking' as TileState,
              shakeTimer: TILE_FALL_CONSTANTS.shakeDuration,
              revealPop: 0,
            };
        this.tileStates.set(msg.tileId, nextState);
        this.broadcastAll(
          JSON.stringify({
            type: 'tile_state_update',
            tileId: msg.tileId,
            ...nextState,
          })
        );
        break;
      }
      case 'quiz_answer': {
        if (!this.roomState || this.roomState.status !== 'playing') return;
        const outcome = validateQuizCheckpointAnswer({
          checkpointIndex: msg.checkpointIndex,
          selectedOption: msg.selectedOption,
          correctOption: msg.correctOption,
        });
        if (outcome.scoreDelta > 0) {
          const prevScore = this.quizScores.get(playerId) ?? 0;
          this.quizScores.set(playerId, prevScore + outcome.scoreDelta);
        }
        socket.send(
          JSON.stringify({
            type: 'quiz_result',
            ...outcome,
          })
        );
        break;
      }
      case 'set_ready': {
        this.roomState = setParticipantReady(this.roomState, playerId, Boolean(msg.isReady));
        this.broadcastState();
        break;
      }
      case 'start_match': {
        const res = startRoomMatch(this.roomState, playerId);
        if (!res.ok) {
          socket.send(JSON.stringify({ type: 'error', error: res.error }));
          return;
        }
        this.roomState = res.state;
        this.broadcastState();
        this.startSyncedMatch();
        break;
      }
      case 'player_pose': {
        if (!this.roomState || this.roomState.status !== 'playing') return;
        const incoming: PlayerPose = {
          ...msg.pose,
          playerId,
        };
        const prev = this.latestPoses.get(playerId) ?? null;
        const validated = validatePlayerPoseUpdate(prev, incoming);
        this.latestPoses.set(playerId, validated.clampedPose);
        this.broadcastExcept(
          playerId,
          JSON.stringify({
            type: 'race_snapshot',
            poses: [validated.clampedPose],
          })
        );
        break;
      }
      case 'player_finish': {
        if (!this.roomState || this.roomState.status !== 'playing') return;
        const participant = this.roomState.participants.find((p) => p.id === playerId);
        const finishTimeMs = Number.isFinite(msg.finishTimeMs)
          ? Math.max(0, msg.finishTimeMs)
          : Math.max(0, Date.now() - (this.matchStartTime ?? Date.now()));
        this.finishStandings = recordFinishOrder(
          this.finishStandings,
          playerId,
          finishTimeMs,
          participant?.nickname
        );
        this.broadcastAll(
          JSON.stringify({
            type: 'finish_standings',
            standings: this.finishStandings,
          })
        );
        if (
          !this.matchPersisted &&
          this.finishStandings.length >= this.roomState.participants.length
        ) {
          this.matchPersisted = true;
          this.ctx.waitUntil(this.persistMatchToD1());
        }
        break;
      }
      case 'leave': {
        this.sessions.delete(playerId);
        this.roomState = leaveRoom(this.roomState, playerId);
        socket.close(1000, 'Left room');
        this.broadcastState();
        break;
      }
    }
  }

  async alarm(): Promise<void> {
    if (!this.roomState) return;
    if (this.roomState.isPublic && this.roomState.status === 'countdown') {
      const res = completePublicCountdown(this.roomState);
      if (res.ok) {
        this.roomState = res.state;
        this.broadcastState();
        this.startSyncedMatch();
      }
    }
  }

  private startSyncedMatch(): void {
    if (!this.roomState) return;
    this.matchSeed = (Math.floor(Math.random() * 0x7fffffff) + 1) >>> 0;
    this.matchStartTime = Date.now();
    this.latestPoses.clear();
    this.finishStandings = [];
    this.matchPersisted = false;
    this.broadcastAll(
      JSON.stringify({
        type: 'match_start',
        seed: this.matchSeed,
        matchStartTime: this.matchStartTime,
        state: this.roomState,
      })
    );
  }

  private async persistMatchToD1(): Promise<void> {
    if (!this.env?.DB || !this.roomState || this.finishStandings.length === 0) return;

    const matchId = crypto.randomUUID();
    const startedAt = new Date(this.matchStartTime ?? Date.now()).toISOString();
    const { code, settings, participants } = this.roomState;

    try {
      const statements: D1PreparedStatement[] = [
        this.env.DB.prepare(
          'INSERT INTO matches (id, room_code, mode, difficulty, subject, seed, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(
          matchId,
          code,
          settings.mode,
          settings.difficulty,
          'semua',
          this.matchSeed ?? 0,
          startedAt
        ),
      ];

      for (const standing of this.finishStandings) {
        const participant = participants.find((p) => p.id === standing.playerId);
        const score = this.quizScores.get(standing.playerId) ?? 0;
        const lapTimeSeconds = Math.max(0.1, Math.round((standing.finishTimeMs / 1000) * 10) / 10);
        const grade = participant?.grade ?? 5;

        statements.push(
          this.env.DB.prepare(
            'INSERT INTO match_participants (id, match_id, player_id, nickname, rank, score, lap_time_seconds, grade) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            crypto.randomUUID(),
            matchId,
            standing.playerId,
            standing.nickname,
            standing.rank,
            score,
            lapTimeSeconds,
            grade
          )
        );
      }

      await this.env.DB.batch(statements);
    } catch (err) {
      console.error('Failed to persist match to D1:', err);
    }
  }

  private broadcastAll(payload: string): void {
    for (const ws of this.sessions.values()) {
      try {
        ws.send(payload);
      } catch {
        // Ignore closed sockets; close listener cleans up
      }
    }
  }

  private broadcastExcept(excludePlayerId: string, payload: string): void {
    for (const [id, ws] of this.sessions.entries()) {
      if (id === excludePlayerId) continue;
      try {
        ws.send(payload);
      } catch {
        // Ignore closed sockets; close listener cleans up
      }
    }
  }

  private broadcastState(): void {
    if (!this.roomState) return;
    this.broadcastAll(JSON.stringify({ type: 'room_state', state: this.roomState }));
  }
}
