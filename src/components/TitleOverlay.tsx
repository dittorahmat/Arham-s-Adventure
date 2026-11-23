import React, { useState } from 'react';
import { DailyChallengesState, loadDailyChallenges } from '../game/dailyChallenges';
import {
  clearLeaderboard,
  LeaderboardEntry,
  loadLeaderboard,
} from '../game/leaderboard';
import { SUBJECT_LABELS } from '../game/questions';
import { GAME_MODE_LIST, GAME_MODE_META } from '../game/tileFall';
import { GameMode, SubjectFilter } from '../game/types';
import { ArhamSprite } from './ArhamSprite';
import { DailyChallengesModal } from './DailyChallengesModal';
import { TopScoresModal } from './TopScoresModal';

interface TitleOverlayProps {
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  selectedSubject: SubjectFilter;
  onSelectSubject: (subject: SubjectFilter) => void;
  onStart: () => void;
}

const SUBJECT_LIST: SubjectFilter[] = ['semua', 'matematika', 'ipa', 'ips', 'bahasa'];

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  selectedMode,
  onSelectMode,
  selectedSubject,
  onSelectSubject,
  onStart,
}) => {
  const [showTopScores, setShowTopScores] = useState(false);
  const [topScores, setTopScores] = useState<LeaderboardEntry[]>(() => loadLeaderboard());
  const [showDailyChallenges, setShowDailyChallenges] = useState(false);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallengesState>(() =>
    loadDailyChallenges(),
  );

  const handleOpenTopScores = () => {
    setTopScores(loadLeaderboard());
    setShowTopScores(true);
  };

  const handleClearTopScores = () => {
    clearLeaderboard();
    setTopScores([]);
  };

  const handleOpenDailyChallenges = () => {
    setDailyChallenges(loadDailyChallenges());
    setShowDailyChallenges(true);
  };

  const dailyDoneCount = dailyChallenges.challenges.filter((c) => c.completed).length;
  const dailyTotalCount = dailyChallenges.challenges.length;
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-5 sm:p-8 lg:p-12">
      {/* Main Left-Third Negative-Space Lockup & Controls */}
      <div className="my-auto flex max-w-lg flex-col items-start gap-6">
        {/* Bespoke Inline SVG Title Emblem Lockup */}
        <div className="w-full max-w-[440px]">
          <svg
            viewBox="0 0 460 190"
            role="img"
            aria-label="Arham's Adventure — Balap Kuis Kelas 5 SD"
            className="h-auto w-full drop-shadow-[0_10px_18px_rgba(15,23,42,0.28)]"
          >
            {/* Crest Ribbon Backing */}
            <path
              d="M28 54 L432 42 L420 132 L18 144 Z"
              fill="#2563eb"
              stroke="#1e293b"
              strokeWidth="7"
              strokeLinejoin="round"
            />
            <path
              d="M36 62 L422 51 L412 123 L27 134 Z"
              fill="#3b82f6"
            />

            {/* Golden Top Star Crest */}
            <g transform="translate(230 34)">
              <circle cx="0" cy="0" r="24" fill="#facc15" stroke="#1e293b" strokeWidth="5" />
              <polygon
                points="0,-15 4,-5 15,-5 6,2 9,13 0,6 -9,13 -6,2 -15,-5 -4,-5"
                fill="#fffbeb"
                stroke="#1e293b"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            </g>

            {/* Primary Display Title: ARHAM'S */}
            <text
              x="228"
              y="108"
              textAnchor="middle"
              fontFamily="Fredoka, Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              fontSize="56"
              fill="#fef08a"
              stroke="#1e293b"
              strokeWidth="10"
              paintOrder="stroke fill"
              letterSpacing="1"
            >
              ARHAM&apos;S
            </text>

            {/* Secondary Plaque: ADVENTURE */}
            <rect
              x="64"
              y="118"
              width="332"
              height="54"
              rx="14"
              fill="#ef4444"
              stroke="#1e293b"
              strokeWidth="6"
            />
            <text
              x="230"
              y="156"
              textAnchor="middle"
              fontFamily="Fredoka, Plus Jakarta Sans, sans-serif"
              fontWeight="700"
              fontSize="36"
              fill="#ffffff"
              stroke="#1e293b"
              strokeWidth="7"
              paintOrder="stroke fill"
              letterSpacing="2"
            >
              ADVENTURE
            </text>
          </svg>

          <p className="mt-1 pl-2 font-display text-base font-semibold text-white hud-stroke-sm sm:text-lg">
            Balap Halang Rintang · Pelajaran Kelas 5 SD
          </p>
        </div>

        {/* Game Mode + Subject Filter Compact Toy Setup Panel */}
        <div className="pointer-events-auto w-full max-w-xl space-y-3 rounded-2xl border-[3px] border-[#1e293b] bg-[#fffdf5]/95 p-3 toy-panel">
          {/* Mode Selector: Balap Klasik vs Lantai Jebakan (Tile Fall) */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#334155]">
              <span>Pilih Mode Balapan</span>
              <span className="text-[#2563eb]">
                {selectedMode === 'tile_fall' ? 'Tile Fall · Stumble!' : 'Lintasan Rintangan'}
              </span>
            </div>
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Pilih Mode Balapan"
            >
              {GAME_MODE_LIST.map((modeId) => {
                const meta = GAME_MODE_META[modeId];
                const active = selectedMode === modeId;
                const isTileFall = modeId === 'tile_fall';
                return (
                  <button
                    key={modeId}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`mode-${modeId}`}
                    onClick={(e) => {
                      onSelectMode(modeId);
                      e.currentTarget.blur();
                    }}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left transition-transform ${
                      active
                        ? isTileFall
                          ? 'border-[#1e293b] bg-[#7c3aed] text-white shadow-[0_3px_0_#1e293b]'
                          : 'border-[#1e293b] bg-[#2563eb] text-white shadow-[0_3px_0_#1e293b]'
                        : 'border-[#cbd5e1] bg-white text-[#1e293b] hover:border-[#64748b] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[#1e293b] ${
                        isTileFall ? 'bg-[#fde047]' : 'bg-[#bae6fd]'
                      }`}
                    >
                      {isTileFall ? (
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                          <rect x="3" y="4" width="8" height="6" rx="1.5" fill="#22c55e" stroke="#1e293b" strokeWidth="2" />
                          <rect x="13" y="4" width="8" height="6" rx="1.5" fill="#818cf8" stroke="#1e293b" strokeWidth="2" />
                          <rect x="3" y="12" width="8" height="6" rx="1.5" fill="#facc15" stroke="#1e293b" strokeWidth="2" />
                          <g transform="translate(17 17) rotate(18)">
                            <rect x="-4" y="-3" width="8" height="6" rx="1.5" fill="#ef4444" stroke="#1e293b" strokeWidth="2" />
                          </g>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                          <path d="M5 19V5h11l-2.2 3.5L16 12H5" fill="#facc15" stroke="#1e293b" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
                          <circle cx="17.5" cy="17.5" r="3" fill="#fb7185" stroke="#1e293b" strokeWidth="2" />
                        </svg>
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-display text-sm font-bold leading-tight">
                        {meta.label}
                      </span>
                      <span
                        className={`block truncate text-[11px] font-semibold ${
                          active ? 'text-white/90' : 'text-[#64748b]'
                        }`}
                      >
                        {meta.subtitle}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Filter */}
          <div className="border-t-2 border-dashed border-[#e2e8f0] pt-2.5">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs font-bold text-[#334155]">
              <span>Pilih Mata Pelajaran Kelas 5 SD</span>
              <span>{selectedMode === 'tile_fall' ? '3 Cekpoin Kuis · 120 Ubin' : '5 Gerbang Kuis'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:flex-nowrap" role="radiogroup" aria-label="Pilih Mata Pelajaran">
              {SUBJECT_LIST.map((subj) => {
                const active = selectedSubject === subj;
                return (
                  <button
                    key={subj}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={(e) => {
                      onSelectSubject(subj);
                      e.currentTarget.blur();
                    }}
                    className={`cursor-pointer whitespace-nowrap rounded-xl border-2 px-2.5 py-2 text-xs font-bold transition-transform ${
                      active
                        ? 'border-[#1e293b] bg-[#2563eb] text-white shadow-[0_3px_0_#1e293b]'
                        : 'border-[#cbd5e1] bg-white text-[#1e293b] hover:border-[#64748b] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    {SUBJECT_LABELS[subj]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Primary Start CTA paired with animated Arham character mascot + optional Top Skor & Misi Harian buttons */}
        <div className="pointer-events-auto flex flex-col items-start gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-[#e0f2fe] p-1 shadow-[0_5px_0_#1e293b] sm:h-[76px] sm:w-[76px]">
              <ArhamSprite
                mood="idle-cheer"
                size={64}
                label="Karakter Arham melambai menyapa pemain"
              />
            </div>
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStart();
              }}
              className="toy-btn cursor-pointer whitespace-nowrap rounded-2xl border-[3px] border-[#1e293b] bg-[#facc15] px-6 py-4 font-display text-xl font-bold tracking-wide text-[#0f172a] focus-visible:outline-4 focus-visible:outline-white sm:px-7 sm:text-2xl"
            >
              Mulai Petualangan
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              data-testid="open-top-scores"
              onClick={(e) => {
                e.currentTarget.blur();
                handleOpenTopScores();
              }}
              className="toy-btn flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl border-[3px] border-[#1e293b] bg-[#fffdf5] px-4 py-3 font-display text-base font-bold text-[#0f172a] focus-visible:outline-4 focus-visible:outline-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" aria-hidden="true">
                <path
                  d="M7 4h10v5a5 5 0 0 1-10 0V4Z"
                  fill="#facc15"
                  stroke="#1e293b"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 6H4.5a2 2 0 0 0 0 4H7M17 6h2.5a2 2 0 0 1 0 4H17"
                  stroke="#1e293b"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path d="M12 14v4M8.5 20h7" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
              <span>Top Skor</span>
            </button>

            <button
              type="button"
              data-testid="open-daily-challenges"
              onClick={(e) => {
                e.currentTarget.blur();
                handleOpenDailyChallenges();
              }}
              className="toy-btn flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl border-[3px] border-[#1e293b] bg-[#fffdf5] px-4 py-3 font-display text-base font-bold text-[#0f172a] focus-visible:outline-4 focus-visible:outline-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" aria-hidden="true">
                <rect x="4" y="5" width="16" height="15" rx="3" fill="#e0f2fe" stroke="#1e293b" strokeWidth="2.2" />
                <path d="M8 3v4M16 3v4M4 9.5h16" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M8.5 14.2 11 16.7 15.8 11.8" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Misi Harian</span>
              <span
                data-testid="daily-challenges-count"
                className={`rounded-lg border-2 border-[#1e293b] px-1.5 py-0.5 text-xs font-extrabold tabular-nums ${
                  dailyDoneCount === dailyTotalCount
                    ? 'bg-[#22c55e] text-white'
                    : 'bg-[#38bdf8] text-[#0f172a]'
                }`}
              >
                {dailyDoneCount}/{dailyTotalCount}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Single Flat Borderless Control Hint Line in Bottom Safe Margin */}
      <div className="w-full text-center sm:text-left">
        <p className="text-xs font-bold text-white hud-stroke-sm lg:hidden">
          HP / Tablet: Stik Analog Kiri Gerak · Tombol Kanan Lompat &amp; Terjang · Auto Lari Tersedia
        </p>
        <p className="hidden text-sm font-bold text-white hud-stroke-sm lg:block">
          WASD / Panah Gerak · Spasi Lompat · Shift Terjang · Esc Jeda · Kontrol Sentuh Otomatis di HP
        </p>
      </div>

      {showTopScores && (
        <TopScoresModal
          entries={topScores}
          onClose={() => setShowTopScores(false)}
          onClear={handleClearTopScores}
        />
      )}

      {showDailyChallenges && (
        <DailyChallengesModal
          state={dailyChallenges}
          onClose={() => setShowDailyChallenges(false)}
        />
      )}
    </div>
  );
};
