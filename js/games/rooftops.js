import { drawSprite, runFrame } from '../sprite.js?v=66513dd-1803';
import { mulberry32 } from '../rng.js?v=66513dd-1803';
import { skyLayer, makeParticles, nextFrame, cancelFrame, makeBuffer, plate, drawTiled, glow, lightPool, placeLabels, fogBank } from './scene.js?v=66513dd-1803';
import { drawActor, placeTags, makeFx, fxFrame, FX_ASSET } from './stage.js?v=66513dd-1803';
import { beginCamera, drawAmbient, vignette, bigText } from './fx.js?v=66513dd-1803';

// Крыши: ночной пробег ниндзя по крышам деревни до башни Хокаге. Прыжки через провалы,
// сюрикены из темноты, кто-то чуть не срывается. Кто первым у башни, тот первым говорит.
// Первая игра по схеме docs/BENCHMARK.md: фон из нарисованных плит в буфере 640×360, код добавляет свет, туман и движение.
const DIR = 'assets/scenes/rooftops/';
const ASSETS = ['sky', 'far', 'mid', 'roof', 'fg', 'props', 'tower'].map((n) => DIR + n + '.png').concat([FX_ASSET]);
const RIDGE = 205;                       // линия конька на плите крыши
const GAP = 64;
const PIECES = {                          // плита крыши разрезана на две: у каждой свой фонарь и трубы
  A: { sx: 0, w: 300, lantern: [48, 124], smoke: [[165, 138]] },
  B: { sx: 300, w: 340, lantern: [290, 124], smoke: [[37, 160], [62, 166]] },
};
const TRACK = (() => { let x = 0; return ['A', 'B', 'A', 'B', 'A', 'B'].map((id) => { const p = { ...PIECES[id], id, x }; x += p.w + GAP; return p; }); })();
const LAST = TRACK[TRACK.length - 1];
const START_X = 60, FINISH_X = LAST.x + 170, L = FINISH_X - START_X, WORLD_W = LAST.x + LAST.w;
const MID_LIGHTS = [[316, 152, 26], [160, 252, 22], [448, 260, 22], [40, 144, 16], [614, 168, 16], [90, 144, 9], [110, 150, 9], [128, 154, 9], [148, 157, 9], [434, 160, 9], [453, 158, 9], [198, 248, 14]];
const PROP = { lantern: { y: 8, h: 70 }, flag: { y: 84, h: 58 }, cols: [115, 217, 318, 420], w: 94 };
const SKY = [[8, 8, 30], [20, 14, 60], [50, 24, 90], [110, 40, 90], [180, 80, 80]];

/* паспорт света сцены: ночь, холодная луна справа сверху, тёплые фонари как местные источники */
const LIGHT = { id: 'rooftops', mul: '150,160,228', tint: '30,40,110', tintK: 0.14, key: { dx: 1, dy: -1, rgb: '170,195,255', k: 0.5 }, shade: { rgb: '6,6,28', k: 0.35 }, warm: '255,150,60', warmEdge: '255,200,120', shadow: 'rgba(4,4,16,0.5)', shadowLen: 3 };
const LANTERNS = TRACK.map((pc) => pc.x + pc.lantern[0]).concat([FINISH_X - 74]);
function gapAt(worldX, margin) { // провал, над которым сейчас бегун, с запасом на разбег
  for (let i = 0; i < TRACK.length - 1; i++) { const a = TRACK[i].x + TRACK[i].w - margin, b = TRACK[i + 1].x + margin; if (worldX > a && worldX < b) return { a, b }; }
  return null;
}

