import { drawSprite, SPRITE_W, SPRITE_H } from '../sprite.js?v=3e26475-1555';
import { mulberry32 } from '../rng.js?v=3e26475-1555';
import { label, makeParticles, drawDesk, drawPlant, nextFrame, cancelFrame, drawThreat, threatTarget, stepRandom } from './scene.js?v=3e26475-1555';

// Лифт: все едут наверх, на каждом этаже перегруз и кого-то высаживают. Последний доезжает до переговорки.
const SLAB = 48; // перекрытие между этажами

function drawBuilding(ctx, w, h, cabX, cabW, cabY, ch, travel, t, exited, scale) {
  // здание в разрезе. Этаж = высота кабины + перекрытие, так что при остановке комнаты вровень с кабиной.
  const floorH = ch + SLAB;
  ctx.fillStyle = '#1c1a2a'; ctx.fillRect(0, 0, w, h);
  const frac = travel - Math.floor(travel);
  const cur = Math.floor(travel); // номер этажа под кабиной (0 = первый)
  for (let k = -3; k <= 3; k++) {
    const fl = cur + k;                      // индекс этажа
    const y = cabY - k * floorH + frac * floorH; // верх комнаты этого этажа
    if (y > h + floorH || y + floorH < -floorH) continue;
    const rr = mulberry32(31 + ((fl % 9) + 9) % 9);
    ctx.fillStyle = '#2c2a3e'; ctx.fillRect(0, y - SLAB, w, floorH);
    ctx.fillStyle = '#3c3a52'; ctx.fillRect(0, y + ch, w, SLAB * 0.4);
    ctx.fillStyle = '#24223a'; ctx.fillRect(0, y - SLAB, w, 8);
    [[16, cabX - 40], [cabX + cabW + 40, w - 16]].forEach(([x0, x1], side) => {
      if (x1 - x0 < 120) return;
      ctx.fillStyle = rr() < 0.7 ? '#e6e0d2' : '#d8e4ee'; ctx.fillRect(x0, y, x1 - x0, ch);
      ctx.fillStyle = '#c9c2b2'; ctx.fillRect(x0, y, x1 - x0, 4);
      ctx.fillStyle = '#8a7a5a'; ctx.fillRect(x0, y + ch - 14, x1 - x0, 14);
      let dx = x0 + 10;
      while (dx + 100 < x1) { drawDesk(ctx, dx, y + ch - 14, 1, Math.abs(fl * 5 + side * 3 + Math.floor(dx / 100)), t); dx += 120; }
      if (rr() < 0.5) drawPlant(ctx, x1 - 40, y + ch - 14, 1);
      ctx.fillStyle = '#7fb0e0'; ctx.fillRect(x0 + 10, y + 12, 50, 34); ctx.fillStyle = '#fff'; ctx.fillRect(x0 + 34, y + 12, 2, 34); ctx.fillRect(x0 + 10, y + 28, 50, 2);
      ctx.fillStyle = '#fff'; ctx.fillRect(x0 + 70, y + 14, 52, 14); ctx.fillStyle = '#222'; ctx.font = "6px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('ЭТАЖ ' + (fl + 1), x0 + 73, y + 18);
      // вышедшие на этом этаже стоят в комнате и машут
      exited.filter((e) => e.floor === fl && e.side === side).forEach((e, j) => {
        const ex = side === 0 ? x1 - 70 - j * 30 : x0 + 20 + j * 30;
        drawSprite(ctx, e.p.person, Math.floor(t * 4) % 2 ? 'cheer' : 'cheer2', ex, y + ch - 14 - SPRITE_H * scale + 6, scale);
      });
    });
  }
  // шахта: направляющие, тросы, противовес
  ctx.fillStyle = '#121020'; ctx.fillRect(cabX - 30, 0, cabW + 60, h);
  ctx.fillStyle = '#2e2c44'; ctx.fillRect(cabX - 30, 0, 8, h); ctx.fillRect(cabX + cabW + 22, 0, 8, h);
  ctx.fillStyle = '#3a3850'; for (let y = -40 + ((travel * floorH) % 40); y < h; y += 40) { ctx.fillRect(cabX - 22, y, 12, 4); ctx.fillRect(cabX + cabW + 10, y, 12, 4); }
  ctx.fillStyle = '#6a6a7a'; ctx.fillRect(cabX + cabW / 2 - 6, 0, 2, cabY); ctx.fillRect(cabX + cabW / 2 + 4, 0, 2, cabY);
  ctx.fillStyle = '#4a4a5a'; ctx.fillRect(cabX + cabW + 4, ((travel * floorH * -1.2) % (h + 200) + h + 200) % (h + 200) - 100, 14, 60);
}

function drawLobby(ctx, x, y, cw, ch, text) {
  ctx.fillStyle = '#d8d0bc'; ctx.fillRect(x, y, cw, ch);
  ctx.fillStyle = '#8a7a5a'; ctx.fillRect(x, y + ch - 24, cw, 24);
  drawPlant(ctx, x + 10, y + ch - 24, 1);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x + cw / 2 - 60, y + 16, 120, 24); ctx.fillStyle = '#1a1428'; ctx.font = "8px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.textAlign = 'center'; ctx.fillText(text, x + cw / 2, y + 24); ctx.textAlign = 'left';
}

