import {
  BASS_PATTERN,
  computeMusicDynamics,
  HARMONY_PATTERN,
  MELODY_PATTERN,
  midiToFreq,
  MUSIC_CONSTANTS,
  MusicDynamics,
} from './musicTempo';

/**
 * 100% Procedural Web Audio API synthesizer + dynamic-tempo looping background music
 * for Arham's Adventure. Zero external audio files — pitch-varied playful synth cues
 * and an upbeat race soundtrack that accelerates during the final seconds.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicMasterGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private muted = false;

  // Dynamic looping music sequencer state
  private musicPlaying = false;
  private backgroundSuspended = false;
  private schedulerTimer: number | null = null;
  private nextStepTime = 0;
  private currentStep = 0;
  private musicTimeLeft = 180;
  private musicTimeLimit = 180;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    this.syncMusicGain();
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    this.syncMusicGain();
    return this.muted;
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.musicMasterGain = this.ctx.createGain();
        this.musicMasterGain.gain.setValueAtTime(this.muted ? 0.0001 : 0.85, this.ctx.currentTime);
        this.musicMasterGain.connect(this.ctx.destination);
        this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.musicPlaying && !this.backgroundSuspended && this.ctx) {
          this.nextStepTime = Math.max(this.nextStepTime, this.ctx.currentTime + 0.04);
        }
      }).catch(() => {});
    }
  }

  public startMusic(timeLeftSeconds: number, timeLimitSeconds: number): void {
    this.musicTimeLeft = timeLeftSeconds;
    this.musicTimeLimit = timeLimitSeconds;
    this.musicPlaying = true;
    this.unlock();
    this.syncMusicGain();

    if (this.ctx) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
    }

    if (this.schedulerTimer === null && typeof window !== 'undefined') {
      this.schedulerTimer = window.setInterval(() => this.tickMusicScheduler(), 40);
    }
  }

  public updateMusicTime(timeLeftSeconds: number, timeLimitSeconds: number): void {
    this.musicTimeLeft = timeLeftSeconds;
    this.musicTimeLimit = timeLimitSeconds;
  }

  public stopMusic(): void {
    this.musicPlaying = false;
    this.currentStep = 0;
    if (this.schedulerTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.syncMusicGain();
  }

  public setSuspendedForBackground(hidden: boolean): void {
    this.backgroundSuspended = hidden;
    if (!hidden && this.ctx && this.musicPlaying) {
      this.nextStepTime = this.ctx.currentTime + 0.05;
    }
    this.syncMusicGain();
  }

  public dispose(): void {
    this.stopMusic();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
      this.musicMasterGain = null;
      this.noiseBuffer = null;
    }
  }

  private syncMusicGain(): void {
    if (!this.ctx || !this.musicMasterGain) return;
    const shouldSound = this.musicPlaying && !this.muted && !this.backgroundSuspended;
    const now = this.ctx.currentTime;
    this.musicMasterGain.gain.cancelScheduledValues(now);
    this.musicMasterGain.gain.setTargetAtTime(shouldSound ? 0.85 : 0.0001, now, 0.025);
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.08);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    return buffer;
  }

  private tickMusicScheduler(): void {
    if (!this.musicPlaying || this.backgroundSuspended || !this.ctx || this.ctx.state !== 'running') {
      return;
    }

    const now = this.ctx.currentTime;
    const lookahead = 0.13;

    // Prevent audio burst if browser tab lagged behind
    if (this.nextStepTime < now - 0.15) {
      this.nextStepTime = now + 0.04;
    }

    const dynamics = computeMusicDynamics(this.musicTimeLeft, this.musicTimeLimit);

    while (this.nextStepTime < now + lookahead) {
      if (!this.muted) {
        this.scheduleMusicStep(this.currentStep, this.nextStepTime, dynamics);
      }
      this.nextStepTime += dynamics.stepSeconds;
      this.currentStep = (this.currentStep + 1) % MUSIC_CONSTANTS.stepsPerLoop;
    }
  }

  private scheduleMusicStep(step: number, time: number, dynamics: MusicDynamics): void {
    if (!this.ctx || !this.musicMasterGain) return;

    const noteDur = Math.max(0.06, dynamics.stepSeconds * 0.82);

    // 1. Playful lead melody (bouncy arcade triangle/square blend)
    const melodyMidi = MELODY_PATTERN[step];
    if (melodyMidi !== null) {
      const freq = midiToFreq(melodyMidi) * dynamics.pitchMultiplier;
      const leadType: OscillatorType = dynamics.tensionLevel === 'final' ? 'square' : 'triangle';
      const leadVol = dynamics.tensionLevel === 'final' ? 0.042 : 0.068;
      this.scheduleMusicTone(freq, time, noteDur, leadType, leadVol);
    }

    // 2. Bouncy walking bassline
    const bassMidi = BASS_PATTERN[step];
    if (bassMidi !== null) {
      const freq = midiToFreq(bassMidi) * dynamics.pitchMultiplier;
      this.scheduleMusicTone(freq, time, dynamics.stepSeconds * 0.9, 'triangle', 0.075);
    }

    // 3. Energetic off-beat harmony sparkle in 'hurry' and 'final' phases
    if (dynamics.tensionLevel !== 'normal') {
      const harmMidi = HARMONY_PATTERN[step];
      if (harmMidi !== null) {
        const freq = midiToFreq(harmMidi) * dynamics.pitchMultiplier;
        const harmVol = dynamics.tensionLevel === 'final' ? 0.038 : 0.024;
        this.scheduleMusicTone(freq, time, noteDur * 0.72, 'sine', harmVol);
      }
    }

    // 4. Kick drum (beats 1 & 3 normally, four-on-the-floor in final seconds!)
    const isKickStep =
      dynamics.tensionLevel === 'final' ? step % 2 === 0 : step % 4 === 0;
    if (isKickStep) {
      this.scheduleKick(time, dynamics.tensionLevel === 'final' ? 0.095 : 0.075);
    }

    // 5. Crisp hi-hat / snare groove (intensifies with hurry & final countdown)
    const isSnareStep = step % 4 === 2;
    const isHatStep = dynamics.tensionLevel === 'normal' ? step % 2 === 1 : true;
    if (isSnareStep) {
      this.scheduleNoisePerc(time, 0.045, 1900, 0.045);
    } else if (isHatStep) {
      const hatVol = dynamics.tensionLevel === 'final' ? 0.03 : 0.02;
      this.scheduleNoisePerc(time, 0.024, 5800, hatVol);
    }
  }

  private scheduleMusicTone(
    freq: number,
    time: number,
    duration: number,
    type: OscillatorType,
    volume: number,
  ): void {
    if (!this.ctx || !this.musicMasterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(gain);
    gain.connect(this.musicMasterGain);
    osc.start(time);
    osc.stop(time + duration + 0.015);
  }

  private scheduleKick(time: number, volume: number): void {
    if (!this.ctx || !this.musicMasterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(135, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.085);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);

    osc.connect(gain);
    gain.connect(this.musicMasterGain);
    osc.start(time);
    osc.stop(time + 0.11);
  }

  private scheduleNoisePerc(time: number, duration: number, filterFreq: number, volume: number): void {
    if (!this.ctx || !this.musicMasterGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(filterFreq, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicMasterGain);
    src.start(time);
    src.stop(time + duration + 0.01);
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playJump(): void {
    const jitter = 0.94 + Math.random() * 0.12;
    this.playTone(260 * jitter, 520 * jitter, 0.14, 'triangle', 0.14);
  }

  public playLand(): void {
    this.playTone(135, 65, 0.08, 'sine', 0.09);
  }

  public playDive(): void {
    this.playTone(340, 190, 0.18, 'sawtooth', 0.08);
    this.playTone(540, 780, 0.14, 'triangle', 0.09, 0.03);
  }

  public playBumper(): void {
    const jitter = 0.92 + Math.random() * 0.16;
    this.playTone(190 * jitter, 510 * jitter, 0.16, 'sine', 0.18);
    this.playTone(420 * jitter, 240 * jitter, 0.12, 'triangle', 0.1, 0.05);
  }

  public playSweeperHit(): void {
    this.playTone(160, 58, 0.22, 'sawtooth', 0.18);
    this.playTone(290, 110, 0.15, 'square', 0.08, 0.02);
  }

  public playSpeedPad(): void {
    this.playTone(440, 880, 0.18, 'triangle', 0.12);
    this.playTone(660, 1180, 0.18, 'sine', 0.1, 0.06);
  }

  public playStar(): void {
    this.playTone(880, 1175, 0.11, 'sine', 0.13);
    this.playTone(1318, 1760, 0.14, 'triangle', 0.11, 0.06);
  }

  public playQuizCorrect(): void {
    // Cheerful major triad chime
    this.playTone(523.25, 523.25, 0.15, 'triangle', 0.15, 0);
    this.playTone(659.25, 659.25, 0.15, 'triangle', 0.15, 0.07);
    this.playTone(783.99, 783.99, 0.18, 'triangle', 0.16, 0.14);
    this.playTone(1046.5, 1046.5, 0.3, 'sine', 0.16, 0.21);
  }

  public playQuizWrong(): void {
    // Playful cartoon bonk-buzz (friendly, not harsh)
    this.playTone(240, 165, 0.16, 'sawtooth', 0.12, 0);
    this.playTone(185, 130, 0.22, 'triangle', 0.13, 0.12);
  }

  public playTileSafe(): void {
    const jitter = 0.96 + Math.random() * 0.08;
    this.playTone(620 * jitter, 880 * jitter, 0.1, 'triangle', 0.11);
  }

  public playTileBreak(): void {
    const jitter = 0.92 + Math.random() * 0.14;
    this.playTone(250 * jitter, 82 * jitter, 0.22, 'sawtooth', 0.13);
    this.playTone(170 * jitter, 65 * jitter, 0.18, 'triangle', 0.12, 0.04);
  }

  public playHoneyCrack(): void {
    const jitter = 0.94 + Math.random() * 0.12;
    this.playTone(540 * jitter, 260 * jitter, 0.11, 'triangle', 0.12);
    this.playTone(320 * jitter, 140 * jitter, 0.14, 'sine', 0.1, 0.04);
  }

  public playLaserZap(): void {
    const jitter = 0.95 + Math.random() * 0.1;
    this.playTone(1120 * jitter, 220 * jitter, 0.18, 'sawtooth', 0.14);
    this.playTone(860 * jitter, 140 * jitter, 0.2, 'square', 0.09, 0.03);
  }

  public playRespawn(): void {
    this.playTone(300, 180, 0.15, 'sine', 0.1, 0);
    this.playTone(320, 520, 0.18, 'triangle', 0.11, 0.14);
  }

  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5];
    const times = [0, 0.1, 0.2, 0.32, 0.46, 0.56];
    notes.forEach((n, i) => {
      this.playTone(n, n, i === notes.length - 1 ? 0.45 : 0.14, 'triangle', 0.16, times[i]);
    });
  }

  public playTimeout(): void {
    const notes = [392, 349, 293];
    const times = [0, 0.2, 0.4];
    this.playTone(notes[0], notes[1], 0.2, 'triangle', 0.14, times[0]);
    this.playTone(notes[1], notes[2], 0.22, 'triangle', 0.14, times[1]);
    this.playTone(notes[2], 220, 0.36, 'sine', 0.15, times[2]);
  }
}
