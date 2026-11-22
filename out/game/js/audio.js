// audio.js — every sound is a WebAudio oscillator. No audio files.
//
// Short synthesized blips: a pickup chime, a coin clink, a vault dial
// click, the rising alarm, a caught sting and a win arpeggio. The audio
// context is created on the first user gesture, so browsers allow it.

let ctx = null;
let alarmNodes = null;

function audioContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// One oscillator note with a quick fade, so nothing clicks or drones.
export function beep(freq, duration = 0.12, type = 'sine', gainValue = 0.12, when = 0) {
  const ac = audioContext();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

// A note that slides from one pitch to another (used for coin and alarm).
function slide(fromFreq, toFreq, duration, type = 'sine', gainValue = 0.1) {
  const ac = audioContext();
  if (!ac) return;
  const t0 = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(fromFreq, t0);
  osc.frequency.exponentialRampToValueAtTime(toFreq, t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function pickupSound() {
  beep(880, 0.1, 'sine', 0.12);
  beep(1318, 0.14, 'sine', 0.1, 0.07);
}

export function coinSound() {
  slide(2400, 1700, 0.09, 'triangle', 0.09);
  beep(3100, 0.06, 'triangle', 0.06, 0.08);
}

export function vaultClickSound() {
  beep(220, 0.05, 'square', 0.05);
}

export function vaultOpenSound() {
  beep(392, 0.12, 'triangle', 0.1);
  beep(523, 0.12, 'triangle', 0.1, 0.1);
  beep(784, 0.2, 'triangle', 0.1, 0.2);
}

export function caughtSound() {
  slide(320, 70, 0.7, 'sawtooth', 0.14);
  beep(110, 0.5, 'square', 0.08, 0.1);
}

export function winSound() {
  const notes = [523, 659, 784, 1046, 1318];
  notes.forEach((n, i) => beep(n, 0.22, 'triangle', 0.11, i * 0.11));
}

// The alarm loop: a low pulsing tone while the meter is high. Call once
// per frame with the current alarm level (0..1); it starts, retunes and
// stops the loop as needed.
export function alarmLoop(level) {
  const ac = audioContext();
  if (!ac) return;
  if (level <= 0.25) {
    stopAlarmLoop();
    return;
  }
  if (!alarmNodes) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 190;
    lfo.type = 'sine';
    lfo.frequency.value = 5;
    lfoGain.gain.value = 0.03;
    gain.gain.value = 0.0;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    lfo.start();
    alarmNodes = { osc, gain, lfo };
  }
  const target = 0.02 + level * 0.05;
  alarmNodes.gain.gain.setTargetAtTime(target, ac.currentTime, 0.1);
  alarmNodes.osc.frequency.setTargetAtTime(170 + level * 160, ac.currentTime, 0.15);
}

export function stopAlarmLoop() {
  if (!alarmNodes) return;
  try {
    alarmNodes.osc.stop();
    alarmNodes.lfo.stop();
  } catch (e) {
    // Already stopped; nothing to do.
  }
  alarmNodes = null;
}

// Unlock audio on the first click or keypress (browsers require a gesture).
export function unlockAudio() {
  audioContext();
}
