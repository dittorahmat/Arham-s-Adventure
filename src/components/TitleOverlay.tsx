import React, { useState } from 'react';
import { DailyChallengesState, loadDailyChallenges } from '../game/dailyChallenges';
import { DIFFICULTY_CATALOG, DIFFICULTY_LEVELS } from '../game/difficulty';
import { GAME_MODE_CATALOG, GAME_MODE_SELECTIONS } from '../game/gameModes';
import {
  clearLeaderboard,
  LeaderboardEntry,
  loadLeaderboard,
} from '../game/leaderboard';
import { GRADE_LEVELS, GRADE_META, SUBJECT_LABELS } from '../game/questions';
import {
  DifficultyLevel,
  GameModeSelection,
  GradeLevel,
  PlayableGameMode,
  SubjectFilter,
} from '../game/types';
import { ArhamSprite } from './ArhamSprite';
import { DailyChallengesModal } from './DailyChallengesModal';
import { PWAInstallButton } from './PWAInstallButton';
import { TopScoresModal } from './TopScoresModal';

interface TitleOverlayProps {
  nickname: string;
  onChangeNickname: (nickname: string) => void;
  selectedGrade: GradeLevel;
  onSelectGrade: (grade: GradeLevel) => void;
  selectedDifficulty: DifficultyLevel;
  onSelectDifficulty: (difficulty: DifficultyLevel) => void;
  selectedMode: GameModeSelection;
  previewMode: PlayableGameMode;
  onSelectMode: (mode: GameModeSelection) => void;
  selectedSubject: SubjectFilter;
  onSelectSubject: (subject: SubjectFilter) => void;
  onStart: () => void;
}

const SUBJECT_LIST: SubjectFilter[] = ['semua', 'matematika', 'ipa', 'ips', 'bahasa'];

