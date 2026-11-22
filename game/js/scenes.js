// scenes.js — deterministic scene previews (?scene=cover|vault|alarm).
//
// A scene is a composed frame of the live game: the same state, the same
// rendering code, the patrols frozen at chosen positions. It is a preview
// mode inside the game, not a screenshot trick — opening
// index.html?scene=cover shows exactly the frame the cover screenshot
// was taken from, and the game can be played from any scene with Enter.

import { PLAYER_START } from './world.js';

// Parse the scene name from the page URL. Returns null for normal play.
export function sceneFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('scene');
  if (scene === 'cover' || scene === 'vault' || scene === 'alarm') return scene;
  return null;
}

// Place the actors for a scene. state is the live game state; this only
// moves things around and sets the alarm meter, then freezes updates.
export function applyScene(state, scene) {
  state.phase = 'scene';
  state.scene = scene;
  state.crackProgress = 0;

  if (scene === 'cover') {
    // The thief mid-room in the Central Hall, a guard cone sweeping over
    // him, a camera cone crossing the frame, loot on the walls and the
    // alarm meter half full — the whole game in one frame.
    state.player.x = 640;
    state.player.y = 520;
    state.player.angle = -Math.PI / 2;
    state.player.sneaking = true;
    state.player.loot = 1250;
    state.player.lootCount = 3;
    state.player.coins = 4;
    placeGuard(state, 'rook', 700, 450, Math.PI * 0.85);
    placeGuard(state, 'bishop', 560, 220, Math.PI / 2);
    placeGuard(state, 'knight', 1000, 650, -Math.PI / 2);
    state.cameras[0].angle = Math.PI / 2 + 0.55;
    state.cameras[1].angle = Math.PI / 2 - 0.45;
    state.alarm = 45;
    state.elapsed = 74;
    return;
  }

  if (scene === 'vault') {
    // At the vault door with the gem: the vault stands open, the gem
    // glows, the thief is about to take it.
    state.vaultOpen = true;
    state.player.x = 1090;
    state.player.y = 210;
    state.player.angle = Math.PI / 4;
    state.player.loot = 4050;
    state.player.lootCount = 7;
    state.player.coins = 3;
    placeGuard(state, 'rook', 600, 600, 0);
    placeGuard(state, 'bishop', 800, 250, Math.PI);
    placeGuard(state, 'knight', 1000, 700, -Math.PI / 2);
    state.cameras[0].angle = Math.PI / 2 - 0.7;
    state.cameras[1].angle = Math.PI / 2 + 0.3;
    state.alarm = 12;
    state.elapsed = 186;
    return;
  }

  // alarm: the spotted moment. A guard has the thief dead in its cone,
  // the meter is almost full and the frame burns red.
  state.player.x = 660;
  state.player.y = 470;
  state.player.angle = Math.PI / 2;
  state.player.sneaking = false;
  state.player.loot = 2300;
  state.player.lootCount = 5;
  state.player.coins = 2;
  placeGuard(state, 'rook', 660, 380, Math.PI / 2);
  placeGuard(state, 'bishop', 520, 250, Math.PI / 2);
  placeGuard(state, 'knight', 1100, 500, Math.PI);
  state.guards[0].alerted = true;
  state.cameras[0].angle = Math.PI / 2;
  state.cameras[1].angle = Math.PI / 2 + 0.6;
  state.alarm = 88;
  state.elapsed = 121;
}

function placeGuard(state, name, x, y, angle) {
  const guard = state.guards.find((g) => g.name === name);
  if (!guard) return;
  guard.x = x;
  guard.y = y;
  guard.angle = angle;
  guard.state = 'patrol';
  guard.pauseLeft = 0;
}

// Back to the lobby, ready to play from a scene.
export function resetPlayerToStart(state) {
  state.player.x = PLAYER_START.x;
  state.player.y = PLAYER_START.y;
  state.player.angle = -Math.PI / 2;
}
