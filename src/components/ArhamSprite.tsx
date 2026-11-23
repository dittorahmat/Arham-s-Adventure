import React from 'react';
import { ArhamSpriteMood, getSpriteFrameDurationMs } from '../game/spriteMood';

interface ArhamSpriteProps {
  mood: ArhamSpriteMood;
  size?: number;
  label?: string;
  showShadow?: boolean;
  className?: string;
}

interface PoseParams {
  bodyY: number;
  tiltDeg: number;
  leftLegDeg: number;
  rightLegDeg: number;
  leftArmDeg: number;
  rightArmDeg: number;
  capTiltDeg: number;
  eyeMode: 'open' | 'wink' | 'happy' | 'dizzy';
  mouthMode: 'smile' | 'open' | 'oof';
  sparkle?: 'star' | 'dizzy' | 'sweat';
}

const POSES_BY_MOOD: Record<ArhamSpriteMood, [PoseParams, PoseParams, PoseParams, PoseParams]> = {
  'idle-cheer': [
    {
      bodyY: 0,
      tiltDeg: 0,
      leftLegDeg: 0,
      rightLegDeg: 0,
      leftArmDeg: -14,
      rightArmDeg: 18,
      capTiltDeg: 0,
      eyeMode: 'open',
      mouthMode: 'smile',
    },
    {
      bodyY: 3,
      tiltDeg: -3,
      leftLegDeg: 8,
      rightLegDeg: -8,
      leftArmDeg: -28,
      rightArmDeg: 32,
      capTiltDeg: -4,
      eyeMode: 'open',
      mouthMode: 'smile',
    },
    {
      bodyY: -7,
      tiltDeg: 4,
      leftLegDeg: -18,
      rightLegDeg: 18,
      leftArmDeg: -125,
      rightArmDeg: 125,
      capTiltDeg: 6,
      eyeMode: 'happy',
      mouthMode: 'open',
      sparkle: 'star',
    },
    {
      bodyY: -1,
      tiltDeg: -2,
      leftLegDeg: 6,
      rightLegDeg: -6,
      leftArmDeg: -95,
      rightArmDeg: 28,
      capTiltDeg: -3,
      eyeMode: 'wink',
      mouthMode: 'smile',
      sparkle: 'star',
    },
  ],
  run: [
    {
      bodyY: -2,
      tiltDeg: 7,
      leftLegDeg: 28,
      rightLegDeg: -26,
      leftArmDeg: -34,
      rightArmDeg: 34,
      capTiltDeg: 4,
      eyeMode: 'open',
      mouthMode: 'smile',
    },
    {
      bodyY: 2,
      tiltDeg: 5,
      leftLegDeg: 4,
      rightLegDeg: -4,
      leftArmDeg: -8,
      rightArmDeg: 10,
      capTiltDeg: 2,
      eyeMode: 'open',
      mouthMode: 'smile',
    },
    {
      bodyY: -3,
      tiltDeg: 8,
      leftLegDeg: -28,
      rightLegDeg: 28,
      leftArmDeg: 36,
      rightArmDeg: -36,
      capTiltDeg: 5,
      eyeMode: 'open',
      mouthMode: 'open',
    },
    {
      bodyY: 1,
      tiltDeg: 5,
      leftLegDeg: -6,
      rightLegDeg: 6,
      leftArmDeg: 10,
      rightArmDeg: -10,
      capTiltDeg: 2,
      eyeMode: 'open',
      mouthMode: 'smile',
    },
  ],
  celebrate: [
    {
      bodyY: 2,
      tiltDeg: -4,
      leftLegDeg: 10,
      rightLegDeg: -10,
      leftArmDeg: -115,
      rightArmDeg: 115,
      capTiltDeg: -4,
      eyeMode: 'happy',
      mouthMode: 'open',
      sparkle: 'star',
    },
    {
      bodyY: -7,
      tiltDeg: 4,
      leftLegDeg: -20,
      rightLegDeg: 20,
      leftArmDeg: -140,
      rightArmDeg: 140,
      capTiltDeg: 5,
      eyeMode: 'happy',
      mouthMode: 'open',
      sparkle: 'star',
    },
    {
      bodyY: 1,
      tiltDeg: 3,
      leftLegDeg: -8,
      rightLegDeg: 8,
      leftArmDeg: -118,
      rightArmDeg: 118,
      capTiltDeg: 3,
      eyeMode: 'wink',
      mouthMode: 'open',
      sparkle: 'star',
    },
    {
      bodyY: -5,
      tiltDeg: -3,
      leftLegDeg: 16,
      rightLegDeg: -16,
      leftArmDeg: -135,
      rightArmDeg: 135,
      capTiltDeg: -5,
      eyeMode: 'happy',
      mouthMode: 'open',
      sparkle: 'star',
    },
  ],
  bonk: [
    {
      bodyY: 1,
      tiltDeg: -12,
      leftLegDeg: 18,
      rightLegDeg: -12,
      leftArmDeg: -55,
      rightArmDeg: 55,
      capTiltDeg: -14,
      eyeMode: 'dizzy',
      mouthMode: 'oof',
      sparkle: 'dizzy',
    },
    {
      bodyY: -2,
      tiltDeg: 10,
      leftLegDeg: -14,
      rightLegDeg: 18,
      leftArmDeg: -75,
      rightArmDeg: 40,
      capTiltDeg: 12,
      eyeMode: 'dizzy',
      mouthMode: 'oof',
      sparkle: 'dizzy',
    },
    {
      bodyY: 2,
      tiltDeg: -8,
      leftLegDeg: 12,
      rightLegDeg: -10,
      leftArmDeg: -45,
      rightArmDeg: 68,
      capTiltDeg: -10,
      eyeMode: 'dizzy',
      mouthMode: 'oof',
      sparkle: 'dizzy',
    },
    {
      bodyY: 0,
      tiltDeg: 8,
      leftLegDeg: -10,
      rightLegDeg: 12,
      leftArmDeg: -60,
      rightArmDeg: 45,
      capTiltDeg: 8,
      eyeMode: 'dizzy',
      mouthMode: 'oof',
      sparkle: 'dizzy',
    },
  ],
};

