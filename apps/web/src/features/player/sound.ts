/**
 * Tiny sound cues, synthesised with the Web Audio API - no audio files, no dependency. Off by
 * default (a web app that beeps unprompted is hostile); the choice is remembered in the browser.
 */
export type Cue = 'clear' | 'medal' | 'levelup';

const KEY = 'lifeos.sound';
let context: AudioContext | null = null;

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* blocked storage: the toggle just won't persist */
  }
}

/** Notes as [frequency Hz, start offset s, length s]. */
const CUES: Record<Cue, [number, number, number][]> = {
  clear: [[660, 0, 0.09], [880, 0.08, 0.14]],
  medal: [[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.18]],
  levelup: [[392, 0, 0.12], [523, 0.12, 0.12], [659, 0.24, 0.12], [784, 0.36, 0.3]],
};

export function playCue(cue: Cue): void {
  if (!soundEnabled() || typeof AudioContext === 'undefined') return;
  try {
    context ??= new AudioContext();
    const ctx = context;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    for (const [freq, offset, length] of CUES[cue]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.06, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + length);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + length + 0.02);
    }
  } catch {
    /* no audio device / autoplay blocked: silence is fine */
  }
}
