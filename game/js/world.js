// world.js — the floor of MIDNIGHT VAULT: walls, rooms, loot and patrol routes.
//
// One connected museum floor. The thief enters at the getaway van in the
// lobby (bottom left), crosses galleries and the central hall, cracks the
// vault in the top-right room and escapes back to the van. Three routes
// reach the vault: the east gallery door, the vault door from the east
// wing, and a narrow vent shaft along the north edge.

export const FLOOR = {
  width: 1280,
  height: 800,
  hudHeight: 72,
  floorTop: 72,
  floorBottom: 792,
  floorLeft: 8,
  floorRight: 1272,
};

// Every wall is a solid rectangle {x, y, w, h}. Doors are simply gaps
// between wall segments. Nothing outside this list blocks movement or sight.
export const WALLS = [
  // Outer shell.
  { x: 8, y: 72, w: 1264, h: 12 }, // north
  { x: 8, y: 780, w: 1264, h: 12 }, // south
  { x: 8, y: 72, w: 12, h: 720 }, // west
  { x: 1260, y: 72, w: 12, h: 720 }, // east

  // W1: west wall, x 420, with doors at y 380-440 and y 600-660.
  { x: 420, y: 84, w: 12, h: 296 },
  { x: 420, y: 440, w: 12, h: 160 },
  { x: 420, y: 660, w: 12, h: 120 },

  // W2: east wall, x 860, with doors at y 180-240 and y 560-620.
  { x: 860, y: 84, w: 12, h: 96 },
  { x: 860, y: 240, w: 12, h: 320 },
  { x: 860, y: 620, w: 12, h: 160 },

  // W3: north gallery / central hall wall, y 300, door at x 600-660.
  { x: 432, y: 300, w: 168, h: 12 },
  { x: 660, y: 300, w: 200, h: 12 },

  // W4: west gallery / lobby wall, y 520, door at x 200-260.
  { x: 20, y: 520, w: 180, h: 12 },
  { x: 260, y: 520, w: 160, h: 12 },

  // W5: vault room / east wing wall, y 300, vault door at x 1000-1060.
  { x: 872, y: 300, w: 128, h: 12 },
  { x: 1060, y: 300, w: 200, h: 12 },

  // Vent shaft south wall, y 140, with drop gaps at x 480-540 and x 1120-1180.
  { x: 432, y: 140, w: 48, h: 12 },
  { x: 540, y: 140, w: 580, h: 12 },
  { x: 1180, y: 140, w: 80, h: 12 },
];

// Named rooms, used for floor tinting and for the "where am I" hint.
export const ROOMS = [
  { name: 'LOBBY', x: 20, y: 532, w: 400, h: 248, tint: '#232030' },
  { name: 'WEST GALLERY', x: 20, y: 84, w: 400, h: 436, tint: '#1d2436' },
  { name: 'CENTRAL HALL', x: 432, y: 312, w: 428, h: 468, tint: '#20242e' },
  { name: 'NORTH GALLERY', x: 432, y: 152, w: 428, h: 148, tint: '#1d2436' },
  { name: 'EAST WING', x: 872, y: 312, w: 388, h: 468, tint: '#1d2436' },
  { name: 'VAULT ROOM', x: 872, y: 152, w: 388, h: 148, tint: '#2e2417' },
  { name: 'VENT SHAFT', x: 432, y: 84, w: 828, h: 56, tint: '#171a20' },
];

// The getaway van pad. Stand here with the loot to finish the heist.
export const VAN_PAD = { x: 56, y: 640, w: 160, h: 112 };

// The vault door and the gem locked inside it.
export const VAULT = { x: 1120, y: 96, w: 96, h: 72, crackSeconds: 3 };

