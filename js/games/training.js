import { drawSprite, SPRITE_W, SPRITE_H } from '../sprite.js?v=3e26475-1555';
import { mulberry32 } from '../rng.js?v=3e26475-1555';
import { label, makeParticles, drawThreat, threatTarget, stepRandom, drawPuff, nextFrame, cancelFrame } from './scene.js?v=3e26475-1555';

// Полигон: тренировка ниндзя в лесу. Метка цели прыгает между бойцами и замирает, потом
// прилетают сюрикены, огненный шар или клоны. Часть попаданий срывается: техника замены,
// вместо человека остаётся бревно. Последний на ногах говорит первым.
const KINDS = ['shuriken', 'fireball', 'clones', 'kunai'];

export default {
  id: 'training',
  title: 'Полигон',
  cover: null,
  description: 'Тренировочный полигон в лесу, где метка цели прыгает между ниндзя, а техника замены спасает не всех.',
  duration: 22,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1e3a24'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2f5a30'; ctx.fillRect(0, h * 0.6, w, h * 0.4);
    ctx.fillStyle = '#5a3a1a'; [40, 120, 200].forEach((x) => ctx.fillRect(x, h * 0.35, 14, h * 0.3));
    people.slice(0, 3).forEach((p, i) => { drawSprite(ctx, p.person, 'idle', 60 + i * 70, h * 0.6 - SPRITE_H * 1.5 + 10, 1.5); if (i === Math.floor(t * 2) % 3) drawThreat(ctx, 60 + i * 70 + 20, h * 0.6 - SPRITE_H * 1.5 + 10, 56, t); });
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rnd = mulberry32(seed);
    const sr = stepRandom(seed);
    const victims = [...order].reverse().slice(0, n - 1);
    const base = n > 10 ? 1.4 : 2.4;
    const gaps = victims.map((_, i) => base + (3.2 - base) * Math.pow(i / Math.max(1, victims.length - 1), 2));
    const total = gaps.reduce((s, g) => s + g, 0);
    const k = total > 19 ? 19 / total : 1;
    const events = []; let acc = 1.0;
    victims.forEach((id, i) => {
      const at = acc + gaps[i] * k;
      // у части раундов сначала промах: техника замены у другого, потом настоящая жертва
      const fake = i < victims.length - 1 && rnd() < 0.45 ? victims[i + 1] : null;
      events.push({ id, at, kind: KINDS[Math.floor(rnd() * KINDS.length)], side: rnd() < 0.5 ? -1 : 1, fake, seedIdx: i * 31 });
      acc += gaps[i] * k;
    });
    const finalAt = acc + 2.6;
    const particles = makeParticles();
    const dead = new Map();
    const logs = []; // брёвна после техники замены
    let start = null, raf = 0, stopped = false, fired = 0;
    const jit = participants.map(() => rnd() * 6.28);

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const t = (now - start) / 1000;
      const w = canvas.width, h = canvas.height;
      const cols = Math.ceil(Math.sqrt(n * 1.8)), rows = Math.ceil(n / cols);
      const groundY = h * 0.62;
      const scale = Math.max(2, Math.min(4, Math.floor(Math.min((w * 0.7) / cols / (SPRITE_W * 0.7), (h * 0.4) / rows / SPRITE_H))));
      const cellW = (w * 0.7) / cols, rowH = (h - groundY - SPRITE_H * scale * 0.3) / Math.max(1, rows);
      const pos = participants.map((p, i) => { const r = Math.floor(i / cols), c = i % cols; const inRow = Math.min(cols, n - r * cols); return { x: Math.round(w * 0.15 + (cols - inRow) * cellW / 2 + c * cellW + cellW / 2 - SPRITE_W * scale / 2 + ((r % 2) ? cellW * 0.15 : 0)), y: Math.round(groundY + 10 + r * rowH - SPRITE_H * scale * 0.85), r }; });
      const idx = new Map(participants.map((p, i) => [p.id, i]));

      while (fired < events.length && t >= events[fired].at) { const ev = events[fired]; const i = idx.get(ev.id); dead.set(ev.id, { time: t, kind: ev.kind, side: ev.side, x: pos[i].x, y: pos[i].y }); fired++; if (onEvent) onEvent('pop'); }
      const cur = fired < events.length ? events[fired] : null;
      const alive = participants.filter((p) => !dead.has(p.id));
      const winner = fired === events.length && t >= finalAt - 2.6;
      // метка цели: прыгает по живым, замирает на жертве (или на обманке) за 0.5 с до события
      let target = null, fakePhase = false;
      if (cur) {
        const fakeAt = cur.at - 1.3;
        if (cur.fake && t >= fakeAt - 1.6 && t < fakeAt + 0.6) { target = threatTarget(alive.map((p) => p.id), cur.fake, t, fakeAt - 1.6, fakeAt - 0.3, (kk) => sr(cur.seedIdx + kk)); fakePhase = t >= fakeAt; }
        else target = threatTarget(alive.map((p) => p.id), cur.id, t, cur.at - 1.5, cur.at - 0.45, (kk) => sr(cur.seedIdx + 100 + kk));
        if (cur.fake && t >= fakeAt && !cur.fakeDone) { cur.fakeDone = true; logs.push({ id: cur.fake, time: t, x: pos[idx.get(cur.fake)].x, y: pos[idx.get(cur.fake)].y }); if (onEvent) onEvent('whoosh'); }
      }

      // лес, вечер, столбы для тренировок, трава
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#1a2e1e'; ctx.fillRect(0, 0, w, h);
      const sky = ctx.createLinearGradient(0, 0, 0, groundY); sky.addColorStop(0, '#0e1a2a'); sky.addColorStop(1, '#3a4a2a'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, groundY);
      ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(w * 0.85, h * 0.12, 22, 0, Math.PI * 2); ctx.fill();
      for (let x = -20; x < w; x += 70) { const th = 120 + ((x / 70) % 3) * 40; ctx.fillStyle = '#12261a'; ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + 35, groundY - th); ctx.lineTo(x + 70, groundY); ctx.fill(); ctx.fillStyle = '#183220'; ctx.beginPath(); ctx.moveTo(x + 8, groundY); ctx.lineTo(x + 35, groundY - th * 0.65); ctx.lineTo(x + 62, groundY); ctx.fill(); }
      ctx.fillStyle = '#2f5a30'; ctx.fillRect(0, groundY, w, h - groundY);
      ctx.fillStyle = '#3a6a38'; for (let y = groundY; y < h; y += 12) for (let x = ((y - groundY) / 12 % 2) * 10; x < w; x += 20) ctx.fillRect(x, y, 6, 3);
      [w * 0.08, w * 0.5, w * 0.92].forEach((px) => { ctx.fillStyle = '#5a3a1a'; ctx.fillRect(px - 8, groundY - 120, 16, 130); ctx.fillStyle = '#3a2410'; for (let yy = groundY - 110; yy < groundY; yy += 24) ctx.fillRect(px - 8, yy, 16, 4); });
      ctx.fillStyle = '#e8d8a0'; ctx.fillRect(w * 0.5 - 60, groundY - 200, 120, 30); ctx.fillStyle = '#e53935'; ctx.font = "9px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('B2B 忍', w * 0.5 - 40, groundY - 190);

      // брёвна от техники замены: лежат там, где стоял человек
      logs.forEach((lg) => { const age = t - lg.time; ctx.fillStyle = '#7a4a24'; ctx.fillRect(lg.x + 6 * scale, lg.y + SPRITE_H * scale - 14 * scale, 26 * scale, 10 * scale); ctx.fillStyle = '#b07a40'; ctx.fillRect(lg.x + 6 * scale, lg.y + SPRITE_H * scale - 14 * scale, 26 * scale, 2 * scale); if (age < 0.6) drawPuff(ctx, lg.x + SPRITE_W * scale / 2, lg.y + SPRITE_H * scale * 0.5, age, 24 * scale / 2); });

      const orderDraw = [...participants.keys()].sort((a, b) => pos[a].r - pos[b].r);
      orderDraw.forEach((i) => {
        const p = participants[i], { x, y } = pos[i];
        const d = dead.get(p.id);
        if (d) {
          const age = t - d.time;
          if (age > 1.5) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 14 * scale, y + SPRITE_H * scale - 3 * scale, 36 * scale, 2); return; }
          if (d.kind === 'fireball') { drawSprite(ctx, p.person, 'hurt' + Math.min(5, Math.floor(age * 5)), x, y, scale); if (age < 0.5) { ctx.fillStyle = age < 0.25 ? '#ff8c42' : '#ffd166'; ctx.beginPath(); ctx.arc(x + SPRITE_W * scale / 2, y + SPRITE_H * scale * 0.5, 24 * scale / 2 * (1 + age), 0, Math.PI * 2); ctx.fill(); } }
          else if (d.kind === 'clones') { for (let c = -1; c <= 1; c += 2) { ctx.globalAlpha = Math.max(0, 0.6 - age); drawSprite(ctx, p.person, 'idle', x + c * 30 * scale * Math.min(1, age * 2), y, scale); } ctx.globalAlpha = 1; drawSprite(ctx, p.person, 'hurt' + Math.min(5, Math.floor(age * 4)), x, y, scale); }
          else { drawSprite(ctx, p.person, 'hurt' + Math.min(5, Math.floor(age * 5)), x + (age < 0.3 ? Math.round(Math.sin(age * 60) * 3) : 0), y, scale); if (age < 0.4) { ctx.fillStyle = '#cfd8dc'; for (let s = 0; s < 3; s++) ctx.fillRect(x + 10 * scale + s * 10 * scale, y + 14 * scale + s * 4, 6, 6); } }
          return;
        }
        // сюрикены летят к цели до попадания
        if (cur && cur.id === p.id && t > cur.at - 0.45 && (cur.kind === 'shuriken' || cur.kind === 'kunai')) { const u = (t - (cur.at - 0.45)) / 0.45; const sx = cur.side < 0 ? -40 + u * (x + 40) : w + 40 - u * (w + 40 - x); ctx.save(); ctx.translate(sx, y + 14 * scale); ctx.rotate(t * 30); ctx.fillStyle = '#cfd8dc'; for (let q = 0; q < 4; q++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-3, -12, 6, 12); } ctx.restore(); }
        if (cur && cur.id === p.id && t > cur.at - 0.6 && cur.kind === 'fireball') { const u = (t - (cur.at - 0.6)) / 0.6; const sx = cur.side < 0 ? -60 + u * (x + 60) : w + 60 - u * (w + 60 - x); ctx.fillStyle = '#ff8c42'; ctx.beginPath(); ctx.arc(sx, y + 16 * scale, 14 * scale / 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(sx, y + 16 * scale, 8 * scale / 2, 0, Math.PI * 2); ctx.fill(); }
        const bob = Math.round(Math.sin(t * 5 + jit[i]) * 1.5);
        const nervous = target === p.id ? Math.round((rnd() - 0.5) * 4) : 0;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 18 * scale, y + SPRITE_H * scale - 6 * scale, 28 * scale, 4 * scale);
        const isLog = logs.some((lg) => lg.id === p.id && t - lg.time < 0.9);
        if (isLog) { ctx.globalAlpha = 0.25; }
        drawSprite(ctx, p.person, winner ? (Math.floor(t * 5) % 2 ? 'cheer' : 'cheer2') : 'idle', x + nervous, y + bob, scale);
        ctx.globalAlpha = 1;
        if (target === p.id && !winner) drawThreat(ctx, x + 16 * scale, y - 2, SPRITE_W * scale - 32 * scale + 32, t, fakePhase ? '#ffd166' : '#ff5050');
        label(ctx, p.name, x + SPRITE_W * scale / 2, y - 24, scale >= 3 ? 9 : 8, winner ? '#ffd166' : '#f4ecd8', 'rgba(12,8,24,0.85)', winner ? '#ffd166' : null);
      });
      particles.draw(ctx, t);
      if (winner) { ctx.fillStyle = 'rgba(255,230,160,0.08)'; ctx.fillRect(0, 0, w, h); }
      ctx.fillStyle = '#fff'; ctx.font = "10px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText(`ОСТАЛОСЬ ${alive.length}`, 20, 20);

      if (t >= finalAt) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