export default {
  id: 'rooftops',
  title: 'Крыши',
  cover: 'assets/covers/rooftops.jpg',
  assets: ASSETS,
  description: 'Ночная деревня ниндзя, прыжки с крыши на крышу и сюрикены из темноты на пути к башне Хокаге.',
  duration: 15,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(skyLayer(w, h, SKY, 3, 'roof-prev'), 0, 0, w, h);
    const roof = plate(DIR + 'roof.png'); if (roof) ctx.drawImage(roof, 0, 120, 300, 240, 0, h - 120, 150, 120);
    people.slice(0, 3).forEach((p, i) => drawSprite(ctx, p.person, runFrame(t, 10, i), 30 + i * 60, h * 0.45 - Math.abs(Math.sin(t * 3 + i)) * 20, 1.5));
  },

  play({ canvas, participants, order, seed, startAt, onFreeze, onEvent }) {
    const buffer = makeBuffer(canvas);
    const ctx = buffer.ctx;
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
    const fx = makeFx();
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, lastPuff = 0, flashAt = null;
    const shurikens = Array.from({ length: 6 }, (_, i) => ({ at: 2 + i * 2.1, row: i % rows }));
    const fired = new Set();
    const progress = (r, t) => { const ease = 1 - Math.pow(1 - t, 2.3); const noise = r.amp * Math.sin(2 * Math.PI * (r.f * t + r.phase)) * Math.pow(1 - t, 1.6) * Math.pow(t, 0.5); return Math.max(0, Math.min(r.final, r.final * ease + noise)); };
    const img = (name) => plate(DIR + name + '.png');

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = (typeof startAt === 'number' && startAt < now) ? startAt : now;
      const time = (now - start) / 1000, t = Math.min(1, time / dur);
      const { w, h } = buffer.fit();
      const yOff = h - 360;                                    // плиты прижаты к низу кадра, лишняя высота уходит в небо
      const ps = runners.map((r) => progress(r, t));
      const leader = Math.max(...ps);
      const drift = Math.sin(time * 0.6) * 1.5;                // лёгкое дыхание камеры
      const camMax = WORLD_W - w + 30;
      const camX = Math.round(Math.max(0, Math.min(camMax, START_X + leader * L - w * 0.55)) + drift);
      const feetY = (row) => yOff + (rows === 1 ? 236 : 222 + Math.round(row * (30 / (rows - 1))));
      const flick = (i) => 0.78 + 0.22 * Math.sin(time * 7 + i * 2.3) * Math.sin(time * 3.1 + i);

      const towerX = FINISH_X + 6 - camX;
      beginCamera(ctx, w, h, time, flashAt !== null ? [flashAt] : [], () => ({ x: FINISH_X - camX, y: yOff + 190 }), { level: 1.14, dur: 1.2, amp: 4 });

      // 1. НЕБО: плита с луной, мерцание звёзд, ореол луны, летучие мыши
      ctx.fillStyle = '#0c0d2b'; ctx.fillRect(0, 0, w, h);
      const sky = img('sky'); if (sky) ctx.drawImage(sky, Math.round(-30 - camX * 0.015), Math.min(0, yOff));
      const moonX = 570 - 30 - camX * 0.015, moonY = Math.min(0, yOff) + 115;
      glow(ctx, moonX, moonY, 120, '150,170,255', 0.16 + 0.03 * Math.sin(time * 0.8));
      for (let i = 0; i < 26; i++) { const tw = Math.sin(time * 2.5 + i * 1.9); if (tw < 0.55) continue; ctx.fillStyle = '#ffffff'; const sx = (i * 89) % w, sy = (i * 53) % Math.max(60, h - 230); ctx.fillRect(sx, sy, 1, 1); if (tw > 0.9) { ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3); } }
      for (let i = 0; i < 3; i++) { const bx = ((time * (22 + i * 6) + i * 260) % (w + 80)) - 40, by = 60 + i * 26 + Math.sin(time * 2 + i) * 10 + Math.min(0, yOff), fl = Math.sin(time * 14 + i) > 0 ? 2 : -1; ctx.fillStyle = '#0a0a1e'; ctx.fillRect(bx - 1, by, 3, 2); ctx.fillRect(bx - 5, by - fl, 4, 1); ctx.fillRect(bx + 2, by - fl, 4, 1); }

      // 2. ДАЛЬНИЙ ПЛАН: деревня со скалой Хокаге, за дымкой
      drawTiled(ctx, img('far'), camX * 0.08, yOff, w);
      for (let i = 0; i < 5; i++) fogBank(ctx, ((i * 210 + time * 5 - camX * 0.12) % (w + 300) + w + 300) % (w + 300) - 150, yOff + 218 + (i % 2) * 22, 150, 9, 'rgba(90,110,190,0.10)');

      // 3. СРЕДНИЙ ПЛАН: дома с фонарями. Окна и фонари живут: ореолы мерцают поверх плиты
      const mid = img('mid');
      if (mid) {
        const scroll = camX * 0.4, first = Math.floor(scroll / 640);
        for (let k = first; k * 640 - scroll < w; k++) {
          const x = Math.round(k * 640 - scroll), mirrored = ((k % 2) + 2) % 2 === 1;
          if (mirrored) { ctx.save(); ctx.translate(x + 640, yOff); ctx.scale(-1, 1); ctx.drawImage(mid, 0, 0); ctx.restore(); } else ctx.drawImage(mid, x, yOff);
          MID_LIGHTS.forEach(([lx, ly, r], i) => glow(ctx, x + (mirrored ? 640 - lx : lx), yOff + ly, r * 1.8, '255,150,60', 0.22 * flick(i + k * 3)));
        }
      }
      for (let i = 0; i < 4; i++) fogBank(ctx, ((i * 260 - time * 9 - camX * 0.5) % (w + 400) + w + 400) % (w + 400) - 200, yOff + 300 + (i % 2) * 18, 190, 12, 'rgba(40,50,120,0.16)');

      // 4. БАШНЯ ХОКАГЕ за последней крышей: флаг Сбера на баке, свет из окон
      const tower = img('tower');
      if (tower && towerX < w + 20) {
        ctx.drawImage(tower, Math.round(towerX), yOff - 12);
        glow(ctx, towerX + 100, yOff + 98, 46, '255,160,70', 0.3 * flick(40));
        const fxp = Math.round(towerX + 118), fyp = yOff - 30; ctx.fillStyle = '#c9c9d6'; ctx.fillRect(fxp, fyp, 1, 24);
        for (let c = 0; c < 16; c++) { const wv = Math.round(Math.sin(time * 6 - c * 0.5) * 1.5); ctx.fillStyle = c % 4 === 0 ? '#2fc24f' : '#21a038'; ctx.fillRect(fxp + 1 + c, fyp + 1 + wv, 1, 9); }
      }

      // 5. ИГРОВОЙ ПЛАН: крыши из двух половин плиты, в провалах глубина, торцы с лунным кантом
      const roof = img('roof'), props = img('props');
      TRACK.forEach((pc, i) => {
        const x = pc.x - camX; if (x > w + 10 || x + pc.w + GAP < -10) return;
        if (i < TRACK.length - 1) { const gx = x + pc.w; const g = ctx.createLinearGradient(0, yOff + RIDGE, 0, h); g.addColorStop(0, 'rgba(6,6,20,0)'); g.addColorStop(0.5, 'rgba(6,6,20,0.55)'); g.addColorStop(1, 'rgba(6,6,20,0.9)'); ctx.fillStyle = g; ctx.fillRect(gx, yOff + RIDGE, GAP, h - yOff - RIDGE); glow(ctx, gx + GAP / 2, h - 14, 30, '255,150,60', 0.25 * flick(i + 20)); ctx.fillStyle = '#ffd98a'; ctx.fillRect(Math.round(gx + 10 + ((time * 9 + i * 17) % (GAP - 20))), h - 9, 2, 4); }
        if (roof) ctx.drawImage(roof, pc.sx, 0, pc.w, 360, x, yOff, pc.w, 360); else { ctx.fillStyle = '#1e2440'; ctx.fillRect(x, yOff + RIDGE, pc.w, 155); }
        ctx.fillStyle = '#0c0c1e'; ctx.fillRect(x + pc.w - 3, yOff + RIDGE + 2, 3, 153); ctx.fillRect(x, yOff + RIDGE + 2, 3, 153);
        ctx.fillStyle = '#5a6aa8'; ctx.fillRect(x + pc.w - 1, yOff + RIDGE + 2, 1, 60); ctx.fillStyle = '#2a3260'; ctx.fillRect(x, yOff + RIDGE + 2, 1, 60);
        if (props && pc.id === 'A') { const f = Math.floor(time * 6 + i) % 4; ctx.drawImage(props, PROP.cols[f], PROP.flag.y, PROP.w, PROP.flag.h, x - 8, yOff + 272, PROP.w, PROP.flag.h); }
        pc.smoke.forEach(([sx, sy], j) => { for (let q = 0; q < 5; q++) { const age = ((time * 0.5 + q / 5 + j * 0.13 + i * 0.07) % 1), px = x + sx + Math.sin(age * 5 + q + i) * 3 + age * 10, py = yOff + sy - age * 46, s = 2 + Math.round(age * 5); ctx.fillStyle = `rgba(170,180,215,${(0.42 * (1 - age)).toFixed(2)})`; ctx.fillRect(Math.round(px), Math.round(py), s, s - 1); } });
      });
      if (props && towerX < w + 20) { const f = Math.floor(time * 5) % 4; ctx.drawImage(props, PROP.cols[f], PROP.lantern.y, PROP.w, PROP.lantern.h, Math.round(FINISH_X - 120 - camX), yOff + RIDGE - 96, PROP.w, PROP.lantern.h); }

      // сюрикены: летят через ряд, бегуны в этом ряду пригибаются
      shurikens.forEach((s, i) => {
        const age = time - s.at; if (age < 0 || age > 1.2) return;
        if (!fired.has(i)) { fired.add(i); if (onEvent) onEvent('whoosh'); }
        const sx = w + 20 - age * (w + 60) / 1.2, sy = feetY(s.row) - 34, ph = Math.floor(age * 30) % 2;
        ctx.fillStyle = 'rgba(200,220,255,0.35)'; ctx.fillRect(Math.round(sx) + 8, sy, 28, 1); ctx.fillRect(Math.round(sx) + 12, sy + 2, 16, 1);
        fxFrame(ctx, 'shuriken', (age * 24) % 6, sx, sy, 1, 1, LIGHT);
      });

      // бегуны: контактная тень, пыль из-под ног, подписи в сетке буфера
      if (time - lastPuff > 0.3 && t < 1) { lastPuff = time; runners.forEach((r, i) => { const wx = START_X + ps[i] * L; if (!gapAt(wx, 0)) fx.spawn('dust', wx - 14, feetY(r.row) - 6, time, { dur: 0.36, vx: -40 }); }); }
      fx.draw(ctx, time, camX, 0, LIGHT);
      particles.draw(ctx, time);
      const labels = [];
      [...runners.keys()].sort((a, b) => runners[a].row - runners[b].row).forEach((i) => {
        const r = runners[i]; const worldX = START_X + ps[i] * L; const x = Math.round(worldX - camX) - 32;
        if (x < -80 || x > w + 20) return;
        const fy = feetY(r.row); const g = gapAt(worldX, 14);
        /* прыжок в три фазы: присед перед краем, дуга, приземление с пылью и просадкой */
        let lift = 0, squat = 0;
        if (g) { const u = (worldX - g.a) / (g.b - g.a); if (u < 0.12) squat = 3; else if (u > 0.9) { squat = 2; if (r.landed !== g.a) { r.landed = g.a; fx.spawn('ring', worldX, fy - 8, time, { dur: 0.4 }); } } else lift = Math.round(Math.sin(((u - 0.12) / 0.78) * Math.PI) * 30); }
        const slipping = r.slipAt !== null && Math.abs(t - r.slipAt) < 0.035 && !g;
        const duck = shurikens.some((sh) => sh.row === r.row && time - sh.at > 0.2 && time - sh.at < 0.7);
        const first = t >= 1 && r.rank === 0;
        const hop = first ? Math.round(Math.abs(Math.sin(time * 6)) * 4) : 0;
        const y = fy - 62 + squat + (duck ? 5 : 0) + (slipping ? 6 : 0);
        let near = 1e9, side = 1; LANTERNS.forEach((lx) => { const d = lx - worldX; if (Math.abs(d) < Math.abs(near)) near = d; }); side = near >= 0 ? 1 : -1;
        const warm = Math.abs(near) < 36 ? 3 : Math.abs(near) < 76 ? 2 : Math.abs(near) < 120 ? 1 : 0;
        const fr = t < 1 ? (lift > 4 ? 'run3' : slipping ? 'hurt0' : runFrame(time, 11 + r.f * 2, r.gait)) : (r.rank === 0 ? (Math.floor(time * 5) % 2 ? 'cheer' : 'cheer2') : 'stand-right');
        drawActor(ctx, r.p.person, fr, x, y, LIGHT, { warm, warmSide: side, lift: lift + hop, shadow: !gapAt(worldX, -4) });
        if (slipping) { ctx.fillStyle = '#ff5050'; ctx.font = "8px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('!', x + 30, y - 4); }
        labels[i] = { text: r.p.name, cx: x + 32, y: y - lift - hop + 4, index: i, gold: first };
      });
      placeTags(ctx, labels.filter(Boolean));

      // 6. СВЕТ поверх персонажей: фонари на столбах красят крышу и тех, кто пробегает рядом
      TRACK.forEach((pc, i) => { const lx = pc.x + pc.lantern[0] - camX, ly = yOff + pc.lantern[1]; if (lx < -80 || lx > w + 80) return; const f = flick(i); glow(ctx, lx, ly, 58, '255,130,50', 0.42 * f); glow(ctx, lx, ly, 14, '255,220,150', 0.5 * f); lightPool(ctx, lx, yOff + RIDGE + 22, 70, 16, '255,140,60', 0.3 * f); });
      if (towerX < w + 20) { const lx = FINISH_X - 120 + 46 - camX; glow(ctx, lx, yOff + RIDGE - 56, 50, '255,130,50', 0.4 * flick(33)); lightPool(ctx, lx, yOff + RIDGE + 24, 60, 14, '255,140,60', 0.28 * flick(33)); }
      for (let i = 0; i < 5; i++) { const lx = ((i * 131 - camX * 1.2 - time * 26 + Math.sin(time * 1.4 + i) * 18) % (w + 80) + w + 80) % (w + 80) - 40, ly = ((i * 83 + time * 30) % (h + 40)) - 20; fxFrame(ctx, 'leaf', (time * 5 + i * 2) % 6, lx, ly, 1, 0.9, LIGHT); }
      for (let i = 0; i < 10; i++) { const ex = ((i * 131 - camX * 1.1 + Math.sin(time * 1.3 + i) * 12) % (w + 40) + w + 40) % (w + 40) - 20, ey = h - ((i * 53 + time * 22) % (h * 0.6)); ctx.fillStyle = i % 3 ? 'rgba(255,160,60,0.9)' : 'rgba(255,225,130,0.9)'; ctx.fillRect(Math.round(ex), Math.round(ey), 1, 1); }

      // 7. ПЕРЕДНИЙ ПЛАН: лента из плиты и её зеркальной копии идёт вдвое быстрее сцены. Крона прижата к верху кадра,
      // забор опущен, чтобы не закрывать бегунов.
      const fg = img('fg');
      if (fg) {
        // за весь пробег лента проходит ровно два своих периода (1280), поэтому старт и финиш попадают на один и тот же пустой участок
        const scroll = camX * (2560 / camMax) + 380, first = Math.floor(scroll / 640);
        for (let k = first; k * 640 - scroll < w; k++) {
          const x = Math.round(k * 640 - scroll), mirrored = ((k % 2) + 2) % 2 === 1;
          ctx.save(); if (mirrored) { ctx.translate(x + 640, 0); ctx.scale(-1, 1); } else ctx.translate(x, 0);
          ctx.drawImage(fg, 0, 0, 640, 170, 0, 0, 640, 170); ctx.drawImage(fg, 0, 144, 640, 216, 0, yOff + 170, 640, 216);
          ctx.restore();
          glow(ctx, x + (mirrored ? 550 : 90), 84, 70, '255,120,40', 0.4 * flick(50 + k));
        }
      }

      vignette(ctx, w, h, 0.5);
      if (flashAt !== null) { const warm = Math.max(0, 0.3 - (time - flashAt) * 0.6); if (warm > 0) { ctx.fillStyle = `rgba(255,170,80,${warm.toFixed(2)})`; ctx.fillRect(0, 0, w, h); } }
      ctx.restore();
      if (flashAt !== null && time - flashAt < 1.6) bigText(ctx, w, h, 'ХОКАГЕ!', time, '#ff6b6b', 24);
      if (flashAt === null && leader >= 0.985) { flashAt = time; particles.burst(FINISH_X - camX, yOff + 150, time, rnd, { count: 70, speed: 140, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#fff'], life: 1.6, gravity: 150, size: 3 }); }
      buffer.blit();
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
