import { drawAvatar, SPRITE_W, SPRITE_H } from '../avatar.js';
import { mulberry32 } from '../rng.js';

// Последний выживший. Выбывают в обратном порядке выступлений, последний говорит первым.
export default {
  id: 'survivor',
  title: 'Последний выживший',
  duration: 20,
  minPlayers: 2,
  maxPlayers: 20,

  play({ canvas, theme, participants, order, seed, onFreeze, onEvent }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rnd = mulberry32(seed);
    const byId = new Map(participants.map((p) => [p.id, p]));
    const victims = [...order].reverse().slice(0, n - 1); // все, кроме первого
    // Длительность пауз: быстро в начале, медленно в конце. Всего не больше 20 секунд.
    const base = n > 10 ? 0.5 : 1.1;
    const gaps = victims.map((_, i) => base + (2.0 - base) * Math.pow(i / Math.max(1, victims.length - 1), 2));
    const total = gaps.reduce((s, g) => s + g, 0);
    const k = total > 17 ? 17 / total : 1;
    const times = []; let acc = 1.0;
    gaps.forEach((g) => { acc += g * k; times.push(acc); });
    const finalAt = acc + 1.6;

    const state = new Map(participants.map((p) => [p.id, 'alive']));
    const particles = [];
    let start = null, raf = 0, stopped = false, killed = 0;

    const spawn = (cx, cy, color) => {
      for (let i = 0; i < 26; i++) {
        const a = rnd() * Math.PI * 2, s = 80 + rnd() * 220;
        particles.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, life: 0.7, color: rnd() < 0.5 ? color : '#ffd166' });
      }
    };

    let last = null;
    const frame = (now) => {
      if (stopped) return;
      if (start === null) { start = now; last = now; }
      const t = (now - start) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const w = canvas.width, h = canvas.height;

      while (killed < victims.length && t >= times[killed]) {
        state.set(victims[killed], 'dead');
        killed++;
        if (onEvent) onEvent('pop');
      }
      if (killed < victims.length && t >= times[killed] - 0.5) state.set(victims[killed], 'doomed');
      if (killed === victims.length) state.set(order[0], 'winner');

      const cols = Math.ceil(Math.sqrt(n * 1.5));
      const rows = Math.ceil(n / cols);
      const gap = 12, pad = 24;
      const cw = Math.floor((w - pad * 2 - gap * (cols - 1)) / cols);
      const ch = Math.floor((h - pad * 2 - gap * (rows - 1)) / rows);
      const scale = Math.max(2, Math.min(5, Math.floor(Math.min(cw / (SPRITE_W + 6), (ch - 30) / SPRITE_H))));

      ctx.fillStyle = theme.colors.bg; ctx.fillRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      participants.forEach((p, i) => {
        const st = state.get(p.id);
        let x = pad + (i % cols) * (cw + gap), y = pad + Math.floor(i / cols) * (ch + gap);
        if (st === 'doomed') { x += Math.round((rnd() - 0.5) * 8); y += Math.round((rnd() - 0.5) * 8); }
        theme.drawCard(ctx, x, y, cw, ch, st, t);
        if (st === 'dead') {
          if (!p._boom) { p._boom = true; spawn(x + cw / 2, y + ch / 2, p.avatar.shirt); }
          ctx.fillStyle = '#3a2a4c'; ctx.font = `${Math.min(28, cw / 4)}px ${theme.font}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
          ctx.fillText('X', x + cw / 2, y + ch / 2); ctx.textAlign = 'left';
          return;
        }
        const sx = x + (cw - SPRITE_W * scale) / 2, sy = y + (ch - 30 - SPRITE_H * scale) / 2 + 6;
        const bob = st === 'winner' ? Math.round(Math.sin(t * 10) * 4) : 0;
        drawAvatar(ctx, Math.round(sx), Math.round(sy + bob), p.avatar, scale, st === 'winner' ? 1 + (Math.floor(t * 8) % 2) : 0);
        theme.drawLabel(ctx, p.name, x + cw / 2, y + ch - 26, scale >= 4 ? 9 : 8, st === 'winner');
      });

      for (let i = particles.length - 1; i >= 0; i--) {
        const q = particles[i];
        q.life -= dt; if (q.life <= 0) { particles.splice(i, 1); continue; }
        q.vy += 500 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        ctx.fillStyle = q.color; ctx.fillRect(Math.round(q.x), Math.round(q.y), 5, 5);
      }

      if (t >= finalAt) { stopped = true; participants.forEach((p) => delete p._boom); onFreeze(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); participants.forEach((p) => delete p._boom); } };
  },
};
