import React, { useEffect, useState } from 'react';
import { formatLapTime, LeaderboardEntry } from '../game/leaderboard';
import { SUBJECT_LABELS } from '../game/questions';

interface TopScoresModalProps {
  entries: LeaderboardEntry[];
  onClose: () => void;
  onClear: () => void;
}

const MEDAL_STYLES = [
  { fill: '#facc15', ribbon: '#ef4444', bg: 'bg-[#fefce8]', border: 'border-[#ca8a04]', label: 'Emas' },
  { fill: '#e2e8f0', ribbon: '#2563eb', bg: 'bg-[#f8fafc]', border: 'border-[#64748b]', label: 'Perak' },
  { fill: '#fdba74', ribbon: '#16a34a', bg: 'bg-[#fff7ed]', border: 'border-[#c2410c]', label: 'Perunggu' },
] as const;

export const TopScoresModal: React.FC<TopScoresModalProps> = ({ entries, onClose, onClear }) => {
  const [confirmClear, setConfirmClear] = useState(false);

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
      aria-labelledby="top-scores-title"
      data-testid="top-scores-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-[#0f172a]/55 p-3 sm:p-4"
    >
      <div className="flex max-h-[88vh] w-full max-w-md flex-col rounded-3xl border-[4px] border-[#1e293b] bg-[#fffdf5] p-5 text-[#0f172a] toy-panel sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-[3px] border-[#1e293b] bg-[#facc15] shadow-[0_3px_0_#1e293b]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                <path
                  d="M7 4h10v5a5 5 0 0 1-10 0V4Z"
                  fill="#fef08a"
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
            </div>
            <div>
              <h2 id="top-scores-title" className="font-display text-2xl font-bold leading-tight text-[#0f172a]">
                Top Skor
              </h2>
              <p className="text-xs font-semibold text-[#475569]">
                5 Waktu Putaran Tercepat · Tersimpan di Perangkat
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Tutup Top Skor"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-[#1e293b] bg-white text-[#0f172a] shadow-[0_2px_0_#1e293b] hover:bg-[#f1f5f9] active:translate-y-0.5"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M5 5l10 10M15 5 5 15" />
            </svg>
          </button>
        </div>

        {/* Leaderboard List or Empty State */}
        <div className="mt-4 flex-1 overflow-y-auto pr-0.5">
          {entries.length === 0 ? (
            <div
              data-testid="top-scores-empty"
              className="rounded-2xl border-2 border-dashed border-[#94a3b8] bg-[#f8fafc] px-4 py-7 text-center"
            >
              <svg viewBox="0 0 48 48" className="mx-auto h-12 w-12" fill="none" aria-hidden="true">
                <circle cx="24" cy="26" r="15" fill="#e0f2fe" stroke="#1e293b" strokeWidth="3" />
                <path d="M24 18v8l5 4" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M19 8h10M24 8v3" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
              </svg>
              <p className="mt-3 font-display text-base font-bold text-[#0f172a]">
                Belum Ada Rekor Waktu Putaran
              </p>
              <p className="mt-1 text-xs font-medium text-[#475569]">
                Selesaikan balapan hingga garis finis untuk mencatat 5 waktu tercepatmu di sini!
              </p>
            </div>
          ) : (
            <ol data-testid="top-scores-list" className="flex flex-col gap-2">
              {entries.map((entry, idx) => {
                const medal = MEDAL_STYLES[idx];
                return (
                  <li
                    key={entry.id}
                    data-testid={`top-score-row-${idx + 1}`}
                    className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-3 py-2.5 ${
                      medal ? `${medal.bg} ${medal.border}` : 'border-[#cbd5e1] bg-white'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {/* Rank Medal / Number */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
                        {medal ? (
                          <svg viewBox="0 0 36 36" className="h-9 w-9" aria-label={`Peringkat ${idx + 1} (${medal.label})`}>
                            <path d="M12 4h12l-2 9h-8l-2-9Z" fill={medal.ribbon} stroke="#1e293b" strokeWidth="2" />
                            <circle cx="18" cy="22" r="10.5" fill={medal.fill} stroke="#1e293b" strokeWidth="2.4" />
                            <text
                              x="18"
                              y="26"
                              textAnchor="middle"
                              fontFamily="Fredoka, sans-serif"
                              fontWeight="700"
                              fontSize="12"
                              fill="#0f172a"
                            >
                              {idx + 1}
                            </text>
                          </svg>
                        ) : (
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1e293b] bg-[#f1f5f9] font-display text-xs font-bold tabular-nums text-[#334155]">
                            {idx + 1}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span
                            data-testid={`top-score-time-${idx + 1}`}
                            className="font-display text-xl font-bold tabular-nums text-[#0f172a]"
                          >
                            {formatLapTime(entry.lapTimeSeconds)}
                          </span>
                          <span className="text-[11px] font-extrabold text-[#2563eb]">
                            Finis #{entry.rank}
                          </span>
                        </div>
                        <p className="truncate text-[11px] font-semibold text-[#475569]">
                          {entry.grade ? `Kelas ${entry.grade} SD · ` : ''}
                          {SUBJECT_LABELS[entry.subject]} · Kuis {entry.correctCount}/{entry.totalGates}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-extrabold tracking-wider text-[#64748b]">SKOR</div>
                      <div className="font-display text-lg font-bold tabular-nums text-[#0f172a]">
                        {entry.score}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between gap-2.5">
          {entries.length > 0 ? (
            confirmClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  data-testid="confirm-clear-scores"
                  onClick={() => {
                    onClear();
                    setConfirmClear(false);
                  }}
                  className="cursor-pointer rounded-xl border-2 border-[#1e293b] bg-[#ef4444] px-3 py-2 text-xs font-bold text-white shadow-[0_2px_0_#1e293b]"
                >
                  Ya, Hapus
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="cursor-pointer rounded-xl border-2 border-[#cbd5e1] bg-white px-2.5 py-2 text-xs font-bold text-[#475569]"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="clear-scores-btn"
                onClick={() => setConfirmClear(true)}
                className="cursor-pointer rounded-xl border-2 border-[#cbd5e1] bg-white px-3 py-2 text-xs font-bold text-[#64748b] hover:border-[#ef4444] hover:text-[#dc2626]"
              >
                Hapus Rekor
              </button>
            )
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="toy-btn cursor-pointer rounded-2xl border-[3px] border-[#1e293b] bg-[#facc15] px-6 py-2.5 font-display text-base font-bold text-[#0f172a]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
