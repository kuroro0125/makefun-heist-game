// main.js — boot and the game loop for MIDNIGHT VAULT.
//
// Owns the game state, the alarm meter, the vault-cracking timer and the
// win / caught transitions. The world, guards, player, rendering and audio
// each live in their own module; this file only wires them together.

import {
  FLOOR,
  VAULT,
  VAN_PAD,
  PATROLS,
  CAMERAS,
  PLAYER_START,
  buildLoot,
  segmentBlocked,
} from './world.js';
import {
  makeGuard,
  makeCamera,
  updateGuard,
  updateCamera,
  canSee,
  distractGuard,
} from './guards.js';
import {
  makePlayer,
  updatePlayer,
  makeCoin,
  updateCoin,
  lootInReach,
  nearVault,
  clampToFloor,
  COIN_HEAR_RADIUS,
  COIN_COST,
  LOUD_STEP_RADIUS,
} from './player.js';
import { drawFrame } from './render.js';
import {
  pickupSound,
  coinSound,
  vaultClickSound,
  vaultOpenSound,
  caughtSound,
  winSound,
  alarmLoop,
  stopAlarmLoop,
  unlockAudio,
  beep,
} from './audio.js';
import { sceneFromUrl, applyScene } from './scenes.js';

// Alarm tuning: a fair grace period. Standing in a cone fills the meter
// in about 2.2 s; sneaking stretches that to about 4 s; a camera is a
// little slower than a guard. Hidden, the meter drains in ~5 s.
const ALARM_GUARD_RATE = 46;
const ALARM_GUARD_SNEAK_RATE = 25;
const ALARM_CAMERA_RATE = 34;
const ALARM_DECAY_RATE = 19;
const ALARM_CAUGHT = 100;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FLOOR.width;
canvas.height = FLOOR.height;

const keys = new Set();

function freshState() {
  const guards = [
    makeGuard('rook', PATROLS.rook, 0),
    makeGuard('bishop', PATROLS.bishop, 0),
    makeGuard('knight', PATROLS.knight, 0),
  ];
  return {
    phase: 'title', // title | playing | caught | won | scene
    scene: null,
    time: 0, // absolute clock for sweeps and pulses
    elapsed: 0, // heist timer, counts only while playing
    player: makePlayer(PLAYER_START),
    guards,
    cameras: CAMERAS.map(makeCamera),
    loot: buildLoot(),
    coins: [], // coins currently flying or ringing on the floor
    alarm: 0,
    vaultOpen: false,
    crackProgress: 0, // 0..1 while standing at the vault
    finalLoot: 0,
    finalScore: 0,
  };
}

let state = freshState();

// Start a fresh heist from the title or end screens.
function startGame() {
  state = freshState();
  state.phase = 'playing';
  stopAlarmLoop();
}

function resetToTitle() {
  state = freshState();
  stopAlarmLoop();
}

// The alarm meter: rises while any watcher sees the thief, falls when
// hidden. Hitting 100 while seen means caught — with the meter's speed
// there is always time to break line of sight first.
function updateAlarm(dt) {
  const player = state.player;
  let seenByGuard = false;
  let seenByCamera = false;
  for (const guard of state.guards) {
    guard.alerted = canSee(guard, player.x, player.y, player.sneaking);
    if (guard.alerted) seenByGuard = true;
  }
  for (const cam of state.cameras) {
    cam.alerted = canSee(cam, player.x, player.y, player.sneaking);
    if (cam.alerted) seenByCamera = true;
  }
  if (state.phase !== 'playing') return;

  if (seenByGuard || seenByCamera) {
    let rate = 0;
    if (seenByGuard) rate = Math.max(rate, player.sneaking ? ALARM_GUARD_SNEAK_RATE : ALARM_GUARD_RATE);
    if (seenByCamera) rate = Math.max(rate, ALARM_CAMERA_RATE);
    state.alarm = Math.min(ALARM_CAUGHT, state.alarm + rate * dt);
    if (state.alarm >= ALARM_CAUGHT) {
      catchThief();
    }
  } else {
    state.alarm = Math.max(0, state.alarm - ALARM_DECAY_RATE * dt);
  }
  alarmLoop(state.alarm / 100);
}

function catchThief() {
  state.phase = 'caught';
  stopAlarmLoop();
  caughtSound();
}

function winHeist() {
  state.phase = 'won';
  state.finalLoot = state.player.loot;
  const timePenalty = Math.floor(state.elapsed) * 2;
  state.finalScore = Math.max(0, state.player.loot - timePenalty - state.player.coinsUsed * COIN_COST);
  stopAlarmLoop();
  winSound();
}

function grabLoot() {
  const player = state.player;
  for (const item of state.loot) {
    if (item.inVault && !state.vaultOpen) continue; // the gem waits for the vault
    if (!lootInReach(player, item)) continue;
    item.taken = true;
    player.loot += item.value;
    player.lootCount += 1;
    if (item.id === 'gem') player.hasGem = true;
    pickupSound();
  }
}

