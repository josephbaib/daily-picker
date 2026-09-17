import { drawSprite } from '../sprite.js?v=5271d64-1818';
import { mulberry32 } from '../rng.js?v=5271d64-1818';
import { makeParticles, threatTarget, stepRandom, nextFrame, cancelFrame, makeBuffer, plate, drawTiled, glow, lightPool, fogBank, pixLabel } from './scene.js?v=5271d64-1818';
import { drawActor, placeTags, fxFrame, threatMark, FX_ASSET, makeTitles } from './stage.js?v=5271d64-1818';
import { makeWarp, beginCamera, vignette, bigText } from './fx.js?v=5271d64-1818';

// Полигон: тренировка ниндзя в лесу. Метка цели прыгает между бойцами и замирает, потом
// прилетают сюрикены, огненный шар или клоны. Часть попаданий срывается: техника замены,
// вместо человека остаётся бревно. Последний на ногах говорит первым.
// Отрисовка по схеме docs/BENCHMARK.md и docs/STAGE.md: небо, горы, поляна и рамка плитами, дым, бревно, шар и клоны с листа.
const KINDS = ['shuriken', 'fireball', 'clones', 'kunai'];
const DIR = 'assets/scenes/training/';
const ASSETS = ['sky', 'far', 'mid', 'ground', 'fg', 'smoke', 'log', 'fireball', 'clone'].map((n) => DIR + n + '.png').concat([FX_ASSET]);
const SMOKE = { w: 88, h: 88 }, LOG = { w: 81, h: 81 }, FIRE = { w: 81, h: 81 }, CLONE = { w: 88, h: 88 };
/* паспорт света: сумерки, низкое закатное солнце справа, длинные тени влево, холодная тень */
const LIGHT = { id: 'training', mul: '236,216,226', tint: '255,120,60', tintK: 0.06, key: { dx: 1, dy: -1, rgb: '255,175,95', k: 0.6 }, shade: { rgb: '30,30,80', k: 0.35 }, warm: '255,170,80', shadow: 'rgba(10,10,40,0.42)', shadowLen: 5 };

