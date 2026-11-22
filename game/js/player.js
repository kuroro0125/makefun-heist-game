// player.js — the thief: movement, sneaking, coin tosses and loot.
//
// The thief walks with WASD or the arrow keys. Holding Shift sneaks:
// slower, but harder to spot and quieter. Clicking the floor tosses a
// coin, which clinks where it lands and pulls nearby guards over to look.
// Coins are limited, and every toss costs a little of the final score.

import { pointHitsWall, WALLS } from './world.js';

export const PLAYER_RADIUS = 13;
export const WALK_SPEED = 175;
export const SNEAK_SPEED = 92;
export const COIN_COUNT = 5;
export const COIN_RANGE = 330; // how far a coin can be thrown
export const COIN_COST = 25; // dollars off the final score per toss
export const COIN_HEAR_RADIUS = 210; // guards inside this hear the clink
export const LOUD_STEP_RADIUS = 150; // running this close is heard

export function makePlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER_RADIUS,
    angle: -Math.PI / 2, // facing up the floor
    sneaking: false,
    moving: false,
    movingFast: false,
    coins: COIN_COUNT,
    coinsUsed: 0,
    loot: 0,
    lootCount: 0,
    hasGem: false,
  };
}

// Move the player for one frame. keys is a Set of currently held key codes
// ('KeyW', 'ArrowUp', 'ShiftLeft' and friends). Collisions slide along
// walls: the x and y axes are resolved separately.
export function updatePlayer(player, keys, dt) {
  let dx = 0;
  let dy = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;

  player.sneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');
  player.moving = dx !== 0 || dy !== 0;
  player.movingFast = player.moving && !player.sneaking;

  if (!player.moving || dt <= 0) return;
  const len = Math.hypot(dx, dy);
  const speed = player.sneaking ? SNEAK_SPEED : WALK_SPEED;
  const vx = (dx / len) * speed * dt;
  const vy = (dy / len) * speed * dt;
  player.angle = Math.atan2(vy, vx);

  const r = player.radius;
  if (!circleHitsWall(player.x + vx, player.y, r)) player.x += vx;
  if (!circleHitsWall(player.x, player.y + vy, r)) player.y += vy;
}

// Is a circle of radius r at (x, y) touching any wall or the floor edge?
function circleHitsWall(x, y, r) {
  if (x < 20 + r || x > 1260 - r || y < 84 + r || y > 780 - r) return true;
  for (const w of WALLS) {
    const closestX = Math.max(w.x, Math.min(x, w.x + w.w));
    const closestY = Math.max(w.y, Math.min(y, w.y + w.h));
    if (Math.hypot(x - closestX, y - closestY) < r) return true;
  }
  return false;
}

// A thrown coin: where it starts, where it is aimed, and its flight.
// The coin arcs for 0.45 s, then lands and clinks.
export function makeCoin(fromX, fromY, toX, toY) {
  const dist = Math.hypot(toX - fromX, toY - fromY);
  const clamped = Math.min(dist, COIN_RANGE);
  const angle = Math.atan2(toY - fromY, toX - fromX);
  return {
    x: fromX,
    y: fromY,
    startX: fromX,
    startY: fromY,
    endX: fromX + Math.cos(angle) * clamped,
    endY: fromY + Math.sin(angle) * clamped,
    flight: 0, // 0..1 along the arc
    landed: false,
    ring: 0, // expanding ring drawn after landing
  };
}

export function updateCoin(coin, dt) {
  if (coin.landed) {
    coin.ring = Math.min(1, coin.ring + dt * 1.4);
    return;
  }
  coin.flight = Math.min(1, coin.flight + dt / 0.45);
  // Ease-out arc: fast at first, settling onto the target.
  const t = 1 - Math.pow(1 - coin.flight, 2);
  coin.x = coin.startX + (coin.endX - coin.startX) * t;
  coin.y = coin.startY + (coin.endY - coin.startY) * t;
  if (coin.flight >= 1) coin.landed = true;
}

// Can the thief reach this loot piece right now? (Close enough to grab.)
export function lootInReach(player, loot) {
  return !loot.taken && Math.hypot(loot.x - player.x, loot.y - player.y) < 34;
}

// The vault gem only appears once the vault has been cracked open.
export function gemAvailable(vaultOpen) {
  return vaultOpen;
}

// Is the thief standing close enough to work on the vault door?
export function nearVault(player, vault) {
  const cx = vault.x + vault.w / 2;
  const cy = vault.y + vault.h / 2;
  return Math.hypot(player.x - cx, player.y - cy) < 95;
}

// Keep a point inside the playable floor (used to clamp coin targets).
export function clampToFloor(x, y) {
  return {
    x: Math.max(24, Math.min(1256, x)),
    y: Math.max(88, Math.min(776, y)),
  };
}

export { pointHitsWall };
