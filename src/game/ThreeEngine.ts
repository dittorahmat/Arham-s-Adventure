import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  evaluateRunAchievements,
  loadAchievementProfile,
  recordAnswerAttempt,
  saveAchievementProfile,
} from './achievements';
import { SoundEngine } from './audio';
import { createCourseLayout, createInitialRacers, RACER_ROSTER } from './courseData';
import {
  applyDailyChallengeEvent,
  DailyChallengeEvent,
  DailyChallengesState,
  loadDailyChallenges,
  saveDailyChallenges,
} from './dailyChallenges';
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTY_CATALOG,
  loadDifficulty,
  saveDifficulty,
} from './difficulty';
import {
  GAME_MODE_CATALOG,
  getLaserBarrierZ,
  HONEY_DROP_CONSTANTS,
  resolveGameMode,
} from './gameModes';
import { loadLeaderboard, recordFastestLap, saveLeaderboard } from './leaderboard';
import {
  CharacterVisualRig,
  createCharacterRig,
  createEraserBumper,
  createFinishArch,
  createLaserBarrierVisual,
  createPencilSweeper,
  createQuizGateVisual,
  createSkyWorldDecor,
  createStarPickup,
  QuizGateVisual,
} from './models';
import { ParticleVfxSystem } from './particles';
import {
  computeAiInput,
  computeProgressPct,
  computeRaceStandings,
  getActiveQuizGate,
  getBumperDynamicX,
  getPlatformDynamicState,
  getSweeperAngle,
  PHYSICS_CONSTANTS,
  PhysicsEvent,
  stepRacerPhysics,
} from './physics';
import { DEFAULT_GRADE_LEVEL, selectRaceQuestions } from './questions';
import {
  computeReplayCameraPose,
  createSyntheticFinishReplayClip,
  FinishReplayClip,
  getReplayCrossMarkerPct,
  mapReplayPlaybackTime,
  ReplayHudSnapshot,
  ReplayRecorder,
  sampleReplayFrame,
} from './replay';
import {
  createContactShadowTexture,
  createIceTrackTexture,
  createNeonTrackTexture,
  createRulerTexture,
  createSpeedPadTexture,
  createSurfaceBumpTexture,
  createTrackTileTexture,
} from './textures';
import { stepFallingTiles } from './tileFall';
import {
  AchievementId,
  AchievementProfile,
  AnsweredReviewItem,
  CourseLayout,
  DifficultyLevel,
  GameModeSelection,
  GameOverSnapshot,
  GameState,
  GradeLevel,
  HudSnapshot,
  InputState,
  PlayableGameMode,
  QuizFeedback,
  RacerState,
  SubjectFilter,
} from './types';

export interface EngineCallbacks {
  onStateChange: (state: GameState) => void;
  onHudUpdate: (hud: HudSnapshot) => void;
  onGameOver: (snapshot: GameOverSnapshot) => void;
  onReplayUpdate?: (replay: ReplayHudSnapshot) => void;
  onMuteChange: (muted: boolean) => void;
  onActiveModeChange?: (mode: PlayableGameMode) => void;
}

const BEST_SCORE_STORAGE_KEY = 'arham_adventure_best_score_v1';

const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _tileDummy = new THREE.Object3D();
const _tileColor = new THREE.Color();