// Loot pieces. kind decides the icon: painting, vase, gold, case, jewel.
// value is dollars; the vault gem is the big prize and needs the vault cracked.
export function buildLoot() {
  return [
    { id: 'p1', kind: 'painting', x: 150, y: 600, value: 400, taken: false, label: 'Portrait' },
    { id: 'g1', kind: 'gold', x: 320, y: 720, value: 600, taken: false, label: 'Gold bars' },
    { id: 'p2', kind: 'painting', x: 100, y: 150, value: 500, taken: false, label: 'Landscape' },
    { id: 'v1', kind: 'vase', x: 300, y: 250, value: 350, taken: false, label: 'Ming vase' },
    { id: 'p3', kind: 'painting', x: 380, y: 450, value: 450, taken: false, label: 'Seascape' },
    { id: 'c1', kind: 'case', x: 500, y: 450, value: 700, taken: false, label: 'Display case' },
    { id: 'g2', kind: 'gold', x: 800, y: 650, value: 800, taken: false, label: 'Gold bars' },
    { id: 'v2', kind: 'vase', x: 700, y: 350, value: 300, taken: false, label: 'Ceramic vase' },
    { id: 'p4', kind: 'painting', x: 1000, y: 450, value: 550, taken: false, label: 'Still life' },
    { id: 'g3', kind: 'gold', x: 1180, y: 600, value: 900, taken: false, label: 'Bullion' },
    { id: 'j1', kind: 'jewel', x: 700, y: 220, value: 1000, taken: false, label: 'Sapphire' },
    { id: 'gem', kind: 'gem', x: 1168, y: 132, value: 5000, taken: false, inVault: true, label: 'Midnight Gem' },
  ];
}

// Patrol waypoints for the three guards. Every leg of a loop is checked
// against the wall gaps above, so a guard never walks through a wall.
export const PATROLS = {
  rook: [
    { x: 500, y: 700 },
    { x: 800, y: 700 },
    { x: 800, y: 400 },
    { x: 500, y: 400 },
  ],
  bishop: [
    { x: 500, y: 250 },
    { x: 800, y: 250 },
    { x: 800, y: 200 },
    { x: 950, y: 200 },
    { x: 1150, y: 200 },
    { x: 1150, y: 250 },
    { x: 950, y: 250 },
  ],
  knight: [
    { x: 950, y: 700 },
    { x: 1180, y: 700 },
    { x: 1180, y: 400 },
    { x: 950, y: 400 },
  ],
};

// Security cameras: fixed mounts that sweep their cone back and forth.
// baseAngle is the centre of the sweep (radians, 0 = east), sweep is the
// half-range in radians, period is seconds for one full back-and-forth.
export const CAMERAS = [
  { id: 'cam1', x: 1030, y: 322, baseAngle: Math.PI / 2, sweep: 0.9, period: 5, range: 280 },
  { id: 'cam2', x: 630, y: 322, baseAngle: Math.PI / 2, sweep: 0.8, period: 6.5, range: 260 },
];

// Where the thief starts: beside the van in the lobby.
export const PLAYER_START = { x: 110, y: 700 };

// A point is inside a wall rectangle (with a small margin for a body radius).
export function pointHitsWall(x, y, margin = 0) {
  for (const w of WALLS) {
    if (x > w.x - margin && x < w.x + w.w + margin && y > w.y - margin && y < w.y + w.h + margin) {
      return true;
    }
  }
  return false;
}

// Does the segment (x1,y1)-(x2,y2) cross any wall? Used for vision
// occlusion: a guard or camera only sees the thief with a clear line.
export function segmentBlocked(x1, y1, x2, y2) {
  for (const w of WALLS) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Quick reject: both ends on the same outside side.
  if ((x1 < r.x && x2 < r.x) || (x1 > r.x + r.w && x2 > r.x + r.w)) return false;
  if ((y1 < r.y && y2 < r.y) || (y1 > r.y + r.h && y2 > r.y + r.h)) return false;
  // An endpoint inside the rectangle counts as a hit.
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  if (x2 >= r.x && x2 <= r.x + r.w && y2 >= r.y && y2 <= r.y + r.h) return true;
  // Test the four edges for a crossing.
  return (
    segmentsCross(x1, y1, x2, y2, r.x, r.y, r.x + r.w, r.y) ||
    segmentsCross(x1, y1, x2, y2, r.x + r.w, r.y, r.x + r.w, r.y + r.h) ||
    segmentsCross(x1, y1, x2, y2, r.x + r.w, r.y + r.h, r.x, r.y + r.h) ||
    segmentsCross(x1, y1, x2, y2, r.x, r.y + r.h, r.x, r.y)
  );
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = direction(cx, cy, dx, dy, ax, ay);
  const d2 = direction(cx, cy, dx, dy, bx, by);
  const d3 = direction(ax, ay, bx, by, cx, cy);
  const d4 = direction(ax, ay, bx, by, dx, dy);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function direction(px, py, qx, qy, rx, ry) {
  return (rx - px) * (qy - py) - (ry - py) * (qx - px);
}
