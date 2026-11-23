import React from 'react';
import { AchievementBadgeView, AchievementIconKind } from '../game/types';

interface AchievementBadgesProps {
  badges: AchievementBadgeView[];
  newlyUnlockedCount: number;
}

const BadgeMedallionIcon: React.FC<{
  kind: AchievementIconKind;
  unlocked: boolean;
  accentHex: string;
}> = ({ kind, unlocked, accentHex }) => {
  const outerFill = unlocked ? accentHex : '#e2e8f0';
  const strokeColor = unlocked ? '#1e293b' : '#94a3b8';
  const innerFill = unlocked ? '#fffbeb' : '#cbd5e1';

  return (
    <svg viewBox="0 0 36 36" className="h-10 w-10 shrink-0" aria-hidden="true">
      {/* Outer scalloped/rounded medallion socket */}
      <circle
        cx="18"
        cy="18"
        r="15.5"
        fill={outerFill}
        stroke={strokeColor}
        strokeWidth="2.6"
      />
      {/* Top specular highlight arc */}
      {unlocked && (
        <path
          d="M9 11 A11 11 0 0 1 27 11"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      )}

      {kind === 'streak' && (
        <path
          d="M20 7 L11.5 19.5 H17.5 L16 29 L24.5 16.5 H18.5 Z"
          fill={innerFill}
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )}

      {kind === 'stopwatch' && (
        <g stroke={strokeColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="15" y1="8" x2="21" y2="8" />
          <line x1="18" y1="8" x2="18" y2="11" />
          <circle cx="18" cy="20" r="8" fill={innerFill} />
          <polyline points="18,15.5 18,20 21.5,21.5" fill="none" />
        </g>
      )}

      {kind === 'trophy' && (
        <g stroke={strokeColor} strokeWidth="1.8" strokeLinejoin="round">
          <path d="M12 10 H24 V16 C24 19.5 21.3 22 18 22 C14.7 22 12 19.5 12 16 Z" fill={innerFill} />
          <path d="M12 12 H9.5 C9.5 15.5 10.5 17 12.5 17.5" fill="none" />
          <path d="M24 12 H26.5 C26.5 15.5 25.5 17 23.5 17.5" fill="none" />
          <line x1="18" y1="22" x2="18" y2="26" />
          <rect x="13.5" y="26" width="9" height="2.6" rx="1" fill={innerFill} />
        </g>
      )}

      {kind === 'perfect' && (
        <g stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8 L26 11.5 V18 C26 23 22.5 26.5 18 28.5 C13.5 26.5 10 23 10 18 V11.5 Z" fill={innerFill} />
          <polyline points="14,18.2 17,21.2 22.5,15.2" fill="none" />
        </g>
      )}

      {kind === 'star' && (
        <polygon
          points="18,8.5 20.8,14.5 27.3,15.3 22.5,19.8 23.8,26.3 18,23.1 12.2,26.3 13.5,19.8 8.7,15.3 15.2,14.5"
          fill={innerFill}
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )}

      {kind === 'flag' && (
        <g stroke={strokeColor} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="9" x2="12" y2="27.5" />
          <path d="M12 10 H25 L22.2 14.5 L25 19 H12 Z" fill={innerFill} />
        </g>
      )}
    </svg>
  );
};

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({
  badges,
  newlyUnlockedCount,
}) => {
  const unlockedCount = badges.filter((b) => b.unlocked).length;

  return (
    <section
      aria-labelledby="achievements-heading"
      data-testid="achievements-section"
      className="mt-4 rounded-2xl border-2 border-[#1e293b] bg-[#f8fafc] p-3"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2 text-xs font-extrabold text-[#1e293b]">
        <h3 id="achievements-heading" className="tracking-wide">
          Lencana Pencapaian ·{' '}
          <span className="tabular-nums text-[#2563eb]">
            {unlockedCount}/{badges.length} Terbuka
          </span>
        </h3>
        {newlyUnlockedCount > 0 && (
          <span className="font-display text-xs font-bold text-[#16a34a]">
            +{newlyUnlockedCount} Lencana Baru!
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            data-achievement-id={badge.id}
            data-unlocked={badge.unlocked ? 'true' : 'false'}
            className={`relative flex items-center gap-2.5 rounded-xl border-2 p-2.5 text-left ${
              badge.newlyUnlocked
                ? 'border-[#1e293b] bg-[#fef9c3] shadow-[0_3px_0_#1e293b]'
                : badge.unlocked
                  ? 'border-[#cbd5e1] bg-white'
                  : 'border-dashed border-[#cbd5e1] bg-[#f1f5f9] opacity-75'
            }`}
          >
            <BadgeMedallionIcon
              kind={badge.icon}
              unlocked={badge.unlocked}
              accentHex={badge.accentHex}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1.5">
                <span
                  className={`truncate font-display text-sm font-bold ${
                    badge.unlocked ? 'text-[#0f172a]' : 'text-[#475569]'
                  }`}
                >
                  {badge.title}
                </span>
                {badge.newlyUnlocked && (
                  <span className="shrink-0 rounded-md border border-[#1e293b] bg-[#ef4444] px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white">
                    BARU
                  </span>
                )}
              </div>
              <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-[#475569]">
                {badge.description}
              </p>
              <div className="mt-0.5 text-[11px] font-bold tabular-nums text-[#0369a1]">
                {badge.unlocked ? 'Terbuka' : 'Terkunci'} · {badge.progressText}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
