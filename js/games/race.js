import { drawSprite, runFrame, SPRITE_W, SPRITE_H } from '../sprite.js?v=6eebc1b-1545';
import { mulberry32 } from '../rng.js?v=6eebc1b-1545';
import { skyLayer, label, makeParticles, drawStands, drawCloud, drawFlag, drawNpc } from './scene.js?v=6eebc1b-1545';

const SKY = [[30, 24, 80], [80, 40, 110], [190, 80, 100], [245, 140, 90], [255, 205, 120]];

// Забег на стадионе: одна трасса, бегуны в несколько рядов в глубину, камера за лидером.
export default {
  id: 'race',
  title: 'Забег',
  description: 'Полный стадион, ревущие трибуны и одна финишная лента, за которой ждёт право сказать первое слово.',
  cover: 'assets/covers/race.jpg',
  duration: 13,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(skyLayer(w, h * 0.5, SKY, 3, 'race-prev'), 0, 0, w, h * 0.5);
    drawCloud(ctx, w * 0.1, h * 0.12, 8); drawCloud(ctx, w * 0.6, h * 0.08, 6);
    drawStands(ctx, 0, h * 0.32, w, 2, t, 0, 1);
    ctx.fillStyle = '#b8503a'; ctx.fillRect(0, h * 0.55, w, h * 0.45);
    ctx.fillStyle = '#e8c0b0'; for (let y = h * 0.62; y < h; y += h * 0.12) ctx.fillRect(0, y, w, 2);
    people.slice(0, 4).forEach((p, i) => {
      const x = ((t * 60 + i * 70) % (w + 100)) - 60;
      drawSprite(ctx, p.person, runFrame(t, 10, i), x, h * 0.5 + i * 12 - 30, 1.5);
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
      f: 1.1 + rnd() * 1.3, phase: rnd() * Math.PI * 2, amp: 0.07 + rnd() * 0.07, gait: rnd() * 8,
    }));
    const particles = makeParticles();
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, lastPuff = 0, flashAt = null;
    const cityRnd = mulberry32(9);
    const city = Array.from({ length: 40 }, () => ({ h: 0.15 + cityRnd() * 0.35, w: 40 + cityRnd() * 50, lit: cityRnd() }));

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
      const horizon = Math.round(h * 0.36);
      const trackTop = Math.round(h * 0.56), trackBottom = h - 24;
      const rowH = (trackBottom - trackTop - sprH * 0.3) / Math.max(1, rows);
      const startX = 80, L = w * 2.6, finishX = startX + L;
      const ps = runners.map((r) => progress(r, t));
      const leader = Math.max(...ps);
      const camX = Math.max(0, Math.min(finishX + 220 - w, startX + leader * L - w * 0.6));

      // небо, солнце, облака, город
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(skyLayer(w, horizon, SKY, 4), 0, 0, w, horizon);
      ctx.fillStyle = 'rgba(255,220,150,0.18)'; ctx.fillRect(w * 0.66, horizon * 0.1, horizon * 0.5, horizon * 0.5);
      ctx.fillStyle = '#ffe2aa'; ctx.fillRect(w * 0.72, horizon * 0.22, horizon * 0.26, horizon * 0.26);
      for (let i = 0; i < 6; i++) drawCloud(ctx, ((i * 260 - camX * 0.05 + time * 8) % (w + 300)) - 150, horizon * (0.1 + (i % 3) * 0.12), 7 + (i % 2) * 4, 'rgba(255,240,230,0.8)');
      let cx = -((camX * 0.12) % 2400) - 100;
      city.forEach((b) => {
        const bh = horizon * b.h;
        ctx.fillStyle = '#2a1c48'; ctx.fillRect(cx, horizon - bh, b.w, bh);
        ctx.fillStyle = '#ffd98a';
        for (let wy = horizon - bh + 8; wy < horizon - 8; wy += 12) for (let wx = cx + 6; wx < cx + b.w - 6; wx += 12) if (((wx * 7 + wy * 13) % 10) / 10 < b.lit) ctx.fillRect(wx, wy, 5, 6);
        cx += b.w + 14;
      });
      // мачты освещения
      [0.15, 0.85].forEach((fx) => {
        const mx = Math.round(w * fx - (camX * 0.2 % w));
        ctx.fillStyle = 'rgba(255,240,200,0.12)'; ctx.beginPath(); ctx.moveTo(mx, horizon * 0.15); ctx.lineTo(mx - 140, trackTop + 60); ctx.lineTo(mx + 140, trackTop + 60); ctx.fill();
        ctx.fillStyle = '#6a6a7a'; ctx.fillRect(mx - 3, horizon * 0.15, 6, horizon * 0.85);
        ctx.fillStyle = '#fff6d0'; ctx.fillRect(mx - 22, horizon * 0.12, 44, 8);
      });
      // трибуна с болельщиками и флагами, козырёк
      ctx.fillStyle = '#4a3a5a'; ctx.fillRect(0, horizon - 10, w, 12);
      drawStands(ctx, 0, horizon, w, 3, time, camX, Math.max(1, scale - 1));
      for (let fx = -((camX * 0.3) % 420) - 100; fx < w; fx += 420) drawFlag(ctx, fx, horizon - 70, time + fx, '#21a038', 'B2B');
      // табло
      const sbx = Math.round(w * 0.5 - (camX * 0.3 % (w * 2)));
      ctx.fillStyle = '#111'; ctx.fillRect(sbx - 110, horizon - 88, 220, 40);
      ctx.fillStyle = '#ffd166'; ctx.font = "9px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('B2Bсосы  CUP', sbx - 100, horizon - 80);
      ctx.fillStyle = '#ff5050'; ctx.fillText(time.toFixed(1), sbx + 40, horizon - 80);
      ctx.fillStyle = '#6ec85a'; ctx.fillText('СБЕР АРЕНА', sbx - 100, horizon - 64);
      // бортик и дорожка
      ctx.fillStyle = '#e8e2d0'; ctx.fillRect(0, trackTop - 14, w, 14);
      ctx.fillStyle = '#21a038'; for (let ax = -((camX) % 160); ax < w; ax += 160) { ctx.fillRect(ax, trackTop - 12, 80, 10); ctx.fillStyle = '#fff'; ctx.font = "7px 'Press Start 2P', monospace"; ctx.fillText('СБЕР', ax + 18, trackTop - 10); ctx.fillStyle = '#21a038'; }
      ctx.fillStyle = '#b8503a'; ctx.fillRect(0, trackTop, w, h - trackTop);
      ctx.fillStyle = '#a84630'; for (let x = -((camX) % 64) - 64; x < w; x += 64) ctx.fillRect(x, trackTop, 32, h - trackTop);
      ctx.fillStyle = 'rgba(0,0,0,0.06)'; for (let y = trackTop; y < h; y += 6) ctx.fillRect(0, y, w, 1);
      ctx.fillStyle = '#e8c0b0';
      for (let r = 0; r <= rows; r++) {
        const ly = Math.round(trackTop + r * rowH + sprH * 0.3);
        ctx.fillRect(0, ly, w, 2);
        if (r < rows) { ctx.fillStyle = '#f4ecd8'; ctx.font = "8px 'Press Start 2P', monospace"; for (let nx = -((camX) % 600) + 20; nx < w; nx += 600) ctx.fillText(String(r + 1), nx, ly + 6); ctx.fillStyle = '#e8c0b0'; }
      }
      // старт, судья с флажком, финиш и фотографы
      const sx = Math.round(startX - camX);
      ctx.fillStyle = '#f4ecd8'; ctx.fillRect(sx, trackTop, 4, h - trackTop);
      if (sx > -100) { drawNpc(ctx, 3, 'stand-right', sx - 70, trackTop - sprH * 0.9, scale); ctx.fillStyle = t < 0.05 ? '#ff5050' : '#ffffff'; ctx.fillRect(sx - 70 + 20 * scale, trackTop - sprH * 0.9 - 10, 14, 10); }
      const fx = Math.round(finishX - camX);
      for (let y = trackTop; y < h; y += 8) for (let k = 0; k < 2; k++) { ctx.fillStyle = ((y / 8 + k) % 2) ? '#141414' : '#f4f4f4'; ctx.fillRect(fx + k * 8, y, 8, 8); }
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(fx - 6, trackTop - 110, 6, 110); ctx.fillRect(fx + 16, trackTop - 110, 6, 110);
      ctx.fillStyle = '#ff6b6b'; ctx.fillRect(fx - 10, trackTop - 118, 36, 16);
      ctx.fillStyle = '#fff'; ctx.font = "8px 'Press Start 2P', monospace"; ctx.fillText('ФИНИШ', fx - 6, trackTop - 115);
      if (fx < w + 200) { [0, 1, 2].forEach((k) => { drawNpc(ctx, 6 + k, 'idle', fx + 40 + k * 26 * scale / 2, trackTop - sprH * 0.95 - k * 4, Math.max(1, scale - 1)); if (leader > 0.9 && Math.floor(time * 12 + k) % 4 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(fx + 40 + k * 26 * scale / 2 + 10, trackTop - sprH * 0.95 + 10, 10, 8); } }); }
      // финишная лента
      if (leader < 0.985) { ctx.fillStyle = '#ffd166'; ctx.fillRect(fx, trackTop + rowH * 0.5, 22, 4); }

      // бегуны, дальние ряды первыми
      const orderDraw = [...runners.keys()].sort((a, b) => runners[a].row - runners[b].row);
      if (time - lastPuff > 0.08 && t < 1) {
        lastPuff = time;
        runners.forEach((r, i) => {
          const x = startX + ps[i] * L - camX;
          if (x > -50 && x < w + 50) particles.puff(x + 16 * scale, trackTop + r.row * rowH + sprH * 0.3 + sprH - 6, time, rnd);
        });
      }
      particles.draw(ctx, time);
      orderDraw.forEach((i) => {
        const r = runners[i];
        const x = Math.round(startX + ps[i] * L - camX);
        if (x + sprW < -80 || x > w + 80) return;
        const y = Math.round(trackTop + r.row * rowH + sprH * 0.3);
        ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(x + 20 * scale, y + sprH - 5 * scale, 24 * scale, 3 * scale);
        if (t < 1 && ps[i] >= leader - 0.001) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let k = 0; k < 4; k++) ctx.fillRect(x - 10 - k * 14, y + 18 * scale + k * 6 * scale, 10, 2); }
        const fr = t < 1 ? runFrame(time, 9 + r.f * 2, r.gait) : (r.rank === 0 ? (Math.floor(time * 5) % 2 ? 'cheer' : 'cheer2') : 'stand-right');
        drawSprite(ctx, r.p.person, fr, x, y, scale);
        const first = t >= 1 && r.rank === 0;
        label(ctx, r.p.name, x + sprW / 2, y - 4, scale >= 3 ? 10 : 8, first ? '#ffd166' : '#f4ecd8', 'rgba(12,8,24,0.85)', first ? '#ffd166' : null);
      });

      if (flashAt === null && leader >= 0.985) { flashAt = time; particles.burst(fx + 8, trackTop - 40, time, rnd, { count: 80, speed: 280, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#f4ecd8', '#21a038'], life: 1.6 }); }
      if (flashAt !== null) { const a = Math.max(0, 0.9 - (time - flashAt) * 2); if (a > 0) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, w, h); } }

      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  },
};
