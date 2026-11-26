import type {
  FinishStanding,
  PlayerPose,
  QuizCheckpointOutcome,
} from './netSync';
import type { RoomState } from './room';
import type { TileState } from './types';

export interface MultiplayerMatchStartPayload {
  seed: number;
  matchStartTime: number;
  state: RoomState;
}

export interface TileStateUpdatePayload {
  tileId: string;
  state: TileState;
  shakeTimer: number;
  revealPop: number;
}

export interface MultiplayerClientCallbacks {
  onMatchStart?: (payload: MultiplayerMatchStartPayload) => void;
  onRaceSnapshot?: (poses: PlayerPose[]) => void;
  onFinishStandings?: (standings: FinishStanding[]) => void;
  onTileStateUpdate?: (payload: TileStateUpdatePayload) => void;
  onQuizResult?: (outcome: QuizCheckpointOutcome) => void;
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
        } else if (msg.type === 'tile_state_update' && typeof msg.tileId === 'string') {
          this.callbacks.onTileStateUpdate?.({
            tileId: msg.tileId,
            state: msg.state,
            shakeTimer: msg.shakeTimer,
            revealPop: msg.revealPop,
          });
        } else if (msg.type === 'quiz_result' && typeof msg.checkpointIndex === 'number') {
          this.callbacks.onQuizResult?.(msg as QuizCheckpointOutcome);
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

  sendTileStep(tileId: string, isSafe: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ type: 'tile_step', tileId, isSafe }));
  }

  sendQuizAnswer(
    checkpointIndex: number,
    selectedOption: number,
    correctOption: number
  ): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(
      JSON.stringify({
        type: 'quiz_answer',
        checkpointIndex,
        selectedOption,
        correctOption,
      })
    );
  }

  dispose(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Match ended');
    }
    this.ws = null;
  }
}