export default {
  id: 'training',
  title: 'Полигон',
  cover: 'assets/covers/training.jpg',
  assets: ASSETS,
  description: 'Тренировочный полигон в лесу, где метка цели прыгает между ниндзя, а техника замены спасает не всех.',
  duration: 22,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#1e3a24'; ctx.fillRect(0, 0, w, h);
    const mid = plate(DIR + 'mid.png'); if (mid) ctx.drawImage(mid, 160, 0, 320, 360, 0, 0, w, h);
    people.slice(0, 3).forEach((p, i) => drawSprite(ctx, p.person, 'idle', 30 + i * 60, h * 0.45, 1.5));
  },

  play({ canvas, participants, order, seed, startAt, onFreeze, onEvent }) {
    const buffer = makeBuffer(canvas);
    const ctx = buffer.ctx;
    const img = (name) => plate(DIR + name + '.png');
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
    const warp = makeWarp(events.map((e) => e.at), n > 10 ? 0.2 : 0.35, 0.4);
    const particles = makeParticles();
    const titles = makeTitles();
    const dead = new Map();
    const logs = []; // брёвна после техники замены
    let start = null, raf = 0, stopped = false, fired = 0;
    const jit = participants.map(() => rnd() * 6.28);

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = typeof startAt === 'number' ? startAt : now;
      const t = warp(Math.max(0, now - start) / 1000);
      const { w, h } = buffer.fit();
      const x0 = Math.round((w - 640) / 2), yOff = h - 360;
      const cols = Math.ceil(Math.sqrt(n * 1.8)), rows = Math.ceil(n / cols);
      const cellW = Math.min(90, 420 / cols), rowH = rows > 1 ? Math.min(34, 92 / (rows - 1)) : 0;
      /* pos: левый верхний угол кадра 64×64, ноги на y + 62 */
      const pos = participants.map((p, i) => { const r = Math.floor(i / cols), c = i % cols; const inRow = Math.min(cols, n - r * cols); return { x: Math.round(x0 + 320 - (inRow * cellW) / 2 + c * cellW + cellW / 2 - 32 + ((r % 2) ? cellW * 0.18 : 0)), y: yOff + (rows > 1 ? 246 : 290) + Math.round(r * rowH) - 62, r }; });
      const idx = new Map(participants.map((p, i) => [p.id, i]));

      while (fired < events.length && t >= events[fired].at) { const ev = events[fired]; const i = idx.get(ev.id); dead.set(ev.id, { time: t, kind: ev.kind, side: ev.side, x: pos[i].x, y: pos[i].y }); fired++; if (onEvent) onEvent('pop'); }
      const cur = fired < events.length ? events[fired] : null;
      const alive = participants.filter((p) => !dead.has(p.id));
      const winner = fired === events.length && t >= finalAt - 2.6;
      let target = null, fakePhase = false;
      if (cur) {
        const fakeAt = cur.at - 1.3;
        if (cur.fake && t >= fakeAt - 1.6 && t < fakeAt + 0.6) { target = threatTarget(alive.map((p) => p.id), cur.fake, t, fakeAt - 1.6, fakeAt - 0.3, (kk) => sr(cur.seedIdx + kk)); fakePhase = t >= fakeAt; }
        else target = threatTarget(alive.map((p) => p.id), cur.id, t, cur.at - 1.5, cur.at - 0.45, (kk) => sr(cur.seedIdx + 100 + kk));
        if (cur.fake && t >= fakeAt && !cur.fakeDone) { cur.fakeDone = true; logs.push({ id: cur.fake, time: t, x: pos[idx.get(cur.fake)].x, y: pos[idx.get(cur.fake)].y }); if (onEvent) onEvent('whoosh'); }
      }

      beginCamera(ctx, w, h, t, events.slice(0, fired).map((e) => e.at), (i) => { const pi = idx.get(events[i].id); return { x: pos[pi].x + 32, y: pos[pi].y + 34 }; }, { level: 1.16, dur: 0.9, amp: 5 });

      // 1. НЕБО в сумерках, мерцание звёзд; 2. ГОРЫ с воротами в дымке, туман ползёт по долине
      ctx.fillStyle = '#16304a'; ctx.fillRect(0, 0, w, h);
      drawTiled(ctx, img('sky'), -x0, yOff - 60, w);
      for (let i = 0; i < 22; i++) { const tw = Math.sin(t * 2.5 + i * 1.9); if (tw < 0.5) continue; ctx.fillStyle = '#ffffff'; ctx.fillRect((i * 89) % w, (i * 37) % 90, 1, 1); }
      drawTiled(ctx, img('far'), -x0, yOff - 72, w); /* поднята, чтобы долина с воротами была видна между столбами над линией травы */
      for (let i = 0; i < 4; i++) fogBank(ctx, ((i * 230 + t * 6) % (w + 300)) - 150, yOff + 186 + (i % 2) * 12, 140, 6, 'rgba(170,190,230,0.14)');

      // 3. СРЕДНИЙ ПЛАН: деревья, тренировочные столбы, мишени, каменный фонарь и святилище со светом; 4. ПОЛЯНА
      drawTiled(ctx, img('mid'), -x0, yOff, w);
      glow(ctx, x0 + 513, yOff + 140, 30, '255,170,80', 0.45 + 0.12 * Math.sin(t * 7) * Math.sin(t * 3.1)); glow(ctx, x0 + 595, yOff + 130, 26, '255,190,110', 0.3 + 0.08 * Math.sin(t * 5 + 1));
      ctx.fillStyle = '#3c5626'; ctx.fillRect(0, yOff + 206, w, 40);
      drawTiled(ctx, img('ground'), -x0, yOff, w);
      lightPool(ctx, x0 + 513, yOff + 214, 70, 12, '255,160,80', 0.22);
      for (let i = 0; i < 9; i++) { const fx1 = x0 + 40 + ((i * 157 + Math.sin(t * 0.7 + i) * 40) % 560), fy1 = yOff + 150 + ((i * 61) % 150) + Math.sin(t * 1.3 + i * 2) * 8, a = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); if (a < 0.3) continue; glow(ctx, fx1, fy1, 6, '200,255,120', 0.5 * a); ctx.fillStyle = '#eaffb0'; ctx.fillRect(Math.round(fx1), Math.round(fy1), 1, 1); }

      // брёвна от техники замены: падают кадрами с листа и остаются лежать
      const logImg = img('log'), smoke = img('smoke'), fire = img('fireball'), clone = img('clone');
      const drawSmoke = (cx, cy, age, dur) => { if (!smoke || age < 0 || age >= dur) return; ctx.drawImage(smoke, Math.min(5, Math.floor((age / dur) * 6)) * SMOKE.w, 0, SMOKE.w, SMOKE.h, Math.round(cx - SMOKE.w / 2), Math.round(cy - SMOKE.h / 2), SMOKE.w, SMOKE.h); };

      // 5. БОЙЦЫ по рядам: свет заката, метка угрозы, снаряды с листа, попадания и замены
      const labels = [], marks = []; /* знаки угрозы рисуются после подписей, чтобы их не закрывали имена соседей */
      [...participants.keys()].sort((a, b) => pos[a].r - pos[b].r).forEach((i) => {
        const p = participants[i], { x, y } = pos[i];
        const lg = logs.find((q) => q.id === p.id), lgAge = lg ? t - lg.time : -1;
        if (lg && logImg) { const fr = Math.min(5, Math.floor(lgAge / 0.1)); ctx.drawImage(logImg, fr * LOG.w, 0, LOG.w, LOG.h, x + 32 - LOG.w / 2 + 34, y + 64 - LOG.h + 4, LOG.w, LOG.h); }
        const d = dead.get(p.id);
        if (d) {
          const age = t - d.time;
          if (age > 1.5) return;
          if (age < 1.05) drawActor(ctx, p.person, 'hurt' + Math.min(5, Math.floor(age * 5)), x + (age < 0.3 ? Math.round(Math.sin(age * 60) * 2) : 0), y, LIGHT);
          if (d.kind === 'fireball') { if (age < 0.5) { fxFrame(ctx, 'spark', (age / 0.5) * 6, x + 32, y + 34, 2); glow(ctx, x + 32, y + 34, 70, '255,140,50', 0.6 * (1 - age / 0.5)); } }
          else if (d.kind === 'clones') { if (clone) for (let c = -1; c <= 1; c += 2) { const fr = Math.min(5, 1 + Math.floor(age / 0.18)); ctx.save(); ctx.translate(x + 32 + c * 30, y - 12); if (c > 0) ctx.scale(-1, 1); ctx.drawImage(clone, fr * CLONE.w, 0, CLONE.w, CLONE.h, -CLONE.w / 2, 0, CLONE.w, CLONE.h); ctx.restore(); } }
          if (age < 0.28) fxFrame(ctx, 'flash', (age / 0.28) * 6, x + 32, y + 30, 2);
          drawSmoke(x + 32, y + 36, age - 0.95, 0.55);
          return;
        }
        if (cur && cur.id === p.id && t > cur.at - 0.45 && (cur.kind === 'shuriken' || cur.kind === 'kunai')) { const u = (t - (cur.at - 0.45)) / 0.45; const tx = x + 32, sx = cur.side < 0 ? -30 + u * (tx + 30) : w + 30 - u * (w + 30 - tx), sy = y + 30; ctx.fillStyle = 'rgba(230,240,255,0.4)'; ctx.fillRect(Math.round(sx) + (cur.side < 0 ? -34 : 8), sy, 26, 1); fxFrame(ctx, 'shuriken', (t * 24) % 6, sx, sy, 1, 1, LIGHT); }
        if (cur && cur.id === p.id && t > cur.at - 0.6 && cur.kind === 'fireball' && fire) { const u = (t - (cur.at - 0.6)) / 0.6; const tx = x + 32, sx = cur.side < 0 ? -50 + u * (tx + 50) : w + 50 - u * (w + 50 - tx), sy = y + 32; ctx.save(); ctx.translate(Math.round(sx), sy - FIRE.h / 2); if (cur.side > 0) ctx.scale(-1, 1); ctx.drawImage(fire, (1 + Math.floor(t * 12) % 3) * FIRE.w, 0, FIRE.w, FIRE.h, -FIRE.w + 16, 0, FIRE.w, FIRE.h); ctx.restore(); glow(ctx, sx, sy, 46, '255,140,50', 0.5); }
        if (cur && cur.id === p.id && t > cur.at - 0.7 && cur.kind === 'clones' && clone) { const u = (t - (cur.at - 0.7)) / 0.7; for (let c = -1; c <= 1; c += 2) { ctx.save(); ctx.translate(x + 32 + c * (70 - u * 40), y - 12); if (c > 0) ctx.scale(-1, 1); ctx.drawImage(clone, Math.min(3, Math.floor(u * 4)) * CLONE.w, 0, CLONE.w, CLONE.h, -CLONE.w / 2, 0, CLONE.w, CLONE.h); ctx.restore(); } }
        const hidden = lg && lgAge < 0.9;
        if (hidden) { drawSmoke(x + 32, y + 36, lgAge, 0.6); return; }
        if (lg && lgAge < 1.4) drawSmoke(x + 32, y + 36, lgAge - 0.9, 0.5);
        const bob = Math.round(Math.sin(t * 5 + jit[i]) * 1);
        const nervous = target === p.id ? Math.round(Math.sin(t * 40 + i) * 1.2) : 0;
        const hop = winner ? Math.round(Math.abs(Math.sin(t * 6)) * 4) : 0;
        drawActor(ctx, p.person, winner ? (Math.floor(t * 5) % 2 ? 'cheer' : 'cheer2') : 'idle', x + nervous, y + bob, LIGHT, { lift: hop });
        if (target === p.id && !winner) marks.push([x + 32, y + 12, t, fakePhase ? '#ffd166' : '#ff5050', 'shuriken']);
        labels.push({ text: p.name, cx: x + 32, y: y - hop - (target === p.id ? 30 : 2), index: i, gold: winner });
      });
      placeTags(ctx, labels);
      marks.forEach((mk) => threatMark(ctx, ...mk));
      particles.draw(ctx, t);
      for (let i = 0; i < 5; i++) { const lx = ((i * 131 - t * 22 + Math.sin(t * 1.4 + i) * 18) % (w + 80) + w + 80) % (w + 80) - 40, ly = ((i * 83 + t * 28) % (h + 40)) - 20; fxFrame(ctx, 'leaf', (t * 5 + i * 2) % 6, lx, ly, 1, 0.9, LIGHT); }
      glow(ctx, x0 + 400, yOff + 170, 260, '255,130,60', 0.08);
      ctx.restore();

      // рамка переднего плана вне камеры: ветка и верёвка с бумажными лентами сверху, трава по нижним углам
      const fg = img('fg');
      if (fg) { const sway = Math.round(Math.sin(t * 0.9) * 1.5); ctx.drawImage(fg, 0, 0, 320, 360, sway, yOff, 320, 360); ctx.drawImage(fg, 320, 0, 320, 360, w - 320 - sway, yOff, 320, 360); }
      vignette(ctx, w, h, 0.45);
      const lastLog = logs.length ? logs[logs.length - 1] : null;
      if (lastLog && t - lastLog.time < 0.9) titles.show(ctx, w, h, 'ЗАМЕНА!', t, 'gold');
      else if (fired > 0 && t - events[fired - 1].at < 0.9) titles.show(ctx, w, h, 'ПОПАЛ!', t, 'danger');
      if (winner) titles.show(ctx, w, h, 'ВЫСТОЯЛ!', t, 'gold');
      pixLabel(ctx, `ОСТАЛОСЬ ${alive.length}`, w - 56, 8, '#ffd166', '#ffd166');
      buffer.blit();
      if (t >= finalAt) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
