import { drawSprite, runFrame, SPRITE_W, SPRITE_H } from '../sprite.js?v=3b8b1e8-1658';
import { mulberry32 } from '../rng.js?v=3b8b1e8-1658';
import { skyLayer, label, makeParticles, drawCloud, nextFrame, cancelFrame, stepRandom } from './scene.js?v=3b8b1e8-1658';
import { makeWarp, beginCamera, impactRing, drawAmbient, vignette, speedLines, bigText } from './fx.js?v=3b8b1e8-1658';

// Крыши: ночной пробег ниндзя по крышам деревни до башни Хокаге. Прыжки через провалы,
// сюрикены из темноты, кто-то чуть не срывается. Кто первым на башне, тот первым говорит.
const SKY = [[8, 8, 30], [20, 14, 60], [50, 24, 90], [110, 40, 90], [180, 80, 80]];
const ROOF_W = 300, GAP_W = 90;

function roofAt(k) { // крыша номер k: высота и цвет по номеру, одинаково у всех
  const r = stepRandom(77)(k);
  return { h: 70 + Math.floor(r * 90), color: ['#7a3a2a', '#5a3a6a', '#3a5a6a', '#6a5a2a'][k % 4] };
}

export default {
  id: 'rooftops',
  title: 'Крыши',
  cover: 'assets/covers/rooftops.jpg',
  description: 'Ночная деревня ниндзя, прыжки с крыши на крышу и сюрикены из темноты на пути к башне Хокаге.',
  duration: 15,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(skyLayer(w, h, SKY, 3, 'roof-prev'), 0, 0, w, h);
    ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.22, 18, 0, Math.PI * 2); ctx.fill();
    for (let k = 0; k < 4; k++) { const rf = roofAt(k); const x = k * 110 - ((t * 40) % 110); ctx.fillStyle = rf.color; ctx.fillRect(x, h - rf.h * 0.8, 90, rf.h * 0.8); ctx.fillStyle = '#2a1a2a'; ctx.fillRect(x - 6, h - rf.h * 0.8 - 8, 102, 10); }
    people.slice(0, 3).forEach((p, i) => drawSprite(ctx, p.person, runFrame(t, 10, i), 30 + i * 60, h * 0.45 - Math.abs(Math.sin(t * 3 + i)) * 20, 1.5));
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rank = new Map(order.map((id, i) => [id, i]));
    const rnd = mulberry32(seed);
    const rows = Math.min(n, 4);
    const runners = participants.map((p, i) => ({
      p, rank: rank.get(p.id), row: i % rows,
      final: 1 - rank.get(p.id) * (0.2 / n), f: 1.1 + rnd() * 1.3, phase: rnd() * 6.28, amp: 0.06 + rnd() * 0.06, gait: rnd() * 8,
      slipAt: rnd() < 0.5 ? 0.25 + rnd() * 0.5 : null, // у половины будет «чуть не сорвался»
    }));
    const particles = makeParticles();
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, lastPuff = 0, flashAt = null;
    const shurikens = Array.from({ length: 6 }, (_, i) => ({ at: 2 + i * 2.1, row: i % rows, x: rnd() }));
    const progress = (r, t) => { const ease = 1 - Math.pow(1 - t, 2.3); const noise = r.amp * Math.sin(2 * Math.PI * (r.f * t + r.phase)) * Math.pow(1 - t, 1.6) * Math.pow(t, 0.5); return Math.max(0, Math.min(r.final, r.final * ease + noise)); };

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const time = (now - start) / 1000, t = Math.min(1, time / dur);
      const w = canvas.width, h = canvas.height;
      const scale = n <= 8 ? Math.max(2, Math.min(3, Math.floor(h / 300))) : 2;
      const sprH = SPRITE_H * scale, sprW = SPRITE_W * scale;
      const startX = 100, L = w * 2.8, finishX = startX + L;
      const ps = runners.map((r) => progress(r, t));
      const leader = Math.max(...ps);
      const camX = Math.max(0, Math.min(finishX + 260 - w, startX + leader * L - w * 0.6));
      const baseY = h * 0.5; // линия крыш верхнего ряда
      const rowH = (h * 0.42) / rows;

      // небо, луна, облака, скала Хокаге и дальние дома
      ctx.imageSmoothingEnabled = false;
      const towerPoint = { x: Math.round(finishX - camX) + 80, y: baseY - 60 };
      beginCamera(ctx, w, h, time, flashAt !== null ? [flashAt] : [], () => towerPoint, { level: 1.25, dur: 1.1, amp: 8 });
      ctx.drawImage(skyLayer(w, h, SKY, 4, 'roof'), 0, 0, w, h);
      drawAmbient(ctx, 'petals', w, h, time, 22, camX);
      ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(w * 0.78 - camX * 0.02, h * 0.16, 34, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,0.08)'; ctx.beginPath(); ctx.arc(w * 0.78 - camX * 0.02, h * 0.16, 70, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 5; i++) drawCloud(ctx, ((i * 320 - camX * 0.05 + time * 5) % (w + 300)) - 150, h * (0.08 + (i % 3) * 0.08), 8, 'rgba(60,40,90,0.7)');
      // скала с лицами: силуэт
      ctx.fillStyle = '#2a1e3a'; const rx = w * 0.15 - camX * 0.08; ctx.fillRect(rx, h * 0.14, 360, h * 0.36);
      ctx.fillStyle = '#3a2c4a'; [0, 1, 2, 3].forEach((i) => { ctx.fillRect(rx + 20 + i * 86, h * 0.2, 60, 60); ctx.fillStyle = '#2a1e3a'; ctx.fillRect(rx + 34 + i * 86, h * 0.2 + 22, 10, 6); ctx.fillRect(rx + 56 + i * 86, h * 0.2 + 22, 10, 6); ctx.fillStyle = '#3a2c4a'; });
      // дальние дома с окнами
      for (let x = -((camX * 0.25) % 140) - 140; x < w; x += 140) { const hh = 60 + ((x + camX * 0.25) / 140 % 3) * 30; ctx.fillStyle = '#1e1630'; ctx.fillRect(x, baseY - hh, 110, hh + 200); ctx.fillStyle = '#ffb347'; for (let wy = baseY - hh + 14; wy < baseY; wy += 22) for (let wx = x + 12; wx < x + 100; wx += 24) if (((wx * 3 + wy) % 7) < 4) ctx.fillRect(wx, wy, 8, 10); ctx.fillStyle = '#3a1a24'; ctx.fillRect(x - 8, baseY - hh - 10, 126, 12); }

      // крыши по рядам: платформы с провалами, черепица, фонари
      for (let r = 0; r < rows; r++) {
        const rowY = baseY + r * rowH + rowH * 0.6;
        const first = Math.floor((camX - 200) / (ROOF_W + GAP_W));
        for (let k = first; k * (ROOF_W + GAP_W) < camX + w + 200; k++) {
          const rf = roofAt(k * 7 + r); const x = k * (ROOF_W + GAP_W) - camX;
          const top = rowY;
          ctx.fillStyle = rf.color; ctx.fillRect(x, top, ROOF_W, h - top);
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let ty = top; ty < h; ty += 10) for (let tx = x + ((ty - top) / 10 % 2) * 12; tx < x + ROOF_W; tx += 24) ctx.fillRect(tx, ty, 12, 2);
          ctx.fillStyle = '#2a1a2a'; ctx.fillRect(x - 6, top - 8, ROOF_W + 12, 10);
          ctx.fillStyle = '#ff8c42'; ctx.fillRect(x + 20, top - 30, 8, 20); ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x + 18, top - 26, 12, 8);
          ctx.fillStyle = 'rgba(255,200,120,0.08)'; ctx.fillRect(x + 6, top - 40, 36, 44);
          if (r === 0 && k % 3 === 1) { ctx.fillStyle = '#3a2a3a'; ctx.fillRect(x + 140, top - 40, 26, 40); ctx.fillStyle = '#e53935'; ctx.fillRect(x + 130, top - 44, 46, 6); }
        }
      }
      // башня Хокаге на финише
      const fx = Math.round(finishX - camX);
      ctx.fillStyle = '#b8503a'; ctx.fillRect(fx, baseY - 160, 160, h - baseY + 160);
      ctx.fillStyle = '#e8a060'; ctx.fillRect(fx - 10, baseY - 180, 180, 24); ctx.fillRect(fx + 10, baseY - 120, 140, 12);
      ctx.fillStyle = '#fff'; ctx.fillRect(fx + 60, baseY - 150, 40, 40); ctx.fillStyle = '#e53935'; ctx.font = "16px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('火', fx + 70, baseY - 140);
      ctx.fillStyle = '#21a038'; ctx.fillRect(fx + 70, baseY - 230, 4, 50); ctx.fillRect(fx + 74, baseY - 230, 36, 20);

      // сюрикены: летят через ряд, бегуны в этом ряду пригибаются
      shurikens.forEach((s) => {
        const age = time - s.at; if (age < 0 || age > 1.2) return;
        const sx = w + 40 - age * (w + 120), sy = baseY + s.row * rowH + rowH * 0.6 - sprH * 0.55;
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(age * 25); ctx.fillStyle = '#cfd8dc'; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillRect(-3, -14, 6, 14); } ctx.restore();
        if (age < 0.05 && onEvent) onEvent('whoosh');
      });

      // бегуны
      const orderDraw = [...runners.keys()].sort((a, b) => runners[a].row - runners[b].row);
      if (time - lastPuff > 0.08 && t < 1) { lastPuff = time; runners.forEach((r, i) => { const x = startX + ps[i] * L - camX; if (x > -50 && x < w + 50) particles.puff(x + 16 * scale, baseY + r.row * rowH + rowH * 0.6 - 4, time, rnd, 'rgba(200,190,220,0.5)'); }); }
      particles.draw(ctx, time);
      orderDraw.forEach((i) => {
        const r = runners[i];
        const worldX = startX + ps[i] * L; const x = Math.round(worldX - camX);
        if (x + sprW < -80 || x > w + 80) return;
        const rowY = baseY + r.row * rowH + rowH * 0.6;
        // прыжок над провалом: положение внутри пары крыша+провал
        const within = ((worldX % (ROOF_W + GAP_W)) + (ROOF_W + GAP_W)) % (ROOF_W + GAP_W);
        let jump = 0, slipping = false;
        if (within > ROOF_W - 30 && within < ROOF_W + GAP_W + 20) { const u = (within - (ROOF_W - 30)) / (GAP_W + 50); jump = Math.sin(u * Math.PI) * 70; }
        if (r.slipAt !== null && Math.abs(t - r.slipAt) < 0.035 && within > ROOF_W + GAP_W) { slipping = true; }
        const duck = shurikens.some((s) => s.row === r.row && time - s.at > 0.2 && time - s.at < 0.7);
        const y = Math.round(rowY - sprH + 4 - jump + (duck ? 10 : 0) + (slipping ? 14 : 0));
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 20 * scale, rowY - 3, 24 * scale, 3);
        const fr = t < 1 ? (jump > 5 ? 'run3' : slipping ? 'hurt0' : runFrame(time, 11 + r.f * 2, r.gait)) : (r.rank === 0 ? (Math.floor(time * 5) % 2 ? 'cheer' : 'cheer2') : 'stand-right');
        drawSprite(ctx, r.p.person, fr, x, y, scale);
        if (slipping) { ctx.fillStyle = '#ff5050'; ctx.font = "10px 'Press Start 2P', monospace"; ctx.fillText('!', x + sprW / 2, y - 26); }
        const first = t >= 1 && r.rank === 0;
        label(ctx, r.p.name, x + sprW / 2, y - 6, scale >= 3 ? 9 : 8, first ? '#ffd166' : '#f4ecd8', 'rgba(12,8,24,0.85)', first ? '#ffd166' : null);
      });
      drawAmbient(ctx, 'embers', w, h, time, 18, camX);
      if (t < 1) { const li = ps.indexOf(leader); const lx = Math.round(startX + ps[li] * L - camX); if (lx > 0 && lx < w) speedLines(ctx, lx - 6, baseY + runners[li].row * rowH + rowH * 0.6 - sprH * 0.6, 5, 28, 'rgba(200,200,255,0.5)'); }
      vignette(ctx, w, h, 0.45);
      ctx.restore();
      if (flashAt !== null && time - flashAt < 1.4) bigText(ctx, w, h, 'ХОКАГЕ!', time, '#ff6b6b');
      if (flashAt === null && leader >= 0.985) { flashAt = time; particles.burst(fx + 80, baseY - 180, time, rnd, { count: 80, speed: 280, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#fff'], life: 1.6 }); }
      if (flashAt !== null) { const a = Math.max(0, 0.8 - (time - flashAt) * 2); if (a > 0) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, w, h); } }
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