const ModeIcon: React.FC<{ mode: GameModeSelection }> = ({ mode }) => {
  switch (mode) {
    case 'random':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="#ffffff" stroke="#1e293b" strokeWidth="2.1" />
          <circle cx="8.5" cy="8.5" r="1.6" fill="#db2777" />
          <circle cx="15.5" cy="8.5" r="1.6" fill="#2563eb" />
          <circle cx="12" cy="12" r="1.7" fill="#f59e0b" />
          <circle cx="8.5" cy="15.5" r="1.6" fill="#16a34a" />
          <circle cx="15.5" cy="15.5" r="1.6" fill="#7c3aed" />
        </svg>
      );
    case 'tile_fall':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="8" height="6" rx="1.5" fill="#22c55e" stroke="#1e293b" strokeWidth="2" />
          <rect x="13" y="4" width="8" height="6" rx="1.5" fill="#818cf8" stroke="#1e293b" strokeWidth="2" />
          <rect x="3" y="12" width="8" height="6" rx="1.5" fill="#facc15" stroke="#1e293b" strokeWidth="2" />
          <g transform="translate(17 17) rotate(18)">
            <rect x="-4" y="-3" width="8" height="6" rx="1.5" fill="#ef4444" stroke="#1e293b" strokeWidth="2" />
          </g>
        </svg>
      );
    case 'ice_slide':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" stroke="#0284c7" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.8" fill="#e0f2fe" stroke="#1e293b" strokeWidth="1.8" />
        </svg>
      );
    case 'laser_dash':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <rect x="2.5" y="7" width="3.5" height="10" rx="1.2" fill="#1e293b" />
          <rect x="18" y="7" width="3.5" height="10" rx="1.2" fill="#1e293b" />
          <line x1="6" y1="12" x2="18" y2="12" stroke="#f43f5e" strokeWidth="3.6" strokeLinecap="round" />
          <line x1="6" y1="12" x2="18" y2="12" stroke="#ffffff" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      );
    case 'honey_drop':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <polygon points="12,3 19.5,7.2 19.5,16.8 12,21 4.5,16.8 4.5,7.2" fill="#f59e0b" stroke="#1e293b" strokeWidth="2.1" strokeLinejoin="round" />
          <polygon points="12,7 16,9.2 16,14.8 12,17 8,14.8 8,9.2" fill="#fef08a" />
        </svg>
      );
    case 'classic':
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <path d="M5 19V5h11l-2.2 3.5L16 12H5" fill="#facc15" stroke="#1e293b" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx="17.5" cy="17.5" r="3" fill="#fb7185" stroke="#1e293b" strokeWidth="2" />
        </svg>
      );
  }
};

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  nickname,
  onChangeNickname,
  selectedGrade,
  onSelectGrade,
  selectedDifficulty,
  onSelectDifficulty,
  selectedMode,
  previewMode,
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
  const selectedMeta = GAME_MODE_CATALOG[selectedMode];
  const previewMeta = GAME_MODE_CATALOG[previewMode];
  const gradeMeta = GRADE_META[selectedGrade];
  const difficultyMeta = DIFFICULTY_CATALOG[selectedDifficulty];

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 lg:p-7">
      {/* Main Left-Third Negative-Space Lockup & Controls */}
      <div className="my-auto flex max-w-xl flex-col items-start gap-2.5 sm:gap-3.5">
        {/* Bespoke Inline SVG Title Emblem Lockup */}
        <div className="w-full max-w-[265px] sm:max-w-[365px]">
          <svg
            viewBox="0 0 460 190"
            role="img"
            aria-label="Arham's Adventure — Balap Kuis SD Kelas 1–6"
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

          <p className="mt-0.5 pl-2 font-display text-sm font-semibold text-white hud-stroke-sm sm:text-base">
            Balap Halang Rintang · Kuis SD Kelas 1–6
          </p>
        </div>

        {/* Grade + Difficulty + Game Mode + Subject Filter Compact Toy Setup Panel */}
        <div className="pointer-events-auto w-full max-w-xl space-y-2 rounded-2xl border-[3px] border-[#1e293b] bg-[#fffdf5]/95 p-2.5 sm:space-y-2.5 sm:p-3 toy-panel">
          {/* Guest Nickname Input */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-bold text-[#334155]">
              <label htmlFor="guest-nickname-input">Nama Panggilan</label>
              <span className="text-[11px] font-semibold text-[#64748b]">
                {nickname.trim().length}/16
              </span>
            </div>
            <input
              id="guest-nickname-input"
              type="text"
              value={nickname}
              maxLength={16}
              placeholder="Contoh: Arham"
              onChange={(e) => onChangeNickname(e.target.value)}
              className="w-full rounded-xl border-2 border-[#1e293b] bg-white px-3 py-1.5 font-display text-sm font-bold text-[#1e293b] outline-none focus:border-[#2563eb]"
            />
          </div>

          {/* Mandatory SD Grade Selector (Kelas 1 - Kelas 6, default Kelas 5) */}
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs font-bold text-[#334155]">
              <span>Pilih Kelas SD (Wajib)</span>
              <span
                className="truncate font-extrabold"
                style={{ color: gradeMeta.accentHex }}
                data-testid="grade-summary"
              >
                {gradeMeta.fullLabel}
                <span className="hidden font-semibold text-[#475569] sm:inline">
                  {' · '}
                  {gradeMeta.summary}
                </span>
              </span>
            </div>
            <div
              className="grid grid-cols-6 gap-1.5"
              role="radiogroup"
              aria-label="Pilih Kelas SD"
            >
              {GRADE_LEVELS.map((grade) => {
                const gMeta = GRADE_META[grade];
                const active = selectedGrade === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`grade-${grade}`}
                    onClick={(e) => {
                      onSelectGrade(grade);
                      e.currentTarget.blur();
                    }}
                    style={active ? { backgroundColor: gMeta.accentHex } : undefined}
                    className={`cursor-pointer whitespace-nowrap rounded-xl border-2 px-1 py-1.5 text-center font-display text-xs font-bold transition-transform sm:py-1.5 sm:text-[13px] ${
                      active
                        ? 'border-[#1e293b] text-white shadow-[0_3px_0_#1e293b]'
                        : 'border-[#cbd5e1] bg-white text-[#1e293b] hover:border-[#64748b] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    <span className="sm:hidden">{gMeta.shortLabel}</span>
                    <span className="hidden sm:inline">{gMeta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Selector (Easy / Medium / Hard) */}
          <div className="border-t-2 border-dashed border-[#e2e8f0] pt-2">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs font-bold text-[#334155]">
              <span>Tingkat Kesulitan</span>
              <span
                className="truncate font-extrabold"
                style={{ color: difficultyMeta.accentHex }}
                data-testid="difficulty-summary"
              >
                {difficultyMeta.subtitle}
              </span>
            </div>
            <div
              className="grid grid-cols-3 gap-1.5"
              role="radiogroup"
              aria-label="Tingkat Kesulitan"
            >
              {DIFFICULTY_LEVELS.map((diffId) => {
                const dMeta = DIFFICULTY_CATALOG[diffId];
                const active = selectedDifficulty === diffId;
                return (
                  <button
                    key={diffId}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    data-testid={`difficulty-${diffId}`}
                    onClick={(e) => {
                      onSelectDifficulty(diffId);
                      e.currentTarget.blur();
                    }}
                    style={active ? { backgroundColor: dMeta.accentHex } : undefined}
                    className={`flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 px-2 py-1.5 font-display text-xs font-bold transition-transform sm:text-[13px] ${
                      active
                        ? 'border-[#1e293b] text-white shadow-[0_3px_0_#1e293b]'
                        : 'border-[#cbd5e1] bg-white text-[#1e293b] hover:border-[#64748b] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 shrink-0 rounded-full border border-[#1e293b] ${
                        active ? 'bg-white' : ''
                      }`}
                      style={!active ? { backgroundColor: dMeta.accentHex } : undefined}
                    />
                    <span>{dMeta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6-Mode Selector: Mode Acak (Default) + 5 Playable Arenas */}
          <div className="border-t-2 border-dashed border-[#e2e8f0] pt-2">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs font-bold text-[#334155]">
              <span>Pilih Mode Balapan</span>
              <span
                className="font-extrabold"
                style={{ color: selectedMeta.accentHex }}
                data-testid="mode-preview-summary"
              >
                {selectedMode === 'random'
                  ? `Pratinjau: ${previewMeta.label}`
                  : selectedMeta.subtitle}
              </span>
            </div>
            <div
              className="grid grid-cols-2 gap-1.5 sm:grid-cols-3"
              role="radiogroup"
              aria-label="Pilih Mode Balapan"
            >
              {GAME_MODE_SELECTIONS.map((modeId) => {
                const meta = GAME_MODE_CATALOG[modeId];
                const active = selectedMode === modeId;
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
                    style={active ? { backgroundColor: meta.accentHex } : undefined}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border-2 px-2 py-1.5 text-left transition-transform sm:px-2.5 sm:py-2 ${
                      active
                        ? 'border-[#1e293b] text-white shadow-[0_3px_0_#1e293b]'
                        : 'border-[#cbd5e1] bg-white text-[#1e293b] hover:border-[#64748b] hover:bg-[#f1f5f9]'
                    }`}
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 border-[#1e293b] sm:h-7 sm:w-7"
                      style={{ backgroundColor: meta.iconBgHex }}
                    >
                      <ModeIcon mode={modeId} />
                    </span>
                    <span className="whitespace-nowrap font-display text-xs font-bold leading-tight sm:text-[13px]">
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subject Filter */}
          <div className="border-t-2 border-dashed border-[#e2e8f0] pt-2">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-xs font-bold text-[#334155]">
              <span>Pilih Mata Pelajaran {gradeMeta.fullLabel}</span>
              <span>{selectedMeta.gateSummary}</span>
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
                    className={`cursor-pointer whitespace-nowrap rounded-xl border-2 px-2.5 py-1.5 text-xs font-bold transition-transform sm:py-1.5 ${
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
        <div className="pointer-events-auto flex flex-col items-start gap-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-[#e0f2fe] p-1 shadow-[0_5px_0_#1e293b] sm:h-[72px] sm:w-[72px]">
              <ArhamSprite
                mood="idle-cheer"
                size={58}
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
              className="toy-btn cursor-pointer whitespace-nowrap rounded-2xl border-[3px] border-[#1e293b] bg-[#facc15] px-6 py-3.5 font-display text-xl font-bold tracking-wide text-[#0f172a] focus-visible:outline-4 focus-visible:outline-white sm:px-7 sm:py-4 sm:text-2xl"
            >
              Mulai Petualangan
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="open-top-scores"
              onClick={(e) => {
                e.currentTarget.blur();
                handleOpenTopScores();
              }}
              className="toy-btn flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl border-[3px] border-[#1e293b] bg-[#fffdf5] px-3.5 py-2.5 font-display text-sm font-bold text-[#0f172a] focus-visible:outline-4 focus-visible:outline-white sm:px-4 sm:py-3 sm:text-base"
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
              className="toy-btn flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-2xl border-[3px] border-[#1e293b] bg-[#fffdf5] px-3.5 py-2.5 font-display text-sm font-bold text-[#0f172a] focus-visible:outline-4 focus-visible:outline-white sm:px-4 sm:py-3 sm:text-base"
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

            <PWAInstallButton />
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
