// render.js — all drawing for MIDNIGHT VAULT.
//
// One canvas, flat colours with a night-museum palette: dark floors with a
// faint tile grid, gold loot, yellow guard cones, orange camera cones and
// a red alarm wash. Safe cover reads as dark floor, danger as warm cones,
// loot as gold — obvious at a glance.

import { FLOOR, WALLS, ROOMS, VAN_PAD, VAULT } from './world.js';
import { visionConePolygon } from './guards.js';

// Draw the whole frame: floor, cones, loot, actors, HUD, then overlays.
export function drawFrame(ctx, state) {
  ctx.clearRect(0, 0, FLOOR.width, FLOOR.height);
  drawFloor(ctx);
  drawVanPad(ctx, state);
  drawVault(ctx, state);
  drawLoot(ctx, state.loot);
  drawCoins(ctx, state.coins);
  drawVisionCones(ctx, state);
  drawCameras(ctx, state.cameras);
  drawGuards(ctx, state.guards);
  drawPlayer(ctx, state.player, state.time);
  drawHud(ctx, state);
  if (state.phase === 'title') drawTitleScreen(ctx, state);
  if (state.phase === 'caught') drawCaughtScreen(ctx, state);
  if (state.phase === 'won') drawWinScreen(ctx, state);
  if (state.alarm >= 75 && (state.phase === 'playing' || state.phase === 'scene')) {
    drawSpottedFlash(ctx, state);
  }
}

function drawFloor(ctx) {
  ctx.fillStyle = '#101019';
  ctx.fillRect(0, 0, FLOOR.width, FLOOR.height);
  for (const room of ROOMS) {
    ctx.fillStyle = room.tint;
    ctx.fillRect(room.x, room.y, room.w, room.h);
  }
  // Faint tile grid over the whole floor.
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = FLOOR.floorLeft; x <= FLOOR.floorRight; x += 40) {
    ctx.moveTo(x, FLOOR.floorTop);
    ctx.lineTo(x, FLOOR.floorBottom);
  }
  for (let y = FLOOR.floorTop; y <= FLOOR.floorBottom; y += 40) {
    ctx.moveTo(FLOOR.floorLeft, y);
    ctx.lineTo(FLOOR.floorRight, y);
  }
  ctx.stroke();
  // Room labels, small and dim.
  ctx.fillStyle = 'rgba(220,225,255,0.16)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  for (const room of ROOMS) {
    ctx.fillText(room.name, room.x + 10, room.y + 8);
  }
  // Walls: dark slabs with a lit top edge.
  for (const w of WALLS) {
    ctx.fillStyle = '#3a3f52';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#565d78';
    if (w.w >= w.h) ctx.fillRect(w.x, w.y, w.w, 3);
    else ctx.fillRect(w.x, w.y, 3, w.h);
  }
}

function drawVanPad(ctx, state) {
  const pad = VAN_PAD;
  const escaped = state.phase === 'won';
  ctx.fillStyle = escaped ? 'rgba(80,220,120,0.25)' : 'rgba(80,220,120,0.13)';
  ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
  ctx.strokeStyle = '#50dc78';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);
  ctx.setLineDash([]);
  // The getaway van: a simple dark van with headlights.
  ctx.fillStyle = '#22242e';
  roundRect(ctx, pad.x + 22, pad.y + 30, 116, 52, 8);
  ctx.fill();
  ctx.fillStyle = '#3d4356';
  ctx.fillRect(pad.x + 96, pad.y + 38, 34, 36);
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(pad.x + 34, pad.y + 44, 4, 0, Math.PI * 2);
  ctx.arc(pad.x + 34, pad.y + 68, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8be9a8';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GETAWAY VAN', pad.x + pad.w / 2, pad.y + pad.h - 12);
}

