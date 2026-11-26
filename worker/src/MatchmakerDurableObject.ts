import {
  generateRoomCode,
  PUBLIC_COUNTDOWN_MS,
  ROOM_MAX_SLOTS,
  RoomSettings,
} from '../../src/game/room';
import type { GradeLevel } from '../../src/game/types';

interface OpenPublicRoom {
  code: string;
  playerCount: number;
  countdownEndsAt: number;
}

interface MatchmakerEnv {
  ROOM_DO: DurableObjectNamespace;
}

export class MatchmakerDurableObject implements DurableObject {
  private openRooms: OpenPublicRoom[] = [];

  constructor(
    private readonly _ctx: DurableObjectState,
    private readonly env: MatchmakerEnv
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST' || !url.pathname.endsWith('/match')) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const body = (await request.json()) as {
      playerId: string;
      nickname: string;
      grade: GradeLevel;
      settings?: Partial<RoomSettings>;
    };

    const now = Date.now();
    this.openRooms = this.openRooms.filter(
      (r) => r.countdownEndsAt > now + 500 && r.playerCount < ROOM_MAX_SLOTS
    );

    const existing = this.openRooms[0];
    if (existing) {
      existing.playerCount += 1;
      return Response.json({ code: existing.code, isNew: false });
    }

    const code = generateRoomCode();
    const id = this.env.ROOM_DO.idFromName(code);
    const stub = this.env.ROOM_DO.get(id);

    const initRes = await stub.fetch('https://room/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        hostId: body.playerId,
        hostNickname: body.nickname,
        hostGrade: body.grade,
        isPublic: true,
        settings: body.settings,
      }),
    });

    const data = (await initRes.json()) as {
      state: { countdownEndsAt?: number };
    };

    this.openRooms.push({
      code,
      playerCount: 1,
      countdownEndsAt: data.state.countdownEndsAt ?? now + PUBLIC_COUNTDOWN_MS,
    });

    return Response.json({ code, isNew: true }, { status: 201 });
  }
}
