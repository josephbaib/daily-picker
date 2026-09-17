import { drawSprite } from '../sprite.js?v=66513dd-1803';
import { mulberry32 } from '../rng.js?v=66513dd-1803';
import { makeParticles, threatTarget, stepRandom, nextFrame, cancelFrame, makeBuffer, plate, drawTiled, glow } from './scene.js?v=66513dd-1803';
import { drawActor, placeTags, fxFrame, threatMark, FX_ASSET } from './stage.js?v=66513dd-1803';
import { makeWarp, beginCamera, vignette, bigText } from './fx.js?v=66513dd-1803';

// Особняк: команда заперта в старом доме, каждый раунд кого-то забирает дом. Последний выживший говорит первым.
// Отрисовка по схеме docs/BENCHMARK.md и docs/STAGE.md: зал и его версия во вспышке молнии плитами, призрак, руки, свеча и чудовище с листа.
const KINDS = ['hands', 'ghost', 'chandelier', 'blackout', 'monster'];
const DIR = 'assets/scenes/horror/';
const ASSETS = ['hall', 'flash', 'chandelier', 'fg', 'ghost', 'hands', 'candle', 'monster'].map((n) => DIR + n + '.png').concat([FX_ASSET]);
const GHOST = { w: 95, h: 87 }, HANDS = { w: 70, h: 64 }, CANDLE = { w: 38, h: 35 }, MONSTER = { w: 133, h: 121 };
const CANDLES = [[12, 252, 26], [28, 265, 26], [33, 182, 16], [41, 180, 16], [49, 186, 16], [173, 72, 14], [245, 185, 14], [283, 148, 10], [355, 148, 10], [393, 186, 14], [467, 70, 14], [473, 210, 12], [590, 188, 16], [598, 182, 16], [606, 190, 16], [612, 268, 26], [628, 255, 26], [320, 14, 40]];
/* паспорт света: тёмный зал, холодный лунный свет из окон сверху, тёплый свет канделябров по краям */
const LIGHT = { id: 'horror', mul: '172,162,205', tint: '30,10,60', tintK: 0.12, key: { dx: 0, dy: -1, rgb: '170,190,255', k: 0.45 }, shade: { rgb: '6,4,20', k: 0.45 }, warm: '255,150,60', warmEdge: '255,200,120', shadow: 'rgba(2,0,10,0.55)', shadowLen: 0 };

