import { drawSprite, SPRITE_W, SPRITE_H } from '../sprite.js';
import { mulberry32 } from '../rng.js';
import { drawSpotlight, label, makeParticles } from './scene.js';

// Арена: персонажи стоят под прожекторами, каждый раунд одного уносит событие. Последний говорит первым.
export default {
  id: 'survivor',
  title: 'Сцена',
  description: 'Прожектор мечется по сцене. Люк, молния или луч уносят по одному. Кто остался, тот и первый.',
  duration: 20,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a0b14'; ctx.fillRect(0, 0, w, h);
    const sx = w / 2 + Math.sin(t * 1.7) * w * 0.3;
    drawSpotlight(ctx, w / 2, 0, sx, h * 0.8, 90);
    ctx.fillStyle = '#2a2a44'; ctx.fillRect(0, h * 0.78, w, h * 0.22);
    ctx.fillStyle = '#3a3a5a'; for (let x = 0; x < w; x += 24) ctx.fillRect(x, h * 0.78, 22, 6);
    people.slice(0, 4).forEach((p, i) => {
      const x = 30 + i * 60, y = h * 0.78 - SPRITE_H * 2 + Math.round(Math.sin(t * 4 + i) * 2);
      drawSprite(ctx, p.person, 'idle', x, y, 2);
    });
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
      const kind = ['trapdoor', 'lightning', 'beam'][Math.floor(rnd() * 3)];
      const sweep = [];
      for (let s = 0; s < 4; s++) sweep.push(participants[Math.floor(rnd() * n)].id);
      sweep.push(id);
      events.push({ id, at: acc + gaps[i] * k, kind, sweep });
      acc += gaps[i] * k;
    });
    const finalAt = acc + 2.4;
    const particles = makeParticles();
    let start = null, raf = 0, stopped = false, fired = 0;
    const spots = participants.map(() => ({ bob: rnd() * 6.28 }));

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const t = (now - start) / 1000;
      const w = canvas.width, h = canvas.height;

      while (fired < events.length && t >= events[fired].at) { fired++; if (onEvent) onEvent('pop'); }
      const current = fired < events.length ? events[fired] : null;

      // расстановка на арене: ряды в глубину, дальние выше и чуть меньше
      const cols = Math.ceil(Math.sqrt(n * 1.8));
      const rows = Math.ceil(n / cols);
      const floorY = h * 0.86;
      const scale = Math.max(2, Math.min(5, Math.floor(Math.min((w * 0.8) / cols / (SPRITE_W + 10), (h * 0.5) / rows / SPRITE_H))));
      const cellW = (w * 0.8) / cols, rowH = scale * SPRITE_H * 0.55;
      const pos = participants.map((p, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        const inRow = Math.min(cols, n - r * cols);
        const rowOffset = (cols - inRow) * cellW / 2;
        return { x: w * 0.1 + rowOffset + c * cellW + cellW / 2 - SPRITE_W * scale / 2 + ((r % 2) ? cellW * 0.15 : 0), y: floorY - (rows - 1 - r) * rowH - SPRITE_H * scale, r };
      });

      // фон: театральная сцена. Занавес сзади, доски, рампа спереди.
      ctx.imageSmoothingEnabled = false;
      const stageTop = floorY - rows * rowH - 40;
      ctx.fillStyle = '#0b0710'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#5a1020'; ctx.fillRect(0, 0, w, stageTop);
      for (let x = 0; x < w; x += 28) {
        ctx.fillStyle = '#7a1a2c'; ctx.fillRect(x, 0, 10, stageTop);
        ctx.fillStyle = '#3e0a18'; ctx.fillRect(x + 18, 0, 6, stageTop);
      }
      ctx.fillStyle = '#4a0c1c'; ctx.fillRect(0, 0, w, 34);
      for (let x = 0; x < w; x += 40) { ctx.fillStyle = '#6e1428'; ctx.fillRect(x, 12, 20, 18); }
      ctx.fillStyle = '#e0b040'; ctx.fillRect(0, 32, w, 4);
      const depth = h - stageTop;
      for (let i = 0; i < 10; i++) {
        const y0 = Math.round(stageTop + (depth * i) / 10), y1 = Math.round(stageTop + (depth * (i + 1)) / 10);
        ctx.fillStyle = i % 2 ? '#7a5a3a' : '#8a6642'; ctx.fillRect(0, y0, w, y1 - y0);
        ctx.fillStyle = '#5c4028'; ctx.fillRect(0, y1 - 2, w, 2);
      }
      ctx.fillStyle = '#5c4028';
      for (let k = -6; k <= 6; k++) {
        const xTop = w / 2 + k * (w / 12), xBot = w / 2 + k * (w / 7);
        ctx.beginPath(); ctx.moveTo(xTop, stageTop); ctx.lineTo(xBot, h); ctx.lineTo(xBot + 2, h); ctx.lineTo(xTop + 2, stageTop); ctx.fill();
      }
      ctx.fillStyle = '#1a1020'; ctx.fillRect(0, h - 14, w, 14);
      for (let x = 24; x < w; x += 64) {
        ctx.fillStyle = 'rgba(255,220,120,0.10)'; ctx.fillRect(x - 24, h - 90, 56, 80);
        ctx.fillStyle = '#ffe08a'; ctx.fillRect(x, h - 18, 10, 8);
      }
      // прожекторы: мечутся, перед событием останавливаются на жертве
      let target = -1;
      if (current) {
        const phase = current.at - t;
        if (phase < 1.4) {
          const idx = Math.min(current.sweep.length - 1, Math.floor((1.4 - phase) / 0.25));
          target = participants.findIndex((p) => p.id === current.sweep[idx]);
          if (phase < 0.4) target = participants.findIndex((p) => p.id === current.id);
        }
      }
      const winnerIdx = fired === events.length ? participants.findIndex((p) => p.id === order[0]) : -1;
      const spotTarget = winnerIdx >= 0 ? winnerIdx : (target >= 0 ? target : -1);
      [0.25, 0.5, 0.75].forEach((f, i) => {
        let sx = w * f + Math.sin(t * 0.9 + i * 2) * w * 0.18;
        if (spotTarget >= 0) sx = pos[spotTarget].x + SPRITE_W * scale / 2;
        drawSpotlight(ctx, w * f, 0, sx, floorY + 8, spotTarget >= 0 ? scale * 30 : scale * 50, spotTarget >= 0 ? 'rgba(255,240,180,0.22)' : 'rgba(255,230,160,0.09)');
      });

      // персонажи
      const drawOrder = [...pos.keys()].sort((a, b) => pos[a].r - pos[b].r);
      drawOrder.forEach((i) => {
        const p = participants[i], { x, y } = pos[i];
        const ev = events.find((e) => e.id === p.id);
        const dead = ev && t >= ev.at;
        const cx = x + SPRITE_W * scale / 2;
        if (dead) {
          const age = t - ev.at;
          if (ev.kind === 'trapdoor') {
            ctx.fillStyle = '#05050a'; ctx.fillRect(x - scale, floorY - 2 - (rows - 1 - pos[i].r) * rowH, SPRITE_W * scale + scale * 2, scale * 2 + 6);
            if (age < 0.6) {
              ctx.save(); ctx.beginPath(); ctx.rect(x - 10, 0, SPRITE_W * scale + 20, y + SPRITE_H * scale); ctx.clip();
              drawSprite(ctx, p.person, 'idle', x, y + age * age * 900, scale); ctx.restore();
            }
          } else if (ev.kind === 'lightning') {
            if (age < 0.12) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(0, 0, w, h); }
            if (age < 0.25) { ctx.fillStyle = '#fff8c0'; ctx.fillRect(cx - 3, 0, 6, y + 10); ctx.fillRect(cx - 14, y * 0.4, 8, 20); }
            if (age < 0.5) { ctx.save(); ctx.globalAlpha = 1 - age * 2; drawSprite(ctx, p.person, 'cheer', x, y, scale); ctx.restore(); }
            if (age < 0.05) particles.burst(cx, y + SPRITE_H * scale / 2, ev.at, rnd, { count: 30, speed: 260, colors: ['#fff8c0', '#ffd166', '#3a3a3a'], life: 0.8 });
          } else {
            if (age < 1.2) {
              ctx.fillStyle = 'rgba(120,255,220,0.25)'; ctx.fillRect(cx - scale * 8, 0, scale * 16, y + SPRITE_H * scale);
              ctx.save(); ctx.globalAlpha = Math.max(0, 1 - age); drawSprite(ctx, p.person, 'idle', x, y - age * 420, scale); ctx.restore();
            }
          }
          // метка на месте
          ctx.fillStyle = '#3a3a5a'; ctx.fillRect(cx - scale * 2, floorY - (rows - 1 - pos[i].r) * rowH - scale * 2, scale * 4, scale * 2);
          return;
        }
        const bob = Math.round(Math.sin(t * 4 + spots[i].bob) * scale * 0.4);
        const doomed = target === i;
        let dx = 0;
        if (doomed && current && current.at - t < 0.4) dx = Math.round((rnd() - 0.5) * scale * 2);
        const winner = winnerIdx === i;
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + scale * 3, y + SPRITE_H * scale - scale, SPRITE_W * scale - scale * 6, scale);
        if (winner) {
          const rise = Math.min(1, (t - events[events.length - 1].at) / 1.2) * scale * 8;
          ctx.fillStyle = '#ffd166'; ctx.fillRect(x - scale * 2, y + SPRITE_H * scale - rise, SPRITE_W * scale + scale * 4, rise + 6);
          ctx.fillStyle = '#c99a2e'; ctx.fillRect(x - scale * 2, y + SPRITE_H * scale - rise, SPRITE_W * scale + scale * 4, 4);
          drawSprite(ctx, p.person, Math.floor(t * 6) % 2 ? 'cheer' : 'idle', x, y - rise, scale);
          if (Math.floor(t * 10) % 5 === 0) particles.burst(cx, y - rise - 10, t, rnd, { count: 4, speed: 120, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc'], life: 1.2, gravity: 200, size: 4 });
        } else {
          drawSprite(ctx, p.person, 'idle', x + dx, y + bob, scale);
        }
        label(ctx, p.name, cx, y - 16 + bob, scale >= 4 ? 10 : 8, winner ? '#ffd166' : doomed ? '#ff6b6b' : '#f4ecd8', 'rgba(12,8,24,0.85)', winner ? '#ffd166' : doomed ? '#ff6b6b' : null);
      });
      particles.draw(ctx, t);

      if (t >= finalAt) { stopped = true; onFreeze(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  },
};
