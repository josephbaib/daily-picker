import { drawSprite, SPRITE_W, SPRITE_H } from '../sprite.js';
import { mulberry32 } from '../rng.js';
import { label, makeParticles } from './scene.js';

// Лифт: все едут наверх, на каждом этаже перегруз и кого-то высаживают. Последний доезжает до переговорки.
function drawShaft(ctx, w, h, cabX, cabW, offset) {
  // здание в разрезе: этажи проезжают вниз
  ctx.fillStyle = '#1c1a2a'; ctx.fillRect(0, 0, w, h);
  const floorH = 150;
  const rnd = mulberry32(31);
  for (let y = -floorH + (offset % floorH); y < h + floorH; y += floorH) {
    ctx.fillStyle = '#2c2a3e'; ctx.fillRect(0, y, w, floorH);
    ctx.fillStyle = '#3c3a52'; ctx.fillRect(0, y + floorH - 10, w, 10);
    // окна офисов слева и справа от шахты
    for (let x = 30; x < w - 40; x += 70) {
      if (x + 50 > cabX - 30 && x < cabX + cabW + 30) continue;
      ctx.fillStyle = rnd() < 0.6 ? '#f0d890' : '#3a4a6a'; ctx.fillRect(x, y + 30, 40, 50);
      ctx.fillStyle = '#5a6a8a'; ctx.fillRect(x + 6, y + 60, 28, 20);
    }
  }
  // шахта
  ctx.fillStyle = '#121020'; ctx.fillRect(cabX - 24, 0, cabW + 48, h);
  ctx.fillStyle = '#26243a'; ctx.fillRect(cabX - 24, 0, 6, h); ctx.fillRect(cabX + cabW + 18, 0, 6, h);
  ctx.fillStyle = '#3a3850';
  for (let y = -40 + (offset % 40); y < h; y += 40) { ctx.fillRect(cabX - 18, y, 12, 4); ctx.fillRect(cabX + cabW + 6, y, 12, 4); }
}

function drawCabin(ctx, x, y, cw, ch, doorsOpen, alarm, lobbyText, t) {
  // за дверями: холл этажа
  ctx.fillStyle = '#d8d0bc'; ctx.fillRect(x, y, cw, ch);
  ctx.fillStyle = '#8a7a5a'; ctx.fillRect(x, y + ch - 24, cw, 24);
  ctx.fillStyle = '#3c9a3c'; ctx.fillRect(x + 12, y + ch - 70, 26, 46); ctx.fillStyle = '#b06a3a'; ctx.fillRect(x + 16, y + ch - 30, 18, 10);
  if (lobbyText) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + cw / 2 - 60, y + 16, 120, 24); ctx.fillStyle = '#1a1428'; ctx.font = "8px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.textAlign = 'center'; ctx.fillText(lobbyText, x + cw / 2, y + 24); ctx.textAlign = 'left'; }
}

