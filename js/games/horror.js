import { drawSprite, spriteCanvas, SPRITE_W, SPRITE_H } from '../sprite.js?v=3b8b1e8-1658';
import { mulberry32 } from '../rng.js?v=3b8b1e8-1658';
import { label, makeParticles, drawNpcBust, nextFrame, cancelFrame, drawThreat, threatTarget, stepRandom } from './scene.js?v=3b8b1e8-1658';
import { makeWarp, beginCamera, impactRing, drawAmbient, vignette, speedLines, bigText } from './fx.js?v=3b8b1e8-1658';

// Особняк: команда заперта в старом доме, каждый раунд кого-то забирает дом. Последний выживший говорит первым.
const KINDS = ['hands', 'ghost', 'chandelier', 'blackout', 'monster'];

function drawHall(ctx, w, h, floorY, t, lightning, dim) {
  // стены с обоями, окно с луной, портреты, свечи, туман
  ctx.fillStyle = '#100a14'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#2a1a2e'; ctx.fillRect(0, 0, w, floorY);
  ctx.fillStyle = '#331f38';
  for (let y = 0; y < floorY; y += 24) for (let x = (y / 24 % 2) * 20; x < w; x += 40) { ctx.fillRect(x, y + 6, 8, 8); ctx.fillRect(x + 4, y + 2, 2, 4); }
  ctx.fillStyle = '#1c1220'; ctx.fillRect(0, floorY - 12, w, 12);
  // окно с луной и дождём
  const wx = w * 0.5 - 70, wy = floorY * 0.12, ww = 140, wh = floorY * 0.55;
  ctx.fillStyle = lightning ? '#dfe8ff' : '#141a34'; ctx.fillRect(wx, wy, ww, wh);
  if (!lightning) { ctx.fillStyle = '#e8e6c8'; ctx.fillRect(wx + 84, wy + 22, 30, 30); ctx.fillStyle = '#141a34'; ctx.fillRect(wx + 96, wy + 18, 30, 26); }
  ctx.fillStyle = 'rgba(180,200,255,0.35)';
  for (let i = 0; i < 24; i++) { const rx = wx + ((i * 37 + t * 60) % ww), ry = wy + ((i * 53 + t * 260) % wh); ctx.fillRect(rx, ry, 1, 8); }
  ctx.fillStyle = '#3a2a1e'; ctx.fillRect(wx - 8, wy - 8, ww + 16, 8); ctx.fillRect(wx - 8, wy, 8, wh + 8); ctx.fillRect(wx + ww, wy, 8, wh + 8); ctx.fillRect(wx - 8, wy + wh, ww + 16, 8);
  ctx.fillRect(wx + ww / 2 - 3, wy, 6, wh); ctx.fillRect(wx, wy + wh / 2 - 3, ww, 6);
  // портреты предков в золочёных рамах, глаза светятся красным
  [[w * 0.12, floorY * 0.16, 9], [w * 0.8, floorY * 0.14, 10], [w * 0.3, floorY * 0.12, 11], [w * 0.62, floorY * 0.12, 12]].forEach(([px, py, npc], i) => {
    ctx.fillStyle = '#7a5a20'; ctx.fillRect(px - 8, py - 8, 80, 100);
    ctx.fillStyle = '#c9a23a'; ctx.fillRect(px - 5, py - 5, 74, 94);
    ctx.fillStyle = '#20242c'; ctx.fillRect(px, py, 64, 84);
    ctx.save(); ctx.globalAlpha = 0.85; ctx.filter = 'grayscale(1) contrast(1.1)'; drawNpcBust(ctx, npc, px, py + 8, 1, 36); ctx.restore();
    ctx.fillStyle = 'rgba(20,10,30,0.45)'; ctx.fillRect(px, py, 64, 84);
    if (Math.floor(t * 1.3 + i) % 4 === 0) { ctx.fillStyle = '#ff3030'; ctx.fillRect(px + 25, py + 24, 4, 3); ctx.fillRect(px + 35, py + 24, 4, 3); }
  });
  // паутина в углах, трещины, напольные часы с маятником
  ctx.strokeStyle = 'rgba(220,220,240,0.35)'; ctx.lineWidth = 1;
  [[0, floorY * 0.2, 1], [w, floorY * 0.2, -1]].forEach(([cx0, cy0, dir]) => {
    for (let r = 20; r <= 80; r += 20) { ctx.beginPath(); ctx.moveTo(cx0, cy0 + r); ctx.lineTo(cx0 + dir * r, cy0); ctx.stroke(); }
    for (let a = 0; a < 4; a++) { ctx.beginPath(); ctx.moveTo(cx0, cy0); ctx.lineTo(cx0 + dir * Math.cos(a * 0.5) * 80, cy0 + Math.sin(a * 0.5) * 80); ctx.stroke(); }
  });
  ctx.fillStyle = '#1a1020'; ctx.fillRect(w * 0.9, floorY * 0.4, 2, floorY * 0.2); ctx.fillRect(w * 0.9, floorY * 0.6, 14, 2); ctx.fillRect(w * 0.91, floorY * 0.62, 2, floorY * 0.1);
  const clx = w * 0.06, cly = floorY * 0.42;
  ctx.fillStyle = '#3a2618'; ctx.fillRect(clx, cly, 46, floorY * 0.58 + 12);
  ctx.fillStyle = '#5a3a24'; ctx.fillRect(clx + 4, cly + 4, 38, 40);
  ctx.fillStyle = '#e8e0c0'; ctx.fillRect(clx + 9, cly + 9, 28, 28); ctx.fillStyle = '#222'; ctx.fillRect(clx + 22, cly + 14, 2, 10); ctx.fillRect(clx + 22, cly + 22, 8, 2);
  ctx.fillStyle = '#1a1020'; ctx.fillRect(clx + 8, cly + 50, 30, floorY * 0.58 - 46);
  const pend = Math.sin(t * 2.4) * 10;
  ctx.fillStyle = '#c9a23a'; ctx.fillRect(clx + 22 + pend * 0.5, cly + 52, 2, 60); ctx.fillRect(clx + 17 + pend, cly + 108, 12, 12);
  // свечи в канделябрах
  [w * 0.3, w * 0.7].forEach((cx, i) => {
    ctx.fillStyle = '#6a5a30'; ctx.fillRect(cx - 2, floorY * 0.42, 4, 40); ctx.fillRect(cx - 20, floorY * 0.42, 40, 4);
    [-18, 0, 18].forEach((dx, j) => {
      const fl = 0.6 + 0.4 * Math.abs(Math.sin(t * 9 + i * 3 + j * 1.7));
      ctx.fillStyle = '#e8e0c0'; ctx.fillRect(cx + dx - 2, floorY * 0.42 - 16, 4, 16);
      if (!dim) { ctx.fillStyle = `rgba(255,170,60,${0.08 * fl})`; ctx.fillRect(cx + dx - 26, floorY * 0.42 - 60, 52, 70); ctx.fillStyle = '#ffb040'; ctx.fillRect(cx + dx - 2, floorY * 0.42 - 22 - fl * 3, 4, 6 + fl * 3); }
    });
  });
  // крыса бежит вдоль плинтуса, при молнии летучие мыши
  const rx = ((t * 90) % (w + 60)) - 30;
  ctx.fillStyle = '#2a2230'; ctx.fillRect(rx, floorY - 8, 14, 6); ctx.fillRect(rx - 8, floorY - 5, 8, 2); ctx.fillRect(rx + 12, floorY - 10, 5, 4);
  if (lightning) { ctx.fillStyle = '#0a0610'; for (let b = 0; b < 6; b++) { const bx = (b * 173 + t * 500) % w, by = floorY * (0.1 + (b % 3) * 0.1); ctx.fillRect(bx, by, 6, 3); ctx.fillRect(bx - 8, by - 3, 8, 3); ctx.fillRect(bx + 6, by - 3, 8, 3); } }
  // паркет в перспективе: доски сходятся к дальней стене, плинтус, ковёр по центру
  const depth = h - floorY;
  ctx.fillStyle = '#3a2618'; ctx.fillRect(0, floorY, w, depth);
  for (let i = 0; i < 12; i++) {
    const y0 = floorY + depth * Math.pow(i / 12, 1.5), y1 = floorY + depth * Math.pow((i + 1) / 12, 1.5);
    ctx.fillStyle = i % 2 ? '#3f2a1a' : '#34220f'; ctx.fillRect(0, y0, w, y1 - y0);
    ctx.fillStyle = '#261808'; ctx.fillRect(0, Math.round(y1) - 1, w, 1);
  }
  ctx.fillStyle = '#261808';
  for (let k = -8; k <= 8; k++) { const xTop = w / 2 + k * (w / 16), xBot = w / 2 + k * (w / 6); ctx.beginPath(); ctx.moveTo(xTop, floorY); ctx.lineTo(xBot, h); ctx.lineTo(xBot + 2, h); ctx.lineTo(xTop + 1, floorY); ctx.fill(); }
  ctx.fillStyle = '#4a1a24'; ctx.beginPath(); ctx.moveTo(w * 0.3, floorY + depth * 0.25); ctx.lineTo(w * 0.7, floorY + depth * 0.25); ctx.lineTo(w * 0.85, h - 6); ctx.lineTo(w * 0.15, h - 6); ctx.fill();
  ctx.fillStyle = '#6a2a34'; ctx.beginPath(); ctx.moveTo(w * 0.32, floorY + depth * 0.3); ctx.lineTo(w * 0.68, floorY + depth * 0.3); ctx.lineTo(w * 0.81, h - 12); ctx.lineTo(w * 0.19, h - 12); ctx.fill();
  ctx.fillStyle = '#c9a23a'; for (let i = 0; i < 6; i++) { const yy = floorY + depth * (0.3 + i * 0.12); const half = w * (0.18 + i * 0.024); ctx.fillRect(w / 2 - half, yy, 4, 3); ctx.fillRect(w / 2 + half - 4, yy, 4, 3); }
  ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, floorY - 6, w, 6);
  // мебель у стен: кресло, столик со свечой, колонна
  ctx.fillStyle = '#4a2a34'; ctx.fillRect(w * 0.06, floorY - 46, 60, 52); ctx.fillStyle = '#5c3642'; ctx.fillRect(w * 0.06 + 6, floorY - 28, 48, 24); ctx.fillStyle = '#2a1a20'; ctx.fillRect(w * 0.06, floorY - 46, 8, 52); ctx.fillRect(w * 0.06 + 52, floorY - 46, 8, 52);
  ctx.fillStyle = '#5a3a24'; ctx.fillRect(w * 0.86, floorY - 30, 50, 6); ctx.fillRect(w * 0.86 + 6, floorY - 24, 6, 26); ctx.fillRect(w * 0.86 + 38, floorY - 24, 6, 26);
  ctx.fillStyle = '#e8e0c0'; ctx.fillRect(w * 0.86 + 22, floorY - 44, 4, 14); ctx.fillStyle = '#ffb040'; ctx.fillRect(w * 0.86 + 21, floorY - 50, 6, 6);
  ctx.fillStyle = '#3a2a3e'; ctx.fillRect(w * 0.22, floorY * 0.18, 18, floorY * 0.82); ctx.fillRect(w * 0.76, floorY * 0.18, 18, floorY * 0.82); ctx.fillStyle = '#4a3a4e'; ctx.fillRect(w * 0.22 - 4, floorY * 0.18, 26, 8); ctx.fillRect(w * 0.76 - 4, floorY * 0.18, 26, 8);
  // туман по полу
  for (let i = 0; i < 6; i++) {
    const fx = ((i * 190 + t * 18) % (w + 200)) - 100, fy = h - 30 - (i % 3) * 14;
    ctx.fillStyle = 'rgba(200,210,240,0.06)'; ctx.fillRect(fx, fy, 220, 28); ctx.fillRect(fx + 40, fy - 10, 140, 12);
  }
}

