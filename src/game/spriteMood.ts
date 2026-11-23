import { HudSnapshot } from './types';

export type ArhamSpriteMood = 'idle-cheer' | 'run' | 'celebrate' | 'bonk';

/**
 * Resolves Arham's HUD sprite animation mood from live race & quiz state.
 */
export function resolveHudSpriteMood(hud: Pick<HudSnapshot, 'feedback' | 'streak' | 'rank'>): ArhamSpriteMood {
  if (hud.feedback?.kind === 'wrong') {
    return 'bonk';
  }
  if (hud.feedback?.kind === 'correct' || hud.streak >= 3) {
    return 'celebrate';
  }
  return 'run';
}

/**
 * Returns the CSS frame-loop duration in milliseconds for each sprite mood.
 */
export function getSpriteFrameDurationMs(mood: ArhamSpriteMood): number {
  switch (mood) {
    case 'run':
      return 480;
    case 'celebrate':
      return 520;
    case 'bonk':
      return 560;
    case 'idle-cheer':
    default:
      return 760;
  }
}
