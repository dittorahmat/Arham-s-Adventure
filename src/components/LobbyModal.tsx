import React, { useEffect, useRef, useState } from 'react';
import { DIFFICULTY_CATALOG, DIFFICULTY_LEVELS } from '../game/difficulty';
import { GAME_MODE_CATALOG, GAME_MODE_SELECTIONS } from '../game/gameModes';
import { GRADE_LEVELS } from '../game/questions';
import {
  isValidRoomCode,
  normalizeRoomCode,
  ROOM_MAX_SLOTS,
  RoomSettings,
  RoomState,
} from '../game/room';
import { DifficultyLevel, GameModeSelection, GradeLevel } from '../game/types';

interface LobbyModalProps {
  open: boolean;
  playerId: string;
  nickname: string;
  grade: GradeLevel;
  defaultMode: GameModeSelection;
  defaultDifficulty: DifficultyLevel;
  onClose: () => void;
  onMatchStart: (room: RoomState) => void;
}

export const LobbyModal: React.FC<LobbyModalProps> = ({
  open,
  playerId,
  nickname,
  grade,
  defaultMode,
  defaultDifficulty,
  onClose,
  onMatchStart,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!open && wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setRoomState(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  if (!open) return null;

  const connectWebSocket = (code: string) => {
    wsRef.current?.close();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams({
      playerId,
      nickname,
      grade: String(grade),
    });
    const wsUrl = `${protocol}//${window.location.host}/api/rooms/${code}/ws?${params.toString()}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data)) as
          | { type: 'room_state'; state: RoomState }
          | { type: 'error'; error: string };
        if (msg.type === 'room_state') {
          setRoomState(msg.state);
          setError(null);
          if (msg.state.status === 'playing') {
            onMatchStart(msg.state);
          }
        } else if (msg.type === 'error') {
          setError(msg.error);
        }
      } catch {
        setError('Gagal membaca pesan server');
      }
    };

    ws.onerror = () => {
      setError('Koneksi ke room gagal. Pastikan server aktif.');
      setLoading(false);
    };

    ws.onopen = () => {
      setLoading(false);
    };
  };

  const handleCreateRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: playerId,
          hostNickname: nickname,
          hostGrade: grade,
          settings: {
            mode: defaultMode,
            difficulty: defaultDifficulty,
            lockedGrade: null,
          },
        }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        setError(errData.error ?? 'Gagal membuat room');
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { code: string; state: RoomState };
      setRoomState(data.state);
      connectWebSocket(data.code);
    } catch {
      setError('Tidak dapat terhubung ke server.');
      setLoading(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeRoomCode(joinCode);
    if (!isValidRoomCode(normalized)) {
      setError('Kode room harus 6 huruf/angka (contoh: AB12CD).');
      return;
    }
    setLoading(true);
    setError(null);
    connectWebSocket(normalized);
  };

  const sendWs = (payload: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const handleUpdateSettings = (patch: Partial<RoomSettings>) => {
    sendWs({ type: 'update_settings', settings: patch });
  };

  const handleCopyCode = async () => {
    if (!roomState) return;
    try {
      await navigator.clipboard.writeText(roomState.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard errors
    }
  };

  const isHost = roomState?.hostId === playerId;
  const me = roomState?.participants.find((p) => p.id === playerId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Mabar Private Room"
    >
      <div className="w-full max-w-lg rounded-3xl border-4 border-slate-900 bg-white p-5 shadow-[0_12px_0_#0f172a]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-900">Mabar Private Room</h2>
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              sendWs({ type: 'leave' });
              onClose();
            }}
            className="rounded-xl border-2 border-slate-900 bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-800 hover:bg-slate-200"
          >
            Tutup
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border-2 border-rose-700 bg-rose-100 px-3 py-2 text-xs font-bold text-rose-900">
            {error}
          </div>
        )}

        {!roomState ? (
          <div className="space-y-4">
            <button
              type="button"
              disabled={loading}
              onClick={(e) => {
                e.currentTarget.blur();
                void handleCreateRoom();
              }}
              className="w-full rounded-2xl border-3 border-slate-900 bg-emerald-400 py-3 text-base font-black text-slate-900 shadow-[0_4px_0_#0f172a] hover:bg-emerald-300 disabled:opacity-60"
            >
              {loading ? 'Menghubungkan...' : 'Buat Room Baru'}
            </button>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t-2 border-slate-200" />
              <span className="mx-3 text-xs font-bold text-slate-400">ATAU GABUNG</span>
              <div className="flex-grow border-t-2 border-slate-200" />
            </div>

            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="KODE 6 KARAKTER"
                className="flex-1 rounded-xl border-2 border-slate-900 bg-slate-50 px-3 py-2 text-center text-sm font-black tracking-widest text-slate-900 uppercase"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl border-2 border-slate-900 bg-sky-400 px-4 py-2 text-sm font-black text-slate-900 shadow-[0_3px_0_#0f172a] hover:bg-sky-300 disabled:opacity-60"
              >
                Gabung
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border-2 border-slate-900 bg-amber-100 px-4 py-2.5">
              <div>
                <div className="text-[11px] font-bold uppercase text-amber-800">Kode Room</div>
                <div className="text-2xl font-black tracking-widest text-slate-900">
                  {roomState.code}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  void handleCopyCode();
                }}
                className="rounded-xl border-2 border-slate-900 bg-white px-3 py-1.5 text-xs font-black text-slate-900 hover:bg-slate-50"
              >
                {copied ? 'Tersalin!' : 'Salin Kode'}
              </button>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-extrabold uppercase text-slate-500">
                Peserta ({roomState.participants.length}/{ROOM_MAX_SLOTS})
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: ROOM_MAX_SLOTS }).map((_, idx) => {
                  const p = roomState.participants[idx];
                  if (!p) {
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-400"
                      >
                        Slot Kosong (AI Bot)
                      </div>
                    );
                  }
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border-2 border-slate-900 bg-sky-50 px-3 py-2 text-xs font-bold text-slate-900"
                    >
                      <span className="truncate">
                        {p.isHost ? '👑 ' : ''}
                        {p.nickname} (Kls {p.grade})
                      </span>
                      <span className={p.isReady ? 'text-emerald-600' : 'text-amber-600'}>
                        {p.isReady ? 'Siap' : 'Tunggu'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border-2 border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-extrabold uppercase text-slate-600">
                Pengaturan Room {isHost ? '(Host)' : '(Hanya Host)'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select
                  disabled={!isHost}
                  value={roomState.settings.mode}
                  onChange={(e) =>
                    handleUpdateSettings({ mode: e.target.value as GameModeSelection })
                  }
                  className="rounded-xl border-2 border-slate-900 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 disabled:opacity-60"
                >
                  {GAME_MODE_SELECTIONS.map((m) => (
                    <option key={m} value={m}>
                      {GAME_MODE_CATALOG[m].label}
                    </option>
                  ))}
                </select>

                <select
                  disabled={!isHost}
                  value={roomState.settings.difficulty}
                  onChange={(e) =>
                    handleUpdateSettings({ difficulty: e.target.value as DifficultyLevel })
                  }
                  className="rounded-xl border-2 border-slate-900 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 disabled:opacity-60"
                >
                  {DIFFICULTY_LEVELS.map((d) => (
                    <option key={d} value={d}>
                      {DIFFICULTY_CATALOG[d].label}
                    </option>
                  ))}
                </select>

                <select
                  disabled={!isHost}
                  value={roomState.settings.lockedGrade ?? ''}
                  onChange={(e) =>
                    handleUpdateSettings({
                      lockedGrade: e.target.value ? (Number(e.target.value) as GradeLevel) : null,
                    })
                  }
                  className="rounded-xl border-2 border-slate-900 bg-white px-2 py-1.5 text-xs font-bold text-slate-900 disabled:opacity-60"
                >
                  <option value="">Kelas Bebas</option>
                  {GRADE_LEVELS.map((g) => (
                    <option key={g} value={g}>
                      Kunci Kls {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isHost ? (
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  sendWs({ type: 'start_match' });
                }}
                className="w-full rounded-2xl border-3 border-slate-900 bg-amber-400 py-3 text-base font-black text-slate-900 shadow-[0_4px_0_#0f172a] hover:bg-amber-300"
              >
                Mulai Balapan Sekarang!
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  sendWs({ type: 'set_ready', isReady: !(me?.isReady ?? false) });
                }}
                className="w-full rounded-2xl border-3 border-slate-900 bg-emerald-400 py-3 text-base font-black text-slate-900 shadow-[0_4px_0_#0f172a] hover:bg-emerald-300"
              >
                {me?.isReady ? 'Batal Siap' : 'Saya Siap!'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