export default {
  id: 'horror',
  title: 'Особняк',
  cover: 'assets/covers/horror.jpg',
  assets: ASSETS,
  description: 'Старый особняк заперт на ночь, и дом забирает команду по одному, пока не останется тот, кому говорить первым.',
  duration: 20,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#0a0814'; ctx.fillRect(0, 0, w, h);
    const hall = plate(DIR + 'hall.png'); if (hall) ctx.drawImage(hall, 160, 0, 320, 360, 0, 0, w, h);
    people.slice(0, 3).forEach((p, i) => drawSprite(ctx, p.person, 'idle', 30 + i * 60, h * 0.5, 1.5));
  },

  play({ canvas, participants, order, seed, startAt, onFreeze, onEvent }) {
    const buffer = makeBuffer(canvas);
    const ctx = buffer.ctx;
    const img = (name) => plate(DIR + name + '.png');
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
      if (start === null) start = (typeof startAt === 'number' && startAt < now) ? startAt : now;
      const t = warp((now - start) / 1000);
      const { w, h } = buffer.fit();
      const x0 = Math.round((w - 640) / 2), yOff = h - 360;
      const cols = Math.ceil(Math.sqrt(n * 1.8)), rows = Math.ceil(n / cols);
      const cellW = Math.min(88, 440 / cols), rowH = rows > 1 ? Math.min(30, 68 / (rows - 1)) : 0;
      /* pos: левый верхний угол кадра 64×64, ноги на y + 62 */
      const pos = participants.map((p, i) => { const r = Math.floor(i / cols), c = i % cols; const inRow = Math.min(cols, n - r * cols); return { x: Math.round(x0 + 320 - (inRow * cellW) / 2 + c * cellW + cellW / 2 - 32 + ((r % 2) ? cellW * 0.18 : 0)), y: yOff + (rows > 1 ? 280 : 306) + Math.round(r * rowH) - 62, r }; });

      while (fired < events.length && t >= events[fired].at) {
        const ev = events[fired]; const i = participants.findIndex((p) => p.id === ev.id);
        dead.set(ev.id, { time: t, kind: ev.kind, x: pos[i].x, y: pos[i].y, side: ev.side });
        fired++;
        if (onEvent) onEvent(ev.kind === 'chandelier' ? 'pop' : 'whoosh');
      }
      const next = fired < events.length ? events[fired] : null;
      const dread = next && t > next.at - 1.2;
      const aliveIds = participants.filter((p) => !dead.has(p.id)).map((p) => p.id);
      const threat = next ? threatTarget(aliveIds, next.id, t, next.at - 1.6, next.at - 0.4, (kk) => sr(fired * 37 + kk)) : null;
      const blackoutD = [...dead.values()].find((d) => d.kind === 'blackout' && t - d.time < 0.7), blackout = !!blackoutD;
      if (next && next.kind !== 'blackout' && t > next.at - 0.35 && lastFlash < next.at - 1) lastFlash = t;
      const flashAge = t - lastFlash;
      const winner = fired === events.length && t >= finalAt - 2.6;
      const flick = (i) => 0.75 + 0.25 * Math.sin(t * 9 + i * 2.3) * Math.sin(t * 3.7 + i);

      beginCamera(ctx, w, h, t, events.slice(0, fired).map((e) => e.at), (i) => { const pi = participants.findIndex((p) => p.id === events[i].id); return { x: pos[pi].x + 32, y: pos[pi].y + 34 }; }, { level: 1.16, dur: 0.9, amp: 5 });

      // 1. ЗАЛ: основная плита, во вспышке молнии поверх ложится вторая плита с холодным светом и тенями рам на ковре
      ctx.fillStyle = '#07060e'; ctx.fillRect(0, 0, w, h);
      drawTiled(ctx, img('hall'), -x0, yOff, w);
      if (flashAge < 0.5) { ctx.globalAlpha = flashAge < 0.12 ? 1 : Math.max(0, 1 - (flashAge - 0.12) / 0.38); drawTiled(ctx, img('flash'), -x0, yOff, w); ctx.globalAlpha = 1; }
      glow(ctx, x0 + 232, yOff + 48, 40, '170,200,255', 0.22 + 0.05 * Math.sin(t * 0.9));
      if (!blackout) CANDLES.forEach(([cx, cy, r], i) => glow(ctx, x0 + cx, yOff + cy, r, '255,160,70', 0.32 * flick(i)));
      /* призрак-жилец иногда проплывает по лестнице, пылинки в лунном свете */
      const ghost = img('ghost'), hands = img('hands'), candle = img('candle'), monster = img('monster'), chand = img('chandelier');
      { const cyc = (t * 0.07) % 1; if (ghost && cyc < 0.5 && !winner) { ctx.globalAlpha = 0.22 * Math.sin((cyc / 0.5) * Math.PI); ctx.drawImage(ghost, (Math.floor(t * 3) % 2) * GHOST.w, 0, GHOST.w, GHOST.h, Math.round(x0 + 200 + cyc * 480), yOff + 120 + Math.round(Math.sin(t * 1.5) * 6), GHOST.w, GHOST.h); ctx.globalAlpha = 1; } }
      for (let i = 0; i < 26; i++) { const dx = ((i * 97 + t * 5 + Math.sin(t * 0.6 + i) * 12) % (w + 40)) - 20, dy = ((i * 61 + t * 4) % 240) + 10; ctx.fillStyle = `rgba(200,210,255,${(0.18 + 0.18 * Math.sin(t * 2 + i)).toFixed(2)})`; ctx.fillRect(Math.round(dx), Math.round(dy), 1, 1); }
      if (dread && !winner) { ctx.fillStyle = `rgba(0,0,12,${(0.34 + 0.1 * Math.sin(t * 9)).toFixed(2)})`; ctx.fillRect(0, 0, w, h); }

      // 2. На месте пропавших остаётся свеча; в темноте она гаснет
      participants.forEach((p) => { const d = dead.get(p.id); if (!d || t - d.time < 1.3 || !candle) return; const fr = blackout ? 3 : Math.floor(t * 6 + d.x) % 2; ctx.drawImage(candle, fr * CANDLE.w, 0, CANDLE.w, CANDLE.h, d.x + 32 - CANDLE.w / 2, d.y + 64 - CANDLE.h, CANDLE.w, CANDLE.h); if (!blackout) glow(ctx, d.x + 32, d.y + 40, 18, '255,160,70', 0.4 * flick(d.x)); });

      // 3. КОМАНДА по рядам: лунный свет сверху, тёплый от канделябров по краям зала, метка угрозы
      const labels = [];
      [...participants.keys()].sort((a, b) => pos[a].r - pos[b].r).forEach((i) => {
        const p = participants[i], { x, y } = pos[i];
        const near = Math.min(x + 32 - x0 - 20, x0 + 620 - x - 32), warm = near < 60 ? 3 : near < 110 ? 2 : near < 170 ? 1 : 0, warmSide = x + 32 < x0 + 320 ? -1 : 1;
        const d = dead.get(p.id);
        if (d) {
          const age = t - d.time; if (age > 1.3) return;
          const k2 = Math.min(1, age / 1.0);
          if (d.kind === 'hands') {
            const sink = Math.round(k2 * 58);
            ctx.save(); ctx.beginPath(); ctx.rect(x - 10, y - 20, 84, 82 - 0); ctx.clip(); drawActor(ctx, p.person, 'cheer', x + Math.round(Math.sin(t * 40) * 1), y + sink, LIGHT, { shadow: false }); ctx.restore();
            if (hands) [-22, 0, 22].forEach((dx, q) => { const fr = Math.min(3, Math.floor((age + q * 0.06) / 0.14)); ctx.drawImage(hands, fr * HANDS.w, 0, HANDS.w, HANDS.h, x + 32 + dx - HANDS.w / 2, y + 66 - HANDS.h, HANDS.w, HANDS.h); });
          } else if (d.kind === 'ghost') {
            const lift = Math.round(k2 * k2 * 110), gx = x + 32 + d.side * (1 - Math.min(1, age / 0.35)) * 260;
            if (k2 < 0.95) { ctx.globalAlpha = 1 - k2 * 0.8; drawActor(ctx, p.person, 'cheer', x, y - lift, LIGHT, { shadow: false }); ctx.globalAlpha = 1; }
            if (ghost) { ctx.globalAlpha = 0.85; ctx.save(); ctx.translate(Math.round(gx), y - lift - 22 + Math.round(Math.sin(t * 8) * 3)); if (d.side < 0) ctx.scale(-1, 1); ctx.drawImage(ghost, (k2 > 0.75 ? 2 + (k2 > 0.9 ? 1 : 0) : Math.floor(t * 6) % 2) * GHOST.w, 0, GHOST.w, GHOST.h, -GHOST.w / 2, 0, GHOST.w, GHOST.h); ctx.restore(); ctx.globalAlpha = 1; glow(ctx, gx, y - lift + 20, 50, '170,220,255', 0.3 * (1 - k2)); }
          } else if (d.kind === 'chandelier') {
            const fall = Math.min(1, age / 0.3), cy = -130 + fall * fall * (y + 62 - 100 + 130);
            if (age < 0.3) drawActor(ctx, p.person, 'idle', x, y, LIGHT);
            else { drawActor(ctx, p.person, 'hurt' + Math.min(5, Math.floor((age - 0.3) * 12)), x, y, LIGHT, { shadow: false }); if (age < 0.62) { fxFrame(ctx, 'ring', ((age - 0.3) / 0.32) * 6, x + 32, y + 58, 1, 1, LIGHT); fxFrame(ctx, 'spark', ((age - 0.3) / 0.32) * 6, x + 32, y + 30, 2); } }
            if (chand) { ctx.globalAlpha = age > 1.0 ? Math.max(0, 1 - (age - 1.0) / 0.3) : 1; ctx.drawImage(chand, x + 32 - 57, Math.round(cy)); ctx.globalAlpha = 1; }
          } else if (d.kind === 'monster') {
            const mx = d.side < 0 ? -140 + k2 * (w + 280) : w + 140 - k2 * (w + 280), passed = d.side < 0 ? mx > x + 20 : mx < x + 44;
            if (!passed) drawActor(ctx, p.person, 'cheer', x + Math.round(Math.sin(t * 40) * 2), y, LIGHT);
            if (monster) { ctx.save(); ctx.translate(Math.round(mx), y - 46); if (d.side > 0) ctx.scale(-1, 1); const dist = Math.abs(mx - x - 32); ctx.drawImage(monster, (dist < 70 ? 3 : dist < 140 ? 2 : dist < 220 ? 1 : 0) * MONSTER.w, 0, MONSTER.w, MONSTER.h, -MONSTER.w / 2, 0, MONSTER.w, MONSTER.h); ctx.restore(); }
          }
          return;
        }
        if (blackout) return;
        const nervous = dread ? Math.round(Math.sin(t * 40 + i * 1.7) * 1.2) : 0;
        const bob = Math.round(Math.sin(t * 5 + jitter[i]) * 1);
        const hop = winner ? Math.round(Math.abs(Math.sin(t * 6)) * 4) : 0;
        drawActor(ctx, p.person, winner ? (Math.floor(t * 6) % 2 ? 'cheer' : 'cheer2') : 'idle', x + nervous, y + bob, LIGHT, { warm, warmSide, lift: hop });
        if (threat === p.id && !winner) threatMark(ctx, x + 32, y + 12, t);
        labels.push({ text: p.name, cx: x + 32, y: y - hop - (threat === p.id ? 12 : 2), index: i, gold: winner });
      });
      placeTags(ctx, labels);
      particles.draw(ctx, t);
      if (winner) { glow(ctx, x0 + 320, yOff + 60, 320, '255,220,160', 0.22); }
      ctx.restore();

      // 4. ТЕМНОТА: гаснет всё, в черноте горят глаза; вспышка молнии; рамка переднего плана вне камеры
      if (blackout) { ctx.fillStyle = '#020108'; ctx.fillRect(0, 0, w, h); if (Math.floor(t * 10) % 2) { ctx.fillStyle = '#ff2a2a'; ctx.fillRect(blackoutD.x + 22, blackoutD.y + 26, 4, 3); ctx.fillRect(blackoutD.x + 38, blackoutD.y + 26, 4, 3); glow(ctx, blackoutD.x + 32, blackoutD.y + 27, 26, '255,40,40', 0.5); } }
      if (flashAge < 0.1) { ctx.fillStyle = 'rgba(220,230,255,0.3)'; ctx.fillRect(0, 0, w, h); }
      const fg = img('fg');
      if (fg && !blackout) { ctx.drawImage(fg, 0, 0, 320, 360, 0, yOff, 320, 360); ctx.drawImage(fg, 320, 0, 320, 360, w - 320, yOff, 320, 360); glow(ctx, w - 640 + 610, yOff + 290, 40, '255,160,70', 0.4 * flick(77)); }
      vignette(ctx, w, h, 0.7);
      if (fired > 0 && t - events[fired - 1].at < 1.0 && !winner) bigText(ctx, w, h, ['УТАЩИЛИ!', 'ПРИЗРАК!', 'ЛЮСТРА!', 'ТЕМНОТА!', 'МОНСТР!'][KINDS.indexOf(events[fired - 1].kind)] || 'ПРОПАЛ!', t, '#ff5050', 24);
      if (winner) bigText(ctx, w, h, 'ВЫЖИЛ!', t, '#ffd166', 24);
      buffer.blit();
      if (t >= finalAt) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
