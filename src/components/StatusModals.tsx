import React from 'react';
import { GRADE_META, SUBJECT_COLORS } from '../game/questions';
import { GameOverSnapshot, GameState, GradeLevel } from '../game/types';
import { AchievementBadges } from './AchievementBadges';

interface StatusModalsProps {
  gameState: GameState;
  activeGrade: GradeLevel;
  gameOver: GameOverSnapshot | null;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  onWatchReplay: () => void;
}

export const StatusModals: React.FC<StatusModalsProps> = ({
  gameState,
  activeGrade,
  gameOver,
  onResume,
  onRestart,
  onReturnTitle,
  onWatchReplay,
}) => {
  if (gameState === 'paused') {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pause-title"
        className="fixed inset-0 z-30 flex items-center justify-center bg-[#0f172a]/55 p-4"
      >
        <div className="w-full max-w-sm rounded-3xl border-[4px] border-[#1e293b] bg-[#fffdf5] p-6 text-center toy-panel">
          <h2 id="pause-title" className="font-display text-3xl font-bold text-[#0f172a]">
            Permainan Dijeda
          </h2>
          <p className="mt-1 text-sm font-medium text-[#475569]">
            Siap lanjutkan petualangan kuis {GRADE_META[activeGrade].fullLabel} bersama Arham?
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={onResume}
              className="toy-btn w-full cursor-pointer rounded-2xl border-[3px] border-[#1e293b] bg-[#facc15] px-5 py-3 font-display text-lg font-bold text-[#0f172a]"
            >
              Lanjutkan
            </button>
            <button
              type="button"
              onClick={onRestart}
              className="toy-btn w-full cursor-pointer rounded-2xl border-[3px] border-[#1e293b] bg-[#38bdf8] px-5 py-3 font-display text-lg font-bold text-[#0f172a]"
            >
              Ulangi Balapan
            </button>
            <button
              type="button"
              onClick={onReturnTitle}
              className="w-full cursor-pointer rounded-2xl border-[3px] border-[#cbd5e1] bg-white px-5 py-2.5 text-sm font-bold text-[#334155] hover:border-[#64748b] hover:bg-[#f8fafc]"
            >
              Ke Menu Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'gameover' && gameOver) {
    const isWin = gameOver.outcome === 'victory';
    const headline = isWin
      ? gameOver.rank === 1
        ? 'Juara #1! Hebat Arham!'
        : `Finis Peringkat #${gameOver.rank}!`
      : 'Waktu Habis!';

    const gradeLabel = GRADE_META[gameOver.grade].fullLabel;
    const subtitle = isWin
      ? `Kamu berhasil menaklukkan lintasan langit dan ${gameOver.totalGates} gerbang kuis ${gradeLabel}.`
      : `Kamu mencapai ${gameOver.progressPct}% lintasan. Yuk coba lagi dan taklukkan garis finis!`;

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gameover-title"
        className="fixed inset-0 z-30 flex items-center justify-center bg-[#0f172a]/60 p-3 sm:p-4"
      >
        <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border-[4px] border-[#1e293b] bg-[#fffdf5] p-5 sm:p-6 toy-panel">
          <div className="text-center">
            <h2
              id="gameover-title"
              className={`font-display text-3xl font-bold sm:text-4xl ${
                isWin ? 'text-[#16a34a]' : 'text-[#dc2626]'
              }`}
            >
              {headline}
            </h2>
            <p className="mt-1 text-sm font-medium text-[#475569]">{subtitle}</p>
          </div>

          {/* 3 Tabular Mastery / Progress Metrics */}
          <div className="mt-4 grid grid-cols-3 gap-2.5 text-center sm:gap-3">
            <div className="rounded-2xl border-2 border-[#1e293b] bg-[#eff6ff] p-2.5 sm:p-3">
              <div className="text-[11px] font-extrabold text-[#2563eb]">
                {isWin ? 'PERINGKAT' : 'PROGRES'}
              </div>
              <div className="font-display text-2xl font-bold tabular-nums text-[#0f172a]">
                {isWin ? `#${gameOver.rank}/${gameOver.totalRacers}` : `${gameOver.progressPct}%`}
              </div>
              <div className="text-xs font-semibold tabular-nums text-[#475569]">
                {gameOver.isNewFastestLap
                  ? `Tercepat ${gameOver.clearTime} dtk!`
                  : gameOver.fastestLapSeconds !== null
                    ? `${gameOver.clearTime} dtk · Rekor ${gameOver.fastestLapSeconds} dtk`
                    : `Waktu ${gameOver.clearTime} dtk`}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-[#1e293b] bg-[#f0fdf4] p-2.5 sm:p-3">
              <div className="text-[11px] font-extrabold text-[#16a34a]">KUIS BENAR</div>
              <div className="font-display text-2xl font-bold tabular-nums text-[#0f172a]">
                {gameOver.correctCount}/{gameOver.totalGates}
              </div>
              <div className="text-xs font-semibold tabular-nums text-[#475569]">
                Rekor Beruntun {gameOver.bestAnswerStreak}×
              </div>
            </div>

            <div className="rounded-2xl border-2 border-[#1e293b] bg-[#fefce8] p-2.5 sm:p-3">
              <div className="text-[11px] font-extrabold text-[#ca8a04]">SKOR AKHIR</div>
              <div className="font-display text-2xl font-bold tabular-nums text-[#0f172a]">
                {gameOver.score}
              </div>
              <div className="text-xs font-semibold tabular-nums text-[#475569]">
                Rekor {gameOver.bestScore} · ★ {gameOver.starsCollected}/{gameOver.totalStars}
              </div>
            </div>
          </div>

          {/* Scrollable Body: Achievement Badges + Daily Challenges + Lesson Review */}
          <div className="mt-1 flex-1 overflow-y-auto pr-1">
            <AchievementBadges
              badges={gameOver.achievements}
              newlyUnlockedCount={gameOver.newlyUnlockedCount}
            />

            {/* Daily Challenges Summary */}
            {gameOver.dailyChallenges.length > 0 && (
              <div
                data-testid="gameover-daily-challenges"
                className="mt-3 rounded-2xl border-2 border-[#1e293b] bg-[#f0f9ff] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-extrabold tracking-wide text-[#0369a1]">
                    Misi Harian Hari Ini
                  </h3>
                  {gameOver.dailyBonusPointsThisRun > 0 && (
                    <span
                      data-testid="gameover-daily-bonus"
                      className="rounded-lg border border-[#1e293b] bg-[#facc15] px-2 py-0.5 font-display text-xs font-bold tabular-nums text-[#0f172a]"
                    >
                      Bonus +{gameOver.dailyBonusPointsThisRun} Poin!
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                  {gameOver.dailyChallenges.map((ch) => {
                    const completedNow = gameOver.dailyChallengesCompletedThisRun.includes(ch.id);
                    return (
                      <div
                        key={ch.id}
                        className={`rounded-xl border-2 px-2.5 py-2 text-left ${
                          ch.completed
                            ? 'border-[#16a34a] bg-[#dcfce7]'
                            : 'border-[#cbd5e1] bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-bold text-[#0f172a]">
                            {ch.title}
                          </span>
                          <span
                            className={`shrink-0 text-[11px] font-extrabold tabular-nums ${
                              ch.completed ? 'text-[#15803d]' : 'text-[#64748b]'
                            }`}
                          >
                            {ch.progress}/{ch.target}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] font-semibold text-[#475569]">
                          {completedNow
                            ? `Baru Selesai · +${ch.bonusPoints} Poin`
                            : ch.completed
                              ? `Selesai · +${ch.bonusPoints} Poin`
                              : `Hadiah +${ch.bonusPoints} Poin`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mini Educational Review of the Race Questions */}
            <div className="mt-3 rounded-2xl border-2 border-[#cbd5e1] bg-white p-3">
              <h3 className="mb-1.5 text-xs font-extrabold tracking-wide text-[#334155]">
                Rangkuman Materi {gradeLabel} Hari Ini
              </h3>
              <div className="flex flex-col divide-y divide-[#e2e8f0]">
                {gameOver.review.map((item) => {
                  const subj = SUBJECT_COLORS[item.subject];
                  return (
                    <div key={item.gateIndex} className="py-2 text-left text-xs">
                      <div className="flex items-center justify-between gap-2 font-bold text-[#0f172a]">
                        <span>
                          {item.gateIndex + 1}. {subj.label} — {item.question}
                        </span>
                        <span className={item.firstTryCorrect ? 'shrink-0 text-[#16a34a]' : 'shrink-0 text-[#d97706]'}>
                          {item.firstTryCorrect ? 'Tepat' : 'Belajar'}
                        </span>
                      </div>
                      <p className="mt-0.5 font-semibold text-[#1e3a8a]">
                        Jawaban: {item.correctAnswer} ·{' '}
                        <span className="font-normal text-[#475569]">{item.explanation}</span>
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Outcome Actions */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="toy-btn flex-1 cursor-pointer whitespace-nowrap rounded-2xl border-[3px] border-[#1e293b] bg-[#facc15] px-5 py-3 font-display text-lg font-bold text-[#0f172a]"
            >
              Main Lagi
            </button>
            {isWin && gameOver.hasFinishReplay && (
              <button
                type="button"
                data-testid="watch-replay"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onWatchReplay();
                }}
                className="toy-btn flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-2xl border-[3px] border-[#1e293b] bg-[#38bdf8] px-4 py-3 font-display text-base font-bold text-[#0f172a]"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" aria-hidden="true">
                  <rect x="3" y="6" width="13" height="12" rx="2.5" fill="#0f172a" />
                  <polygon points="16,10 21.5,7 21.5,17 16,14" fill="#ef4444" stroke="#0f172a" strokeWidth="1.6" strokeLinejoin="round" />
                  <polygon points="8,9.5 12.8,12 8,14.5" fill="#facc15" />
                </svg>
                <span>Replay Finis (5 dtk)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onReturnTitle}
              className="cursor-pointer whitespace-nowrap rounded-2xl border-[3px] border-[#cbd5e1] bg-white px-5 py-3 text-sm font-bold text-[#334155] hover:border-[#64748b] hover:bg-[#f8fafc]"
            >
              Menu Utama
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
