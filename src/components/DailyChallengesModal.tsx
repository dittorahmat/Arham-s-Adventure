import React, { useEffect } from 'react';
import {
  DailyChallengeIcon,
  DailyChallengesState,
  formatIndonesianDateKey,
} from '../game/dailyChallenges';

interface DailyChallengesModalProps {
  state: DailyChallengesState;
  onClose: () => void;
}

const ChallengeIconSvg: React.FC<{ icon: DailyChallengeIcon; completed: boolean }> = ({
  icon,
  completed,
}) => {
  const accent = completed ? '#22c55e' : '#38bdf8';
  switch (icon) {
    case 'quiz':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none" aria-hidden="true">
          <rect x="4" y="4" width="20" height="20" rx="5" fill={completed ? '#dcfce7' : '#fef9c3'} stroke="#1e293b" strokeWidth="2.2" />
          <path d="M9.5 14.5 12.8 17.8 19 10.5" stroke={completed ? '#16a34a' : '#2563eb'} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none" aria-hidden="true">
          <polygon
            points="14,3 17.2,10.2 25,11 19.2,16.2 20.8,24 14,20 7.2,24 8.8,16.2 3,11 10.8,10.2"
            fill="#facc15"
            stroke="#1e293b"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'bolt':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none" aria-hidden="true">
          <polygon
            points="15.5,3 6.5,15.5 13.5,15.5 12.2,25 21.5,12.5 14.5,12.5"
            fill="#facc15"
            stroke="#1e293b"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'flag':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none" aria-hidden="true">
          <path d="M7 5v19" stroke="#1e293b" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M8 6h13l-2.8 4.5L21 15H8V6Z" fill={accent} stroke="#1e293b" strokeWidth="2.2" strokeLinejoin="round" />
        </svg>
      );
    case 'trophy':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none" aria-hidden="true">
          <path d="M8 5h12v6a6 6 0 0 1-12 0V5Z" fill="#facc15" stroke="#1e293b" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M8 7H5.5a2 2 0 0 0 0 4H8M20 7h2.5a2 2 0 0 1 0 4H20" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M14 17v4.5M10 23h8" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case 'stopwatch':
      return (
        <svg viewBox="0 0 28 28" className="h-6 w-6" fill="none" aria-hidden="true">
          <circle cx="14" cy="15.5" r="8.5" fill={completed ? '#dcfce7' : '#e0f2fe'} stroke="#1e293b" strokeWidth="2.2" />
          <path d="M14 11v4.5l3 2" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11 4.5h6M14 4.5V7" stroke="#1e293b" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
  }
};

export const DailyChallengesModal: React.FC<DailyChallengesModalProps> = ({ state, onClose }) => {
  const completedCount = state.challenges.filter((c) => c.completed).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-challenges-title"
      data-testid="daily-challenges-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-[#0f172a]/55 p-3 sm:p-4"
    >
      <div className="flex max-h-[88vh] w-full max-w-md flex-col rounded-3xl border-[4px] border-[#1e293b] bg-[#fffdf5] p-5 text-[#0f172a] toy-panel sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-[#38bdf8] shadow-[0_3px_0_#1e293b]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                <rect x="4" y="5" width="16" height="15" rx="3" fill="#fffdf5" stroke="#1e293b" strokeWidth="2.2" />
                <path d="M8 3v4M16 3v4M4 9.5h16" stroke="#1e293b" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M8.5 14.2 11 16.7 15.8 11.8" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h2
                id="daily-challenges-title"
                className="font-display text-2xl font-bold leading-tight text-[#0f172a]"
              >
                Misi Harian
              </h2>
              <p className="text-xs font-semibold text-[#475569]">
                {formatIndonesianDateKey(state.dateKey)} · {completedCount}/{state.challenges.length} Selesai
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Tutup Misi Harian"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-[#1e293b] bg-white text-[#0f172a] shadow-[0_2px_0_#1e293b] hover:bg-[#f1f5f9] active:translate-y-0.5"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </div>

        {/* Daily Bonus Summary Banner */}
        <div className="mt-3.5 flex items-center justify-between rounded-2xl border-2 border-[#1e293b] bg-[#fefce8] px-3.5 py-2.5">
          <span className="text-xs font-bold text-[#854d0e]">Bonus Poin Misi Hari Ini</span>
          <span
            data-testid="daily-bonus-total"
            className="font-display text-lg font-bold tabular-nums text-[#b45309]"
          >
            +{state.totalBonusEarnedToday} Poin
          </span>
        </div>

        {/* 3 Daily Challenge Cards */}
        <ul data-testid="daily-challenges-list" className="mt-3 flex flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
          {state.challenges.map((ch) => {
            const pct = Math.min(100, Math.round((ch.progress / Math.max(1, ch.target)) * 100));
            return (
              <li
                key={ch.id}
                data-testid={`daily-challenge-${ch.id}`}
                className={`rounded-2xl border-2 p-3 ${
                  ch.completed
                    ? 'border-[#16a34a] bg-[#f0fdf4]'
                    : 'border-[#cbd5e1] bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-[#1e293b] bg-white">
                      <ChallengeIconSvg icon={ch.icon} completed={ch.completed} />
                    </div>
                    <div>
                      <h3 className="font-display text-base font-bold leading-snug text-[#0f172a]">
                        {ch.title}
                      </h3>
                      <p className="text-xs font-medium text-[#475569]">{ch.description}</p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-lg border-2 border-[#1e293b] px-2 py-0.5 font-display text-xs font-bold tabular-nums ${
                      ch.completed
                        ? 'bg-[#22c55e] text-white'
                        : 'bg-[#facc15] text-[#0f172a]'
                    }`}
                  >
                    {ch.completed ? `✓ +${ch.bonusPoints}` : `+${ch.bonusPoints}`}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full border-2 border-[#1e293b] bg-[#e2e8f0]">
                    <div
                      className={`h-full transition-all duration-200 ${
                        ch.completed ? 'bg-[#16a34a]' : 'bg-[#2563eb]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span
                    data-testid={`daily-progress-${ch.id}`}
                    className="w-11 text-right text-xs font-extrabold tabular-nums text-[#334155]"
                  >
                    {ch.progress}/{ch.target}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-[#64748b]">
            Bonus otomatis ditambahkan ke skor saat misi selesai!
          </p>
          <button
            type="button"
            onClick={onClose}
            className="toy-btn shrink-0 cursor-pointer rounded-2xl border-[3px] border-[#1e293b] bg-[#facc15] px-6 py-2.5 font-display text-base font-bold text-[#0f172a]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
