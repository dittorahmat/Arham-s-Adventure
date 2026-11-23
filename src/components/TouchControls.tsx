import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  combineJoystickWithAutoRun,
  computeJoystickVector,
  triggerHapticFeedback,
} from '../game/touchControls';

interface TouchControlsProps {
  diveReadyPct: number;
  onVirtualMove: (mx: number, mz: number) => void;
  onVirtualJump: (pressed: boolean) => void;
  onVirtualDive: () => void;
}

const JOYSTICK_MAX_RADIUS = 44;

export const TouchControls: React.FC<TouchControlsProps> = ({
  diveReadyPct,
  onVirtualMove,
  onVirtualJump,
  onVirtualDive,
}) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const stickPointerIdRef = useRef<number | null>(null);
  const jumpPointerIdRef = useRef<number | null>(null);
  const rawStickRef = useRef<{ moveX: number; moveZ: number }>({ moveX: 0, moveZ: 0 });
  const autoRunRef = useRef(false);

  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [stickActive, setStickActive] = useState(false);
  const [jumpPressed, setJumpPressed] = useState(false);
  const [divePressed, setDivePressed] = useState(false);
  const [autoRun, setAutoRun] = useState(false);

  const emitCombinedMove = useCallback(
    (rawX: number, rawZ: number, isAutoRun: boolean) => {
      const combined = combineJoystickWithAutoRun({ moveX: rawX, moveZ: rawZ }, isAutoRun);
      onVirtualMove(combined.moveX, combined.moveZ);
    },
    [onVirtualMove],
  );

  // Sync Auto-Run toggle into live movement immediately
  useEffect(() => {
    autoRunRef.current = autoRun;
    emitCombinedMove(rawStickRef.current.moveX, rawStickRef.current.moveZ, autoRun);
  }, [autoRun, emitCombinedMove]);

  // Safety cleanup: always clear virtual inputs when unmounted or when window loses focus
  useEffect(() => {
    const handleBlur = () => {
      stickPointerIdRef.current = null;
      jumpPointerIdRef.current = null;
      rawStickRef.current = { moveX: 0, moveZ: 0 };
      setKnobPos({ x: 0, y: 0 });
      setStickActive(false);
      setJumpPressed(false);
      setDivePressed(false);
      onVirtualMove(0, 0);
      onVirtualJump(false);
    };
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
      onVirtualMove(0, 0);
      onVirtualJump(false);
    };
  }, [onVirtualJump, onVirtualMove]);

  const updateStickFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      const centerX = rect.left + rect.width * 0.5;
      const centerY = rect.top + rect.height * 0.5;
      const vec = computeJoystickVector(clientX - centerX, clientY - centerY, JOYSTICK_MAX_RADIUS);
      rawStickRef.current = { moveX: vec.moveX, moveZ: vec.moveZ };
      setKnobPos({ x: vec.knobX, y: vec.knobY });
      emitCombinedMove(vec.moveX, vec.moveZ, autoRunRef.current);
    },
    [emitCombinedMove],
  );

  const releaseStick = useCallback(() => {
    stickPointerIdRef.current = null;
    rawStickRef.current = { moveX: 0, moveZ: 0 };
    setStickActive(false);
    setKnobPos({ x: 0, y: 0 });
    emitCombinedMove(0, 0, autoRunRef.current);
  }, [emitCombinedMove]);

  const handleStickPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointerIdRef.current !== null) return;
    e.preventDefault();
    stickPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events without active pointer capture support
    }
    setStickActive(true);
    updateStickFromClientPoint(e.clientX, e.clientY);
  };

  const handleStickPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateStickFromClientPoint(e.clientX, e.clientY);
  };

  const handleStickPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore synthetic release errors
    }
    releaseStick();
  };

  const handleJumpPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (jumpPointerIdRef.current !== null) return;
    e.preventDefault();
    jumpPointerIdRef.current = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic events
    }
    setJumpPressed(true);
    triggerHapticFeedback('jump');
    onVirtualJump(true);
  };

  const handleJumpPointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (jumpPointerIdRef.current !== null && jumpPointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    jumpPointerIdRef.current = null;
    setJumpPressed(false);
    onVirtualJump(false);
  };

  const handleDivePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setDivePressed(true);
    if (diveReadyPct >= 100) {
      triggerHapticFeedback('dive');
    }
    onVirtualDive();
  };

  const handleDivePointerEnd = () => {
    setDivePressed(false);
  };

  const diveReady = diveReadyPct >= 100;
  const ringRadius = 29;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - Math.max(0, Math.min(100, diveReadyPct)) / 100);

  return (
    <div
      data-testid="touch-controls"
      className="pointer-events-none mt-auto flex items-end justify-between pb-[max(0.25rem,env(safe-area-inset-bottom))]"
    >
      {/* Bottom-Left: Auto-Run Toggle + 360-Degree Virtual Analog Joystick */}
      <div className="pointer-events-auto flex flex-col items-start gap-2 select-none">
        <button
          type="button"
          tabIndex={-1}
          aria-pressed={autoRun}
          aria-label={autoRun ? 'Matikan Lari Otomatis' : 'Aktifkan Lari Otomatis'}
          data-testid="auto-run-toggle"
          onClick={(e) => {
            setAutoRun((prev) => !prev);
            e.currentTarget.blur();
          }}
          className={`flex cursor-pointer items-center gap-1.5 rounded-xl border-[2.5px] border-[#1e293b] px-2.5 py-1 text-[11px] font-extrabold shadow-[0_3px_0_#1e293b] transition-transform active:translate-y-0.5 ${
            autoRun
              ? 'bg-[#22c55e] text-white'
              : 'bg-[#fffdf5]/90 text-[#1e293b]'
          }`}
        >
          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
            <path
              d="M4 10h11M11 5.5 15.5 10 11 14.5"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{autoRun ? 'Auto Lari: ON' : 'Auto Lari'}</span>
        </button>

        {/* Analog Stick Base */}
        <div
          ref={padRef}
          role="application"
          aria-label="Stik Analog Gerak"
          data-testid="virtual-joystick"
          onPointerDown={handleStickPointerDown}
          onPointerMove={handleStickPointerMove}
          onPointerUp={handleStickPointerEnd}
          onPointerCancel={handleStickPointerEnd}
          onLostPointerCapture={handleStickPointerEnd}
          className={`relative flex h-[128px] w-[128px] touch-none items-center justify-center rounded-full border-[3.5px] border-[#1e293b]/85 shadow-[0_5px_0_rgba(30,41,59,0.55)] sm:h-[140px] sm:w-[140px] ${
            stickActive ? 'bg-[#e0f2fe]/65' : 'bg-[#fffdf5]/45'
          }`}
        >
          {/* Subtle inner guide ring & 4 directional chevron ticks */}
          <svg
            viewBox="0 0 120 120"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r="42"
              fill="none"
              stroke="#1e293b"
              strokeOpacity="0.22"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            <polygon points="60,11 54,20 66,20" fill="#1e293b" fillOpacity="0.45" />
            <polygon points="60,109 54,100 66,100" fill="#1e293b" fillOpacity="0.45" />
            <polygon points="11,60 20,54 20,66" fill="#1e293b" fillOpacity="0.45" />
            <polygon points="109,60 100,54 100,66" fill="#1e293b" fillOpacity="0.45" />
          </svg>

          {/* Movable Thumbstick Knob */}
          <div
            data-testid="virtual-joystick-knob"
            style={{
              transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
            }}
            className={`pointer-events-none flex h-14 w-14 items-center justify-center rounded-full border-[3.5px] border-[#1e293b] shadow-[0_4px_0_#1e293b] will-change-transform sm:h-16 sm:w-16 ${
              stickActive ? 'bg-[#facc15]' : 'bg-[#fffdf5]/95'
            }`}
          >
            <div className="h-5 w-5 rounded-full border-2 border-[#1e293b]/70 bg-[#38bdf8]" />
          </div>
        </div>
      </div>

      {/* Bottom-Right: Stumble Guys Arc Action Buttons (TERJANG + LOMPAT) */}
      <div className="pointer-events-auto flex items-end gap-3 select-none sm:gap-3.5">
        {/* Dive / Terjang Button with Live SVG Cooldown Progress Ring */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Terjang"
          data-testid="touch-dive-btn"
          onPointerDown={handleDivePointerDown}
          onPointerUp={handleDivePointerEnd}
          onPointerCancel={handleDivePointerEnd}
          onPointerLeave={handleDivePointerEnd}
          className={`relative mb-3 flex h-[68px] w-[68px] touch-none flex-col items-center justify-center rounded-full border-[3.5px] border-[#1e293b] font-display text-[#0f172a] shadow-[0_4px_0_#1e293b] transition-transform sm:h-[74px] sm:w-[74px] ${
            diveReady ? 'bg-[#38bdf8]' : 'bg-[#cbd5e1]/90 opacity-85'
          } ${divePressed ? 'translate-y-1 scale-95 shadow-[0_1px_0_#1e293b]' : ''}`}
        >
          {/* SVG Cooldown Ring */}
          <svg
            viewBox="0 0 68 68"
            className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="34"
              cy="34"
              r={ringRadius}
              fill="none"
              stroke="#0f172a"
              strokeOpacity="0.16"
              strokeWidth="4"
            />
            <circle
              cx="34"
              cy="34"
              r={ringRadius}
              fill="none"
              stroke={diveReady ? '#ffffff' : '#0284c7'}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringDashOffset}
            />
          </svg>

          <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" aria-hidden="true">
            <path
              d="M4 14.5h9.5l-2.8-3m0 6 2.8-3M14.5 9.5l5.5 2.5-5.5 2.5"
              stroke="#0f172a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="relative text-[10px] font-extrabold leading-none tracking-wide">
            {diveReady ? 'TERJANG' : `${diveReadyPct}%`}
          </span>
        </button>

        {/* Primary Jump / Lompat Button */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Lompat"
          data-testid="touch-jump-btn"
          onPointerDown={handleJumpPointerDown}
          onPointerUp={handleJumpPointerEnd}
          onPointerCancel={handleJumpPointerEnd}
          onLostPointerCapture={handleJumpPointerEnd}
          className={`flex h-[84px] w-[84px] touch-none flex-col items-center justify-center rounded-full border-[3.5px] border-[#1e293b] bg-[#facc15] font-display text-[#0f172a] shadow-[0_5px_0_#1e293b] transition-transform sm:h-[92px] sm:w-[92px] ${
            jumpPressed ? 'translate-y-1 scale-95 bg-[#fde047] shadow-[0_1px_0_#1e293b]' : ''
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
            <path
              d="M12 19V6M6.5 11.5 12 6l5.5 5.5"
              stroke="#0f172a"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs font-extrabold leading-none tracking-wide">LOMPAT</span>
        </button>
      </div>
    </div>
  );
};
