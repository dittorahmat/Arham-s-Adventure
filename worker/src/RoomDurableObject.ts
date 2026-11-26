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
import type { GradeLevel } from '../../src/game/types';

type ClientMessage =
  | { type: 'update_settings'; settings: Partial<RoomSettings> }
  | { type: 'set_ready'; isReady: boolean }
  | { type: 'start_match' }
  | { type: 'leave' };

export class RoomDurableObject implements DurableObject {
  private roomState: RoomState | null = null;
  private sessions = new Map<string, WebSocket>();

  constructor(private readonly ctx: DurableObjectState) {}

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
      }
    }
  }

  private broadcastState(): void {
    if (!this.roomState) return;
    const payload = JSON.stringify({ type: 'room_state', state: this.roomState });
    for (const ws of this.sessions.values()) {
      try {
        ws.send(payload);
      } catch {
        // Ignore closed sockets; close listener cleans up
      }
    }
  }
}
