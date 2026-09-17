import { drawSprite, runFrame } from '../sprite.js?v=ddff8ed-1653';
import { mulberry32 } from '../rng.js?v=ddff8ed-1653';
import { makeParticles, nextFrame, cancelFrame, makeBuffer, plate, drawTiled, glow } from './scene.js?v=ddff8ed-1653';
import { drawActor, placeTags, makeFx, fxFrame, FX_ASSET } from './stage.js?v=ddff8ed-1653';
import { beginCamera, vignette, bigText } from './fx.js?v=ddff8ed-1653';

// Забег на стадионе на закате: одна дорожка, бегуны в несколько рядов в глубину, камера за лидером.
// Собрано по схеме docs/BENCHMARK.md и docs/STAGE.md: небо, город с мачтами, трибуны, дорожка, финишная арка, камеры на переднем плане.
const DIR = 'assets/scenes/race/';
const ASSETS = ['sky', 'far', 'stands', 'track', 'finish', 'fg', 'flag', 'cannon'].map((n) => DIR + n + '.png').concat([FX_ASSET]);
const START_X = 60, L = 1664, FINISH_X = START_X + L;
const TRACK_Y = 40, STANDS_Y = -137, FAR_Y = -170, SKY_Y = -150, GANTRY_Y = -62; /* вертикальные сдвиги плит относительно низа кадра */
const FLAG = { w: 62, h: 46 }, CANNON = { w: 69, h: 51 };
const STAND_LAMPS = [[30, 174], [600, 174]], FAR_LAMPS = [[32, 176], [147, 196], [481, 198], [608, 176]];
const BANNERS = [[85, 300, 120, 'B2Bсосы'], [410, 300, 90, 'СБЕР']]; /* пустые белые баннеры на стене трибун: x, y, ширина, надпись */
/* паспорт света: закат за стадионом и прожекторы сверху, тёплая кромка слева сверху, фиолетовая тень */
const LIGHT = { id: 'race', mul: '255,228,220', tint: '255,140,90', tintK: 0.07, key: { dx: -1, dy: -1, rgb: '255,205,140', k: 0.6 }, shade: { rgb: '70,30,100', k: 0.3 }, warm: '255,200,120', shadow: 'rgba(60,10,30,0.4)', shadowLen: 2 };
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export default {
  id: 'race',
  title: 'Забег',
  cover: 'assets/covers/race.jpg',
  assets: ASSETS,
  description: 'Полный стадион, ревущие трибуны и одна финишная лента, за которой ждёт право сказать первое слово.',
  duration: 13,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#3a2060'; ctx.fillRect(0, 0, w, h);
    const tr = plate(DIR + 'track.png'); if (tr) ctx.drawImage(tr, 0, 150, 320, 210, 0, h - 105, 160, 105);
    people.slice(0, 3).forEach((p, i) => drawSprite(ctx, p.person, runFrame(t, 10, i), 20 + i * 50, h * 0.4 + i * 10, 1.5));
  },

  play({ canvas, participants, order, seed, onFreeze }) {
    const buffer = makeBuffer(canvas);
    const ctx = buffer.ctx;
    const n = participants.length;
    const rank = new Map(order.map((id, i) => [id, i]));
    const rnd = mulberry32(seed);
    const rows = Math.min(n, 5);
    const runners = participants.map((p, i) => ({
      p, rank: rank.get(p.id), row: i % rows,
      final: 1 - rank.get(p.id) * (0.22 / n),
      f: 1.1 + rnd() * 1.3, phase: rnd() * Math.PI * 2, amp: 0.07 + rnd() * 0.07, gait: rnd() * 8, lastDust: 0,
    }));
    const particles = makeParticles();
    const fx = makeFx();
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, flashAt = null;
    const progress = (r, t) => { const ease = 1 - Math.pow(1 - t, 2.4); const noise = r.amp * Math.sin(2 * Math.PI * (r.f * t + r.phase)) * Math.pow(1 - t, 1.6) * Math.pow(t, 0.5); return Math.max(0, Math.min(r.final, r.final * ease + noise)); };
    const img = (name) => plate(DIR + name + '.png');

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const time = (now - start) / 1000, t = Math.min(1, time / dur);
      const { w, h } = buffer.fit();
      const yOff = h - 360;
      const ps = runners.map((r) => progress(r, t));
      const leader = Math.max(...ps);
      const camMax = FINISH_X - w * 0.68;
      const camX = Math.round(Math.max(0, Math.min(camMax, START_X + leader * L - w * 0.55)) + Math.sin(time * 0.6) * 1.2);
      const feetY = (row) => yOff + (rows === 1 ? 300 : 254 + Math.round(row * (92 / (rows - 1))));
      const flick = (i) => 0.85 + 0.15 * Math.sin(time * 9 + i * 2.3) * Math.sin(time * 3.7 + i);
      const finX = FINISH_X - camX;
      beginCamera(ctx, w, h, time, flashAt !== null ? [flashAt] : [], () => ({ x: finX, y: yOff + 290 }), { level: 1.12, dur: 1.1, amp: 4 });

      // 1. НЕБО на закате и салют после финиша
      ctx.fillStyle = '#2a1850'; ctx.fillRect(0, 0, w, h);
      const sky = img('sky'); if (sky) ctx.drawImage(sky, Math.round(-30 - camX * 0.015), yOff + SKY_Y);
      if (flashAt !== null) for (let k = 0; k < 9; k++) { const born = flashAt + 0.15 + k * 0.28, age = time - born; if (age < 0 || age > 0.7) continue; fxFrame(ctx, 'spark', (age / 0.7) * 6, 40 + hash(k + seed % 97) * (w - 80), 14 + hash(k * 3 + 1) * 60, 2); glow(ctx, 40 + hash(k + seed % 97) * (w - 80), 14 + hash(k * 3 + 1) * 60, 60, '255,190,90', 0.35 * (1 - age / 0.7)); }

      // 2. ДАЛЬНИЙ ПЛАН: город и мачты освещения, лампы дышат
      const farScroll = camX * 0.1;
      drawTiled(ctx, img('far'), farScroll, yOff + FAR_Y, w);
      for (let k = Math.floor(farScroll / 640); k * 640 - farScroll < w; k++) FAR_LAMPS.forEach(([lx, ly], i) => glow(ctx, k * 640 - farScroll + (((k % 2) + 2) % 2 ? 640 - lx : lx), yOff + FAR_Y + ly, 26, '255,210,140', 0.4 * flick(i + k)));

      // 3. ТРИБУНЫ: надписи на пустых баннерах, прожекторы, вспышки фотоаппаратов в толпе
      const stScroll = camX * 0.5, stands = img('stands');
      drawTiled(ctx, stands, stScroll, yOff + STANDS_Y, w);
      ctx.font = "8px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
      for (let k = Math.floor(stScroll / 640); k * 640 - stScroll < w; k++) {
        const x = Math.round(k * 640 - stScroll), mir = ((k % 2) + 2) % 2 === 1;
        BANNERS.forEach(([bx, by, bw, text]) => { ctx.fillStyle = '#1d6b35'; ctx.fillText(text, x + (mir ? 640 - bx - bw : bx) + bw / 2, yOff + STANDS_Y + by + 6); });
        STAND_LAMPS.forEach(([lx, ly], i) => { glow(ctx, x + (mir ? 640 - lx : lx), yOff + STANDS_Y + ly, 44, '255,225,170', 0.5 * flick(i + k * 2 + 7)); });
      }
      ctx.textAlign = 'left';
      for (let s = Math.floor(time / 0.09) - 3; s <= Math.floor(time / 0.09); s++) { const age = time - s * 0.09; if (age < 0 || age > 0.28) continue; const wx = hash(s * 7 + 3) * (FINISH_X + 700), x = wx - stScroll; if (x < -20 || x > w + 20) continue; fxFrame(ctx, 'flash', (age / 0.28) * 6, x, yOff + STANDS_Y + 232 + hash(s * 13) * 52, 1); }

      // 4. ДОРОЖКА, флажки на бровке, финишная арка с часами и надписью, финишная черта
      drawTiled(ctx, img('track'), camX, yOff + TRACK_Y, w);
      const flag = img('flag');
      if (flag) for (let k = Math.floor((camX - 100) / 260); k * 260 < camX + w + 100; k++) { if (k < 0) continue; ctx.drawImage(flag, (Math.floor(time * 7 + k) % 4) * FLAG.w, 0, FLAG.w, FLAG.h, Math.round(k * 260 + 30 - camX), yOff + TRACK_Y + 190 - FLAG.h, FLAG.w, FLAG.h); }
      const gantry = img('finish');
      if (gantry && finX < w + 340) {
        const gx = Math.round(finX - 320), gy = yOff + GANTRY_Y;
        ctx.drawImage(gantry, gx, gy);
        ctx.textAlign = 'center'; ctx.font = "16px 'Press Start 2P', monospace"; ctx.fillStyle = '#1d6b35'; ctx.fillText('B2Bсосы', gx + 322, gy + 82);
        ctx.font = "8px 'Press Start 2P', monospace"; ctx.fillStyle = '#ffb347'; ctx.fillText((flashAt !== null ? flashAt : time).toFixed(1).padStart(4, '0'), gx + 320, gy + 144); ctx.textAlign = 'left';
        glow(ctx, gx + 140, gy + 55, 50, '255,225,170', 0.45 * flick(31)); glow(ctx, gx + 500, gy + 55, 50, '255,225,170', 0.45 * flick(32));
        for (let y = yOff + TRACK_Y + 196; y < h; y += 4) { ctx.fillStyle = (Math.floor((y - yOff) / 4) % 2) ? '#f4f4f4' : '#22222c'; ctx.fillRect(Math.round(finX) - 2, y, 2, 4); ctx.fillStyle = (Math.floor((y - yOff) / 4) % 2) ? '#22222c' : '#f4f4f4'; ctx.fillRect(Math.round(finX), y, 2, 4); }
        const cannon = img('cannon');
        if (cannon) [-170, 110].forEach((dx, i) => { const age = flashAt === null ? -1 : time - flashAt - i * 0.12, f = age < 0 ? 0 : age < 0.6 ? 1 + Math.floor((age / 0.6) * 3) % 3 : 0; ctx.save(); if (i) { ctx.translate(Math.round(finX + dx) + CANNON.w, yOff + 236 - CANNON.h); ctx.scale(-1, 1); } else ctx.translate(Math.round(finX + dx), yOff + 236 - CANNON.h); ctx.drawImage(cannon, f * CANNON.w, 0, CANNON.w, CANNON.h, 0, 0, CANNON.w, CANNON.h); ctx.restore(); });
      }

      // 5. БЕГУНЫ: пыль с листа эффектов из-под ног, свет сцены, имена без плашек
      fx.draw(ctx, time, camX, 0, LIGHT);
      const labels = [];
      [...runners.keys()].sort((a, b) => runners[a].row - runners[b].row).forEach((i) => {
        const r = runners[i]; const worldX = START_X + ps[i] * L; const x = Math.round(worldX - camX) - 32;
        const fy = feetY(r.row);
        if (t < 1 && time - r.lastDust > 0.34 + r.row * 0.02) { r.lastDust = time; fx.spawn('dust', worldX - 14, fy - 6, time, { dur: 0.36, vx: -40 }); }
        if (x < -80 || x > w + 20) return;
        const first = t >= 1 && r.rank === 0;
        const hop = first ? Math.round(Math.abs(Math.sin(time * 6)) * 4) : 0;
        const fr = t < 1 ? runFrame(time, 11 + r.f * 2, r.gait) : (r.rank === 0 ? (Math.floor(time * 5) % 2 ? 'cheer' : 'cheer2') : 'stand-right');
        drawActor(ctx, r.p.person, fr, x, fy - 62, LIGHT, { lift: hop });
        labels[i] = { text: r.p.name, cx: x + 32, y: fy - 62 - hop + 4, index: i, gold: first };
      });
      particles.draw(ctx, time);
      placeTags(ctx, labels.filter(Boolean));

      // 6. ПЕРЕДНИЙ ПЛАН: телекамеры, объективы и флажки прессы проходят у нижнего края кадра быстрее сцены
      const fg = img('fg');
      if (fg) drawTiled(ctx, fg, camX * (2560 / camMax) + 560, yOff + 60, w);
      glow(ctx, w * 0.5, yOff + 60, 300, '255,140,80', 0.10); /* тёплая закатная дымка над трибунами */
      vignette(ctx, w, h, 0.4);
      if (flashAt !== null) { const warm = Math.max(0, 0.35 - (time - flashAt) * 0.7); if (warm > 0) { ctx.fillStyle = `rgba(255,220,160,${warm.toFixed(2)})`; ctx.fillRect(0, 0, w, h); } }
      ctx.restore();
      if (flashAt !== null && time - flashAt < 1.6) bigText(ctx, w, h, 'ФИНИШ!', time, '#ffd166', 24);
      if (flashAt === null && leader >= 0.985) { flashAt = time; [-150, 150].forEach((dx) => particles.burst(finX + dx, yOff + 200, time, rnd, { count: 50, speed: 170, colors: ['#21a038', '#ffffff', '#ffd166', '#2fc24f'], life: 1.8, gravity: 120, size: 2 })); }
      buffer.blit();
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
