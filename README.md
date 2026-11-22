# MIDNIGHT VAULT

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/kuroro0125/makefun-heist-game/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/kuroro0125/makefun-heist-game/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559)

A top-down 2D stealth heist game that runs offline in a desktop browser from
static files. One thief, one museum floor, three patrolling guards, two
sweeping security cameras, eleven pieces of loot and one vault holding the
Midnight Gem.

## How to play

- **Move** with WASD or the arrow keys.
- **Sneak** by holding Shift — slower, but harder to spot and quieter.
- **Toss a coin** by clicking the floor — the clink pulls nearby guards over
  to investigate. You carry 5 coins; each toss costs a little score.
- **Grab loot** by walking over it. The big prize is the **Midnight Gem**,
  locked in the vault in the top-right room: stand by the vault to crack it
  open, then take the gem.
- **Escape** by getting back to the getaway van in the bottom-left lobby.
  Escaping with the gem is a Perfect Heist; escaping without it is still a
  getaway, just a smaller haul.

Guards patrol waypoint loops and see you only inside their vision cones —
and only with no wall between you. Cameras sweep their cones back and forth.
Being seen fills the **alarm meter**; it drains while you stay hidden. If it
fills completely while you are seen, you are caught. Sneaking slows the fill,
and breaking line of sight early always saves you.

Three routes reach the vault: the east gallery door, the vault door from the
east wing, and a narrow vent shaft along the north edge. Read the cones
before you move.

## Scenes

The game ships with deterministic scene previews, rendered by the same code
that draws the game:

- `?scene=cover` — the thief mid-room with a guard cone, a camera cone,
  loot and the alarm meter in one frame.
- `?scene=vault` — at the open vault with the gem.
- `?scene=alarm` — the spotted moment, meter almost full.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no external assets. All sounds are
WebAudio oscillator blips synthesized at runtime.

## Files

- `game/index.html`, `game/style.css` — page and page chrome.
- `game/js/main.js` — boot, game loop, alarm meter, win/caught flow.
- `game/js/world.js` — floor layout, rooms, loot, patrol routes.
- `game/js/guards.js` — patrols, vision cones, camera sweeps, hearing.
- `game/js/player.js` — movement, sneaking, coin tosses.
- `game/js/render.js` — all canvas drawing.
- `game/js/audio.js` — WebAudio sound effects.
- `game/js/scenes.js` — the `?scene=` preview setups.
- `main.ts` — the make.fun hand-in program (Node 22, standard library only).
- `screenshots/` — real renders of the running game.

MIT licensed. Built for the make.fun best-heist-game competition.
