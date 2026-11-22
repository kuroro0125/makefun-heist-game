// guards.js — patrols, vision cones, camera sweeps and hearing.
//
// A guard walks its waypoint loop, pauses at each waypoint and looks along
// its direction of travel. A camera sits on a wall and sweeps its cone back
// and forth on a fixed period. Both see the thief only inside their cone,
// inside their range, and with no wall between them and the thief.
// A thrown coin (or loud running nearby) makes a guard walk over to listen.

import { segmentBlocked } from './world.js';

export const GUARD_VISION_RANGE = 235;
export const GUARD_VISION_HALF_ANGLE = 0.61; // ~35 degrees
export const GUARD_SNEAK_RANGE = 175; // sneaking shrinks the cone's reach
export const GUARD_SPEED = 62; // pixels per second on patrol
export const GUARD_INVESTIGATE_SPEED = 95;
export const WAYPOINT_PAUSE = 1.4; // seconds spent looking around

export function makeGuard(name, waypoints, startIndex = 0) {
  const start = waypoints[startIndex];
  const next = waypoints[(startIndex + 1) % waypoints.length];
  return {
    kind: 'guard',
    name,
    waypoints,
    x: start.x,
    y: start.y,
    targetIndex: (startIndex + 1) % waypoints.length,
    // Facing angle in radians, initialised toward the next waypoint.
    angle: Math.atan2(next.y - start.y, next.x - start.x),
    pauseLeft: 0,
    state: 'patrol', // patrol | investigate | return
    investigateX: 0,
    investigateY: 0,
    investigateWait: 0,
    alerted: false, // true while the guard currently sees the thief
    lookTimer: 0, // slow scan while paused at a waypoint
  };
}

export function makeCamera(def) {
  return {
    kind: 'camera',
    id: def.id,
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    period: def.period,
    range: def.range,
    angle: def.baseAngle,
    alerted: false,
  };
}

// Advance one guard by dt seconds. Returns nothing; the guard object is
// mutated in place. Frozen when dt is 0 (scene previews).
export function updateGuard(guard, dt) {
  if (dt <= 0) return;
  guard.alerted = false;

  if (guard.state === 'investigate') {
    if (guard.investigateWait > 0) {
      // Arrived at the noise: look around for a while, then give up.
      guard.investigateWait -= dt;
      guard.lookTimer += dt;
      guard.angle += Math.sin(guard.lookTimer * 2.2) * 0.9 * dt;
      if (guard.investigateWait <= 0) {
        guard.state = 'return';
      }
      return;
    }
    walkToward(guard, guard.investigateX, guard.investigateY, GUARD_INVESTIGATE_SPEED, dt);
    if (distanceTo(guard, guard.investigateX, guard.investigateY) < 8) {
      guard.investigateWait = 2.6;
    }
    return;
  }

  if (guard.state === 'return') {
    // Walk back to the nearest waypoint, then resume the loop.
    let best = 0;
    let bestDist = Infinity;
    guard.waypoints.forEach((w, i) => {
      const d = distanceTo(guard, w.x, w.y);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    guard.targetIndex = best;
    walkToward(guard, guard.waypoints[best].x, guard.waypoints[best].y, GUARD_SPEED, dt);
    if (bestDist < 10) {
      guard.state = 'patrol';
      guard.pauseLeft = 0.6;
    }
    return;
  }

  // Patrol: walk to the current waypoint, pause, then take the next one.
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    guard.lookTimer += dt;
    // Slow scan left and right while waiting at the waypoint.
    const target = guard.waypoints[guard.targetIndex];
    const base = Math.atan2(target.y - guard.y, target.x - guard.x);
    guard.angle = base + Math.sin(guard.lookTimer * 1.1) * 0.55;
    return;
  }
  const target = guard.waypoints[guard.targetIndex];
  walkToward(guard, target.x, target.y, GUARD_SPEED, dt);
  if (distanceTo(guard, target.x, target.y) < 8) {
    guard.targetIndex = (guard.targetIndex + 1) % guard.waypoints.length;
    guard.pauseLeft = WAYPOINT_PAUSE;
  }
}

function walkToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.001) return;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
}

function distanceTo(guard, x, y) {
  return Math.hypot(x - guard.x, y - guard.y);
}

// Send a guard to listen at a point (a coin landing, or loud footsteps).
export function distractGuard(guard, x, y) {
  guard.state = 'investigate';
  guard.investigateX = x;
  guard.investigateY = y;
  guard.investigateWait = 0;
  guard.pauseLeft = 0;
}

// Advance a camera's sweep. time is the absolute clock in seconds.
export function updateCamera(camera, time) {
  const phase = (time / camera.period) * Math.PI * 2;
  camera.angle = camera.baseAngle + Math.sin(phase) * camera.sweep;
  camera.alerted = false;
}

// Can this watcher (guard or camera) see the point (px, py)?
// sneaking shortens a guard's reach; cameras are not fooled by sneaking.
export function canSee(watcher, px, py, sneaking) {
  const dx = px - watcher.x;
  const dy = py - watcher.y;
  const dist = Math.hypot(dx, dy);
  const range = watcher.kind === 'guard' ? (sneaking ? GUARD_SNEAK_RANGE : GUARD_VISION_RANGE) : watcher.range;
  if (dist > range) return false;
  if (dist < 26) return true; // bumping into a guard is always spotted
  const angleTo = Math.atan2(dy, dx);
  let diff = angleTo - watcher.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const half = watcher.kind === 'guard' ? GUARD_VISION_HALF_ANGLE : 0.52;
  if (Math.abs(diff) > half) return false;
  // A wall between watcher and thief breaks the line of sight.
  return !segmentBlocked(watcher.x, watcher.y, px, py);
}

// The polygon of a watcher's vision cone, clipped by walls: cast a fan of
// rays and stop each one at the first wall it hits (or at full range).
// Returns an array of [x, y] points starting at the watcher's position.
export function visionConePolygon(watcher, range, walls) {
  const half = watcher.kind === 'guard' ? GUARD_VISION_HALF_ANGLE : 0.52;
  const rays = 26;
  const points = [[watcher.x, watcher.y]];
  for (let i = 0; i <= rays; i++) {
    const a = watcher.angle - half + (2 * half * i) / rays;
    points.push(castVisionRay(watcher.x, watcher.y, a, range, walls));
  }
  return points;
}

function castVisionRay(x, y, angle, range, walls) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = range;
  for (const w of walls) {
    const hit = rayHitsRect(x, y, dx, dy, w, range);
    if (hit !== null && hit < best) best = hit;
  }
  return [x + dx * best, y + dy * best];
}

// Distance along the ray to the first intersection with the rectangle,
// or null when the ray misses it within range.
function rayHitsRect(x, y, dx, dy, r, range) {
  let tMin = 0;
  let tMax = range;
  if (Math.abs(dx) < 1e-9) {
    if (x < r.x || x > r.x + r.w) return null;
  } else {
    let t1 = (r.x - x) / dx;
    let t2 = (r.x + r.w - x) / dx;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y < r.y || y > r.y + r.h) return null;
  } else {
    let t1 = (r.y - y) / dy;
    let t2 = (r.y + r.h - y) / dy;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }
  return tMin;
}
