// Lightweight synth sound effects via the Web Audio API — no asset files needed.
// Fully guarded: if audio is unavailable/blocked it silently no-ops (never throws).
let ctx: AudioContext | null = null;
let on = true;

function getCtx(): AudioContext | null {
  if (!on) return null;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) { on = false; return null; }
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    on = false;
    return null;
  }
}

/** Call once from a user gesture so the browser allows audio. */
export function initAudio() { getCtx(); }

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.05, delay = 0) {
  const a = getCtx();
  if (!a) return;
  try {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    g.connect(a.destination);
    const t = a.currentTime + delay;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch { /* ignore */ }
}

export const sfx = {
  coin: () => { tone(880, 0.1, "triangle", 0.05); tone(1320, 0.1, "triangle", 0.04, 0.05); },
  click: () => tone(280, 0.05, "square", 0.03),
  win: () => { tone(523, 0.1, "triangle", 0.05); tone(659, 0.1, "triangle", 0.05, 0.08); tone(784, 0.16, "triangle", 0.05, 0.16); },
  level: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, "triangle", 0.05, i * 0.08)),
  error: () => tone(150, 0.16, "sawtooth", 0.04),
};

// ---- Background music: a gentle looping arpeggio over a I–V–vi–IV progression.
const CHORDS = [
  [261.63, 329.63, 392.0, 523.25], // C
  [196.0, 246.94, 293.66, 392.0],  // G
  [220.0, 261.63, 329.63, 440.0],  // Am
  [174.61, 220.0, 261.63, 349.23], // F
];
const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
const BPM = 96;
const EIGHTH = 60 / BPM / 2;

let musicOn = false;
let musicTimer: number | null = null;
let nextNoteAt = 0;
let step = 0;

function musicNote(freq: number, dur: number, when: number, gain: number, type: OscillatorType = "triangle") {
  const a = getCtx();
  if (!a) return;
  try {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.start(when); o.stop(when + dur + 0.03);
  } catch { /* ignore */ }
}

function scheduleMusic() {
  const a = getCtx();
  if (!a || !musicOn) return;
  while (nextNoteAt < a.currentTime + 0.25) {
    const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    const inChord = step % 8;
    musicNote(chord[ARP[inChord]] * 2, EIGHTH * 1.6, nextNoteAt, 0.035); // melody (octave up)
    if (inChord === 0 || inChord === 4) musicNote(chord[0], EIGHTH * 3, nextNoteAt, 0.045, "sine"); // bass
    nextNoteAt += EIGHTH;
    step++;
  }
}

export function isMusicOn() { return musicOn; }

export function setMusic(on: boolean) {
  musicOn = on;
  const a = getCtx();
  if (on && a) {
    if (musicTimer === null) musicTimer = window.setInterval(scheduleMusic, 60);
    nextNoteAt = Math.max(nextNoteAt, a.currentTime + 0.1);
  } else if (!on && musicTimer !== null) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
}