function drawChandelier(ctx, cx, y, drop) {
  const yy = y + drop;
  ctx.fillStyle = '#8a7030'; ctx.fillRect(cx - 1, 0, 3, yy);
  ctx.fillRect(cx - 46, yy, 92, 4); ctx.fillRect(cx - 30, yy - 10, 60, 4);
  [-40, -20, 0, 20, 40].forEach((dx) => { ctx.fillStyle = '#e8e0c0'; ctx.fillRect(cx + dx - 2, yy - 12, 4, 12); ctx.fillStyle = '#ffd060'; ctx.fillRect(cx + dx - 2, yy - 18, 4, 6); });
  ctx.fillStyle = 'rgba(255,200,90,0.12)'; ctx.fillRect(cx - 60, yy - 40, 120, 60);
}

export default {
  id: 'horror',
  title: 'Особняк',
  description: 'Старый особняк заперт на ночь, и дом забирает команду по одному, пока не останется тот, кому говорить первым.',
  cover: 'assets/covers/horror.jpg',
  duration: 20,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    drawHall(ctx, w, h, h * 0.62, t, Math.floor(t * 2) % 11 === 0, false);
    people.slice(0, 4).forEach((p, i) => {
      const x = 24 + i * 58, y = h * 0.75 - SPRITE_H * 1.5 + Math.round(Math.sin(t * 6 + i) * 1.5);
      drawSprite(ctx, p.person, 'idle', x, y, 1.5);
    });
    const gx = ((t * 40) % (w + 80)) - 40;
    ctx.fillStyle = 'rgba(220,230,255,0.35)'; ctx.fillRect(gx, h * 0.3 + Math.sin(t * 3) * 10, 26, 34);
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rnd = mulberry32(seed);
    const victims = [...order].reverse().slice(0, n - 1);
    const base = n > 10 ? 0.9 : 1.6;
    const gaps = victims.map((_, i) => base + (2.6 - base) * Math.pow(i / Math.max(1, victims.length - 1), 2));
    const total = gaps.reduce((s, g) => s + g, 0);
    const k = total > 17 ? 17 / total : 1;
    const events = [];
    let acc = 1.2;
    victims.forEach((id, i) => {
      events.push({ id, at: acc + gaps[i] * k, kind: KINDS[Math.floor(rnd() * KINDS.length)], side: rnd() < 0.5 ? -1 : 1 });
      acc += gaps[i] * k;
    });
    const finalAt = acc + 2.6;
    const warp = makeWarp(events.map((e) => e.at), n > 10 ? 0.2 : 0.35, 0.4);
    const particles = makeParticles();
    const dead = new Map(); // id -> {time, kind, x, y}
    let start = null, raf = 0, stopped = false, fired = 0, lastFlash = -10;
    const jitter = participants.map(() => rnd() * 6.28);
    const sr = stepRandom(seed ^ 0x77);

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const t = warp((now - start) / 1000);
      const w = canvas.width, h = canvas.height;

      const cols = Math.ceil(Math.sqrt(n * 1.8));
      const rows = Math.ceil(n / cols);
      const floorY = h * 0.7;
      const scale = Math.max(2, Math.min(4, Math.floor(Math.min((w * 0.7) / cols / (SPRITE_W * 0.7), (h * 0.42) / rows / SPRITE_H))));
      const cellW = (w * 0.7) / cols, rowH = (h - floorY - SPRITE_H * scale * 0.3) / Math.max(1, rows);
      const pos = participants.map((p, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        const inRow = Math.min(cols, n - r * cols);
        const rowOffset = (cols - inRow) * cellW / 2;
        return { x: Math.round(w * 0.15 + rowOffset + c * cellW + cellW / 2 - SPRITE_W * scale / 2 + ((r % 2) ? cellW * 0.15 : 0)), y: Math.round(floorY + 10 + r * rowH - SPRITE_H * scale * 0.85), r };
      });

      while (fired < events.length && t >= events[fired].at) {
        const ev = events[fired]; const i = participants.findIndex((p) => p.id === ev.id);
        dead.set(ev.id, { time: t, kind: ev.kind, x: pos[i].x, y: pos[i].y, side: ev.side });
        fired++;
        if (onEvent) onEvent(ev.kind === 'chandelier' ? 'pop' : 'whoosh');
      }
      const next = fired < events.length ? events[fired] : null;
      const dread = next && t > next.at - 1.2; // напряжение перед событием
      const aliveIds = participants.filter((p) => !dead.has(p.id)).map((p) => p.id);
      const threat = next ? threatTarget(aliveIds, next.id, t, next.at - 1.6, next.at - 0.4, (kk) => sr(fired * 37 + kk)) : null;
      const blackout = [...dead.values()].some((d) => d.kind === 'blackout' && t - d.time < 0.7);
      if (next && next.kind !== 'blackout' && t > next.at - 0.35 && lastFlash < next.at - 1) lastFlash = t;
      const lightning = t - lastFlash < 0.12;
      const winner = fired === events.length && t >= finalAt - 2.6;

      ctx.imageSmoothingEnabled = false;
      beginCamera(ctx, w, h, t, events.slice(0, fired).map((e) => e.at), (i) => { const pi = participants.findIndex((p) => p.id === events[i].id); return { x: pos[pi].x + SPRITE_W * scale / 2, y: pos[pi].y + SPRITE_H * scale / 2 }; }, { level: 1.35, dur: 0.9, amp: 9 });
      drawHall(ctx, w, h, floorY, t, lightning, dread);
      drawAmbient(ctx, 'dust', w, h, t, 30);
      // люстра над залом
      const chand = [...dead.values()].find((d) => d.kind === 'chandelier' && t - d.time < 1.5);
      drawChandelier(ctx, w / 2, floorY * 0.1, chand ? Math.min(1, (t - chand.time) / 0.35) * (chand.y - floorY * 0.1 + 20) : 0);
      if (dread && !winner) { ctx.fillStyle = 'rgba(0,0,10,0.45)'; ctx.fillRect(0, 0, w, h); }

      // мёртвые: следы на полу
      participants.forEach((p, i) => {
        const d = dead.get(p.id); if (!d) return;
        const age = t - d.time;
        if (age > 1.3) {
          // меловой контур
          ctx.fillStyle = 'rgba(240,240,240,0.55)';
          const cx = d.x + SPRITE_W * scale / 2, cy = d.y + SPRITE_H * scale - 4;
          ctx.fillRect(cx - 14 * scale / 2, cy, 14 * scale, 2); ctx.fillRect(cx - 14 * scale / 2, cy - 6, 2, 8); ctx.fillRect(cx + 14 * scale / 2, cy - 6, 2, 8);
          ctx.fillRect(cx - 6, cy - 12, 12, 2);
        }
      });
      // живые и умирающие, дальние ряды первыми
      const orderDraw = [...participants.keys()].sort((a, b) => pos[a].r - pos[b].r);
      orderDraw.forEach((i) => {
        const p = participants[i], { x, y } = pos[i];
        const d = dead.get(p.id);
        if (d) {
          const age = t - d.time;
          if (age > 1.3) return;
          impactRing(ctx, x + SPRITE_W * scale / 2, y + SPRITE_H * scale / 2, age, '#ff5050', 90);
          const k2 = Math.min(1, age / 1.0);
          if (d.kind === 'hands') {
            // чёрные руки тянут вниз
            const sink = k2 * SPRITE_H * scale;
            ctx.save(); ctx.beginPath(); ctx.rect(x - 20, y - 40, SPRITE_W * scale + 40, SPRITE_H * scale - sink + 2); ctx.clip();
            drawSprite(ctx, p.person, 'cheer', x, y + sink, scale); ctx.restore();
            ctx.fillStyle = '#05030a';
            for (let hnd = 0; hnd < 5; hnd++) { const hx = x + hnd * (SPRITE_W * scale / 5), hy = y + SPRITE_H * scale - 10 - Math.abs(Math.sin(t * 6 + hnd)) * 30 * (1 - k2 * 0.5); ctx.fillRect(hx, hy, 5, 40); ctx.fillRect(hx - 3, hy, 11, 6); }
          } else if (d.kind === 'ghost') {
            const gx = d.side < 0 ? -80 + k2 * (x + 80) : w + 40 - k2 * (w + 40 - x);
            const lift = k2 * 90;
            ctx.globalAlpha = 1 - k2 * 0.8;
            drawSprite(ctx, p.person, 'cheer', k2 > 0.5 ? x + (gx - x) * (k2 - 0.5) * 2 : x, y - lift, scale);
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = '#e8ecff'; const gxx = k2 > 0.5 ? gx : d.side < 0 ? -80 + (k2 * 2) * (x + 80) : w + 40 - (k2 * 2) * (w + 40 - x);
            ctx.fillRect(gxx - 10, y - lift - 30 + Math.sin(t * 8) * 6, 44, 60); ctx.fillStyle = '#1a1a2a'; ctx.fillRect(gxx + 2, y - lift - 16 + Math.sin(t * 8) * 6, 8, 10); ctx.fillRect(gxx + 20, y - lift - 16 + Math.sin(t * 8) * 6, 8, 10);
            ctx.globalAlpha = 1;
          } else if (d.kind === 'chandelier') {
            if (age < 0.35) drawSprite(ctx, p.person, 'idle', x, y, scale);
            else { drawSprite(ctx, p.person, 'hurt' + Math.min(5, Math.floor((age - 0.35) * 12)), x, y, scale); if (age < 0.45) particles.burst(x + SPRITE_W * scale / 2, y + SPRITE_H * scale * 0.6, t, rnd, { count: 24, speed: 220, colors: ['#ffd060', '#e8e0c0', '#8a7030'], life: 0.9 }); }
          } else if (d.kind === 'blackout') {
            if (age < 0.7) { /* темно, персонажа не видно */ } else if (age < 1.3) { ctx.fillStyle = '#ffe8a0'; ctx.fillRect(x + SPRITE_W * scale / 2 - 4, y + SPRITE_H * scale - 6, 10, 6); }
          } else if (d.kind === 'monster') {
            const mx = d.side < 0 ? -200 + k2 * (x + 200) : w + 200 - k2 * (w + 200 - x - SPRITE_W * scale);
            drawSprite(ctx, p.person, 'cheer', x, y + Math.sin(t * 40) * 2, scale);
            ctx.fillStyle = '#05030a'; ctx.fillRect(mx - 60, y - 60, 160, SPRITE_H * scale + 80);
            ctx.fillStyle = '#ff3030'; ctx.fillRect(mx - 20, y - 20, 12, 8); ctx.fillRect(mx + 10, y - 20, 12, 8);
            ctx.fillStyle = '#f0f0f0'; for (let tt = 0; tt < 6; tt++) ctx.fillRect(mx - 30 + tt * 12, y + 10, 6, 10 + (tt % 2) * 6);
          }
          return;
        }
        const nervous = dread ? Math.round((rnd() - 0.5) * 4) : 0;
        const bob = Math.round(Math.sin(t * 5 + jitter[i]) * 1.5);
        if (blackout) return;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 18 * scale, y + SPRITE_H * scale - 6 * scale, 28 * scale, 4 * scale);
        const fr = winner ? (Math.floor(t * 6) % 2 ? 'cheer' : 'idle') : 'idle';
        drawSprite(ctx, p.person, fr, x + nervous, y + bob, scale);
        if (threat === p.id && !winner) drawThreat(ctx, x + 16 * scale, y - 2, 32 * scale, t);
        label(ctx, p.name, x + SPRITE_W * scale / 2, y - 24 + bob, scale >= 3 ? 9 : 8, winner ? '#ffd166' : '#f4ecd8', 'rgba(12,8,24,0.85)', winner ? '#ffd166' : null);
      });
      particles.draw(ctx, t);

      ctx.restore();
      if (fired > 0 && t - events[fired - 1].at < 1.0) bigText(ctx, w, h, ['УТАЩИЛИ!', 'ПРИЗРАК!', 'ЛЮСТРА!', 'ТЕМНОТА!', 'МОНСТР!'][KINDS.indexOf(events[fired - 1].kind)] || 'ПРОПАЛ!', t, '#ff6b6b', 30);
      if (blackout) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ff3030'; const bd = [...dead.values()].find((d) => d.kind === 'blackout' && t - d.time < 0.7); if (bd && Math.floor(t * 10) % 2) { ctx.fillRect(bd.x + 10, bd.y + 20, 8, 6); ctx.fillRect(bd.x + 30, bd.y + 20, 8, 6); } }
      if (lightning) { ctx.fillStyle = 'rgba(220,230,255,0.35)'; ctx.fillRect(0, 0, w, h); }
      if (winner) { ctx.fillStyle = 'rgba(255,230,160,0.10)'; ctx.fillRect(0, 0, w, h); }
      // виньетка
      const vg = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);

      if (t >= finalAt) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
