/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { PlayingHud } from './components/PlayingHud';
import { StatusModals } from './components/StatusModals';
import { TitleOverlay } from './components/TitleOverlay';
import { ArhamGameEngine } from './game/ThreeEngine';
import { GameOverSnapshot, GameState, HudSnapshot, SubjectFilter } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  rank: 1,
  totalRacers: 6,
  score: 0,
  starsCollected: 0,
  totalStars: 12,
  progressPct: 0,
  timeLeft: 180,
  elapsedTime: 0,
  streak: 0,
  correctCount: 0,
  totalGates: 5,
  diveReadyPct: 100,
  activeGate: null,
  feedback: null,
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ArhamGameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [selectedSubject, setSelectedSubject] = useState<SubjectFilter>('semua');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [gameOver, setGameOver] = useState<GameOverSnapshot | null>(null);
  const [muted, setMuted] = useState(false);

  // Store latest setters in refs so the Three.js mount effect runs strictly once
  const callbacksRef = useRef({
    onStateChange: (s: GameState) => setGameState(s),
    onHudUpdate: (h: HudSnapshot) => setHud(h),
    onGameOver: (g: GameOverSnapshot) => setGameOver(g),
    onMuteChange: (m: boolean) => setMuted(m),
  });

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    document.body.dataset.state = 'title';
    const engine = new ArhamGameEngine(mount, {
      onStateChange: (s) => callbacksRef.current.onStateChange(s),
      onHudUpdate: (h) => callbacksRef.current.onHudUpdate(h),
      onGameOver: (g) => callbacksRef.current.onGameOver(g),
      onMuteChange: (m) => callbacksRef.current.onMuteChange(m),
    });
    engineRef.current = engine;

    // Support ?autostart=1 and ?preview_gameover=1 for automated testing and direct-entry links
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview_gameover') === '1') {
      engine.previewGameOver();
    } else if (params.get('autostart') === '1') {
      engine.startGame('semua');
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectSubject = useCallback((subj: SubjectFilter) => {
    setSelectedSubject(subj);
    engineRef.current?.setSubjectFilter(subj);
  }, []);

  const handleStart = useCallback(() => {
    setGameOver(null);
    engineRef.current?.startGame(selectedSubject);
  }, [selectedSubject]);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleRestart = useCallback(() => {
    setGameOver(null);
    engineRef.current?.restartGame();
  }, []);

  const handleReturnTitle = useCallback(() => {
    setGameOver(null);
    engineRef.current?.returnToTitle();
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handleVirtualMove = useCallback((mx: number, mz: number) => {
    engineRef.current?.setVirtualInput(mx, mz);
  }, []);

  const handleVirtualJump = useCallback((pressed: boolean) => {
    engineRef.current?.triggerVirtualJump(pressed);
  }, []);

  const handleVirtualDive = useCallback(() => {
    engineRef.current?.triggerVirtualDive();
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#74d1fb]">
      {/* Isolated WebGL Canvas Container — never re-rendered by HUD state changes */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {gameState === 'title' && (
        <TitleOverlay
          selectedSubject={selectedSubject}
          onSelectSubject={handleSelectSubject}
          onStart={handleStart}
        />
      )}

      {gameState === 'playing' && (
        <PlayingHud
          hud={hud}
          muted={muted}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onRestart={handleRestart}
          onVirtualMove={handleVirtualMove}
          onVirtualJump={handleVirtualJump}
          onVirtualDive={handleVirtualDive}
        />
      )}

      {(gameState === 'paused' || gameState === 'gameover') && (
        <StatusModals
          gameState={gameState}
          gameOver={gameOver}
          onResume={handleResume}
          onRestart={handleRestart}
          onReturnTitle={handleReturnTitle}
        />
      )}
    </main>
  );
}