function drawVault(ctx, state) {
  const v = VAULT;
  // Vault door: a steel slab with a dial and bolts.
  ctx.fillStyle = state.vaultOpen ? '#4a4238' : '#6b7280';
  roundRect(ctx, v.x, v.y, v.w, v.h, 6);
  ctx.fill();
  ctx.strokeStyle = '#9aa3b2';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#2c2f38';
  ctx.beginPath();
  ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c8ccd8';
  ctx.beginPath();
  ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 16, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(v.x + v.w / 2, v.y + v.h / 2);
  ctx.lineTo(v.x + v.w / 2 + 12, v.y + v.h / 2 - 6);
  ctx.stroke();
  ctx.fillStyle = '#c8ccd8';
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(state.vaultOpen ? 'VAULT OPEN' : 'VAULT', v.x + v.w / 2, v.y + v.h + 6);
  // Cracking progress ring while the thief works the dial.
  if (state.crackProgress > 0 && !state.vaultOpen) {
    ctx.strokeStyle = '#ffd75e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 30, -Math.PI / 2, -Math.PI / 2 + state.crackProgress * Math.PI * 2);
    ctx.stroke();
  }
  // The Midnight Gem glows once the vault is open.
  if (state.vaultOpen) {
    const gem = state.loot.find((l) => l.id === 'gem');
    if (gem && !gem.taken) {
      const pulse = 0.7 + Math.sin(state.time * 4) * 0.3;
      ctx.save();
      ctx.shadowColor = '#7df9ff';
      ctx.shadowBlur = 24 * pulse;
      drawGemShape(ctx, gem.x, gem.y, 16);
      ctx.restore();
    }
  }
}