function drawCabinFront(ctx, x, y, cw, ch, doorsOpen, alarm, t, floorNo) {
  const half = cw / 2, slide = half * doorsOpen;
  ctx.save(); ctx.globalAlpha = 0.42;
  ctx.fillStyle = '#c8d8ee'; ctx.fillRect(x, y, half - slide, ch); ctx.fillRect(x + half + slide, y, half - slide, ch);
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#7a7a8c'; ctx.fillRect(x + half - slide - 4, y, 4, ch); ctx.fillRect(x + half + slide, y, 4, ch);
  ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.35;
  for (let yy = y + 16; yy < y + ch; yy += 44) { ctx.fillRect(x + 8, yy, Math.max(0, half - slide - 16), 3); ctx.fillRect(x + half + slide + 8, yy, Math.max(0, half - slide - 16), 3); }
  ctx.restore();
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
  description: 'Перегруженный лифт ползёт на совещание, и на каждом этаже кому-то придётся выйти раньше времени.',
  cover: 'assets/covers/elevator.jpg',
  duration: 20,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    const cw = 120, ch = 110, x = w / 2 - cw / 2, y = h - ch - 30;
    drawBuilding(ctx, w, h, x, cw, y, ch, t * 0.4, t, [], 2);
    ctx.fillStyle = '#c8c8d8'; ctx.fillRect(x, y, cw, ch);
    people.slice(0, 3).forEach((p, i) => drawSprite(ctx, p.person, 'idle', x + 8 + i * 36, y + ch - SPRITE_H * 1.5 - 8 + Math.sin(t * 8 + i) * 1.5, 1.5));
    drawCabinFront(ctx, x, y, cw, ch, Math.max(0, Math.sin(t * 1.2)) * 0.9, Math.floor(t / 2) % 3 === 0, t, 1 + Math.floor(t * 0.4) % 9);
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rnd = mulberry32(seed);
    const victims = [...order].reverse().slice(0, n - 1);
    const particles = makeParticles();
    // раунд: едем этаж (drive) → тревога 0.7 → двери 0.4 → выход 0.9 → двери 0.4
    const drive = n > 10 ? 0.6 : 1.0, alarmT = 0.7, openT = 0.4, exitT = 0.9, closeT = 0.4;
    const roundLen = drive + alarmT + openT + exitT + closeT;
    const total = victims.length * roundLen;
    const k = total > 17 ? 17 / total : 1;
    const rounds = victims.map((id, i) => ({ id, at: 0.6 + i * roundLen * k, side: i % 2 }));
    const finalAt = 0.6 + victims.length * roundLen * k + drive * k + 2.2;
    const exited = [];
    let start = null, raf = 0, stopped = false;
    const dinged = new Set();
    const sr = stepRandom(seed ^ 0x99);

    // пройдено этажей к моменту t: первый переезд до раунда 0, потом по одному за раунд, потом последний к переговорке
    const travelAt = (t) => {
      let tr = Math.min(1, Math.max(0, t / 0.6));
      rounds.forEach((r) => { const local = (t - r.at) / k; tr += Math.min(1, Math.max(0, local / drive)); });
      const lastEnd = rounds.length ? rounds[rounds.length - 1].at + roundLen * k : 0.6;
      tr += Math.min(1, Math.max(0, (t - lastEnd) / (drive * k)));
      return tr;
    };

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const t = (now - start) / 1000;
      const w = canvas.width, h = canvas.height;
      const cols = Math.ceil(Math.sqrt(n * 1.6));
      const rowsN = Math.ceil(n / cols);
      const scale = Math.max(2, Math.min(4, Math.floor(Math.min((w * 0.45) / cols / (SPRITE_W * 0.6), (h * 0.5) / (rowsN * 0.5 + 1) / SPRITE_H))));
      const cw = Math.max(cols * SPRITE_W * scale * 0.6 + 60, 240), ch = Math.round(SPRITE_H * scale * (1 + rowsN * 0.45) + 30);
      const x = Math.round(w / 2 - cw / 2), y = Math.round(h * 0.55 - ch / 2) + 20;

      // фаза
      let doors = 0, alarm = false, floorNo = 1, moving = true, finale = false, threat = null;
      rounds.forEach((r, i) => {
        const local = (t - r.at) / k;
        if (local < 0) return;
        floorNo = i + 2;
        const ph = local - drive;
        // события фиксируем по факту прохождения времени, даже если кадр пропущен
        if (ph >= alarmT && !dinged.has(r.id)) { dinged.add(r.id); if (onEvent) onEvent('ding'); }
        if (ph >= alarmT + openT && !exited.find((e) => e.id === r.id)) { exited.push({ id: r.id, p: participants.find((p) => p.id === r.id), time: r.at + (drive + alarmT + openT) * k, floor: i + 1, side: r.side }); if (onEvent) onEvent('pop'); }
        if (local < drive) { moving = true; }
        else if (local < roundLen) {
          moving = false;
          if (ph < alarmT) { alarm = true; const insideIds = participants.filter((p) => !exited.find((e) => e.id === p.id)).map((p) => p.id); threat = threatTarget(insideIds, r.id, ph, 0, alarmT * 0.9, (kk) => sr(i * 41 + kk)); }
          else if (ph < alarmT + openT) doors = (ph - alarmT) / openT;
          else if (ph < alarmT + openT + exitT) doors = 1;
          else doors = 1 - (ph - alarmT - openT - exitT) / closeT;
        }
      });
      const lastEnd = rounds.length ? rounds[rounds.length - 1].at + roundLen * k : 0.6;
      if (t >= lastEnd + drive * k) { finale = true; moving = false; doors = Math.min(1, (t - lastEnd - drive * k) / 0.5); floorNo = victims.length + 2; if (!dinged.has('final')) { dinged.add('final'); if (onEvent) onEvent('ding'); } }
      const travel = travelAt(t);

      ctx.imageSmoothingEnabled = false;
      drawBuilding(ctx, w, h, x, cw, y, ch, travel, t, exited, scale);
      const shake = alarm ? Math.round((rnd() - 0.5) * 6) : 0;
      ctx.save(); ctx.translate(shake, 0);
      // интерьер: холл за открытыми дверями или задняя стенка с зеркалом и панелью
      if (doors > 0) drawLobby(ctx, x, y, cw, ch, finale ? 'ПЕРЕГОВОРКА' : `ЭТАЖ ${floorNo}`);
      else {
        ctx.fillStyle = '#bdbdd0'; ctx.fillRect(x, y, cw, ch);
        ctx.fillStyle = '#9fb4c8'; ctx.fillRect(x + 12, y + 12, cw - 24, ch * 0.5);
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(x + 20, y + 16, 18, ch * 0.44);
        ctx.fillStyle = '#8a8a9c'; ctx.fillRect(x + 12, y + ch * 0.66, cw - 24, 5);
        ctx.fillStyle = '#5a5a6c'; ctx.fillRect(x + cw - 34, y + ch * 0.28, 20, 62);
        for (let b = 0; b < 8; b++) { ctx.fillStyle = (b === (floorNo - 1) % 8) ? '#ffb040' : '#d0d0dc'; ctx.fillRect(x + cw - 30 + (b % 2) * 9, y + ch * 0.28 + 6 + Math.floor(b / 2) * 13, 6, 6); }
        ctx.fillStyle = '#c9c9d8'; ctx.fillRect(x, y + ch - 10, cw, 10);
      }
      const inside = participants.filter((p) => !exited.find((e) => e.id === p.id));
      if (finale && doors > 0.9) {
        ctx.fillStyle = '#c03030'; ctx.fillRect(x + cw / 2 - 30, y + ch - 24, 60, 24);
        if (Math.floor(t * 6) % 3 === 0) particles.burst(x + cw / 2, y + 20, t, rnd, { count: 8, speed: 160, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc'], life: 1.2, gravity: 200, size: 4 });
      }
      participants.forEach((p, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const baseX = x + 24 + col * (cw - 48 - SPRITE_W * scale) / Math.max(1, cols - 1) + (row % 2) * 6 * scale;
        const baseY = y + ch - 12 - SPRITE_H * scale - (rowsN - 1 - row) * SPRITE_H * scale * 0.45;
        const e = exited.find((q) => q.id === p.id);
        if (e) {
          // выходит: шагает к краю кабины и в комнату этажа
          const age = t - e.time;
          if (age > exitT) return;
          const dir = e.side === 0 ? -1 : 1;
          const dx = (age / exitT) * (cw * 0.5 + 40) * dir;
          drawSprite(ctx, p.person, 'run' + (Math.floor(age * 9) % 8), baseX + dx, baseY + (rowsN - 1 - row) * SPRITE_H * scale * 0.45, scale, dir < 0);
          label(ctx, p.name, baseX + dx + SPRITE_W * scale / 2, baseY - 4, 8, '#ff9a9a');
          return;
        }
        const bob = moving ? Math.round(Math.sin(t * 10 + i) * scale * 0.5) : 0;
        const fr = finale && inside.length === 1 ? (Math.floor(t * 5) % 2 ? 'cheer' : 'cheer2') : 'idle';
        drawSprite(ctx, p.person, fr, baseX, baseY + bob + shake, scale);
        if (threat === p.id) drawThreat(ctx, baseX + 16 * scale, baseY + bob - 2, 32 * scale, t);
        label(ctx, p.name, baseX + SPRITE_W * scale / 2, baseY - 22 + bob, scale >= 3 ? 9 : 8, inside.length === 1 && finale ? '#ffd166' : '#f4ecd8');
      });
      drawCabinFront(ctx, x, y, cw, ch, doors, alarm, t, floorNo);
      ctx.restore();
      particles.draw(ctx, t);

      if (t >= finalAt) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
