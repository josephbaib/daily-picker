import { mulberry32 } from '../rng.js?v=1197198-1746';
import { makeParticles, nextFrame, cancelFrame, makeBuffer, plate, drawTiled, glow, lightPool } from './scene.js?v=1197198-1746';
import { litSprite, placeTags, makeFx, FX_ASSET } from './stage.js?v=1197198-1746';
import { beginCamera, vignette, bigText } from './fx.js?v=1197198-1746';

// Гонки на офисных стульях по коридору до переговорки.
// Собрано по схеме docs/BENCHMARK.md и docs/STAGE.md: город за панорамными окнами, опенспейс за стеклянным ограждением,
// коридор с ковролином, переговорка с открытой дверью, рамка из фикуса, кулера и стойки ресепшена. Кресло, бумаги и кофе с листа.
const DIR = 'assets/scenes/chairs/';
const ASSETS = ['window', 'office', 'corridor', 'room', 'fg', 'chair', 'papers', 'coffee'].map((n) => DIR + n + '.png').concat([FX_ASSET]);
const START_X = 70, L = 1664, FINISH_X = START_X + L;
const OFFICE_Y = -40, ROOM_Y = -34, FG_Y = 60;
const CHAIR = { w: 102, h: 56 }, PAPERS = { w: 81, h: 45 }, COFFEE = { w: 65, h: 36 };
const LAMPS = [[72, 196], [199, 198], [245, 208], [389, 208], [467, 192], [585, 196]];
const PANTS = { black: '#26262c', charcoal: '#3c3c44', navy: '#2a3a68', bluegray: '#55627e', slate: '#5a6478', orange: '#e0782a', brown: '#6b4a2e', white: '#e8e8e8', gray: '#8a8a94', forest: '#3a6a3a', tan: '#c8a878' };
/* паспорт света: дневной офис, холодный свет из окон сверху и сзади, мягкая тень под креслом */
const LIGHT = { id: 'chairs', mul: '248,248,255', tintK: 0, key: { dx: 0, dy: -1, rgb: '235,245,255', k: 0.45 }, shade: { rgb: '40,50,80', k: 0.25 }, warm: '255,230,180' };
function darken(hex) { const v = parseInt(hex.slice(1), 16); const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255; return `rgb(${Math.round(r * 0.7)},${Math.round(g * 0.7)},${Math.round(b * 0.75)})`; }