/**
 * Single crisp cartoon frame of Arham matching his exact 3D uniform:
 * royal-blue explorer cap + dark visor, white SD shirt, red shorts/vest, yellow backpack, sneakers.
 */
const ArhamPoseFrame: React.FC<{ pose: PoseParams; frameIndex: number }> = ({ pose, frameIndex }) => {
  return (
    <svg viewBox="0 0 80 80" className="h-full w-full shrink-0" aria-hidden="true">
      <g transform={`translate(40 ${44 + pose.bodyY}) rotate(${pose.tiltDeg}) translate(-40 -44)`}>
        {/* Yellow Backpack peeking behind shoulders */}
        <rect
          x="19"
          y="39"
          width="42"
          height="21"
          rx="7"
          fill="#facc15"
          stroke="#1e293b"
          strokeWidth="3.2"
        />

        {/* Articulating Left & Right Legs + Sneakers */}
        <g transform={`translate(33 58) rotate(${pose.leftLegDeg})`}>
          <rect x="-5.5" y="0" width="11" height="11" rx="4" fill="#ef4444" stroke="#1e293b" strokeWidth="2.8" />
          <rect x="-7" y="9" width="14" height="6.5" rx="3" fill="#1e293b" />
          <rect x="-6.5" y="13.5" width="13" height="2.4" rx="1" fill="#f8fafc" />
        </g>
        <g transform={`translate(47 58) rotate(${pose.rightLegDeg})`}>
          <rect x="-5.5" y="0" width="11" height="11" rx="4" fill="#ef4444" stroke="#1e293b" strokeWidth="2.8" />
          <rect x="-7" y="9" width="14" height="6.5" rx="3" fill="#1e293b" />
          <rect x="-6.5" y="13.5" width="13" height="2.4" rx="1" fill="#f8fafc" />
        </g>

        {/* Left & Right Arms */}
        <g transform={`translate(25 45) rotate(${pose.leftArmDeg})`}>
          <rect x="-4.5" y="0" width="9" height="13" rx="4.5" fill="#ffffff" stroke="#1e293b" strokeWidth="2.8" />
          <circle cx="0" cy="14" r="4.2" fill="#f1c29b" stroke="#1e293b" strokeWidth="2.4" />
        </g>
        <g transform={`translate(55 45) rotate(${pose.rightArmDeg})`}>
          <rect x="-4.5" y="0" width="9" height="13" rx="4.5" fill="#ffffff" stroke="#1e293b" strokeWidth="2.8" />
          <circle cx="0" cy="14" r="4.2" fill="#f1c29b" stroke="#1e293b" strokeWidth="2.4" />
        </g>

        {/* Crisp White SD Shirt & Red Shorts Belt */}
        <rect
          x="26"
          y="39"
          width="28"
          height="22"
          rx="10"
          fill="#ffffff"
          stroke="#1e293b"
          strokeWidth="3.2"
        />
        <path
          d="M27.5 52 H52.5 V56 C52.5 59.5 49.5 61 46 61 H34 C30.5 61 27.5 59.5 27.5 56 Z"
          fill="#ef4444"
          stroke="#1e293b"
          strokeWidth="2.6"
        />
        {/* Cute red SD collar tie */}
        <polygon points="37,40 43,40 41.5,48 40,50 38.5,48" fill="#ef4444" />

        {/* Rounded Head */}
        <circle
          cx="40"
          cy="28"
          r="15.5"
          fill="#f1c29b"
          stroke="#1e293b"
          strokeWidth="3.2"
        />

        {/* Cheek Blush */}
        <ellipse cx="30.5" cy="31.5" rx="2.6" ry="1.6" fill="#fb7185" opacity="0.55" />
        <ellipse cx="49.5" cy="31.5" rx="2.6" ry="1.6" fill="#fb7185" opacity="0.55" />

        {/* Expressive Eyes */}
        {pose.eyeMode === 'open' && (
          <>
            <circle cx="34.5" cy="27.5" r="2.5" fill="#0f172a" />
            <circle cx="35.3" cy="26.7" r="0.8" fill="#ffffff" />
            <circle cx="45.5" cy="27.5" r="2.5" fill="#0f172a" />
            <circle cx="46.3" cy="26.7" r="0.8" fill="#ffffff" />
          </>
        )}
        {pose.eyeMode === 'happy' && (
          <g fill="none" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round">
            <path d="M31.5 28 Q34.5 24 37.5 28" />
            <path d="M42.5 28 Q45.5 24 48.5 28" />
          </g>
        )}
        {pose.eyeMode === 'wink' && (
          <>
            <circle cx="34.5" cy="27.5" r="2.5" fill="#0f172a" />
            <circle cx="35.3" cy="26.7" r="0.8" fill="#ffffff" />
            <path d="M42.5 28 Q45.5 24.5 48.5 28" fill="none" stroke="#0f172a" strokeWidth="2.6" strokeLinecap="round" />
          </>
        )}
        {pose.eyeMode === 'dizzy' && (
          <g stroke="#0f172a" strokeWidth="2.3" strokeLinecap="round">
            <line x1="32.5" y1="25.5" x2="36.5" y2="29.5" />
            <line x1="36.5" y1="25.5" x2="32.5" y2="29.5" />
            <line x1="43.5" y1="25.5" x2="47.5" y2="29.5" />
            <line x1="47.5" y1="25.5" x2="43.5" y2="29.5" />
          </g>
        )}

        {/* Mouth */}
        {pose.mouthMode === 'smile' && (
          <path d="M36 33.5 Q40 37.2 44 33.5" fill="none" stroke="#1e293b" strokeWidth="2.3" strokeLinecap="round" />
        )}
        {pose.mouthMode === 'open' && (
          <path d="M35.5 33 Q40 39 44.5 33 Z" fill="#ef4444" stroke="#1e293b" strokeWidth="2" strokeLinejoin="round" />
        )}
        {pose.mouthMode === 'oof' && (
          <circle cx="40" cy="35" r="2.8" fill="#1e293b" />
        )}

        {/* Royal Blue Explorer Cap + Dark Visor */}
        <g transform={`translate(40 19) rotate(${pose.capTiltDeg}) translate(-40 -19)`}>
          <path
            d="M23.5 22 C24 10.5 56 10.5 56.5 22 Z"
            fill="#2563eb"
            stroke="#1e293b"
            strokeWidth="3.2"
            strokeLinejoin="round"
          />
          {/* Cap golden star pin */}
          <circle cx="40" cy="15.5" r="2.6" fill="#facc15" stroke="#1e293b" strokeWidth="1.4" />
          {/* Visor brim */}
          <path
            d="M25 21.5 Q42 18.5 60 22.5 Q43 24.5 25 22.5 Z"
            fill="#1e293b"
          />
        </g>
      </g>

      {/* Frame-synced celebration stars or dizzy stars */}
      {pose.sparkle === 'star' && (
        <g>
          <polygon
            points="12,15 14,19 18.5,19.5 15,22.5 16,27 12,24.5 8,27 9,22.5 5.5,19.5 10,19"
            fill="#facc15"
            stroke="#1e293b"
            strokeWidth="1.6"
            transform={`translate(${frameIndex % 2 === 0 ? 0 : 2} ${frameIndex % 2 === 0 ? 0 : -3})`}
          />
          <polygon
            points="68,12 69.6,15.2 73,15.6 70.4,18 71.2,21.4 68,19.5 64.8,21.4 65.6,18 63,15.6 66.4,15.2"
            fill="#fef08a"
            stroke="#1e293b"
            strokeWidth="1.5"
            transform={`translate(${frameIndex % 2 === 0 ? 0 : -2} ${frameIndex % 2 === 0 ? 2 : -1})`}
          />
        </g>
      )}
      {pose.sparkle === 'dizzy' && (
        <g>
          <polygon
            points="16,9 17.5,12 20.5,12.4 18.2,14.5 18.8,17.5 16,16 13.2,17.5 13.8,14.5 11.5,12.4 14.5,12"
            fill="#fde047"
            stroke="#1e293b"
            strokeWidth="1.5"
            transform={`translate(${frameIndex * 6} ${frameIndex % 2 === 0 ? 0 : 3})`}
          />
          <polygon
            points="62,10 63.5,13 66.5,13.4 64.2,15.5 64.8,18.5 62,17 59.2,18.5 59.8,15.5 57.5,13.4 60.5,13"
            fill="#fb7185"
            stroke="#1e293b"
            strokeWidth="1.5"
            transform={`translate(${-frameIndex * 5} ${frameIndex % 2 === 0 ? 3 : 0})`}
          />
        </g>
      )}
    </svg>
  );
};

export const ArhamSprite: React.FC<ArhamSpriteProps> = ({
  mood,
  size = 64,
  label = 'Animasi karakter Arham',
  showShadow = true,
  className = '',
}) => {
  const frames = POSES_BY_MOOD[mood];
  const durationMs = getSpriteFrameDurationMs(mood);

  return (
    <div
      role="img"
      aria-label={label}
      data-testid="arham-sprite"
      data-sprite-mood={mood}
      className={`relative shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {showShadow && (
        <div
          aria-hidden="true"
          className="arham-sprite-shadow pointer-events-none absolute bottom-0.5 left-1/2 h-2 w-3/5 -translate-x-1/2 rounded-full bg-[#0f172a]"
        />
      )}
      <div className="h-full w-full overflow-hidden">
        <div
          className="arham-sprite-strip"
          style={{ animationDuration: `${durationMs}ms` }}
        >
          {frames.map((pose, idx) => (
            <div key={idx} className="h-full w-1/4 shrink-0">
              <ArhamPoseFrame pose={pose} frameIndex={idx} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