function drawCabinFront(ctx, x, y, cw, ch, doorsOpen, alarm, t, floorNo) {
  // стенки и двери поверх персонажей
  // стеклянные двери: пассажиров видно и в дороге
  const half = cw / 2, slide = half * doorsOpen;
  ctx.save(); ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#c8d8ee'; ctx.fillRect(x, y, half - slide, ch); ctx.fillRect(x + half + slide, y, half - slide, ch);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#7a7a8c'; ctx.fillRect(x + half - slide - 4, y, 4, ch); ctx.fillRect(x + half + slide, y, 4, ch);
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.35;
  for (let yy = y + 16; yy < y + ch; yy += 44) { ctx.fillRect(x + 8, yy, Math.max(0, half - slide - 16), 3); ctx.fillRect(x + half + slide + 8, yy, Math.max(0, half - slide - 16), 3); }
  ctx.restore();
  // рама и табло
  ctx.fillStyle = '#4a4a5c'; ctx.fillRect(x - 10, y - 46, cw + 20, 46); ctx.fillRect(x - 10, y, 10, ch); ctx.fillRect(x + cw, y, 10, ch); ctx.fillRect(x - 10, y + ch, cw + 20, 14);
  ctx.fillStyle = '#101018'; ctx.fillRect(x + cw / 2 - 40, y - 38, 80, 30);
  ctx.fillStyle = alarm && Math.floor(t * 8) % 2 ? '#ff4040' : '#ffb040';
  ctx.font = "16px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  ctx.fillText(alarm ? '!!' : String(floorNo), x + cw / 2, y - 31); ctx.textAlign = 'left';
  if (alarm) { ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ff4040' : '#802020'; ctx.fillRect(x - 10, y - 46, cw + 20, 4); }
}

export default {
  id: 'elevator',
  title: 'Лифт',
  description: 'Все едут на совещание. На каждом этаже перегруз, и кого-то высаживают. Кто доехал, тот первый.',
  duration: 20,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    const cw = 120, ch = 110, x = w / 2 - cw / 2, y = h - ch - 30;
    drawShaft(ctx, w, h, x, cw, t * 60);
    ctx.fillStyle = '#c8c8d8'; ctx.fillRect(x, y, cw, ch);
    people.slice(0, 3).forEach((p, i) => drawSprite(ctx, p.person, 'idle', x + 8 + i * 36, y + ch - SPRITE_H * 2 - 8 + Math.sin(t * 8 + i) * 1.5, 2));
    drawCabinFront(ctx, x, y, cw, ch, Math.max(0, Math.sin(t * 1.2)) * 0.9, Math.floor(t / 2) % 3 === 0, t, 1 + Math.floor(t) % 9);
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rnd = mulberry32(seed);
    const victims = [...order].reverse().slice(0, n - 1);
    const particles = makeParticles();
    // раунд: едем (drive) → тревога (alarm 0.7) → двери (0.4) → выход (0.9) → двери (0.4)
    const drive = n > 10 ? 0.5 : 0.9;
    const roundLen = drive + 0.7 + 0.4 + 0.9 + 0.4;
    const total = victims.length * roundLen;
    const k = total > 17 ? 17 / total : 1;
    const rounds = victims.map((id, i) => ({ id, at: 0.8 + i * roundLen * k }));
    const finalAt = 0.8 + victims.length * roundLen * k + 1.8;
    const out = new Map(); // id -> {time, floor}
    let start = null, raf = 0, stopped = false, dinged = new Set();

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const t = (now - start) / 1000;
      const w = canvas.width, h = canvas.height;
      const cols = Math.ceil(Math.sqrt(n * 1.6));
      const rowsN = Math.ceil(n / cols);
      const scale = Math.max(2, Math.min(5, Math.floor(Math.min((w * 0.5) / cols / (SPRITE_W + 4), (h * 0.55) / (rowsN * 0.6 + 1) / SPRITE_H))));
      const cw = Math.max(cols * (SPRITE_W + 4) * scale + 40, 220), ch = Math.round(SPRITE_H * scale * (1 + rowsN * 0.5) + 40);
      const x = Math.round(w / 2 - cw / 2), y = Math.round(h * 0.58 - ch / 2) + 20;

      // фаза раунда
      let phase = 'drive', doors = 0, alarm = false, cur = null, sub = 0, floorNo = 1;
      let moving = true;
      rounds.forEach((r, i) => {
        const local = (t - r.at) / k;
        if (local >= 0) floorNo = i + 2;
        if (local >= 0 && local < roundLen) {
          cur = r; sub = local;
          if (local < drive) { phase = 'drive'; }
          else if (local < drive + 0.7) { phase = 'alarm'; alarm = true; moving = false; }
          else if (local < drive + 1.1) { phase = 'open'; doors = (local - drive - 0.7) / 0.4; moving = false; }
          else if (local < drive + 2.0) { phase = 'exit'; doors = 1; moving = false; if (!out.has(r.id)) { out.set(r.id, { time: t, floor: i + 2 }); if (onEvent) onEvent('pop'); } }
          else { phase = 'close'; doors = 1 - (local - drive - 2.0) / 0.4; moving = false; }
          if (phase === 'open' && !dinged.has(r.id)) { dinged.add(r.id); if (onEvent) onEvent('ding'); }
        }
      });
      const finale = t >= finalAt - 1.8;
      if (finale) { moving = false; doors = Math.min(1, (t - (finalAt - 1.8)) / 0.5); floorNo = victims.length + 2; if (!dinged.has('final')) { dinged.add('final'); if (onEvent) onEvent('ding'); } }
      const offset = moving ? t * 260 : (rounds.reduce((acc, r) => acc + Math.min(Math.max((t - r.at) / k, 0), drive), 0) + Math.min(t, 0.8)) * 260;

      ctx.imageSmoothingEnabled = false;
      drawShaft(ctx, w, h, x, cw, offset);
      // интерьер кабины
      const shake = alarm ? Math.round((rnd() - 0.5) * 6) : 0;
      ctx.save(); ctx.translate(shake, 0);
      if (doors > 0) drawCabin(ctx, x, y, cw, ch, doors, alarm, finale ? 'ПЕРЕГОВОРКА' : `ЭТАЖ ${floorNo}`, t);
      ctx.fillStyle = '#bdbdd0'; if (doors === 0) ctx.fillRect(x, y, cw, ch);
      if (doors === 0) { ctx.fillStyle = '#a8a8bc'; ctx.fillRect(x + 10, y + 10, cw - 20, ch * 0.45); ctx.fillStyle = '#8a8a9c'; ctx.fillRect(x + cw - 30, y + ch * 0.3, 14, 40); }
      // люди внутри
      const inside = participants.filter((p) => !out.has(p.id));
      const drawOrder = [...participants].sort((a, b) => (a._row || 0) - (b._row || 0));
      participants.forEach((p, i) => { p._row = Math.floor(i / cols); });
      if (finale && doors > 0.9) {
        ctx.fillStyle = '#c03030'; ctx.fillRect(x + cw / 2 - 30, y + ch - 24, 60, 24);
        if (Math.floor(t * 6) % 3 === 0) particles.burst(x + cw / 2, y + 20, t, rnd, { count: 8, speed: 160, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc'], life: 1.2, gravity: 200, size: 4 });
      }
      drawOrder.forEach((p) => {
        const i = participants.indexOf(p);
        const col = i % cols, row = Math.floor(i / cols);
        const baseX = x + 20 + col * (cw - 40 - SPRITE_W * scale) / Math.max(1, cols - 1) + (row % 2) * 6 * scale;
        const baseY = y + ch - 16 - SPRITE_H * scale - (rowsN - 1 - row) * SPRITE_H * scale * 0.5;
        const o = out.get(p.id);
        if (o) {
          // выходит: шагает наружу и растворяется вместе с этажом
          const age = t - o.time;
          if (age > 1.3) return;
          const dx = Math.min(1, age / 0.9) * (cw * 0.35) * (col < cols / 2 ? -1 : 1);
          drawSprite(ctx, p.person, 'run' + (Math.floor(age * 8) % 4), baseX + dx, baseY + (rowsN - 1 - row) * SPRITE_H * scale * 0.5, scale, col < cols / 2);
          label(ctx, p.name, baseX + dx + SPRITE_W * scale / 2, baseY - 14, 8, '#ff9a9a');
          return;
        }
        const bob = moving ? Math.round(Math.sin(t * 10 + i) * scale * 0.5) : 0;
        const fr = finale && inside.length === 1 ? (Math.floor(t * 6) % 2 ? 'cheer' : 'idle') : 'idle';
        drawSprite(ctx, p.person, fr, baseX, baseY + bob + shake, scale);
        label(ctx, p.name, baseX + SPRITE_W * scale / 2, baseY - 14 + bob, scale >= 4 ? 9 : 8, inside.length === 1 && finale ? '#ffd166' : '#f4ecd8');
      });
      drawCabinFront(ctx, x, y, cw, ch, doors, alarm, t, floorNo);
      ctx.restore();
      particles.draw(ctx, t);

      if (t >= finalAt) { stopped = true; participants.forEach((p) => delete p._row); onFreeze(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); participants.forEach((p) => delete p._row); } };
  },
};