function drawLoot(ctx, loot) {
  for (const item of loot) {
    if (item.taken) continue;
    if (item.inVault) continue; // the gem is drawn by drawVault
    ctx.save();
    switch (item.kind) {
      case 'painting': {
        ctx.fillStyle = '#8a6d3b';
        ctx.fillRect(item.x - 16, item.y - 12, 32, 24);
        ctx.fillStyle = '#7fb3d5';
        ctx.fillRect(item.x - 13, item.y - 9, 26, 18);
        ctx.fillStyle = '#e8dcc0';
        ctx.beginPath();
        ctx.arc(item.x - 4, item.y - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'vase': {
        ctx.fillStyle = '#b56a8a';
        ctx.beginPath();
        ctx.ellipse(item.x, item.y, 9, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d98ab0';
        ctx.fillRect(item.x - 3, item.y - 18, 6, 6);
        break;
      }
      case 'gold': {
        ctx.fillStyle = '#ffd75e';
        ctx.fillRect(item.x - 14, item.y - 6, 28, 12);
        ctx.fillStyle = '#c9a227';
        ctx.fillRect(item.x - 14, item.y + 2, 28, 4);
        break;
      }
      case 'case': {
        ctx.fillStyle = '#3a3f52';
        ctx.fillRect(item.x - 15, item.y - 12, 30, 24);
        ctx.fillStyle = 'rgba(180,220,255,0.5)';
        ctx.fillRect(item.x - 12, item.y - 9, 24, 18);
        ctx.fillStyle = '#ffd75e';
        ctx.beginPath();
        ctx.arc(item.x, item.y, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'jewel': {
        ctx.shadowColor = '#9db8ff';
        ctx.shadowBlur = 14;
        drawGemShape(ctx, item.x, item.y, 11);
        ctx.shadowBlur = 0;
        break;
      }
      default:
        break;
    }
    ctx.restore();
    // Value tag under each piece.
    ctx.fillStyle = 'rgba(255,215,94,0.9)';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`$${item.value}`, item.x, item.y + 16);
  }
}

function drawGemShape(ctx, x, y, r) {
  ctx.fillStyle = '#7df9ff';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.8, y - r * 0.2);
  ctx.lineTo(x + r * 0.5, y + r);
  ctx.lineTo(x - r * 0.5, y + r);
  ctx.lineTo(x - r * 0.8, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.4, y - r * 0.2);
  ctx.lineTo(x, y + r * 0.4);
  ctx.lineTo(x - r * 0.4, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
}

function drawCoins(ctx, coins) {
  for (const coin of coins) {
    const lift = coin.landed ? 0 : Math.sin(coin.flight * Math.PI) * 14;
    ctx.fillStyle = '#ffd75e';
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y - lift, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (coin.landed && coin.ring < 1) {
      ctx.strokeStyle = `rgba(255,215,94,${0.8 * (1 - coin.ring)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 8 + coin.ring * 60, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawVisionCones(ctx, state) {
  const watchers = [...state.guards, ...state.cameras];
  for (const watcher of watchers) {
    const range = watcher.kind === 'guard' ? 235 : watcher.range;
    const poly = visionConePolygon(watcher, range, WALLS);
    const alerted = watcher.alerted;
    ctx.fillStyle = alerted
      ? 'rgba(255,70,70,0.30)'
      : watcher.kind === 'guard'
        ? 'rgba(255,214,90,0.20)'
        : 'rgba(255,150,60,0.18)';
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCameras(ctx, cameras) {
  for (const cam of cameras) {
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.angle);
    ctx.fillStyle = cam.alerted ? '#ff4646' : '#2c2f38';
    ctx.fillRect(-4, -6, 18, 12);
    ctx.fillStyle = cam.alerted ? '#ff8080' : '#ffb14e';
    ctx.beginPath();
    ctx.arc(14, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Wall mount dot.
    ctx.fillStyle = '#565d78';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGuards(ctx, guards) {
  for (const guard of guards) {
    // Body: dark uniform with a pale visor; direction tick shows facing.
    ctx.fillStyle = guard.state === 'investigate' ? '#7a5a20' : '#2e3442';
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = guard.alerted ? '#ff4646' : '#8a93a8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = guard.alerted ? '#ff4646' : '#dfe6f2';
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.angle) * 7, guard.y + Math.sin(guard.angle) * 7, 4, 0, Math.PI * 2);
    ctx.fill();
    // Name tag.
    ctx.fillStyle = 'rgba(223,230,242,0.75)';
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y + 16);
    // "!" when the guard has eyes on the thief.
    if (guard.alerted) {
      ctx.fillStyle = '#ff4646';
      ctx.font = '900 22px system-ui, sans-serif';
      ctx.textBaseline = 'bottom';
      ctx.fillText('!', guard.x, guard.y - 14);
    }
  }
}

function drawPlayer(ctx, player, time) {
  const bob = player.moving ? Math.sin(time * 14) * 1.5 : 0;
  // Cloak: a dark hooded figure with a purple trim.
  ctx.save();
  ctx.translate(player.x, player.y + bob * 0.3);
  ctx.rotate(player.angle + Math.PI / 2);
  ctx.fillStyle = '#1c1a26';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(11, 10);
  ctx.lineTo(-11, 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#9b7ede';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e8e4f5';
  ctx.beginPath();
  ctx.arc(0, -4, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Sneak indicator: a soft ring while sneaking.
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(155,126,222,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHud(ctx, state) {
  // Top bar.
  ctx.fillStyle = '#0b0b12';
  ctx.fillRect(0, 0, FLOOR.width, FLOOR.hudHeight);
  ctx.fillStyle = '#ffd75e';
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('MIDNIGHT VAULT', 20, 26);
  ctx.fillStyle = 'rgba(220,225,255,0.6)';
  ctx.font = '500 13px system-ui, sans-serif';
  ctx.fillText('WASD move · Shift sneak · Click: toss a coin', 20, 52);

  // Loot total.
  ctx.fillStyle = '#ffd75e';
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`LOOT $${state.player.loot}`, 560, 26);
  ctx.fillStyle = 'rgba(220,225,255,0.6)';
  ctx.font = '500 13px system-ui, sans-serif';
  ctx.fillText(`${state.player.lootCount} pieces${state.player.hasGem ? ' · GEM!' : ''}`, 560, 52);

  // Alarm meter.
  const barX = 600;
  const barY = 16;
  const barW = 300;
  const barH = 20;
  ctx.fillStyle = '#262a38';
  roundRect(ctx, barX, barY, barW, barH, 5);
  ctx.fill();
  const alarmFrac = Math.max(0, Math.min(1, state.alarm / 100));
  const alarmColor = state.alarm >= 75 ? '#ff4646' : state.alarm >= 40 ? '#ffb14e' : '#ffd75e';
  if (alarmFrac > 0) {
    ctx.fillStyle = alarmColor;
    roundRect(ctx, barX, barY, barW * alarmFrac, barH, 5);
    ctx.fill();
  }
  ctx.strokeStyle = '#565d78';
  ctx.lineWidth = 1.5;
  roundRect(ctx, barX, barY, barW, barH, 5);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(10,10,16,0.85)';
  ctx.strokeText('ALARM', barX + 4, barY + barH / 2);
  ctx.fillText('ALARM', barX + 4, barY + barH / 2);
  ctx.fillStyle = 'rgba(220,225,255,0.6)';
  ctx.font = '500 13px system-ui, sans-serif';
  ctx.fillText(state.alarm >= 75 ? 'SPOTTED!' : state.alarm >= 40 ? 'suspicious…' : 'unseen', barX, barY + barH + 14);

  // Coins and timer.
  ctx.fillStyle = '#ffd75e';
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`● × ${state.player.coins}`, 1000, 26);
  ctx.fillStyle = 'rgba(220,225,255,0.6)';
  ctx.font = '500 13px system-ui, sans-serif';
  ctx.fillText('coins (click to toss)', 1000, 52);
  ctx.fillStyle = '#fff';
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.fillText(formatTime(state.elapsed), 1240, 26);
  ctx.fillStyle = 'rgba(220,225,255,0.6)';
  ctx.font = '500 13px system-ui, sans-serif';
  ctx.fillText('time', 1240, 52);

  // Objective line under the bar when the gem is still locked away.
  if (state.phase === 'playing' && !state.player.hasGem) {
    ctx.fillStyle = state.vaultOpen ? '#7df9ff' : 'rgba(255,215,94,0.85)';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      state.vaultOpen ? 'The vault is open — grab the Midnight Gem!' : 'Crack the vault in the top-right room (stand by it)',
      FLOOR.width / 2,
      FLOOR.floorTop + 16,
    );
  }
}

function drawSpottedFlash(ctx, state) {
  const pulse = 0.10 + Math.sin(state.time * 8) * 0.05;
  ctx.fillStyle = `rgba(255,40,40,${pulse})`;
  ctx.fillRect(0, FLOOR.hudHeight, FLOOR.width, FLOOR.height - FLOOR.hudHeight);
  ctx.fillStyle = '#ff4646';
  ctx.font = '900 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('SPOTTED!', FLOOR.width / 2, FLOOR.hudHeight + 24);
}

function drawTitleScreen(ctx, state) {
  dimScreen(ctx);
  ctx.fillStyle = '#ffd75e';
  ctx.font = '900 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MIDNIGHT VAULT', FLOOR.width / 2, 300);
  ctx.fillStyle = '#e8e4f5';
  ctx.font = '500 20px system-ui, sans-serif';
  ctx.fillText('One thief. Three guards. Two cameras. One gem.', FLOOR.width / 2, 370);
  ctx.fillStyle = 'rgba(220,225,255,0.85)';
  ctx.font = '500 17px system-ui, sans-serif';
  ctx.fillText('WASD / arrows — move      Shift — sneak      Click — toss a coin to distract', FLOOR.width / 2, 420);
  ctx.fillText('Read the cones before you move. Fill the alarm and you are caught.', FLOOR.width / 2, 448);
  ctx.fillStyle = '#7df9ff';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('Click or press Enter to begin the heist', FLOOR.width / 2, 510);
  void state;
}

function drawCaughtScreen(ctx, state) {
  dimScreen(ctx);
  ctx.fillStyle = '#ff4646';
  ctx.font = '900 58px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CAUGHT!', FLOOR.width / 2, 320);
  ctx.fillStyle = '#e8e4f5';
  ctx.font = '500 20px system-ui, sans-serif';
  ctx.fillText(`The alarm hit 100%. The guards took back $${state.player.loot} of loot.`, FLOOR.width / 2, 380);
  ctx.fillStyle = 'rgba(220,225,255,0.85)';
  ctx.font = '500 17px system-ui, sans-serif';
  ctx.fillText('Tip: break line of sight early — the meter falls fast when you are hidden.', FLOOR.width / 2, 420);
  ctx.fillStyle = '#ffd75e';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('Press R to try again', FLOOR.width / 2, 480);
}

function drawWinScreen(ctx, state) {
  dimScreen(ctx);
  const perfect = state.player.hasGem;
  ctx.fillStyle = perfect ? '#7df9ff' : '#ffd75e';
  ctx.font = '900 56px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(perfect ? 'PERFECT HEIST!' : 'CLEAN GETAWAY', FLOOR.width / 2, 300);
  ctx.fillStyle = '#e8e4f5';
  ctx.font = '500 22px system-ui, sans-serif';
  ctx.fillText(
    perfect
      ? `The Midnight Gem is yours. Loot $${state.finalLoot} in ${formatTime(state.elapsed)}.`
      : `You escaped without the gem. Loot $${state.finalLoot} in ${formatTime(state.elapsed)}.`,
    FLOOR.width / 2,
    372,
  );
  ctx.fillStyle = 'rgba(220,225,255,0.85)';
  ctx.font = '500 17px system-ui, sans-serif';
  ctx.fillText(`Score $${state.finalScore}  ·  coins used: ${state.player.coinsUsed}  ·  time ${formatTime(state.elapsed)}`, FLOOR.width / 2, 414);
  ctx.fillStyle = '#ffd75e';
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('Press R to run it again', FLOOR.width / 2, 480);
}

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(8,8,14,0.72)';
  ctx.fillRect(0, 0, FLOOR.width, FLOOR.height);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
