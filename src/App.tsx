/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PlayingHud } from './components/PlayingHud';
import { ReplayOverlay } from './components/ReplayOverlay';
import { StatusModals } from './components/StatusModals';
import { LobbyModal } from './components/LobbyModal';
import { TitleOverlay } from './components/TitleOverlay';
import {
  DEFAULT_DIFFICULTY,
  loadDifficulty,
  parseDifficultyParam,
} from './game/difficulty';
import { parseGameModeParam } from './game/gameModes';
import { DEFAULT_GRADE_LEVEL, parseGradeParam } from './game/questions';
import {
  createOfflineGuestSession,
  loadGuestSession,
  syncGuestSession,
} from './game/session';
import { MultiplayerClient } from './game/MultiplayerClient';
import { ReplayHudSnapshot } from './game/replay';
import { ArhamGameEngine } from './game/ThreeEngine';
import {
  DifficultyLevel,
  GameModeSelection,
  GameOverSnapshot,
  GameState,
  GradeLevel,
  HudSnapshot,
  PlayableGameMode,
  SubjectFilter,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  mode: 'classic',
  selectedMode: 'random',
  grade: DEFAULT_GRADE_LEVEL,
  difficulty: DEFAULT_DIFFICULTY,
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
  const [nickname, setNickname] = useState<string>(() => loadGuestSession()?.nickname ?? 'Arham');
  const [guestPlayerId] = useState<string>(
    () => loadGuestSession()?.playerId ?? createOfflineGuestSession('Arham', DEFAULT_GRADE_LEVEL).playerId,
  );
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(
    () => loadGuestSession()?.grade ?? DEFAULT_GRADE_LEVEL,
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>(() =>
    loadDifficulty(),
  );
  const [selectedMode, setSelectedMode] = useState<GameModeSelection>('random');
  const [previewMode, setPreviewMode] = useState<PlayableGameMode>('classic');
  const [selectedSubject, setSelectedSubject] = useState<SubjectFilter>('semua');
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [replay, setReplay] = useState<ReplayHudSnapshot | null>(null);
  const [gameOver, setGameOver] = useState<GameOverSnapshot | null>(null);
  const [muted, setMuted] = useState(false);

  // Store latest setters in refs so the Three.js mount effect runs strictly once
  const callbacksRef = useRef({
    onStateChange: (s: GameState) => setGameState(s),
    onHudUpdate: (h: HudSnapshot) => setHud(h),
    onReplayUpdate: (r: ReplayHudSnapshot) => setReplay(r),
    onGameOver: (g: GameOverSnapshot) => setGameOver(g),
    onMuteChange: (m: boolean) => setMuted(m),
    onActiveModeChange: (m: PlayableGameMode) => setPreviewMode(m),
  });

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    document.body.dataset.state = 'title';
    const engine = new ArhamGameEngine(mount, {
      onStateChange: (s) => callbacksRef.current.onStateChange(s),
      onHudUpdate: (h) => callbacksRef.current.onHudUpdate(h),
      onReplayUpdate: (r) => callbacksRef.current.onReplayUpdate(r),
      onGameOver: (g) => callbacksRef.current.onGameOver(g),
      onMuteChange: (m) => callbacksRef.current.onMuteChange(m),
      onActiveModeChange: (m) => callbacksRef.current.onActiveModeChange(m),
    });
    engineRef.current = engine;
    setPreviewMode(engine.getActiveMode());
    setSelectedDifficulty(engine.getDifficulty());

    // Support ?grade=1..6, ?difficulty=<easy|medium|hard>, ?mode=<random|classic|tile_fall|ice_slide|laser_dash|honey_drop>,
    // ?autostart=1, ?preview_replay=1, and ?preview_gameover=1
    const params = new URLSearchParams(window.location.search);
    const parsedGrade = parseGradeParam(params.get('grade'));
    const initialGrade = parsedGrade ?? DEFAULT_GRADE_LEVEL;
    if (parsedGrade !== null && parsedGrade !== DEFAULT_GRADE_LEVEL) {
      setSelectedGrade(parsedGrade);
      engine.setGradeLevel(parsedGrade);
    }

    const parsedDifficulty = parseDifficultyParam(params.get('difficulty'));
    const initialDifficulty = parsedDifficulty ?? engine.getDifficulty();
    if (parsedDifficulty !== null) {
      setSelectedDifficulty(parsedDifficulty);
      engine.setDifficulty(parsedDifficulty, false);
    }

    const initialMode = parseGameModeParam(params.get('mode'));
    if (initialMode !== 'random') {
      setSelectedMode(initialMode);
      engine.setGameMode(initialMode);
    }

    if (params.get('preview_replay') === '1') {
      engine.previewFinishReplay();
    } else if (params.get('preview_gameover') === '1') {
      engine.previewGameOver();
    } else if (params.get('autostart') === '1') {
      engine.startGame('semua', initialMode, false, initialGrade, initialDifficulty);
    }

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectGrade = useCallback((grade: GradeLevel) => {
    setSelectedGrade(grade);
    engineRef.current?.setGradeLevel(grade);
  }, []);

  const handleSelectDifficulty = useCallback((difficulty: DifficultyLevel) => {
    setSelectedDifficulty(difficulty);
    engineRef.current?.setDifficulty(difficulty);
  }, []);

  const handleSelectMode = useCallback((mode: GameModeSelection) => {
    setSelectedMode(mode);
    engineRef.current?.setGameMode(mode);
  }, []);

  const handleSelectSubject = useCallback((subj: SubjectFilter) => {
    setSelectedSubject(subj);
    engineRef.current?.setSubjectFilter(subj);
  }, []);

  const handleStart = useCallback(() => {
    void syncGuestSession(nickname, selectedGrade);
    setGameOver(null);
    setReplay(null);
    engineRef.current?.startGame(
      selectedSubject,
      selectedMode,
      false,
      selectedGrade,
      selectedDifficulty,
    );
  }, [selectedSubject, selectedMode, selectedGrade, selectedDifficulty]);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleRestart = useCallback(() => {
    setGameOver(null);
    setReplay(null);
    engineRef.current?.restartGame();
  }, []);

  const handleReturnTitle = useCallback(() => {
    setGameOver(null);
    setReplay(null);
    engineRef.current?.returnToTitle();
  }, []);

  const handleSkipReplay = useCallback(() => {
    engineRef.current?.skipReplay();
  }, []);

  const handleWatchReplay = useCallback(() => {
    engineRef.current?.watchFinishReplay();
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
          nickname={nickname}
          onChangeNickname={setNickname}
          selectedGrade={selectedGrade}
          onSelectGrade={handleSelectGrade}
          selectedDifficulty={selectedDifficulty}
          onSelectDifficulty={handleSelectDifficulty}
          selectedMode={selectedMode}
          previewMode={previewMode}
          onSelectMode={handleSelectMode}
          selectedSubject={selectedSubject}
          onSelectSubject={handleSelectSubject}
          onStart={handleStart}
          onOpenLobby={() => setLobbyOpen(true)}
        />
      )}

      {gameState === 'title' && (
        <LobbyModal
          open={lobbyOpen}
          playerId={guestPlayerId}
          nickname={nickname}
          grade={selectedGrade}
          defaultMode={selectedMode}
          defaultDifficulty={selectedDifficulty}
          onClose={() => setLobbyOpen(false)}
          onMatchStart={(room, ws, meta) => {
            setLobbyOpen(false);
            handleSelectMode(room.settings.mode);
            handleSelectDifficulty(room.settings.difficulty);
            if (room.settings.lockedGrade !== null) {
              handleSelectGrade(room.settings.lockedGrade);
            }
            const client = new MultiplayerClient({
              onRaceSnapshot: (poses) => engineRef.current?.pushRemotePoses(poses),
              onTileStateUpdate: (u) =>
                engineRef.current?.applyTileStateUpdate(u.tileId, u.state, u.shakeTimer, u.revealPop),
            });
            if (ws) {
              client.attachSocket(ws);
            }
            engineRef.current?.setMultiplayerSession({
              client,
              localPlayerId: guestPlayerId,
              seed: meta.seed,
              matchStartTime: meta.matchStartTime,
            });
            handleStart();
          }}
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

      {gameState === 'replay' && replay && (
        <ReplayOverlay replay={replay} onSkip={handleSkipReplay} />
      )}

      {(gameState === 'paused' || gameState === 'gameover') && (
        <StatusModals
          gameState={gameState}
          activeGrade={selectedGrade}
          activeDifficulty={selectedDifficulty}
          gameOver={gameOver}
          onResume={handleResume}
          onRestart={handleRestart}
          onReturnTitle={handleReturnTitle}
          onWatchReplay={handleWatchReplay}
        />
      )}

      <OfflineIndicator />
    </main>
  );
}
