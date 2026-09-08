import { drawAvatar, SPRITE_W, SPRITE_H } from '../avatar.js';
import { mulberry32 } from '../rng.js';

// Гонка. Порядок известен заранее, траектории подгоняются под него.
export default {
  id: 'race',
  title: 'Гонка',
  duration: 12,
  minPlayers: 2,
  maxPlayers: 20,

  play({ canvas, theme, participants, order, seed, onFreeze }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rank = new Map(order.map((id, i) => [id, i]));
    const rnd = mulberry32(seed);
    const runners = participants.map((p) => ({
      p, rank: rank.get(p.id),
      final: 1 - rank.get(p.id) * (0.45 / n),
      f: 1.2 + rnd() * 1.2, phase: rnd() * Math.PI * 2, amp: 0.08 + rnd() * 0.06,
    }));
    const dur = this.duration * 1000;
    let start = null, raf = 0, stopped = false;

    const progress = (r, t) => {
      const ease = 1 - Math.pow(1 - t, 2.2);
      const noise = r.amp * Math.sin(2 * Math.PI * (r.f * t + r.phase)) * Math.pow(1 - t, 1.5) * Math.pow(t, 0.5);
      return Math.max(0, Math.min(r.final, r.final * ease + noise));
    };

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const t = Math.min(1, (now - start) / dur);
      const w = canvas.width, h = canvas.height;
      const horizon = Math.round(h * 0.3);
      const laneH = (h - horizon - 8) / n;
      const scale = Math.max(2, Math.min(5, Math.floor(laneH / 20)));
      const sprH = SPRITE_H * scale, sprW = SPRITE_W * scale;
      const startX = 60, L = w * 2.4;
      const finishX = startX + L;
      const ps = runners.map((r) => progress(r, t));
      const leader = Math.max(...ps);
      const camX = Math.max(0, Math.min(finishX + 160 - w, startX + leader * L - w * 0.62));

      ctx.fillStyle = theme.colors.bg; ctx.fillRect(0, 0, w, h);
      theme.drawSky(ctx, w, horizon, camX);
      ctx.imageSmoothingEnabled = false;
      for (let i = 0; i < n; i++) {
        const laneTop = Math.round(horizon + i * laneH);
        const groundY = Math.round(laneTop + laneH * 0.62);
        if (i > 0) { ctx.fillStyle = '#1c1430'; ctx.fillRect(0, laneTop, w, groundY - laneTop); }
        theme.drawGround(ctx, groundY, w, Math.round(laneTop + laneH) - groundY + 8, camX);
        for (let tx = 400 - (Math.floor(camX) % 400); tx < w; tx += 400) if (i === 0) theme.drawTorch(ctx, tx, groundY, now / 1000);
        theme.drawFinish(ctx, Math.round(finishX - camX), groundY, Math.min(64, laneH * 0.9));
      }
      const time = now / 1000;
      runners.forEach((r, i) => {
        const laneTop = horizon + i * laneH;
        const groundY = Math.round(laneTop + laneH * 0.62);
        const x = Math.round(startX + ps[i] * L - camX);
        if (x + sprW < -80 || x > w + 80) return;
        const y = groundY - sprH + 2;
        const moving = t < 1;
        const fr = moving ? 1 + (Math.floor(time * 9 + i) % 2) : 0;
        drawAvatar(ctx, x, y, r.p.avatar, scale, fr);
        theme.drawLabel(ctx, r.p.name, x + sprW / 2, y - 16 - scale, scale >= 4 ? 9 : 8, t >= 1 && r.rank === 0);
      });

      if (t >= 1) { stopped = true; onFreeze(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  },
};
