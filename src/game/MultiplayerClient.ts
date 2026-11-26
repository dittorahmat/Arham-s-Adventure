import type { FinishStanding, PlayerPose } from './netSync';
import type { RoomState } from './room';

export interface MultiplayerMatchStartPayload {
  seed: number;
  matchStartTime: number;
  state: RoomState;
}

export interface MultiplayerClientCallbacks {
  onMatchStart?: (payload: MultiplayerMatchStartPayload) => void;
  onRaceSnapshot?: (poses: PlayerPose[]) => void;
  onFinishStandings?: (standings: FinishStanding[]) => void;
  onClose?: () => void;
}

/**
 * Lightweight WebSocket wrapper for 20Hz pose streaming and receiving
 * race_snapshot / finish_standings / match_start from RoomDurableObject.
 */
export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private lastPoseSentAt = 0;
  private readonly minPoseIntervalMs = 50; // ~20Hz

  constructor(private readonly callbacks: MultiplayerClientCallbacks = {}) {}

  attachSocket(ws: WebSocket): void {
    this.ws = ws;
    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        if (msg.type === 'match_start') {
          this.callbacks.onMatchStart?.({
            seed: msg.seed,
            matchStartTime: msg.matchStartTime,
            state: msg.state,
          });
        } else if (msg.type === 'race_snapshot' && Array.isArray(msg.poses)) {
          this.callbacks.onRaceSnapshot?.(msg.poses);
        } else if (msg.type === 'finish_standings' && Array.isArray(msg.standings)) {
          this.callbacks.onFinishStandings?.(msg.standings);
        }
      } catch {
        // Ignore malformed server frames
      }
    });
    ws.addEventListener('close', () => {
      this.callbacks.onClose?.();
    });
  }

  sendPose(pose: Omit<PlayerPose, 'playerId'>, nowMs = Date.now()): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (nowMs - this.lastPoseSentAt < this.minPoseIntervalMs) return;
    this.lastPoseSentAt = nowMs;
    this.ws.send(JSON.stringify({ type: 'player_pose', pose }));
  }

  sendFinish(finishTimeMs: number): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'player_finish', finishTimeMs }));
  }

  dispose(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Match ended');
    }
    this.ws = null;
  }
}
