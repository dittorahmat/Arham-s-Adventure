export type MusicTensionLevel = 'normal' | 'hurry' | 'final';

export interface MusicDynamics {
  bpm: number;
  stepSeconds: number;
  tensionLevel: MusicTensionLevel;
  pitchMultiplier: number;
  intensity: number;
}

export const MUSIC_CONSTANTS = {
  baseBpm: 122,
  hurryStartSeconds: 45,
  hurryStartBpm: 130,
  finalStartSeconds: 20,
  finalStartBpm: 152,
  maxBpm: 178,
  finalSemitoneLift: Math.pow(2, 1 / 12), // +1 semitone classic final-seconds urgency
  stepsPerLoop: 32, // 4 bars of 8th notes
} as const;

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Computes dynamic BPM, 8th-note step duration, tension tier, and harmonic pitch lift
 * from remaining race time so the looping soundtrack ramps seamlessly into the final seconds.
 */
export function computeMusicDynamics(
  timeLeftSeconds: number,
  timeLimitSeconds: number,
): MusicDynamics {
  const limit = Math.max(1, Number.isFinite(timeLimitSeconds) ? timeLimitSeconds : 180);
  const left = Math.max(0, Math.min(limit, Number.isFinite(timeLeftSeconds) ? timeLeftSeconds : limit));

  let bpm: number;
  let tensionLevel: MusicTensionLevel;
  let intensity: number;
  let pitchMultiplier = 1;

  if (left <= MUSIC_CONSTANTS.finalStartSeconds) {
    // Final 20 seconds: steep ramp from 152 BPM -> 178 BPM + 1 semitone urgency lift
    const t = 1 - left / MUSIC_CONSTANTS.finalStartSeconds;
    bpm = MUSIC_CONSTANTS.finalStartBpm + t * (MUSIC_CONSTANTS.maxBpm - MUSIC_CONSTANTS.finalStartBpm);
    tensionLevel = 'final';
    intensity = 0.65 + t * 0.35;
    pitchMultiplier = MUSIC_CONSTANTS.finalSemitoneLift;
  } else if (left <= MUSIC_CONSTANTS.hurryStartSeconds) {
    // 45s -> 20s remaining: energetic acceleration from 130 BPM -> 152 BPM
    const span = MUSIC_CONSTANTS.hurryStartSeconds - MUSIC_CONSTANTS.finalStartSeconds;
    const t = 1 - (left - MUSIC_CONSTANTS.finalStartSeconds) / span;
    bpm = MUSIC_CONSTANTS.hurryStartBpm + t * (MUSIC_CONSTANTS.finalStartBpm - MUSIC_CONSTANTS.hurryStartBpm);
    tensionLevel = 'hurry';
    intensity = 0.25 + t * 0.4;
  } else {
    // Cruising phase: gentle build from 122 BPM -> 130 BPM
    const cruiseSpan = Math.max(1, limit - MUSIC_CONSTANTS.hurryStartSeconds);
    const t = Math.max(0, Math.min(1, 1 - (left - MUSIC_CONSTANTS.hurryStartSeconds) / cruiseSpan));
    bpm = MUSIC_CONSTANTS.baseBpm + t * (MUSIC_CONSTANTS.hurryStartBpm - MUSIC_CONSTANTS.baseBpm);
    tensionLevel = 'normal';
    intensity = t * 0.25;
  }

  const roundedBpm = Math.round(bpm * 10) / 10;
  // 8th-note step duration: 1 beat = 60/bpm seconds -> 1/2 beat = 30/bpm seconds
  const stepSeconds = 30 / roundedBpm;

  return {
    bpm: roundedBpm,
    stepSeconds,
    tensionLevel,
    pitchMultiplier,
    intensity,
  };
}

// 32-step (4-bar, 8th-note) cheerful Stumble-style arcade loop (C - G - Am - F/G)
// null = rest for rhythmic bounce
export const MELODY_PATTERN: ReadonlyArray<number | null> = [
  // Bar 1 (C major)
  72, 76, 79, null, 81, 79, 76, 79,
  // Bar 2 (G major)
  83, 81, 79, null, 74, 76, 79, 74,
  // Bar 3 (A minor)
  81, 84, 83, null, 81, 79, 76, 79,
  // Bar 4 (F major -> G7 turnaround)
  77, 81, 84, 81, 79, 83, 86, 83,
];

export const BASS_PATTERN: ReadonlyArray<number | null> = [
  // Bar 1 (C3 / G2 bounce)
  48, null, 55, null, 48, null, 52, 55,
  // Bar 2 (G2 / D3 bounce)
  43, null, 50, null, 43, null, 47, 50,
  // Bar 3 (A2 / E3 bounce)
  45, null, 52, null, 45, null, 48, 52,
  // Bar 4 (F2 -> G2 drive)
  41, null, 48, null, 43, null, 47, 50,
];

// Subtle sparkle arpeggio added during 'hurry' and 'final' tension phases
export const HARMONY_PATTERN: ReadonlyArray<number | null> = [
  null, 79, null, 84, null, 79, null, 84,
  null, 74, null, 79, null, 74, null, 83,
  null, 76, null, 81, null, 76, null, 84,
  null, 77, null, 81, null, 79, null, 86,
];