export default {
  id: 'chairs',
  title: 'Гонки на стульях',
  cover: 'assets/covers/chairs.jpg',
  assets: ASSETS,
  description: 'Безумный заезд на офисных креслах по коридору, где на кону не кубок, а первое слово на дейлике.',
  duration: 13,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h) {
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#9ab8e0'; ctx.fillRect(0, 0, w, h);
    const win = plate(DIR + 'window.png'); if (win) ctx.drawImage(win, 160, 0, 320, 360, 0, 0, w, h);
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const buffer = makeBuffer(canvas);
    const ctx = buffer.ctx;
    const n = participants.length;
    const rank = new Map(order.map((id, i) => [id, i]));
    const rnd = mulberry32(seed);
    const rows = Math.min(n, 4);
    const riders = participants.map((p, i) => ({
      p, rank: rank.get(p.id), row: i % rows,
      final: 1 - rank.get(p.id) * (0.22 / n),
      f: 1.1 + rnd() * 1.3, phase: rnd() * Math.PI * 2, amp: 0.07 + rnd() * 0.07,
      spinAt: 2 + rnd() * 8, kick: rnd() * 6, lastDust: 0, spill: null,
    }));
    /* стопки бумаг в коридоре: первая пара кресел в ряду разносит их */
    const stacks = Array.from({ length: 6 }, (_, k) => ({ x: START_X + 260 + k * 250 + Math.round(rnd() * 60), row: k % rows, hitAt: null }));
    const particles = makeParticles();
    const fx = makeFx();
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, doorOpened = null;
    const progress = (r, t) => { const ease = 1 - Math.pow(1 - t, 2.4); const noise = r.amp * Math.sin(2 * Math.PI * (r.f * t + r.phase)) * Math.pow(1 - t, 1.6) * Math.pow(t, 0.5); return Math.max(0, Math.min(r.final, r.final * ease + noise)); };
    const img = (name) => plate(DIR + name + '.png');

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const time = (now - start) / 1000, t = Math.min(1, time / dur);
      const { w, h } = buffer.fit();
      const yOff = h - 360;
      const ps = riders.map((r) => progress(r, t));
      const leader = Math.max(...ps);
      const camMax = FINISH_X - w * 0.68;
      const camX = Math.round(Math.max(0, Math.min(camMax, START_X + leader * L - w * 0.55)) + Math.sin(time * 0.6) * 1.2);
      const feetY = (row) => yOff + (rows === 1 ? 310 : 284 + Math.round(row * (50 / (rows - 1))));
      const finX = FINISH_X - camX;
      beginCamera(ctx, w, h, time, doorOpened !== null ? [doorOpened] : [], () => ({ x: finX, y: yOff + 220 }), { level: 1.1, dur: 1.1, amp: 3 });

      // 1. ГОРОД за панорамными окнами; 2. ОПЕНСПЕЙС со светильниками, виден сквозь стеклянное ограждение
      ctx.fillStyle = '#a8c4e8'; ctx.fillRect(0, 0, w, h);
      drawTiled(ctx, img('window'), camX * 0.15, yOff, w);
      const offScroll = camX * 0.5;
      drawTiled(ctx, img('office'), offScroll, yOff + OFFICE_Y, w);
      for (let k = Math.floor(offScroll / 640); k * 640 - offScroll < w; k++) LAMPS.forEach(([lx, ly], i) => glow(ctx, k * 640 - offScroll + (((k % 2) + 2) % 2 ? 640 - lx : lx), yOff + OFFICE_Y + ly, 22, '255,225,160', 0.35 + 0.04 * Math.sin(time * 3 + i)));

      // 3. КОРИДОР: стекло ограждения полупрозрачное, ковролин плотный; блики окон на полу
      const cor = img('corridor');
      if (cor) for (let k = Math.floor(camX / 640); k * 640 - camX < w; k++) {
        const x = Math.round(k * 640 - camX), mir = ((k % 2) + 2) % 2 === 1;
        ctx.save(); if (mir) { ctx.translate(x + 640, yOff); ctx.scale(-1, 1); } else ctx.translate(x, yOff);
        ctx.globalAlpha = 0.6; ctx.drawImage(cor, 0, 0, 640, 258, 0, 0, 640, 258); ctx.globalAlpha = 1; ctx.drawImage(cor, 0, 258, 640, 102, 0, 258, 640, 102);
        ctx.restore();
      }
      for (let k = Math.floor((camX - 200) / 320); k * 320 < camX + w + 200; k++) lightPool(ctx, k * 320 + 160 - camX, yOff + 306, 120, 16, '220,235,255', 0.12);

      // 4. ПЕРЕГОВОРКА на финише: свет внутри, надпись на экране, табличка у двери
      const room = img('room');
      if (room && finX < w + 560) {
        const rx = Math.round(finX - 500), ry = yOff + ROOM_Y, lit = doorOpened !== null ? Math.min(1, (time - doorOpened) * 3) : 0;
        ctx.drawImage(room, rx, ry);
        glow(ctx, rx + 320, ry + 150, 170, '255,240,200', 0.12 + 0.3 * lit);
        ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = "8px 'Press Start 2P', monospace";
        ctx.fillStyle = lit > 0.5 ? '#8fe0a0' : '#5a7a90'; ctx.fillText('ДЕЙЛИК', rx + 320, ry + 140); ctx.fillText('10:00', rx + 320, ry + 154);
        ctx.fillStyle = '#1d6b35'; ctx.fillText('B2B', rx + 587, ry + 111); ctx.textAlign = 'left';
      }

      // стопки бумаг и пролитый кофе на ковролине
      const papers = img('papers'), coffee = img('coffee'), chair = img('chair');
      stacks.forEach((s) => { const x = s.x - camX; if (!papers || x < -60 || x > w + 60) return; const age = s.hitAt === null ? -1 : time - s.hitAt; if (age > 0.6) return; const fr = age < 0 ? 0 : Math.min(3, 1 + Math.floor(age / 0.2)); ctx.drawImage(papers, fr * PAPERS.w, 0, PAPERS.w, PAPERS.h, Math.round(x - PAPERS.w / 2), feetY(s.row) - PAPERS.h + 6 - (age > 0 ? Math.round(age * 30) : 0), PAPERS.w, PAPERS.h); });
      riders.forEach((r) => { if (!r.spill || !coffee) return; const x = r.spill.x - camX; if (x < -60 || x > w + 60) return; const age = time - r.spill.at; ctx.drawImage(coffee, Math.min(3, Math.floor(age / 0.12)) * COFFEE.w, 0, COFFEE.w, COFFEE.h, Math.round(x - COFFEE.w / 2), feetY(r.row) - COFFEE.h + 8, COFFEE.w, COFFEE.h); });

      // 5. ЕЗДОКИ: кресло с листа, освещённый торс, ноги толкаются, пыль из-под колёс
      fx.draw(ctx, time, camX, 0, LIGHT);
      const labels = [];
      [...riders.keys()].sort((a, b) => riders[a].row - riders[b].row).forEach((i) => {
        const r = riders[i]; const worldX = START_X + ps[i] * L; const x = Math.round(worldX - camX);
        const gy = feetY(r.row);
        if (t < 1 && time - r.lastDust > 0.36) { r.lastDust = time; fx.spawn('dust', worldX - 22, gy - 6, time, { dur: 0.36, vx: -40 }); }
        stacks.forEach((s) => { if (s.hitAt === null && s.row === r.row && worldX + 20 >= s.x) { s.hitAt = time; if (onEvent) onEvent('whoosh'); } });
        const spinning = time > r.spinAt && time < r.spinAt + 0.7 && t < 0.9;
        if (spinning && !r.spill) r.spill = { x: worldX + 10, at: time };
        if (x < -90 || x > w + 90) return;
        const first = t >= 1 && r.rank === 0;
        const hop = first ? Math.round(Math.abs(Math.sin(time * 6)) * 3) : 0;
        const tilt = spinning ? ((time - r.spinAt) / 0.7) * Math.PI * 2 : 0;
        const bob = t < 1 ? Math.round(Math.sin(time * 16 + r.kick) * 0.6) : 0;
        ctx.fillStyle = 'rgba(10,14,40,0.32)'; ctx.fillRect(x - 20, gy - 1, 40, 2); ctx.fillRect(x - 15, gy + 1, 30, 1);
        const torso = litSprite(r.p.person, 'stand-right', LIGHT), fr = t < 1 ? (Math.floor(time * 12 + i) % 2) + (ps[i] > 0.1 && time < dur * 0.6 ? 2 : 0) : 0;
        ctx.save(); ctx.translate(x, gy - hop + bob - 28); if (tilt) ctx.rotate(tilt);
        if (chair) ctx.drawImage(chair, fr * CHAIR.w, 0, CHAIR.w, CHAIR.h, -50, -28, CHAIR.w, CHAIR.h);
        ctx.drawImage(torso, 0, 0, 64, 45, -50 + 16, -28 - 13, 64, 45);
        if (chair) ctx.drawImage(chair, fr * CHAIR.w + 44, 22, 28, 16, -50 + 44, -28 + 22, 28, 16);
        const sheetName = r.p.person.sheet || '', pants = sheetName.includes('naruto') ? PANTS.orange : sheetName.includes('max') ? PANTS.navy : PANTS[r.p.person.legs] || '#3c3c44', kick = time * 12 * (0.7 + r.f * 0.3) + r.kick;
        [[Math.sin(kick + Math.PI), true], [Math.sin(kick), false]].forEach(([k, far]) => { const kk = t < 1 ? k : 0, dx = Math.round(kk * 3); ctx.fillStyle = far ? darken(pants) : pants; ctx.fillRect(0, 1 - (far ? 1 : 0), 14 + dx, 4); ctx.fillRect(11 + dx, 3 - (far ? 1 : 0), 4, 12 + Math.round(Math.max(0, -kk) * 2)); ctx.fillStyle = far ? '#15151c' : '#22222c'; ctx.fillRect(11 + dx, 15 + Math.round(Math.max(0, -kk) * 2) - (far ? 1 : 0), 7, 3); });
        ctx.restore();
        labels[i] = { text: r.p.name, cx: x - 2, y: gy - hop - 76, index: i, gold: first };
      });
      particles.draw(ctx, time);
      placeTags(ctx, labels.filter(Boolean));

      // 6. ПЕРЕДНИЙ ПЛАН: фикус, кулер и стойка ресепшена проходят перед камерой; лента подобрана так, что старт и финиш открыты
      const fg = img('fg');
      if (fg) drawTiled(ctx, fg, 130 + camX * (1840 / camMax), yOff + FG_Y, w);
      vignette(ctx, w, h, 0.28);
      ctx.restore();
      if (doorOpened !== null && time - doorOpened < 1.6) bigText(ctx, w, h, 'ПЕРЕГОВОРКА!', time, '#8fe0a0', 22);
      if (doorOpened === null && leader >= 0.975) { doorOpened = time; if (onEvent) onEvent('pop'); particles.burst(finX - 40, yOff + 200, time, rnd, { count: 40, speed: 150, colors: ['#ffffff', '#f0f0f0', '#dfe6f2', '#21a038'], life: 1.8, gravity: 90, size: 3 }); }
      buffer.blit();
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
