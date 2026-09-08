import { drawSprite, spriteCanvas, runFrame, SPRITE_W, SPRITE_H } from '../sprite.js';
import { mulberry32 } from '../rng.js';
import { skyLayer, drawCrowd, label, makeParticles } from './scene.js';

const SKY = [[24, 16, 60], [70, 30, 90], [170, 60, 90], [240, 120, 80], [255, 190, 110]];

// Гонка на стадионе: одна трасса, бегуны в несколько рядов в глубину, камера за лидером.
export default {
  id: 'race',
  title: 'Забег',
  description: 'Стадион, трибуны, финишная лента. Кто первым добежал, тот первым говорит.',
  duration: 13,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(skyLayer(w, h * 0.55, SKY, 3, 'race-prev'), 0, 0, w, h * 0.55);
    ctx.fillStyle = '#3a2a4a'; ctx.fillRect(0, h * 0.4, w, h * 0.15);
    drawCrowd(ctx, 0, h * 0.5, w, 2, t, 3, 5);
    ctx.fillStyle = '#b8503a'; ctx.fillRect(0, h * 0.55, w, h * 0.45);
    ctx.fillStyle = '#d8a090'; for (let y = h * 0.62; y < h; y += h * 0.12) ctx.fillRect(0, y, w, 2);
    const shown = people.slice(0, 4);
    shown.forEach((p, i) => {
      const x = ((t * 60 + i * 70) % (w + 100)) - 60;
      drawSprite(ctx, p.person, runFrame(t, 10, i), x, h * 0.55 + i * 12 - 10, 2);
    });
  },

  play({ canvas, participants, order, seed, onFreeze }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rank = new Map(order.map((id, i) => [id, i]));
    const rnd = mulberry32(seed);
    const rows = Math.min(n, 5);
    const runners = participants.map((p, i) => ({
      p, rank: rank.get(p.id), row: i % rows,
      final: 1 - rank.get(p.id) * (0.22 / n),
      f: 1.1 + rnd() * 1.3, phase: rnd() * Math.PI * 2, amp: 0.07 + rnd() * 0.07, gait: rnd() * 4,
    }));
    const particles = makeParticles();
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, lastPuff = 0, flashAt = null;

    const progress = (r, t) => {
      const ease = 1 - Math.pow(1 - t, 2.4);
      const noise = r.amp * Math.sin(2 * Math.PI * (r.f * t + r.phase)) * Math.pow(1 - t, 1.6) * Math.pow(t, 0.5);
      return Math.max(0, Math.min(r.final, r.final * ease + noise));
    };

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / 1000 / dur);
      const time = (now - start) / 1000;
      const w = canvas.width, h = canvas.height;
      const scale = n <= 8 ? Math.max(2, Math.min(4, Math.floor(h / 250))) : Math.max(2, Math.min(3, Math.floor(h / 330)));
      const sprH = SPRITE_H * scale, sprW = SPRITE_W * scale;
      const horizon = Math.round(h * 0.42);
      const trackTop = Math.round(h * 0.55), trackBottom = h - 24;
      const rowH = (trackBottom - trackTop - sprH * 0.3) / Math.max(1, rows);
      const startX = 80, L = w * 2.6, finishX = startX + L;
      const ps = runners.map((r) => progress(r, t));
      const leader = Math.max(...ps);
      const camX = Math.max(0, Math.min(finishX + 220 - w, startX + leader * L - w * 0.6));

      // небо, город, трибуна
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(skyLayer(w, horizon, SKY, 4), 0, 0, w, horizon);
      ctx.fillStyle = '#ffe2aa'; ctx.fillRect(w * 0.72, horizon * 0.25, horizon * 0.22, horizon * 0.22);
      const cityRnd = mulberry32(9);
      ctx.fillStyle = '#2a1c48';
      for (let x = -((camX * 0.1) % 90) - 90; x < w; x += 90) {
        const bh = horizon * (0.15 + cityRnd() * 0.3);
        ctx.fillRect(x, horizon - bh, 60, bh);
      }
      ctx.fillStyle = '#3a2a4a'; ctx.fillRect(0, horizon - 4, w, trackTop - horizon + 4);
      ctx.fillStyle = '#4a3a5a'; ctx.fillRect(0, horizon - 4, w, 6);
      ctx.save(); ctx.beginPath(); ctx.rect(0, horizon, w, trackTop - horizon); ctx.clip();
      drawCrowd(ctx, -((camX * 0.3) % 40) - 40, horizon + 14, w + 80, 3, time, 5, Math.max(5, scale + 2));
      ctx.restore();
      // баннер
      const bx = Math.round(w * 0.5 - camX * 0.3) % (w * 2);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(bx, trackTop - 26, 220, 20);
      ctx.fillStyle = '#1a1428'; ctx.font = "bold 12px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('ДЕЙЛИК CUP', bx + 14, trackTop - 22);
      ctx.fillStyle = '#5a4a6a'; ctx.fillRect(0, trackTop - 6, w, 6);

      // дорожка
      ctx.fillStyle = '#b8503a'; ctx.fillRect(0, trackTop, w, h - trackTop);
      ctx.fillStyle = '#a04430';
      for (let x = -((camX) % 64) - 64; x < w; x += 64) ctx.fillRect(x, trackTop, 32, h - trackTop);
      ctx.fillStyle = '#e8c0b0';
      for (let r = 0; r <= rows; r++) ctx.fillRect(0, Math.round(trackTop + r * rowH + sprH * 0.3), w, 2);
      // старт и финиш
      const sx = Math.round(startX - camX);
      ctx.fillStyle = '#f4ecd8'; ctx.fillRect(sx, trackTop, 4, h - trackTop);
      const fx = Math.round(finishX - camX);
      for (let y = trackTop; y < h; y += 8) for (let k = 0; k < 2; k++) {
        ctx.fillStyle = ((y / 8 + k) % 2) ? '#141414' : '#f4f4f4'; ctx.fillRect(fx + k * 8, y, 8, 8);
      }
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(fx - 6, trackTop - 90, 6, 90); ctx.fillRect(fx + 16, trackTop - 90, 6, 90);
      ctx.fillStyle = '#ff6b6b'; ctx.fillRect(fx - 6, trackTop - 96, 28, 14);
      ctx.fillStyle = '#fff'; ctx.font = "8px 'Press Start 2P', monospace"; ctx.fillText('ФИНИШ', fx - 4, trackTop - 93);

      // бегуны, дальние ряды первыми
      const orderDraw = [...runners.keys()].sort((a, b) => runners[a].row - runners[b].row);
      if (time - lastPuff > 0.08 && t < 1) {
        lastPuff = time;
        runners.forEach((r, i) => {
          const x = startX + ps[i] * L - camX;
          if (x > -50 && x < w + 50) particles.puff(x + 6, trackTop + r.row * rowH + sprH * 0.3 + sprH - 4, time, rnd);
        });
      }
      particles.draw(ctx, time);
      orderDraw.forEach((i) => {
        const r = runners[i];
        const x = Math.round(startX + ps[i] * L - camX);
        if (x + sprW < -80 || x > w + 80) return;
        const y = Math.round(trackTop + r.row * rowH + sprH * 0.3);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + scale * 4, y + sprH - scale, sprW - scale * 8, scale);
        const fr = t < 1 ? runFrame(time, 9 + r.f * 2, r.gait) : (r.rank === 0 ? 'cheer' : 'idle');
        drawSprite(ctx, r.p.person, fr, x, y, scale);
        label(ctx, r.p.name, x + sprW / 2, y - 18, scale >= 4 ? 10 : 8, t >= 1 && r.rank === 0 ? '#ffd166' : '#f4ecd8', 'rgba(12,8,24,0.85)', t >= 1 && r.rank === 0 ? '#ffd166' : null);
      });

      // вспышка на финише
      if (flashAt === null && leader >= 0.985) { flashAt = time; particles.burst(fx + 8, trackTop - 40, time, rnd, { count: 60, speed: 260, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#f4ecd8'], life: 1.4 }); }
      if (flashAt !== null) { const a = Math.max(0, 0.9 - (time - flashAt) * 2); if (a > 0) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, w, h); } }

      if (t >= 1 && time - (start ? 0 : 0) >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  },
};
