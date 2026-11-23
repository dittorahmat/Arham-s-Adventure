/**
 * 100% Procedural Web Audio API synthesizer for Arham's Adventure.
 * Zero external audio files — pitch-varied playful synth cues with mute toggle.
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
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
    this.playTone(392, 349, 0.2, 'triangle', 0.14, 0);
    this.playTone(349, 293, 0.22, 'triangle', 0.14, 0.2);
    this.playTone(293, 220, 0.36, 'sine', 0.15, 0.4);
  }
}
