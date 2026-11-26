import React, { useState } from 'react';
import { GAME_MODE_CATALOG } from '../game/gameModes';
import { GRADE_META } from '../game/questions';
import { ReplayHudSnapshot } from '../game/replay';

interface ReplayOverlayProps {
  replay: ReplayHudSnapshot;
  onSkip: () => void;
  matchId?: string;
  onSaveReplay?: (matchId: string) => Promise<boolean> | boolean;
}

export const ReplayOverlay: React.FC<ReplayOverlayProps> = ({
  replay,
  onSkip,
  matchId,
  onSaveReplay,
}) => {
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const modeMeta = GAME_MODE_CATALOG[replay.mode];
  const gradeMeta = GRADE_META[replay.grade];
  const speedText = `${replay.speedFactor.toFixed(1)}× SLOW-MO`;
  const elapsedText = Math.min(replay.durationSeconds, replay.elapsedSeconds).toFixed(1);
  const durationText = replay.durationSeconds.toFixed(1);

  return (
    <div
      data-testid="replay-overlay"
      className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between"
    >
      {/* Top Cinema Letterbox Strip (No backdrop-filter over live WebGL) */}
      <div className="w-full border-b-[3px] border-[#1e293b] bg-[#0f172a]/92 px-4 py-2.5 text-white sm:px-7 sm:py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          {/* Left: Broadcast Replay Identity & Slow-Mo Telemetry */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#1e293b] bg-[#facc15] px-2.5 py-0.5 font-display text-xs font-bold tracking-wide text-[#0f172a] sm:text-sm">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" aria-hidden="true">
                <rect x="3" y="6" width="13" height="12" rx="2.5" fill="#0f172a" />
                <polygon points="16,10 21.5,7 21.5,17 16,14" fill="#ef4444" stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round" />
                <circle cx="9.5" cy="12" r="2.2" fill="#facc15" />
              </svg>
              <span>TAYANGAN ULANG FINIS</span>
            </span>

            <span
              data-testid="replay-speed"
              className="font-mono text-xs font-extrabold tabular-nums text-[#38bdf8] sm:text-sm"
            >
              {speedText}
            </span>

            <span aria-hidden="true" className="text-[#475569]">
              ·
            </span>

            <span className="font-display text-xs font-bold tabular-nums text-[#fef08a] sm:text-sm">
              Peringkat #{replay.rank}/{replay.totalRacers}
            </span>

            <span aria-hidden="true" className="hidden text-[#475569] sm:inline">
              ·
            </span>

            <span className="hidden text-xs font-bold tabular-nums text-[#e2e8f0] sm:inline sm:text-sm">
              Waktu {replay.clearTime} dtk
            </span>
          </div>

          {/* Right: Unboxed Mode & Grade Metadata */}
          <div className="hidden items-center gap-2 text-xs font-bold text-[#cbd5e1] md:flex">
            <span style={{ color: modeMeta.iconBgHex }}>{modeMeta.label}</span>
            <span aria-hidden="true" className="text-[#475569]">
              ·
            </span>
            <span>{gradeMeta.fullLabel}</span>
            <span aria-hidden="true" className="text-[#475569]">
              ·
            </span>
            <span className="tabular-nums text-[#facc15]">Skor {replay.score}</span>
          </div>
        </div>
      </div>

      {/* Upper-Center Non-Obstructing Photo-Finish Callout (keeps central 3D action completely clear) */}
      <div className="mt-3 flex justify-center px-4">
        <div
          data-testid="replay-callout"
          className={`rounded-2xl border-[3px] border-[#1e293b] px-4 py-1.5 text-center shadow-[0_4px_0_#1e293b] transition-transform duration-200 ${
            replay.crossedFinish
              ? 'scale-105 bg-[#facc15] text-[#0f172a]'
              : 'bg-[#0f172a]/85 text-white'
          }`}
        >
          <p className="font-display text-sm font-bold tracking-wide sm:text-lg">
            {replay.crossedFinish
              ? replay.rank === 1
                ? 'GARIS FINIS TERTAKLUKKAN! JUARA #1!'
                : `MELEWATI GARIS FINIS · PERINGKAT #${replay.rank}!`
              : 'Momen Penentuan di Garis Finis...'}
          </p>
        </div>
      </div>

      {/* Spacer keeps 3D viewport center completely unobstructed */}
      <div className="flex-1" />

      {/* Bottom Cinema Letterbox Control Strip */}
      <div className="pointer-events-auto w-full border-t-[3px] border-[#1e293b] bg-[#0f172a]/92 px-4 py-3 text-white sm:px-7 sm:py-3.5">
        <div className="mx-auto flex max-w-6xl items-center gap-3 sm:gap-5">
          {/* 5-Second Timeline Bar with Finish-Crossing Marker */}
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-[#cbd5e1]">
              <span>Klip Sinematik Finis 5 Detik</span>
              <span data-testid="replay-timer" className="font-mono tabular-nums text-[#fef08a]">
                {elapsedText}s / {durationText}s
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full border-2 border-[#334155] bg-[#1e293b]">
              {/* Progress Fill */}
              <div
                className="h-full rounded-full bg-[#38bdf8] transition-all duration-75"
                style={{ width: `${replay.progressPct}%` }}
              />
              {/* Golden Finish-Line Crossing Tick Marker */}
              <div
                aria-hidden="true"
                title="Titik Garis Finis"
                className="absolute top-0 bottom-0 w-1 bg-[#facc15]"
                style={{ left: `${replay.crossMarkerPct}%` }}
              />
            </div>
          </div>

          {/* Optional Save Replay to R2 CTA (only when matchId is present) */}
          {matchId && onSaveReplay && (
            <button
              type="button"
              data-testid="save-replay"
              disabled={saveState === 'saving' || saveState === 'saved'}
              onClick={async (e) => {
                e.currentTarget.blur();
                if (saveState === 'saving' || saveState === 'saved') return;
                setSaveState('saving');
                try {
                  const ok = await onSaveReplay(matchId);
                  setSaveState(ok ? 'saved' : 'error');
                } catch {
                  setSaveState('error');
                }
              }}
              className="toy-btn shrink-0 cursor-pointer whitespace-nowrap rounded-xl border-[3px] border-[#1e293b] bg-[#38bdf8] px-3.5 py-2 font-display text-sm font-bold text-[#0f172a] disabled:cursor-default disabled:opacity-75 focus-visible:outline-4 focus-visible:outline-white sm:px-4 sm:py-2.5 sm:text-base"
            >
              {saveState === 'saving'
                ? 'Menyimpan...'
                : saveState === 'saved'
                  ? 'Tersimpan ✓'
                  : saveState === 'error'
                    ? 'Coba Lagi'
                    : 'Simpan Replay'}
            </button>
          )}

          {/* Primary Skip CTA */}
          <button
            type="button"
            data-testid="skip-replay"
            onClick={(e) => {
              e.currentTarget.blur();
              onSkip();
            }}
            className="toy-btn shrink-0 cursor-pointer whitespace-nowrap rounded-xl border-[3px] border-[#1e293b] bg-[#facc15] px-4 py-2 font-display text-sm font-bold text-[#0f172a] focus-visible:outline-4 focus-visible:outline-white sm:px-5 sm:py-2.5 sm:text-base"
          >
            Lewati <span className="hidden sm:inline">[Spasi]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