// Standing by the vault cracks it open after VAULT.crackSeconds.
function updateVault(dt) {
  if (state.vaultOpen) return;
  if (state.phase !== 'playing') return;
  if (nearVault(state.player, VAULT)) {
    state.crackProgress += dt / VAULT.crackSeconds;
    if (Math.random() < dt * 4) vaultClickSound();
    if (state.crackProgress >= 1) {
      state.vaultOpen = true;
      state.crackProgress = 0;
      vaultOpenSound();
    }
  } else {
    state.crackProgress = Math.max(0, state.crackProgress - dt * 0.7);
  }
}

// Escaping: reach the van pad. The gem is needed for the best ending,
// but any loot at all still counts as a getaway.
function checkEscape() {
  const p = state.player;
  if (state.phase !== 'playing') return;
  if (p.x > VAN_PAD.x && p.x < VAN_PAD.x + VAN_PAD.w && p.y > VAN_PAD.y && p.y < VAN_PAD.y + VAN_PAD.h) {
    if (p.lootCount > 0) winHeist();
  }
}

// Running close to a guard is heard: the guard turns to investigate.
function updateNoise() {
  const player = state.player;
  if (!player.movingFast || state.phase !== 'playing') return;
  for (const guard of state.guards) {
    if (guard.state !== 'patrol') continue;
    const dist = Math.hypot(guard.x - player.x, guard.y - player.y);
    if (dist < LOUD_STEP_RADIUS && !segmentBlocked(guard.x, guard.y, player.x, player.y)) {
      distractGuard(guard, player.x, player.y);
    }
  }
}

// One tick of the simulation.
function update(dt) {
  state.time += dt;
  if (state.phase === 'playing') {
    state.elapsed += dt;
    updatePlayer(state.player, keys, dt);
    for (const guard of state.guards) updateGuard(guard, dt);
    for (const cam of state.cameras) updateCamera(cam, state.time);
    updateAlarm(dt);
    updateVault(dt);
    grabLoot();
    updateNoise();
    checkEscape();
  }
  // Coins fly and ring in every phase (they are visible in scenes too).
  for (const coin of state.coins) updateCoin(coin, dt);
  state.coins = state.coins.filter((c) => !c.landed || c.ring < 1);
}

// The render loop: fixed-step simulation, draw every frame.
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (state.phase !== 'scene') update(dt);
  drawFrame(ctx, state);
  requestAnimationFrame(frame);
}

// Throw a coin toward the click point. A landed coin pulls every guard
// in earshot over to look at it.
function tossCoin(clientX, clientY) {
  if (state.phase !== 'playing') return;
  const player = state.player;
  if (player.coins <= 0) {
    beep(160, 0.12, 'square', 0.08);
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const target = clampToFloor(
    ((clientX - rect.left) / rect.width) * FLOOR.width,
    ((clientY - rect.top) / rect.height) * FLOOR.height,
  );
  player.coins -= 1;
  player.coinsUsed += 1;
  const coin = makeCoin(player.x, player.y, target.x, target.y);
  state.coins.push(coin);
  coinSound();
  // Guards hear the clink once the coin lands.
  setTimeout(() => {
    for (const guard of state.guards) {
      const dist = Math.hypot(guard.x - coin.endX, guard.y - coin.endY);
      if (dist < COIN_HEAR_RADIUS) distractGuard(guard, coin.endX, coin.endY);
    }
  }, 480);
}

// Input: keys and mouse.
window.addEventListener('keydown', (event) => {
  unlockAudio();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === 'Enter' && (state.phase === 'title' || state.phase === 'scene')) {
    startGame();
    return;
  }
  if (event.code === 'KeyR' && (state.phase === 'caught' || state.phase === 'won')) {
    resetToTitle();
    return;
  }
  keys.add(event.code);
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

canvas.addEventListener('mousedown', (event) => {
  unlockAudio();
  if (state.phase === 'title' || state.phase === 'scene') {
    startGame();
    return;
  }
  if (state.phase === 'caught' || state.phase === 'won') return;
  tossCoin(event.clientX, event.clientY);
});

// Debug hook for play-testing: window.MIDNIGHT_VAULT.getState() returns
// the live game state (read-only use in tests; the game never reads it).
window.MIDNIGHT_VAULT = { getState: () => state };

// Boot: a scene preview sets up a composed frame; otherwise the title.
const scene = sceneFromUrl();
if (scene) {
  applyScene(state, scene);
  // In scene mode the cameras hold their composed angles and the guards
  // hold their places; the alarm meter is drawn as set.
  for (const cam of state.cameras) cam.alerted = false;
  for (const guard of state.guards) {
    if (scene === 'alarm' && guard.name === 'rook') guard.alerted = true;
  }
}
requestAnimationFrame(frame);
