import React, { useEffect, useState } from 'react';
import { SUBJECT_COLORS } from '../game/questions';
import { resolveHudSpriteMood } from '../game/spriteMood';
import {
  detectTouchEnvironment,
  loadTouchControlsPreference,
  resolveTouchControlsVisible,
  saveTouchControlsPreference,
  TouchControlsPreference,
  TouchEnvironment,
} from '../game/touchControls';
import { HudSnapshot } from '../game/types';
import { ArhamSprite } from './ArhamSprite';
import { TouchControls } from './TouchControls';

interface PlayingHudProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
  onVirtualMove: (mx: number, mz: number) => void;
  onVirtualJump: (pressed: boolean) => void;
  onVirtualDive: () => void;
}

const OPTION_LETTERS: ['A', 'B', 'C'] = ['A', 'B', 'C'];

export const PlayingHud: React.FC<PlayingHudProps> = ({
  hud,
  muted,
  onToggleMute,
  onPause,
  onRestart,
  onVirtualMove,
  onVirtualJump,
  onVirtualDive,
}) => {
  const [touchPref, setTouchPref] = useState<TouchControlsPreference>(() =>
    loadTouchControlsPreference(),
  );
  const [touchEnv, setTouchEnv] = useState<TouchEnvironment>(() => detectTouchEnvironment());

  useEffect(() => {
    const handleResize = () => setTouchEnv(detectTouchEnvironment());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showTouchControls = resolveTouchControlsVisible(touchPref, touchEnv);

  const handleToggleTouchControls = () => {
    const nextPref: TouchControlsPreference = showTouchControls ? 'off' : 'on';
    setTouchPref(nextPref);
    saveTouchControlsPreference(nextPref);
    if (nextPref === 'off') {
      onVirtualMove(0, 0);
      onVirtualJump(false);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const gate = hud.activeGate;
  const gateSubj = gate ? SUBJECT_COLORS[gate.question.subject] : null;
  const spriteMood = resolveHudSpriteMood(hud);
  const spriteBg =
    spriteMood === 'celebrate'
      ? 'bg-[#dcfce7]'
      : spriteMood === 'bonk'
        ? 'bg-[#fee2e2]'
        : 'bg-[#e0f2fe]';

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-5">
      {/* Top Row: Left Status Cluster, Center Quiz Chalkboard (on lg+), Right Utility Icons */}
      <div className="flex flex-wrap items-start justify-between gap-2 lg:flex-nowrap">
        {/* Top-Left Compact World-Matched Status Cluster with Reactive Animated Arham Portrait */}
        <div
          className="order-1 flex shrink-0 items-center gap-2 rounded-2xl border-[3px] border-[#1e293b] bg-[#fffdf5]/95 px-2 py-1.5 text-[#0f172a] shadow-[0_4px_0_#1e293b] sm:gap-3 sm:px-3.5 sm:py-2.5"
          data-testid="hud-status"
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#1e293b] sm:h-13 sm:w-13 ${spriteBg}`}
          >
            <ArhamSprite
              mood={spriteMood}
              size={44}
              showShadow={false}
              label={
                spriteMood === 'celebrate'
                  ? 'Arham bersorak merayakan jawaban benar'
                  : spriteMood === 'bonk'
                    ? 'Arham terpental dan pusing'
                    : 'Arham sedang berlari di lintasan'
              }
            />
          </div>

          <div className="flex flex-col gap-1 sm:gap-1.5">
            <div className="flex items-baseline gap-2.5 sm:gap-4">
              {/* Hero Rank */}
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className="text-[10px] font-extrabold tracking-wider text-[#64748b] sm:text-[11px]">
                  POS
                </span>
                <span className="font-display text-lg font-bold tabular-nums text-[#2563eb] sm:text-3xl">
                  #{hud.rank}
                </span>
                <span className="text-[11px] font-bold tabular-nums text-[#64748b] sm:text-xs">
                  /{hud.totalRacers}
                </span>
              </div>

              {/* Hero Score */}
              <div className="flex items-baseline gap-0.5 sm:gap-1">
                <span className="text-[10px] font-extrabold tracking-wider text-[#64748b] sm:text-[11px]">
                  SKOR
                </span>
                <span
                  className="font-display text-lg font-bold tabular-nums text-[#0f172a] sm:text-3xl"
                  data-testid="hud-score"
                >
                  {hud.score}
                </span>
              </div>

              {/* Golden Star Pickup Counter with Matched Inline SVG */}
              <div className="hidden items-center gap-1 sm:flex">
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <polygon
                    points="12,2 15,8.5 22,9.3 16.8,14 18.2,21 12,17.5 5.8,21 7.2,14 2,9.3 9,8.5"
                    fill="#facc15"
                    stroke="#1e293b"
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                  />
                  <polygon
                    points="12,5.5 13.7,9.4 17.8,9.9 14.8,12.7 15.5,16.8 12,14.8"
                    fill="#fef9c3"
                  />
                </svg>
                <span className="font-display text-lg font-bold tabular-nums text-[#b45309]">
                  {hud.starsCollected}/{hud.totalStars}
                </span>
              </div>
            </div>

            {/* Slim Course Progress + Time + Dive Ready */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#334155] sm:gap-3 sm:text-xs">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <div className="h-2.5 w-14 overflow-hidden rounded-full border-2 border-[#1e293b] bg-[#e2e8f0] sm:w-28">
                  <div
                    className="h-full bg-[#16a34a] transition-transform duration-150"
                    style={{ width: `${hud.progressPct}%` }}
                  />
                </div>
                <span className="tabular-nums" data-testid="hud-progress">
                  {hud.progressPct}%
                </span>
              </div>

            <span aria-hidden="true" className="text-[#94a3b8]">
              ·
            </span>
            <span
              className={`tabular-nums ${hud.timeLeft <= 20 ? 'text-[#dc2626]' : 'text-[#0f172a]'}`}
            >
              {formatTime(hud.timeLeft)}
            </span>

            <span aria-hidden="true" className="hidden text-[#94a3b8] sm:inline">
              ·
            </span>
            <span className="hidden tabular-nums text-[#0369a1] sm:inline">
              Terjang {hud.diveReadyPct === 100 ? 'Siap [Shift]' : `${hud.diveReadyPct}%`}
            </span>

            {hud.mode === 'tile_fall' && (
              <>
                <span aria-hidden="true" className="text-[#94a3b8]">
                  ·
                </span>
                <span className="font-extrabold text-[#7c3aed]" data-testid="hud-mode">
                  Tile Fall
                </span>
              </>
            )}

            {hud.streak > 0 && (
              <>
                <span aria-hidden="true" className="text-[#94a3b8]">
                  ·
                </span>
                <span className="tabular-nums text-[#b45309]" data-testid="hud-streak">
                  Beruntun {hud.streak}/10
                </span>
              </>
            )}
          </div>
          </div>
        </div>

        {/* Top-Center Classroom Chalkboard Question Banner (Stays high at top edge so 3D Doors stay unobstructed!) */}
        <div className="pointer-events-none order-3 flex w-full flex-col items-center gap-2 lg:order-2 lg:max-w-2xl">
          {gate && gateSubj && (
            <div
              data-testid="quiz-chalkboard"
              className="w-full rounded-2xl border-[4px] border-[#b45309] bg-[#14532d]/95 px-4 py-2.5 text-white shadow-[0_6px_0_#1e293b]"
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold text-[#fde68a] sm:text-xs">
                <span>
                  Gerbang {gate.gateIndex + 1}/{hud.totalGates} · {gateSubj.label} · {gate.question.topic}
                </span>
                <span className="hidden sm:inline">Tabrak Pintu Jawaban Benar!</span>
              </div>
              <p className="font-display text-sm font-semibold leading-snug text-white sm:text-lg">
                {gate.question.question}
              </p>
              <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2">
                {gate.question.options.map((opt, idx) => {
                  const isWrong = gate.wrongDoors[idx];
                  const badgeBg =
                    isWrong
                      ? 'bg-[#991b1b] text-[#fecaca]'
                      : idx === 0
                        ? 'bg-[#2563eb] text-white'
                        : idx === 1
                          ? 'bg-[#16a34a] text-white'
                          : 'bg-[#ea580c] text-white';
                  return (
                    <div
                      key={OPTION_LETTERS[idx]}
                      className={`flex items-center gap-1.5 rounded-xl border-2 border-[#1e293b] px-2 py-1 text-xs font-bold sm:px-2.5 sm:py-1.5 sm:text-sm ${
                        isWrong ? 'bg-[#7f1d1d]/90 text-[#fecaca] line-through' : 'bg-[#fffbeb] text-[#0f172a]'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#1e293b] font-display text-[11px] font-bold sm:h-6 sm:w-6 sm:text-xs ${badgeBg}`}
                      >
                        {OPTION_LETTERS[idx]}
                      </span>
                      <span className="truncate">{opt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Brief Educational Toast after passing or bouncing off a Quiz Gate */}
          {hud.feedback && (
            <div
              data-testid="quiz-feedback"
              className={`rounded-xl border-[3px] border-[#1e293b] px-4 py-2 text-center shadow-[0_4px_0_#1e293b] ${
                hud.feedback.kind === 'correct'
                  ? 'bg-[#dcfce7] text-[#14532d]'
                  : 'bg-[#fee2e2] text-[#7f1d1d]'
              }`}
            >
              <p className="font-display text-sm font-bold sm:text-base">{hud.feedback.headline}</p>
              <p className="text-xs font-semibold">{hud.feedback.detail}</p>
            </div>
          )}
        </div>

        {/* Top-Right Compact Utility Icon Controls (Touch Toggle, Mute [M], Restart [R], Pause [P]) */}
        <div className="pointer-events-auto order-2 flex shrink-0 items-center gap-1 sm:gap-2 lg:order-3">
          <button
            type="button"
            tabIndex={-1}
            aria-pressed={showTouchControls}
            aria-label={showTouchControls ? 'Sembunyikan Kontrol Sentuh' : 'Tampilkan Kontrol Sentuh'}
            title={showTouchControls ? 'Kontrol Sentuh Aktif' : 'Aktifkan Kontrol Sentuh'}
            data-testid="toggle-touch-controls"
            onClick={(e) => {
              handleToggleTouchControls();
              e.currentTarget.blur();
            }}
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-[3px] border-[#1e293b] text-[#0f172a] shadow-[0_4px_0_#1e293b] transition-transform active:translate-y-0.5 sm:h-11 sm:w-11 ${
              showTouchControls ? 'bg-[#38bdf8]' : 'bg-[#fffdf5]'
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="7" width="19" height="11" rx="5" fill={showTouchControls ? '#e0f2fe' : '#f1f5f9'} />
              <path d="M8 10.5v4M6 12.5h4" />
              <circle cx="15.5" cy="11.5" r="0.9" fill="currentColor" />
              <circle cx="17.5" cy="13.5" r="0.9" fill="currentColor" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label={muted ? 'Aktifkan Suara' : 'Matikan Suara'}
            title={muted ? 'Suara Mati (M)' : 'Suara Aktif (M)'}
            onClick={(e) => {
              onToggleMute();
              e.currentTarget.blur();
            }}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-[3px] border-[#1e293b] bg-[#fffdf5] text-[#0f172a] shadow-[0_4px_0_#1e293b] transition-transform active:translate-y-0.5 sm:h-11 sm:w-11"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill={muted ? '#cbd5e1' : '#facc15'} />
              {muted ? (
                <>
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </>
              ) : (
                <>
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                  <path d="M18.8 5.8a9 9 0 0 1 0 12.4" />
                </>
              )}
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Ulangi Balapan"
            title="Ulangi Balapan (R)"
            onClick={(e) => {
              onRestart();
              e.currentTarget.blur();
            }}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-[3px] border-[#1e293b] bg-[#fffdf5] text-[#0f172a] shadow-[0_4px_0_#1e293b] transition-transform active:translate-y-0.5 sm:h-11 sm:w-11"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <polyline points="3 3 3 8 8 8" />
            </svg>
          </button>

          <button
            type="button"
            tabIndex={-1}
            aria-label="Jeda Permainan"
            title="Jeda (Esc / P)"
            onClick={(e) => {
              onPause();
              e.currentTarget.blur();
            }}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-[3px] border-[#1e293b] bg-[#facc15] text-[#0f172a] shadow-[0_4px_0_#1e293b] transition-transform active:translate-y-0.5 sm:h-11 sm:w-11"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <rect x="6" y="4" width="4.5" height="16" rx="1.5" />
              <rect x="13.5" y="4" width="4.5" height="16" rx="1.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom Area: Stumble-style Touch Controls (Auto on mobile/tablet/touch, or toggled on desktop) */}
      {showTouchControls && (
        <TouchControls
          diveReadyPct={hud.diveReadyPct}
          onVirtualMove={onVirtualMove}
          onVirtualJump={onVirtualJump}
          onVirtualDive={onVirtualDive}
        />
      )}
    </div>
  );
};