function detectSoftwareGl(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class ArhamGameEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private sound = new SoundEngine();

  private courseGroup = new THREE.Group();
  private course!: CourseLayout;
  private racers: RacerState[] = [];
  private racerRigs: CharacterVisualRig[] = [];

  private platformMeshes = new Map<string, THREE.Object3D>();
  private sweeperRotors = new Map<string, THREE.Group>();
  private laserMeshes = new Map<string, THREE.Group>();
  private bumperMeshes = new Map<string, { group: THREE.Group; bounceAnim: number }>();
  private starMeshes = new Map<string, THREE.Group>();
  private gateVisuals: QuizGateVisual[] = [];
  private tileCapMesh: THREE.InstancedMesh | null = null;
  private tileBaseMesh: THREE.InstancedMesh | null = null;
  private finishTrophy: THREE.Group | null = null;
  private balloons: THREE.Group[] = [];

  // Pooled multi-layer InstancedMesh particle & shockwave VFX system
  private particleVfx: ParticleVfxSystem;

  // Shared procedural textures
  private shadowTex: THREE.CanvasTexture;
  private bumpTex: THREE.CanvasTexture;
  private maxAniso: number;

  // Game state & loop
  private gameState: GameState = 'title';
  private selectedMode: GameModeSelection = 'random';
  private activeMode: PlayableGameMode = resolveGameMode('random');
  private selectedGrade: GradeLevel = DEFAULT_GRADE_LEVEL;
  private selectedDifficulty: DifficultyLevel = DEFAULT_DIFFICULTY;
  private subjectFilter: SubjectFilter = 'semua';
  private elapsedTime = 0;
  private worldTime = 0;
  private hitstopTimer = 0;
  private cameraTrauma = 0;
  private score = 0;
  private bestScore = 0;
  private streak = 0;
  private correctCount = 0;
  private starsCollected = 0;
  private feedback: QuizFeedback | null = null;
  private hudEmitAccum = 0;
  private reviewMap = new Map<number, AnsweredReviewItem>();
  private achievementProfile: AchievementProfile;
  private midRunUnlockedIds: AchievementId[] = [];
  private dailyChallenges: DailyChallengesState;
  private runDailyCompletedIds: string[] = [];
  private runDailyBonusPoints = 0;

  // Finish-line 5-second cinematic slow-motion replay state
  private replayRecorder = new ReplayRecorder();
  private finishReplayClip: FinishReplayClip | null = null;
  private replayElapsed = 0;
  private replaySpeedFactor = 0.35;
  private replayCrossedFinish = false;
  private replayConfettiFired = false;
  private replayCrossMarkerPct = 62;
  private replayHudEmitAccum = 0;
  private replaySourceRaceTime = 0;
  private pendingGameOverSnapshot: GameOverSnapshot | null = null;

  // Input state
  private keysHeld = new Set<string>();
  private jumpJustPressed = false;
  private jumpJustReleased = false;
  private diveJustPressed = false;
  private virtualMoveX = 0;
  private virtualMoveZ = 0;
  private virtualJumpHeld = false;

  // Frame loop handles
  private frameId = 0;
  private lastTimestamp = 0;
  private disposed = false;
  private resizeObserver: ResizeObserver;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareGl();
    this.achievementProfile = loadAchievementProfile();
    this.dailyChallenges = loadDailyChallenges();
    this.selectedDifficulty = loadDifficulty();
    this.streak = this.achievementProfile.currentAnswerStreak;

    try {
      const saved = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
      if (saved) this.bestScore = Number(saved) || 0;
    } catch {
      this.bestScore = 0;
    }

    // 1. Renderer setup (Modern PBR + Software WebGL safe path)
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.setAttribute('data-testid', 'game-canvas');
    container.appendChild(this.renderer.domElement);

    this.maxAniso = this.isSoftwareGl ? 1 : Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    // 2. Scene, Sky Color & Horizon-Matched Fog
    this.scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x74d1fb);
    this.scene.background = skyColor;
    this.scene.fog = new THREE.Fog(skyColor, 82, 270);

    // 3. Mandatory Studio Environment Reflections (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 4. Camera
    const aspect = (container.clientWidth || 1280) / Math.max(1, container.clientHeight || 720);
    this.camera = new THREE.PerspectiveCamera(56, aspect, 0.15, 360);
    this.camera.position.set(14, 11, 14);
    this.camera.lookAt(0, 2, -16);

    // 5. Warm/Cool 3-Point Sky Daylight Rig (1 shadow caster max)
    const hemi = new THREE.HemisphereLight(0xbbe9ff, 0x3f704d, 0.76);
    hemi.position.set(0, 80, 0);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff1c9, 1.38);
    sun.position.set(36, 64, 28);
    sun.castShadow = !this.isSoftwareGl;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 260;
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.025;
    this.scene.add(sun);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.45);
    rimLight.position.set(-28, 22, -80);
    this.scene.add(rimLight);

    // 6. Sky World Environment Decor
    const decor = createSkyWorldDecor(this.scene);
    this.balloons = decor.balloons;

    // 7. Shared textures & course group
    this.shadowTex = createContactShadowTexture();
    this.bumpTex = createSurfaceBumpTexture();
    this.scene.add(this.courseGroup);

    // 8. Pooled Multi-Layer Particle & Shockwave VFX System
    this.particleVfx = new ParticleVfxSystem(this.scene);

    // 9. Build Initial Course & Racers (defaults to Random mode preview)
    this.rebuildRace('semua', this.activeMode);
    this.callbacks.onActiveModeChange?.(this.activeMode);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 10. Event listeners
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(container);

    // Start render/sim loop
    this.lastTimestamp = performance.now();
    this.scheduleNextFrame();
  }

  public getActiveMode(): PlayableGameMode {
    return this.activeMode;
  }

  public getDifficulty(): DifficultyLevel {
    return this.selectedDifficulty;
  }

  public setDifficulty(difficulty: DifficultyLevel, persist = true): void {
    this.selectedDifficulty = difficulty;
    if (persist) {
      saveDifficulty(difficulty);
    }
    if (this.gameState === 'title') {
      this.rebuildRace(this.subjectFilter, this.activeMode);
    }
  }

  public setGradeLevel(grade: GradeLevel): void {
    this.selectedGrade = grade;
    if (this.gameState === 'title') {
      this.rebuildRace(this.subjectFilter, this.activeMode);
    }
  }

  public setSubjectFilter(subject: SubjectFilter): void {
    this.subjectFilter = subject;
    if (this.gameState === 'title') {
      this.rebuildRace(subject, this.activeMode);
    }
  }

  public setGameMode(selection: GameModeSelection): void {
    this.selectedMode = selection;
    this.activeMode = resolveGameMode(
      selection,
      selection === 'random' ? this.activeMode : null,
    );
    this.callbacks.onActiveModeChange?.(this.activeMode);
    if (this.gameState === 'title') {
      this.rebuildRace(this.subjectFilter, this.activeMode);
    }
  }

  public startGame(
    subject?: SubjectFilter,
    modeSelection?: GameModeSelection,
    rerollIfRandom = false,
    grade?: GradeLevel,
    difficulty?: DifficultyLevel,
  ): void {
    this.sound.unlock();
    if (grade) this.selectedGrade = grade;
    if (difficulty) {
      this.selectedDifficulty = difficulty;
      saveDifficulty(difficulty);
    }
    if (subject) this.subjectFilter = subject;
    if (modeSelection) {
      const selectionChanged = modeSelection !== this.selectedMode;
      this.selectedMode = modeSelection;
      if (modeSelection !== 'random') {
        this.activeMode = modeSelection;
      } else if (selectionChanged || rerollIfRandom) {
        this.activeMode = resolveGameMode('random', this.activeMode);
      }
    } else if (rerollIfRandom && this.selectedMode === 'random') {
      this.activeMode = resolveGameMode('random', this.activeMode);
    }

    this.callbacks.onActiveModeChange?.(this.activeMode);
    this.clearInputs();
    this.rebuildRace(this.subjectFilter, this.activeMode);

    const modeMeta = GAME_MODE_CATALOG[this.activeMode];
    if (this.selectedMode === 'random' || this.activeMode !== 'classic') {
      this.feedback = {
        kind: 'correct',
        headline:
          this.selectedMode === 'random'
            ? `Mode Acak → ${modeMeta.label}!`
            : modeMeta.introHeadline,
        detail: modeMeta.introDetail,
        timer: 3.4,
      };
    }

    this.setGameState('playing');
    this.sound.startMusic(this.course.timeLimitSeconds, this.course.timeLimitSeconds);
    // Immediately align camera behind Arham and restore gameplay FOV
    this.camera.fov = 56;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(0, 6.2, 10.2);
    this.camera.lookAt(0, 1.8, -12);
    this.emitHud();
  }

  public pauseGame(): void {
    if (this.gameState !== 'playing') return;
    this.clearInputs();
    this.sound.stopMusic();
    this.setGameState('paused');
  }

  public resumeGame(): void {
    if (this.gameState !== 'paused') return;
    this.sound.unlock();
    this.clearInputs();
    this.lastTimestamp = performance.now();
    this.setGameState('playing');
    const remaining = Math.max(0, this.course.timeLimitSeconds - this.elapsedTime);
    this.sound.startMusic(remaining, this.course.timeLimitSeconds);
  }

  public restartGame(): void {
    // In Random mode, restarting rolls a fresh playable mode for continuous surprise!
    this.startGame(
      this.subjectFilter,
      this.selectedMode,
      this.selectedMode === 'random',
      this.selectedGrade,
      this.selectedDifficulty,
    );
  }

  public returnToTitle(): void {
    this.clearInputs();
    this.sound.stopMusic();
    this.camera.fov = 56;
    this.camera.updateProjectionMatrix();
    if (this.selectedMode === 'random') {
      this.activeMode = resolveGameMode('random', this.activeMode);
      this.callbacks.onActiveModeChange?.(this.activeMode);
    }
    this.rebuildRace(this.subjectFilter, this.activeMode);
    this.setGameState('title');
  }

  public skipReplay(): void {
    if (this.gameState !== 'replay') return;
    this.finishReplayToGameOver();
  }

  public watchFinishReplay(): void {
    if (!this.finishReplayClip || !this.pendingGameOverSnapshot) return;
    this.sound.unlock();
    this.startFinishReplay();
  }

  public toggleMute(): boolean {
    this.sound.unlock();
    const muted = this.sound.toggleMute();
    this.callbacks.onMuteChange(muted);
    return muted;
  }

  public setVirtualInput(moveX: number, moveZ: number): void {
    this.virtualMoveX = moveX;
    this.virtualMoveZ = moveZ;
  }

  public triggerVirtualJump(pressed: boolean): void {
    this.sound.unlock();
    if (pressed && !this.virtualJumpHeld) {
      this.jumpJustPressed = true;
    } else if (!pressed && this.virtualJumpHeld) {
      this.jumpJustReleased = true;
    }
    this.virtualJumpHeld = pressed;
  }

  public triggerVirtualDive(): void {
    this.sound.unlock();
    this.diveJustPressed = true;
  }

  private setGameState(next: GameState): void {
    this.gameState = next;
    document.body.dataset.state = next;
    this.callbacks.onStateChange(next);
  }

  private clearInputs(): void {
    this.keysHeld.clear();
    this.jumpJustPressed = false;
    this.jumpJustReleased = false;
    this.diveJustPressed = false;
    this.virtualMoveX = 0;
    this.virtualMoveZ = 0;
    this.virtualJumpHeld = false;
  }

  private rebuildRace(subject: SubjectFilter, mode: PlayableGameMode = this.activeMode): void {
    // Dispose old course meshes cleanly
    this.clearGroup(this.courseGroup);
    this.platformMeshes.clear();
    this.sweeperRotors.clear();
    this.laserMeshes.clear();
    this.bumperMeshes.clear();
    this.starMeshes.clear();
    this.gateVisuals = [];
    this.tileCapMesh = null;
    this.tileBaseMesh = null;
    this.racerRigs = [];
    this.finishTrophy = null;

    const questions = selectRaceQuestions(
      subject,
      5,
      undefined,
      this.selectedGrade,
      this.selectedDifficulty,
    );
    this.course = createCourseLayout(questions, mode, Date.now(), this.selectedDifficulty);
    this.racers = createInitialRacers();

    this.elapsedTime = 0;
    this.hitstopTimer = 0;
    this.cameraTrauma = 0;
    this.score = 0;
    this.streak = this.achievementProfile.currentAnswerStreak;
    this.correctCount = 0;
    this.starsCollected = 0;
    this.feedback = null;
    this.reviewMap.clear();
    this.midRunUnlockedIds = [];
    this.dailyChallenges = loadDailyChallenges();
    this.runDailyCompletedIds = [];
    this.runDailyBonusPoints = 0;
    this.replayRecorder.reset();
    this.finishReplayClip = null;
    this.pendingGameOverSnapshot = null;
    this.replayElapsed = 0;
    this.replayConfettiFired = false;
    this.replayCrossedFinish = false;

    // Build Platforms
    const rulerTex = createRulerTexture(this.maxAniso);
    const speedTex = createSpeedPadTexture(this.maxAniso);

    for (const plat of this.course.platforms) {
      const platGroup = new THREE.Group();
      platGroup.position.set(plat.x, plat.y, plat.z);

      let topMat: THREE.MeshStandardMaterial;
      let sideColor = 0x1e3a8a;
      let railColor = 0xfef08a;

      if (plat.surface === 'ice') {
        const tex = createIceTrackTexture(this.maxAniso);
        tex.repeat.set(Math.max(1, Math.round(plat.width / 8)), Math.max(1, Math.round(plat.length / 8)));
        topMat = new THREE.MeshStandardMaterial({
          map: tex,
          color: 0xffffff,
          roughness: 0.14,
          metalness: 0.18,
        });
        sideColor = 0x0369a1;
        railColor = 0xe0f2fe;
      } else if (plat.surface === 'neon') {
        const tex = createNeonTrackTexture(this.maxAniso);
        tex.repeat.set(Math.max(1, Math.round(plat.width / 8)), Math.max(1, Math.round(plat.length / 8)));
        topMat = new THREE.MeshStandardMaterial({
          map: tex,
          color: 0xffffff,
          roughness: 0.34,
          metalness: 0.26,
        });
        sideColor = 0x0f172a;
        railColor = 0x22d3ee;
      } else if (plat.kind === 'ruler_bridge') {
        topMat = new THREE.MeshStandardMaterial({
          map: rulerTex,
          color: 0xffffff,
          roughness: 0.52,
          metalness: 0.05,
        });
        sideColor = 0x92400e;
      } else {
        const pair =
          plat.colorHex === 0xf59e0b
            ? ['#d97706', '#f59e0b']
            : plat.kind === 'start'
              ? ['#0284c7', '#0ea5e9']
              : plat.kind === 'quiz_plaza'
                ? ['#059669', '#10b981']
                : plat.kind === 'finish'
                  ? ['#2563eb', '#3b82f6']
                  : plat.colorHex === 0xec4899
                    ? ['#db2777', '#ec4899']
                    : ['#4f46e5', '#6366f1'];

        const tex = createTrackTileTexture(pair[0], pair[1], this.maxAniso);
        tex.repeat.set(Math.max(1, Math.round(plat.width / 8)), Math.max(1, Math.round(plat.length / 8)));
        topMat = new THREE.MeshStandardMaterial({
          map: tex,
          bumpMap: this.bumpTex,
          bumpScale: 0.03,
          color: 0xffffff,
          roughness: 0.62,
          metalness: 0.04,
        });
        sideColor = 0x1e293b;
      }

      const sideMat = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.55, metalness: 0.12 });
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(plat.width, plat.height, plat.length),
        [sideMat, sideMat, topMat, sideMat, sideMat, sideMat],
      );
      deck.position.y = -plat.height * 0.5;
      deck.receiveShadow = true;
      platGroup.add(deck);

      // Glossy safety side rails along main tracks (not on bridges)
      if (plat.kind !== 'ruler_bridge') {
        const railMat = new THREE.MeshStandardMaterial({
          color: railColor,
          roughness: 0.24,
          metalness: 0.18,
        });
        const curbL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, plat.length), railMat);
        curbL.position.set(-plat.width * 0.5 + 0.21, 0.17, 0);
        const curbR = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, plat.length), railMat);
        curbR.position.set(plat.width * 0.5 - 0.21, 0.17, 0);
        platGroup.add(curbL, curbR);
      }

      this.courseGroup.add(platGroup);
      this.platformMeshes.set(plat.id, platGroup);
    }

    // Start line checkered strip (offset +0.025 on Y to prevent Z-fighting)
    const startStrip = new THREE.Mesh(
      new THREE.PlaneGeometry(15.2, 1.4),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    startStrip.rotation.x = -Math.PI / 2;
    startStrip.position.set(0, 0.025, -2.5);
    this.courseGroup.add(startStrip);

    // Speed Pads
    for (const pad of this.course.speedPads) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(pad.width, 0.08, pad.length),
        new THREE.MeshStandardMaterial({
          map: speedTex,
          color: 0xffffff,
          emissive: 0x0ea5e9,
          emissiveIntensity: 0.22,
          roughness: 0.25,
          metalness: 0.2,
        }),
      );
      mesh.position.set(pad.x, pad.y + 0.04, pad.z);
      this.courseGroup.add(mesh);
    }

    // Rotating Pencil Sweepers
    for (const sw of this.course.sweepers) {
      const { group, rotor } = createPencilSweeper(sw.armLength, sw.barHeight);
      group.position.set(sw.x, sw.y, sw.z);
      this.courseGroup.add(group);
      this.sweeperRotors.set(sw.id, rotor);
    }

    // Sweeping Neon Laser Barriers (Laser Dash mode)
    for (const laser of this.course.lasers) {
      const group = createLaserBarrierVisual(laser.width, laser.barHeight, laser.colorHex);
      group.position.set(0, laser.y, getLaserBarrierZ(laser, 0));
      this.courseGroup.add(group);
      this.laserMeshes.set(laser.id, group);
    }

    // Springy Bumpers
    for (const b of this.course.bumpers) {
      const group = createEraserBumper(b.radius, b.colorHex);
      group.position.set(b.x, b.y, b.z);
      this.courseGroup.add(group);
      this.bumperMeshes.set(b.id, { group, bounceAnim: 0 });
    }

    // Golden Stars
    for (const star of this.course.stars) {
      const mesh = createStarPickup();
      mesh.position.set(star.x, star.y, star.z);
      this.courseGroup.add(mesh);
      this.starMeshes.set(star.id, mesh);
    }

    // Falling Tiles (Tile Fall squares OR Honey Drop hexagons — 2 zero-GC InstancedMeshes)
    if (this.course.fallingTiles.length > 0) {
      const count = this.course.fallingTiles.length;
      const firstTile = this.course.fallingTiles[0];
      const isHex = firstTile.shape === 'hex';
      const tileSize = firstTile.size;

      const capGeo = isHex
        ? new THREE.CylinderGeometry(HONEY_DROP_CONSTANTS.hexRadius, HONEY_DROP_CONSTANTS.hexRadius, 0.26, 6)
        : new THREE.BoxGeometry(tileSize, 0.24, tileSize);
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: isHex ? 0.24 : 0.28,
        metalness: isHex ? 0.12 : 0.08,
      });
      this.tileCapMesh = new THREE.InstancedMesh(capGeo, capMat, count);
      this.tileCapMesh.frustumCulled = false;
      this.tileCapMesh.receiveShadow = true;

      const baseGeo = isHex
        ? new THREE.CylinderGeometry(
            HONEY_DROP_CONSTANTS.hexRadius * 0.9,
            HONEY_DROP_CONSTANTS.hexRadius * 0.84,
            0.34,
            6,
          )
        : new THREE.BoxGeometry(tileSize * 0.9, 0.34, tileSize * 0.9);
      const baseMat = new THREE.MeshStandardMaterial({
        color: isHex ? 0x78350f : 0x1e293b,
        roughness: 0.56,
        metalness: 0.14,
      });
      this.tileBaseMesh = new THREE.InstancedMesh(baseGeo, baseMat, count);
      this.tileBaseMesh.frustumCulled = false;

      this.courseGroup.add(this.tileCapMesh, this.tileBaseMesh);
      this.syncFallingTilesVisuals();
    }

    // Quiz Gates (5 in Classic mode, 3 checkpoints in Tile Fall mode)
    for (const gate of this.course.quizGates) {
      const vis = createQuizGateVisual(gate, this.maxAniso);
      this.courseGroup.add(vis.group);
      this.gateVisuals.push(vis);
    }

    // Towering Finish Arch & Golden Trophy (grounded dynamically to finish deck height)
    const finishDeckY =
      this.course.platforms.find((p) => p.kind === 'finish')?.y ?? 1.1;
    const finish = createFinishArch(finishDeckY, this.course.finishZ - 1.5, this.maxAniso);
    this.courseGroup.add(finish.group);
    this.finishTrophy = finish.trophy;

    // 6 Composite Racer Characters
    this.racers.forEach((racer, idx) => {
      const rig = createCharacterRig(RACER_ROSTER[idx], racer.isPlayer, this.shadowTex);
      rig.root.position.set(racer.x, racer.y, racer.z);
      rig.root.rotation.y = racer.facingYaw;
      this.courseGroup.add(rig.root);
      this.racerRigs.push(rig);
    });
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const std = m as THREE.MeshStandardMaterial;
            if (std.map && std.map !== this.shadowTex && std.map !== this.bumpTex) {
              std.map.dispose();
            }
            m.dispose();
          });
        }
      });
    }
  }

  private readPlayerInput(): InputState {
    let moveX = this.virtualMoveX;
    let moveZ = this.virtualMoveZ;

    if (this.keysHeld.has('KeyA') || this.keysHeld.has('ArrowLeft')) moveX -= 1;
    if (this.keysHeld.has('KeyD') || this.keysHeld.has('ArrowRight')) moveX += 1;
    if (this.keysHeld.has('KeyW') || this.keysHeld.has('ArrowUp')) moveZ -= 1;
    if (this.keysHeld.has('KeyS') || this.keysHeld.has('ArrowDown')) moveZ += 1;

    const input: InputState = {
      moveX: Math.max(-1, Math.min(1, moveX)),
      moveZ: Math.max(-1, Math.min(1, moveZ)),
      jumpHeld: this.keysHeld.has('Space') || this.virtualJumpHeld,
      jumpJustPressed: this.jumpJustPressed,
      jumpJustReleased: this.jumpJustReleased,
      diveJustPressed: this.diveJustPressed,
    };

    // Consume single-frame edges
    this.jumpJustPressed = false;
    this.jumpJustReleased = false;
    this.diveJustPressed = false;

    return input;
  }

  private processEvents(events: PhysicsEvent[]): void {
    let forceHud = false;

    for (const ev of events) {
      switch (ev.type) {
        case 'jump':
          if (ev.isPlayer) {
            this.sound.playJump();
            this.particleVfx.emitSimpleBurst(ev.x, ev.y + 0.1, ev.z, 5, [0xffffff, 0xe0f2fe], 3.2, 'debris');
          }
          break;
        case 'land':
          if (ev.isPlayer) {
            this.sound.playLand();
            this.particleVfx.emitSimpleBurst(ev.x, ev.y + 0.1, ev.z, 5, [0xfef08a, 0xffffff], 2.8, 'debris');
          }
          break;
        case 'dive':
          if (ev.isPlayer) {
            this.sound.playDive();
            this.particleVfx.emitSimpleBurst(ev.x, ev.y + 0.4, ev.z, 8, [0x38bdf8, 0xffffff], 5.0, 'spark');
          }
          break;
        case 'bumper': {
          const bEntry = this.bumperMeshes.get(ev.bumperId);
          if (bEntry) bEntry.bounceAnim = 1;
          if (ev.isPlayer) {
            this.sound.playBumper();
            this.hitstopTimer = 0.038;
            this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.55);
            this.particleVfx.emitHurdleImpact(ev.x, ev.y, ev.z, 'bumper');
          }
          break;
        }
        case 'sweeper':
          if (ev.isPlayer) {
            this.sound.playSweeperHit();
            this.hitstopTimer = 0.055;
            this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.72);
            this.particleVfx.emitHurdleImpact(ev.x, ev.y, ev.z, 'sweeper');
          }
          break;
        case 'laser_hit':
          if (ev.isPlayer) {
            this.sound.playLaserZap();
            this.hitstopTimer = 0.048;
            this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.65);
            this.particleVfx.emitHurdleImpact(ev.x, ev.y, ev.z, 'laser');
          } else {
            this.particleVfx.emitSimpleBurst(ev.x, ev.y, ev.z, 8, [0x22d3ee, 0xf43f5e], 6.0, 'spark');
          }
          break;
        case 'speedpad':
          if (ev.isPlayer) {
            this.sound.playSpeedPad();
            this.particleVfx.emitSimpleBurst(ev.x, ev.y + 0.3, ev.z, 10, [0x22d3ee, 0xfde047], 6.0, 'spark');
          }
          break;
        case 'star':
          if (ev.isPlayer) {
            this.starsCollected += 1;
            this.score += 50;
            this.sound.playStar();
            this.particleVfx.emitSimpleBurst(ev.x, ev.y, ev.z, 14, [0xfacc15, 0xfef08a, 0xffffff], 6.8, 'spark');
            const starChallenge = this.recordDailyProgress({ type: 'star_collected', count: 1 });
            if (starChallenge.newlyCompleted.length > 0) {
              const titleList = starChallenge.newlyCompleted.map((c) => c.title).join(', ');
              this.sound.playVictory();
              this.feedback = {
                kind: 'correct',
                headline: `Misi Harian Selesai! +${starChallenge.bonusPointsAwarded} Poin`,
                detail: titleList,
                timer: 3.4,
              };
            }
            forceHud = true;
          }
          break;
        case 'quiz_correct': {
          const gate = this.course.quizGates[ev.gateIndex];
          this.particleVfx.emitQuizGateClear(ev.x, ev.y, ev.z, ev.firstTry);
          if (ev.isPlayer) {
            this.sound.playQuizCorrect();
            this.hitstopTimer = 0.042;
            this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.35);
            const dailyQuiz = this.recordDailyProgress({
              type: 'quiz_correct',
              firstTry: ev.firstTry,
            });
            const dailyTag =
              dailyQuiz.bonusPointsAwarded > 0
                ? ` · Misi +${dailyQuiz.bonusPointsAwarded}`
                : '';

            if (ev.firstTry) {
              const streakResult = recordAnswerAttempt(this.achievementProfile, true);
              this.achievementProfile = streakResult.nextProfile;
              saveAchievementProfile(this.achievementProfile);

              this.streak = this.achievementProfile.currentAnswerStreak;
              this.correctCount += 1;
              const diffMul = DIFFICULTY_CATALOG[this.selectedDifficulty].scoreMultiplier;
              const bonus = Math.round((100 + Math.min(4, this.streak - 1) * 25) * diffMul);
              this.score += bonus;

              if (streakResult.unlockedStreak10Now) {
                this.midRunUnlockedIds.push('streak_10');
                this.sound.playVictory();
                this.feedback = {
                  kind: 'correct',
                  headline: `Lencana Baru: 10 Benar Beruntun! +${bonus} Poin${dailyTag}`,
                  detail: gate.question.explanation,
                  timer: 3.6,
                };
              } else if (dailyQuiz.newlyCompleted.length > 0) {
                this.sound.playVictory();
                this.feedback = {
                  kind: 'correct',
                  headline: `Misi Selesai: ${dailyQuiz.newlyCompleted[0].title}! +${bonus + dailyQuiz.bonusPointsAwarded} Poin`,
                  detail: gate.question.explanation,
                  timer: 3.6,
                };
              } else {
                this.feedback = {
                  kind: 'correct',
                  headline: `Benar! +${bonus} Poin${this.streak >= 2 ? ` (Beruntun x${this.streak})` : ''}`,
                  detail: gate.question.explanation,
                  timer: 3.1,
                };
              }
            } else {
              this.score += 50;
              this.feedback = {
                kind: 'correct',
                headline: `Mantap! +50 Poin${dailyTag}`,
                detail: gate.question.explanation,
                timer: 2.8,
              };
            }
            this.reviewMap.set(gate.gateIndex, {
              gateIndex: gate.gateIndex,
              subject: gate.question.subject,
              question: gate.question.question,
              correctAnswer: gate.question.options[gate.question.correctIndex],
              explanation: gate.question.explanation,
              firstTryCorrect: ev.firstTry,
            });
            forceHud = true;
          }
          break;
        }
        case 'quiz_wrong': {
          const gate = this.course.quizGates[ev.gateIndex];
          if (ev.isPlayer) {
            const streakResult = recordAnswerAttempt(this.achievementProfile, false);
            this.achievementProfile = streakResult.nextProfile;
            saveAchievementProfile(this.achievementProfile);
            this.streak = 0;
            this.sound.playQuizWrong();
            this.hitstopTimer = 0.05;
            this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.6);
            this.particleVfx.emitHurdleImpact(ev.x, ev.y, ev.z, 'wrong_door');
            this.feedback = {
              kind: 'wrong',
              headline: 'Ups, pintu terkunci! Coba pintu lainnya!',
              detail: `Petunjuk: ${gate.question.topic}`,
              timer: 2.6,
            };
            forceHud = true;
          }
          break;
        }
        case 'tile_safe':
          if (ev.isPlayer) {
            this.score += 10;
            this.sound.playTileSafe();
            this.particleVfx.emitSimpleBurst(ev.x, ev.y + 0.15, ev.z, 8, [0x22c55e, 0x86efac, 0xfef08a], 4.4, 'spark');
            forceHud = true;
          } else {
            this.particleVfx.emitSimpleBurst(ev.x, ev.y + 0.15, ev.z, 4, [0x22c55e, 0x86efac], 3.2, 'spark');
          }
          break;
        case 'tile_fake':
          if (this.course.mode === 'honey_drop') {
            if (ev.isPlayer) {
              this.sound.playHoneyCrack();
              this.particleVfx.emitSimpleBurst(
                ev.x,
                ev.y + 0.15,
                ev.z,
                8,
                [0xfbbf24, 0xf97316, 0xfef08a],
                4.5,
                'spark',
              );
            } else {
              this.particleVfx.emitSimpleBurst(ev.x, ev.y + 0.15, ev.z, 4, [0xfbbf24, 0xf97316], 3.5, 'debris');
            }
          } else if (ev.isPlayer) {
            this.sound.playTileBreak();
            this.cameraTrauma = Math.min(1, this.cameraTrauma + 0.35);
            this.particleVfx.emitHurdleImpact(ev.x, ev.y + 0.15, ev.z, 'bumper');
          } else {
            this.particleVfx.emitSimpleBurst(ev.x, ev.y + 0.15, ev.z, 10, [0xef4444, 0xfb923c, 0xfef08a], 5.8, 'debris');
          }
          break;
        case 'respawn':
          if (ev.isPlayer) {
            this.sound.playRespawn();
            this.particleVfx.emitSimpleBurst(ev.x, ev.y, ev.z, 12, [0x38bdf8, 0xffffff], 5.5, 'spark');
            forceHud = true;
          }
          break;
        case 'finish':
          if (ev.isPlayer) {
            this.handleRunFinished('victory');
            return;
          }
          break;
      }
    }

    if (forceHud) {
      this.emitHud();
    }
  }

  private recordDailyProgress(event: DailyChallengeEvent) {
    const result = applyDailyChallengeEvent(this.dailyChallenges, event);
    this.dailyChallenges = result.nextState;
    saveDailyChallenges(this.dailyChallenges);

    if (result.bonusPointsAwarded > 0) {
      this.score += result.bonusPointsAwarded;
      this.runDailyBonusPoints += result.bonusPointsAwarded;
      for (const ch of result.newlyCompleted) {
        if (!this.runDailyCompletedIds.includes(ch.id)) {
          this.runDailyCompletedIds.push(ch.id);
        }
      }
    }
    return result;
  }

  private populatePreviewVictoryRun(): void {
    this.rebuildRace(this.subjectFilter, this.activeMode);
    this.elapsedTime = 41;
    this.correctCount = this.course.quizGates.length;
    this.starsCollected = Math.min(9, this.course.stars.length);
    this.score = 1350;
    const finishDeckY =
      this.course.platforms.find((p) => p.kind === 'finish')?.y ?? 1.1;
    this.racers[0].x = 0.25;
    this.racers[0].y = finishDeckY;
    this.racers[0].z = this.course.finishZ;
    this.racers[0].vz = -11.6;
    this.racers[0].finished = true;
    this.racers[0].finishTime = 41;

    // Simulate answering gates + collecting stars for Daily Challenges
    for (let i = 0; i < this.course.quizGates.length; i++) {
      this.recordDailyProgress({ type: 'quiz_correct', firstTry: true });
    }
    this.recordDailyProgress({ type: 'star_collected', count: this.starsCollected });

    // Simulate reaching 10 correct answers in a row on the final gate
    this.achievementProfile = {
      ...this.achievementProfile,
      currentAnswerStreak: 9,
      bestAnswerStreak: Math.max(9, this.achievementProfile.bestAnswerStreak),
    };
    const tenth = recordAnswerAttempt(this.achievementProfile, true);
    this.achievementProfile = tenth.nextProfile;
    if (tenth.unlockedStreak10Now) {
      this.midRunUnlockedIds.push('streak_10');
    }

    for (const gate of this.course.quizGates) {
      this.reviewMap.set(gate.gateIndex, {
        gateIndex: gate.gateIndex,
        subject: gate.question.subject,
        question: gate.question.question,
        correctAnswer: gate.question.options[gate.question.correctIndex],
        explanation: gate.question.explanation,
        firstTryCorrect: true,
      });
    }
  }

  public previewGameOver(): void {
    // Populates a realistic completed race snapshot (only used when ?preview_gameover=1 is requested)
    this.populatePreviewVictoryRun();
    this.handleRunFinished('victory', { skipReplay: true, syntheticReplay: true });
  }

  public previewFinishReplay(): void {
    // Populates a realistic completed race and immediately launches the 5-second slow-mo finish replay (?preview_replay=1)
    this.populatePreviewVictoryRun();
    this.handleRunFinished('victory', { skipReplay: false, syntheticReplay: true });
  }

  private startFinishReplay(): void {
    if (!this.finishReplayClip || !this.pendingGameOverSnapshot) return;
    this.clearInputs();
    this.replayElapsed = 0;
    this.replayHudEmitAccum = 0;
    this.replayConfettiFired = false;
    this.replayCrossedFinish = false;
    this.replayCrossMarkerPct = getReplayCrossMarkerPct(this.finishReplayClip);

    // Apply initial pose & snap camera cleanly to start of broadcast sweep
    const initialSample = mapReplayPlaybackTime(0, this.finishReplayClip);
    this.replaySpeedFactor = initialSample.effectiveSpeedFactor;
    this.replaySourceRaceTime = initialSample.sourceRaceTime;
    this.applyReplayFrameToRacers(initialSample.sourceRaceTime);

    const camPose = computeReplayCameraPose(
      0,
      this.racers[0],
      this.finishReplayClip.finishZ,
      this.finishReplayClip.finishY,
    );
    this.camera.position.set(camPose.posX, camPose.posY, camPose.posZ);
    this.camera.fov = camPose.fov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(camPose.lookX, camPose.lookY, camPose.lookZ);

    this.setGameState('replay');
    this.emitReplayHud();
  }

  private applyReplayFrameToRacers(sourceRaceTime: number): void {
    if (!this.finishReplayClip) return;
    const frame = sampleReplayFrame(this.finishReplayClip, sourceRaceTime);
    for (let i = 0; i < this.racers.length && i < frame.racers.length; i++) {
      const dst = this.racers[i];
      const src = frame.racers[i];
      dst.x = src.x;
      dst.y = src.y;
      dst.z = src.z;
      dst.vx = src.vx;
      dst.vz = src.vz;
      dst.facingYaw = src.facingYaw;
      dst.grounded = src.grounded;
      dst.diveTimer = src.diveTimer;
      dst.stunTimer = src.stunTimer;
      dst.squashX = src.squashX;
      dst.squashY = src.squashY;
      dst.walkDistance = src.walkDistance;
      dst.hitFlashTimer = 0;
    }
  }

  private emitReplayHud(): void {
    if (!this.finishReplayClip || !this.pendingGameOverSnapshot) return;
    const duration = this.finishReplayClip.playbackDuration;
    const elapsed = Math.min(duration, this.replayElapsed);
    const snap: ReplayHudSnapshot = {
      elapsedSeconds: elapsed,
      durationSeconds: duration,
      progressPct: Math.min(100, Math.round((elapsed / Math.max(0.1, duration)) * 100)),
      crossMarkerPct: this.replayCrossMarkerPct,
      speedFactor: this.replaySpeedFactor,
      crossedFinish: this.replayCrossedFinish,
      rank: this.pendingGameOverSnapshot.rank,
      totalRacers: this.pendingGameOverSnapshot.totalRacers,
      clearTime: this.pendingGameOverSnapshot.clearTime,
      mode: this.course.mode,
      grade: this.selectedGrade,
      score: this.pendingGameOverSnapshot.score,
    };
    this.callbacks.onReplayUpdate?.(snap);
  }

  private finishReplayToGameOver(): void {
    this.camera.fov = 56;
    this.camera.updateProjectionMatrix();
    const snapshot = this.pendingGameOverSnapshot;
    this.setGameState('gameover');
    if (snapshot) {
      this.callbacks.onGameOver(snapshot);
    }
  }

  private handleRunFinished(
    outcome: 'victory' | 'timeout',
    options: { skipReplay?: boolean; syntheticReplay?: boolean } = {},
  ): void {
    const standings = computeRaceStandings(this.racers);
    const player = this.racers[0];
    const rank = standings.findIndex((r) => r.isPlayer) + 1;
    const clearTime = Math.max(1, Math.round(this.elapsedTime));

    // Silence looping race music cleanly before playing victory/timeout fanfare
    this.sound.stopMusic();

    if (outcome === 'victory') {
      // Placement bonus!
      const rankBonus = Math.max(50, (7 - rank) * 50);
      this.score += rankBonus;
      this.sound.playVictory();
      this.particleVfx.emitQuizGateClear(player.x, player.y + 0.6, player.z, true);

      // Update Daily Challenges race-finish milestones (awards bonus points into score)
      this.recordDailyProgress({
        type: 'race_finished',
        rank,
        clearTimeSeconds: clearTime,
      });

      // Save top 5 fastest lap times in localStorage
      const updatedLeaderboard = recordFastestLap(loadLeaderboard(), {
        lapTimeSeconds: this.elapsedTime,
        score: Math.round(this.score),
        rank,
        correctCount: this.correctCount,
        totalGates: this.course.quizGates.length,
        subject: this.subjectFilter,
        grade: this.selectedGrade,
      });
      saveLeaderboard(updatedLeaderboard.entries);

      // Finalize 5-second slow-motion finish-line replay clip
      const finishDeckY =
        this.course.platforms.find((p) => p.kind === 'finish')?.y ?? 1.1;
      this.finishReplayClip = options.syntheticReplay
        ? createSyntheticFinishReplayClip(
            this.course.finishZ,
            finishDeckY,
            this.elapsedTime,
            this.racers,
          )
        : this.replayRecorder.finalizeFinishClip(
            this.course.finishZ,
            finishDeckY,
            this.elapsedTime,
            this.racers,
          );
    } else {
      this.finishReplayClip = null;
      this.sound.playTimeout();
    }

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(this.bestScore));
      } catch {
        // Ignore storage quota errors
      }
    }

    const achievementEval = evaluateRunAchievements(this.achievementProfile, {
      outcome,
      rank,
      clearTime,
      correctCount: this.correctCount,
      totalGates: this.course.quizGates.length,
      starsCollected: this.starsCollected,
      midRunUnlockedIds: this.midRunUnlockedIds,
    });
    this.achievementProfile = achievementEval.nextProfile;
    saveAchievementProfile(this.achievementProfile);

    const review: AnsweredReviewItem[] = this.course.quizGates.map((g) => {
      const existing = this.reviewMap.get(g.gateIndex);
      if (existing) return existing;
      return {
        gateIndex: g.gateIndex,
        subject: g.question.subject,
        question: g.question.question,
        correctAnswer: g.question.options[g.question.correctIndex],
        explanation: g.question.explanation,
        firstTryCorrect: false,
      };
    });

    const hasFinishReplay = outcome === 'victory' && this.finishReplayClip !== null;

    const snapshot: GameOverSnapshot = {
      outcome,
      grade: this.selectedGrade,
      difficulty: this.selectedDifficulty,
      rank,
      totalRacers: this.racers.length,
      score: Math.round(this.score),
      bestScore: Math.round(this.bestScore),
      clearTime,
      fastestLapSeconds: this.achievementProfile.fastestLapSeconds,
      isNewFastestLap: achievementEval.isNewFastestLap,
      bestAnswerStreak: this.achievementProfile.bestAnswerStreak,
      correctCount: this.correctCount,
      totalGates: this.course.quizGates.length,
      starsCollected: this.starsCollected,
      totalStars: this.course.stars.length,
      progressPct: computeProgressPct(player.z, this.course.startZ, this.course.finishZ),
      achievements: achievementEval.badges,
      newlyUnlockedCount: achievementEval.newlyUnlockedIds.length,
      dailyChallenges: this.dailyChallenges.challenges.map((c) => ({ ...c })),
      dailyChallengesCompletedThisRun: [...this.runDailyCompletedIds],
      dailyBonusPointsThisRun: this.runDailyBonusPoints,
      hasFinishReplay,
      review,
    };

    this.pendingGameOverSnapshot = snapshot;

    if (hasFinishReplay && !options.skipReplay) {
      this.startFinishReplay();
    } else {
      this.setGameState('gameover');
      this.callbacks.onGameOver(snapshot);
    }
  }

  private emitHud(): void {
    const player = this.racers[0];
    const standings = computeRaceStandings(this.racers);
    const rank = standings.findIndex((r) => r.isPlayer) + 1;
    const active = getActiveQuizGate(player.z, this.course);

    const remainingExact = Math.max(0, this.course.timeLimitSeconds - this.elapsedTime);
    this.sound.updateMusicTime(remainingExact, this.course.timeLimitSeconds);

    const hud: HudSnapshot = {
      mode: this.course.mode,
      selectedMode: this.selectedMode,
      grade: this.selectedGrade,
      difficulty: this.selectedDifficulty,
      rank,
      totalRacers: this.racers.length,
      score: Math.round(this.score),
      starsCollected: this.starsCollected,
      totalStars: this.course.stars.length,
      progressPct: computeProgressPct(player.z, this.course.startZ, this.course.finishZ),
      timeLeft: Math.ceil(remainingExact),
      elapsedTime: Math.floor(this.elapsedTime),
      streak: this.streak,
      correctCount: this.correctCount,
      totalGates: this.course.quizGates.length,
      diveReadyPct: Math.round(
        (1 - Math.min(1, player.diveCooldown / PHYSICS_CONSTANTS.diveCooldown)) * 100,
      ),
      activeGate: active
        ? {
            gateIndex: active.gateIndex,
            question: active.question,
            wrongDoors: active.doors.map((d) => d.wrongRevealed),
            cleared: active.playerCleared,
          }
        : null,
      feedback: this.feedback ? { ...this.feedback } : null,
    };

    this.callbacks.onHudUpdate(hud);
  }

  private syncFallingTilesVisuals(): void {
    if (!this.tileCapMesh || !this.tileBaseMesh) return;
    const tiles = this.course.fallingTiles;
    const t = this.worldTime;

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];

      if (tile.state === 'gone') {
        _tileDummy.position.set(0, -120, 0);
        _tileDummy.rotation.set(0, 0, 0);
        _tileDummy.scale.setScalar(0.0001);
        _tileDummy.updateMatrix();
        this.tileCapMesh.setMatrixAt(i, _tileDummy.matrix);
        this.tileBaseMesh.setMatrixAt(i, _tileDummy.matrix);
        continue;
      }

      let offsetX = 0;
      let offsetY = 0;
      let offsetZ = 0;
      let rx = tile.rotX;
      let rz = tile.rotZ;
      let scaleXZ = 1;
      const isHex = tile.shape === 'hex';

      if (tile.state === 'safe_revealed') {
        offsetY = Math.sin(tile.revealPop * Math.PI) * 0.16;
        _tileColor.setHex(0x16a34a); // Vivid emerald green safe path!
      } else if (tile.state === 'shaking') {
        const intensity = isHex ? 0.08 : 0.11;
        offsetX = Math.sin(t * 58 + i) * intensity;
        offsetZ = Math.cos(t * 54 + i) * intensity;
        rx = Math.sin(t * 48 + i) * 0.12;
        rz = Math.cos(t * 46 + i) * 0.12;
        if (isHex) {
          // Honey Drop warning progression: blazing orange -> hot crimson as crumble nears
          _tileColor.setHex(tile.shakeTimer > 0.22 ? 0xf97316 : 0xdc2626);
          scaleXZ = 0.94 + Math.sin(t * 40 + i) * 0.04;
        } else {
          _tileColor.setHex(0xdc2626); // Bright crimson crack telegraph!
        }
      } else if (tile.state === 'falling') {
        _tileColor.setHex(isHex ? 0xea580c : 0xdc2626);
      } else if (isHex) {
        // Warm golden honeycomb alternating tones
        const isHoneyA = (tile.row + tile.col) % 2 === 0;
        _tileColor.setHex(isHoneyA ? 0xf59e0b : 0xfbbf24);
      } else {
        // Hidden mystery tile: high-contrast Stumble Guys amber-gold & royal-indigo checkerboard
        const isCheckerA = (tile.row + tile.col) % 2 === 0;
        _tileColor.setHex(isCheckerA ? 0xf59e0b : 0x6366f1);

        // Subtle periodic Tip-Toe micro-shudder tell on unrevealed fake tiles
        if (!tile.isSafe) {
          const tell = Math.sin(t * 1.35 + tile.hintPhase);
          if (tell > 0.965) {
            rx = Math.sin(t * 40 + i) * 0.055;
            rz = Math.cos(t * 36 + i) * 0.055;
          }
        }
      }

      // Top glossy tile cap (top flush at tile.y)
      _tileDummy.position.set(tile.x + offsetX, tile.y - 0.12 + offsetY, tile.z + offsetZ);
      _tileDummy.rotation.set(rx, 0, rz);
      _tileDummy.scale.set(scaleXZ, 1, scaleXZ);
      _tileDummy.updateMatrix();
      this.tileCapMesh.setMatrixAt(i, _tileDummy.matrix);
      this.tileCapMesh.setColorAt(i, _tileColor);

      // Beveled under-pedestal beneath the cap
      _tileDummy.position.set(tile.x + offsetX, tile.y - 0.4 + offsetY, tile.z + offsetZ);
      _tileDummy.rotation.set(rx, 0, rz);
      _tileDummy.scale.set(scaleXZ, 1, scaleXZ);
      _tileDummy.updateMatrix();
      this.tileBaseMesh.setMatrixAt(i, _tileDummy.matrix);
    }

    this.tileCapMesh.instanceMatrix.needsUpdate = true;
    if (this.tileCapMesh.instanceColor) {
      this.tileCapMesh.instanceColor.needsUpdate = true;
    }
    this.tileBaseMesh.instanceMatrix.needsUpdate = true;
  }

  private syncVisuals(dt: number): void {
    // 1. Dynamic Platforms (Moving Wooden Rulers & Ice Bridges)
    const animTime =
      this.gameState === 'replay'
        ? this.replaySourceRaceTime
        : this.gameState === 'playing'
          ? this.elapsedTime
          : this.worldTime;
    for (const plat of this.course.platforms) {
      if (plat.moveAxis === 'x') {
        const mesh = this.platformMeshes.get(plat.id);
        if (mesh) {
          mesh.position.x = getPlatformDynamicState(plat, animTime).x;
        }
      }
    }

    // 1b. Falling / Honey Hex Tiles InstancedMesh animation & color states
    if (this.tileCapMesh && this.tileBaseMesh && this.course.fallingTiles.length > 0) {
      this.syncFallingTilesVisuals();
    }

    // 2. Rotating Pencil Sweepers
    for (const sw of this.course.sweepers) {
      const rotor = this.sweeperRotors.get(sw.id);
      if (rotor) {
        rotor.rotation.y = -getSweeperAngle(sw.speed, sw.phase, animTime);
      }
    }

    // 2b. Sweeping Neon Laser Barriers
    for (const laser of this.course.lasers) {
      const mesh = this.laserMeshes.get(laser.id);
      if (mesh) {
        mesh.position.z = getLaserBarrierZ(laser, animTime);
      }
    }

    // 3. Bouncing Eraser Bumpers
    for (const b of this.course.bumpers) {
      const entry = this.bumperMeshes.get(b.id);
      if (entry) {
        entry.group.position.x = getBumperDynamicX(b, animTime);
        if (entry.bounceAnim > 0) {
          entry.bounceAnim = Math.max(0, entry.bounceAnim - dt * 5.2);
          const s = 1 + Math.sin(entry.bounceAnim * Math.PI) * 0.28;
          entry.group.scale.set(s, 1 / Math.sqrt(s), s);
        } else {
          entry.group.scale.set(1, 1, 1);
        }
      }
    }

    // 4. Spinning Golden Stars
    for (const star of this.course.stars) {
      const mesh = this.starMeshes.get(star.id);
      if (mesh) {
        mesh.visible = !star.collected;
        if (!star.collected) {
          mesh.rotation.y = this.worldTime * 2.4;
          mesh.position.y = star.y + Math.sin(this.worldTime * 3.2 + star.z) * 0.2;
        }
      }
    }

    // 5. Quiz Gate Door Animations & Wrong-Door Visual Updates
    for (let g = 0; g < this.course.quizGates.length; g++) {
      const gate = this.course.quizGates[g];
      const vis = this.gateVisuals[g];
      for (let d = 0; d < 3; d++) {
        const doorState = gate.doors[d];
        const doorMesh = vis.doorMeshes[d];

        if (doorState.wrongRevealed && !vis.doorWrongApplied[d]) {
          vis.doorWrongApplied[d] = true;
          const mats = doorMesh.material as THREE.MeshStandardMaterial[];
          mats[4].map = vis.doorWrongTextures[d];
          mats[5].map = vis.doorWrongTextures[d];
          mats[4].needsUpdate = true;
          mats[5].needsUpdate = true;
        }

        if (doorState.opened && vis.doorOpenProgress[d] < 1) {
          vis.doorOpenProgress[d] = Math.min(1, vis.doorOpenProgress[d] + dt * 5.5);
          const p = vis.doorOpenProgress[d];
          // Shatter / swing flat into the floor and dissolve cleanly
          doorMesh.rotation.x = -p * (Math.PI * 0.52);
          doorMesh.position.y = 1.74 * (1 - p * 0.85);
          doorMesh.position.z = -p * 1.4;
          doorMesh.scale.setScalar(Math.max(0.01, 1 - p * 0.92));
          if (p >= 0.98) doorMesh.visible = false;
        }
      }
    }

    // 6. Spinning Trophy & Drifting Hot-Air Balloons
    if (this.finishTrophy) {
      this.finishTrophy.rotation.y = this.worldTime * 1.1;
    }
    this.balloons.forEach((b, idx) => {
      b.position.y += Math.sin(this.worldTime * 0.9 + idx * 1.3) * dt * 0.65;
      b.rotation.y = Math.sin(this.worldTime * 0.4 + idx) * 0.25;
    });

    // 7. Character Rigs (Walk Gait Sync, Dive Pitch, Squash & Stretch, Hit Flash)
    this.racers.forEach((racer, idx) => {
      const rig = this.racerRigs[idx];
      rig.root.position.set(racer.x, racer.y, racer.z);

      // Smoothly interpolate facing yaw
      const currentYaw = rig.root.rotation.y;
      let diff = racer.facingYaw - currentYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      rig.root.rotation.y = currentYaw + diff * (1 - Math.exp(-16 * dt));

      // Squash & stretch
      rig.bodyPivot.scale.set(racer.squashX, racer.squashY, racer.squashX);

      // Dive forward pitch or stun tumble wobble
      if (racer.diveTimer > 0) {
        rig.bodyPivot.rotation.x = THREE.MathUtils.damp(rig.bodyPivot.rotation.x, 1.05, 16, dt);
        rig.bodyPivot.rotation.z = THREE.MathUtils.damp(rig.bodyPivot.rotation.z, 0, 12, dt);
      } else if (racer.stunTimer > 0) {
        rig.bodyPivot.rotation.x = Math.sin(this.worldTime * 26) * 0.45;
        rig.bodyPivot.rotation.z = Math.cos(this.worldTime * 24) * 0.42;
      } else {
        rig.bodyPivot.rotation.x = THREE.MathUtils.damp(rig.bodyPivot.rotation.x, 0, 14, dt);
        rig.bodyPivot.rotation.z = THREE.MathUtils.damp(rig.bodyPivot.rotation.z, 0, 14, dt);
      }

      // Gait cycle synced to actual distance traveled (or joyful idle bounce on title)
      if (this.gameState === 'title') {
        const idle = Math.sin(this.worldTime * 3.6 + idx * 1.1);
        rig.bodyPivot.position.y = Math.max(0, idle * 0.14);
        rig.leftArm.rotation.x = idle * 0.35;
        rig.rightArm.rotation.x = -idle * 0.35;
        rig.leftLeg.rotation.x = 0;
        rig.rightLeg.rotation.x = 0;
      } else if (!racer.grounded) {
        rig.leftArm.rotation.x = -0.85;
        rig.rightArm.rotation.x = -0.85;
        rig.leftLeg.rotation.x = 0.45;
        rig.rightLeg.rotation.x = -0.35;
        rig.bodyPivot.position.y = 0;
      } else {
        const stride = Math.sin(racer.walkDistance * 2.2);
        const speedMag = Math.min(1, Math.hypot(racer.vx, racer.vz) / 6);
        rig.leftLeg.rotation.x = stride * 0.78 * speedMag;
        rig.rightLeg.rotation.x = -stride * 0.78 * speedMag;
        rig.leftArm.rotation.x = -stride * 0.72 * speedMag;
        rig.rightArm.rotation.x = stride * 0.72 * speedMag;
        rig.bodyPivot.position.y = Math.abs(stride) * 0.08 * speedMag;
      }

      // Hit flash emissive feedback
      const flash = racer.hitFlashTimer > 0 ? 0.65 : 0;
      for (const m of rig.hitMeshes) {
        m.emissive.setRGB(flash, flash, flash);
      }

      // Bobbing player diamond marker
      if (rig.marker) {
        rig.marker.rotation.y = this.worldTime * 3;
        rig.marker.position.y = 2.02 + Math.sin(this.worldTime * 5) * 0.12;
      }

      // Contact shadow scales slightly with height
      const hAbove = Math.max(0, racer.y);
      const sScale = Math.max(0.45, 1 - hAbove * 0.09);
      rig.shadowDisc.scale.setScalar(sScale);
      rig.shadowDisc.visible = racer.y > -2;
    });
  }

  private updateCamera(dt: number): void {
    if (this.gameState === 'title') {
      // Atmospheric Live World Camera Tour overlooking Start Plaza, Racers & Quiz Gate 1
      const t = this.worldTime * 0.24;
      const targetX = Math.sin(t) * 14 + 5;
      const targetY = 8.8 + Math.sin(t * 1.4) * 1.2;
      const targetZ = 10.5 + Math.cos(t) * 6.5;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetX, 3.2, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetY, 3.2, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetZ, 3.2, dt);
      // Offset look target slightly right so left side keeps 35-40% calm sky negative space for SVG Title Lockup
      this.camera.lookAt(-3.5, 2.0, -18);
      return;
    }

    if (this.gameState === 'replay' && this.finishReplayClip) {
      // Dramatic 5-second slow-motion broadcast sweep around Arham crossing the Finish Arch
      const u = Math.min(
        1,
        this.replayElapsed / Math.max(0.1, this.finishReplayClip.playbackDuration),
      );
      const camPose = computeReplayCameraPose(
        u,
        this.racers[0],
        this.finishReplayClip.finishZ,
        this.finishReplayClip.finishY,
      );
      const damp = 1 - Math.exp(-8.5 * dt);
      this.camera.position.x += (camPose.posX - this.camera.position.x) * damp;
      this.camera.position.y += (camPose.posY - this.camera.position.y) * damp;
      this.camera.position.z += (camPose.posZ - this.camera.position.z) * damp;

      if (Math.abs(this.camera.fov - camPose.fov) > 0.04) {
        this.camera.fov = THREE.MathUtils.damp(this.camera.fov, camPose.fov, 7.5, dt);
        this.camera.updateProjectionMatrix();
      }
      _vec3A.set(camPose.lookX, camPose.lookY, camPose.lookZ);
      this.camera.lookAt(_vec3A);
      return;
    }

    // Third-person Stumble Chase Camera with exponential damping, speed FOV kick & trauma shake
    const player = this.racers[0];
    const desiredX = player.x * 0.68;
    const desiredY = Math.max(2.6, player.y + 5.8);
    const desiredZ = player.z + 10.4;

    const dampFactor = 1 - Math.exp(-7.5 * dt);
    this.camera.position.x += (desiredX - this.camera.position.x) * dampFactor;
    this.camera.position.y += (desiredY - this.camera.position.y) * dampFactor;
    this.camera.position.z += (desiredZ - this.camera.position.z) * dampFactor;

    // Decaying trauma^2 camera shake on impacts
    let shakeX = 0;
    let shakeY = 0;
    if (this.cameraTrauma > 0) {
      this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 2.4);
      const mag = this.cameraTrauma * this.cameraTrauma * 0.45;
      shakeX = (Math.random() - 0.5) * 2 * mag;
      shakeY = (Math.random() - 0.5) * 2 * mag;
    }

    // Subtle FOV kick during speed boost or dive
    const targetFov = player.boostTimer > 0 || player.diveTimer > 0 ? 63 : 56;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();
    }

    _vec3A.set(player.x * 0.55 + shakeX, Math.max(0.5, player.y + 1.55) + shakeY, player.z - 8.5);
    _vec3B.copy(this.camera.position);
    this.camera.position.set(_vec3B.x + shakeX * 0.6, _vec3B.y + shakeY * 0.6, _vec3B.z);
    this.camera.lookAt(_vec3A);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const now = performance.now();
    const rawDt = Math.max(0.001, (now - this.lastTimestamp) / 1000);
    this.lastTimestamp = now;
    const dt = Math.min(rawDt, 0.05);

    this.worldTime += dt;

    if (this.gameState === 'playing') {
      if (this.feedback) {
        this.feedback.timer -= dt;
        if (this.feedback.timer <= 0) {
          this.feedback = null;
          this.emitHud();
        }
      }

      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      } else {
        this.elapsedTime += dt;

        // Time limit check
        if (this.elapsedTime >= this.course.timeLimitSeconds) {
          this.handleRunFinished('timeout');
        } else {
          const events: PhysicsEvent[] = [];
          const playerInput = this.readPlayerInput();
          stepRacerPhysics(this.racers[0], playerInput, this.course, dt, this.elapsedTime, events);

          for (let i = 1; i < this.racers.length; i++) {
            const aiIn = computeAiInput(this.racers[i], this.course, this.elapsedTime);
            stepRacerPhysics(this.racers[i], aiIn, this.course, dt, this.elapsedTime, events);
          }

          // Capture rolling ~30Hz pose frame for the 5-second finish-line slow-motion replay
          this.replayRecorder.capture(this.elapsedTime, this.racers);

          if (this.course.fallingTiles.length > 0) {
            const tileStep = stepFallingTiles(this.course.fallingTiles, dt);
            for (const fallen of tileStep.newlyFallenTiles) {
              const debrisColors =
                fallen.shape === 'hex'
                  ? [0xf59e0b, 0xfbbf24, 0xf97316, 0x78350f]
                  : [0xef4444, 0xf97316, 0xfef08a, 0x1e293b];
              this.particleVfx.emitSimpleBurst(
                fallen.x,
                fallen.baseY + 0.1,
                fallen.z,
                12,
                debrisColors,
                6.2,
                'debris',
              );
            }
          }

          if (events.length > 0) {
            this.processEvents(events);
          }
        }
      }

      this.hudEmitAccum += dt;
      if (this.hudEmitAccum >= 0.1 && this.gameState === 'playing') {
        this.hudEmitAccum = 0;
        this.emitHud();
      }
    } else if (this.gameState === 'replay' && this.finishReplayClip) {
      this.replayElapsed += dt;
      const sample = mapReplayPlaybackTime(this.replayElapsed, this.finishReplayClip);
      this.replaySpeedFactor = sample.effectiveSpeedFactor;
      this.replaySourceRaceTime = sample.sourceRaceTime;
      const justCrossed = sample.crossedFinish && !this.replayCrossedFinish;
      this.replayCrossedFinish = sample.crossedFinish;

      this.applyReplayFrameToRacers(sample.sourceRaceTime);

      // Fire celebratory slow-motion confetti burst at the exact finish-crossing climax
      if (sample.crossedFinish && !this.replayConfettiFired) {
        this.replayConfettiFired = true;
        const p = this.racers[0];
        this.particleVfx.emitQuizGateClear(p.x, p.y + 0.75, p.z, true);
        this.particleVfx.emitSimpleBurst(
          p.x,
          p.y + 1.25,
          p.z - 0.6,
          24,
          [0xfacc15, 0x38bdf8, 0xf43f5e, 0x22c55e, 0xffffff],
          8.4,
          'confetti',
        );
        this.sound.playQuizCorrect();
      }

      this.replayHudEmitAccum += dt;
      if (justCrossed || this.replayHudEmitAccum >= 0.065) {
        this.replayHudEmitAccum = 0;
        this.emitReplayHud();
      }

      if (sample.finished) {
        this.finishReplayToGameOver();
      }
    }

    const visualDt = this.gameState === 'replay' ? dt * this.replaySpeedFactor : dt;
    this.particleVfx.update(visualDt);
    this.syncVisuals(visualDt);
    this.updateCamera(dt);

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  };

  private scheduleNextFrame(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }

    // Start from Title Screen on Enter or Space (unless a modal dialog such as Top Scores is open)
    if (this.gameState === 'title') {
      if (document.querySelector('[role="dialog"]')) {
        return;
      }
      if (e.code === 'Enter' || e.code === 'Space') {
        this.startGame();
      }
      return;
    }

    if (this.gameState === 'replay') {
      if ((e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') && !e.repeat) {
        this.skipReplay();
      }
      return;
    }

    // Utility shortcuts
    if (e.code === 'KeyM' && !e.repeat) {
      this.toggleMute();
      return;
    }

    if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
      if (this.gameState === 'playing') this.pauseGame();
      else if (this.gameState === 'paused') this.resumeGame();
      return;
    }

    if (e.code === 'KeyR' && !e.repeat && (this.gameState === 'playing' || this.gameState === 'paused')) {
      this.restartGame();
      return;
    }

    if (this.gameState !== 'playing') return;

    this.sound.unlock();

    if (e.code === 'Space' && !this.keysHeld.has('Space')) {
      this.jumpJustPressed = true;
    }

    if (
      (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE' || e.code === 'KeyK') &&
      !e.repeat
    ) {
      this.diveJustPressed = true;
    }

    this.keysHeld.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (e.code === 'Space' && this.keysHeld.has('Space')) {
      this.jumpJustReleased = true;
    }
    this.keysHeld.delete(e.code);
  };

  private handleWindowBlur = (): void => {
    this.clearInputs();
  };

  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.clearInputs();
      this.sound.setSuspendedForBackground(true);
    } else {
      this.sound.setSuspendedForBackground(false);
    }
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
  };

  private handleResize(): void {
    const width = this.container.clientWidth || window.innerWidth;
    const height = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    this.disposed = true;
    this.sound.dispose();
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.resizeObserver.disconnect();
    this.clearGroup(this.courseGroup);
    this.particleVfx.dispose();
    this.shadowTex.dispose();
    this.bumpTex.dispose();
    this.envRenderTarget?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
