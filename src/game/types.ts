import type { DailyChallengeItem } from './dailyChallenges';

export type SubjectFilter = 'semua' | 'matematika' | 'ipa' | 'ips' | 'bahasa';

export type SubjectKey = Exclude<SubjectFilter, 'semua'>;

export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type PlayableGameMode = 'classic' | 'tile_fall' | 'ice_slide' | 'laser_dash' | 'honey_drop';

export type GameMode = PlayableGameMode;

export type GameModeSelection = 'random' | PlayableGameMode;

export type GameState = 'title' | 'playing' | 'paused' | 'replay' | 'gameover';

export type AiPolicy = 'speedster' | 'cautious' | 'quizwhiz';

export type TileState = 'hidden' | 'safe_revealed' | 'shaking' | 'falling' | 'gone';

export type TileShape = 'square' | 'hex';

export type PlatformSurface = 'normal' | 'ice' | 'neon';

export interface FallingTileDef {
  id: string;
  gridIndex: number;
  row: number;
  col: number;
  x: number;
  baseY: number;
  y: number;
  z: number;
  size: number;
  shape?: TileShape;
  crumbleDuration?: number;
  isSafe: boolean;
  state: TileState;
  shakeTimer: number;
  fallVy: number;
  rotX: number;
  rotZ: number;
  spinX: number;
  spinZ: number;
  revealPop: number;
  hintPhase: number;
}

export interface QuizQuestion {
  id: string;
  grade: GradeLevel;
  subject: SubjectKey;
  topic: string;
  question: string;
  options: [string, string, string];
  correctIndex: 0 | 1 | 2;
  explanation: string;
  difficultyTier?: DifficultyLevel;
}

export interface PlatformDef {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  length: number;
  kind: 'start' | 'track' | 'ruler_bridge' | 'quiz_plaza' | 'finish';
  surface?: PlatformSurface;
  colorHex: number;
  moveAxis?: 'x';
  moveAmp?: number;
  moveSpeed?: number;
  movePhase?: number;
}

export interface SweeperDef {
  id: string;
  x: number;
  y: number;
  z: number;
  armLength: number;
  barHeight: number;
  speed: number;
  phase: number;
}

export interface LaserBarrierDef {
  id: string;
  zMin: number;
  zMax: number;
  y: number;
  barHeight: number;
  width: number;
  speed: number;
  phase: number;
  colorHex: number;
}

export interface BumperDef {
  id: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  colorHex: number;
  moveAmp?: number;
  moveSpeed?: number;
  movePhase?: number;
}

export interface SpeedPadDef {
  id: string;
  x: number;
  y: number;
  z: number;
  width: number;
  length: number;
}

export interface StarPickupDef {
  id: string;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

export interface QuizDoorState {
  index: 0 | 1 | 2;
  x: number;
  width: number;
  opened: boolean;
  wrongRevealed: boolean;
}

export interface QuizGateDef {
  id: string;
  gateIndex: number;
  z: number;
  y: number;
  promptStartZ: number;
  question: QuizQuestion;
  doors: [QuizDoorState, QuizDoorState, QuizDoorState];
  playerCleared: boolean;
  playerMissedOnce: boolean;
}

export interface CourseLayout {
  mode: PlayableGameMode;
  platforms: PlatformDef[];
  fallingTiles: FallingTileDef[];
  sweepers: SweeperDef[];
  lasers: LaserBarrierDef[];
  bumpers: BumperDef[];
  speedPads: SpeedPadDef[];
  stars: StarPickupDef[];
  quizGates: QuizGateDef[];
  startZ: number;
  finishZ: number;
  timeLimitSeconds: number;
}

export interface RacerState {
  id: string;
  name: string;
  isPlayer: boolean;
  policy: AiPolicy;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facingYaw: number;
  grounded: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  diveTimer: number;
  diveCooldown: number;
  stunTimer: number;
  boostTimer: number;
  hitFlashTimer: number;
  squashX: number;
  squashY: number;
  walkDistance: number;
  checkpointX: number;
  checkpointY: number;
  checkpointZ: number;
  finished: boolean;
  finishTime: number | null;
  aiTargetX: number;
  aiDecisionGate: number;
  aiChosenDoor: number;
}

export interface InputState {
  moveX: number;
  moveZ: number;
  jumpHeld: boolean;
  jumpJustPressed: boolean;
  jumpJustReleased: boolean;
  diveJustPressed: boolean;
}

export interface QuizFeedback {
  kind: 'correct' | 'wrong';
  headline: string;
  detail: string;
  timer: number;
}

export type AchievementId =
  | 'first_finish'
  | 'champion_1'
  | 'perfect_quiz'
  | 'streak_10'
  | 'fastest_lap'
  | 'star_collector';

export type AchievementIconKind =
  | 'flag'
  | 'trophy'
  | 'perfect'
  | 'streak'
  | 'stopwatch'
  | 'star';

export interface AchievementProfile {
  unlockedIds: AchievementId[];
  currentAnswerStreak: number;
  bestAnswerStreak: number;
  fastestLapSeconds: number | null;
  totalWins: number;
  totalRacesCompleted: number;
  totalStarsCollected: number;
}

export interface AchievementBadgeView {
  id: AchievementId;
  title: string;
  description: string;
  icon: AchievementIconKind;
  unlocked: boolean;
  newlyUnlocked: boolean;
  progressText: string;
  accentHex: string;
}

export interface HudSnapshot {
  mode: PlayableGameMode;
  selectedMode: GameModeSelection;
  grade: GradeLevel;
  difficulty: DifficultyLevel;
  rank: number;
  totalRacers: number;
  score: number;
  starsCollected: number;
  totalStars: number;
  progressPct: number;
  timeLeft: number;
  elapsedTime: number;
  streak: number;
  correctCount: number;
  totalGates: number;
  diveReadyPct: number;
  activeGate: {
    gateIndex: number;
    question: QuizQuestion;
    wrongDoors: boolean[];
    cleared: boolean;
  } | null;
  feedback: QuizFeedback | null;
}

export interface AnsweredReviewItem {
  gateIndex: number;
  subject: SubjectKey;
  question: string;
  correctAnswer: string;
  explanation: string;
  firstTryCorrect: boolean;
}

export interface GameOverSnapshot {
  outcome: 'victory' | 'timeout';
  grade: GradeLevel;
  difficulty: DifficultyLevel;
  rank: number;
  totalRacers: number;
  score: number;
  bestScore: number;
  clearTime: number;
  fastestLapSeconds: number | null;
  isNewFastestLap: boolean;
  bestAnswerStreak: number;
  correctCount: number;
  totalGates: number;
  starsCollected: number;
  totalStars: number;
  progressPct: number;
  achievements: AchievementBadgeView[];
  newlyUnlockedCount: number;
  dailyChallenges: DailyChallengeItem[];
  dailyChallengesCompletedThisRun: string[];
  dailyBonusPointsThisRun: number;
  hasFinishReplay: boolean;
  review: AnsweredReviewItem[];
}
