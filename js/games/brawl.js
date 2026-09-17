import { drawSprite } from '../sprite.js?v=e3874c0-1738';
import { mulberry32 } from '../rng.js?v=e3874c0-1738';
import { makeParticles, nextFrame, cancelFrame, makeBuffer, plate, drawTiled, lightPool } from './scene.js?v=e3874c0-1738';
import { drawActor, placeTags, fxFrame, FX_ASSET } from './stage.js?v=e3874c0-1738';
import { makeWarp, beginCamera, vignette, bigText } from './fx.js?v=e3874c0-1738';

// Драка: все на ринге дерутся одновременно. Симуляция идёт фиксированным шагом от сида,
// поэтому у всех зрителей картинка одинаковая. Кто и когда вылетает, задано порядком заранее.
// Отрисовка по схеме docs/BENCHMARK.md и docs/STAGE.md: зал, ринг, передние канаты и стол судей плитами, удары и звёзды с листа.
const STEP = 1 / 30;
const DIR = 'assets/scenes/brawl/';
const ASSETS = ['arena', 'ring', 'ropes', 'fg', 'hit', 'stars', 'bell', 'crowd'].map((n) => DIR + n + '.png').concat([FX_ASSET]);
const HIT = { w: 89, h: 49 }, STARS = { w: 81, h: 45 }, BELL = { w: 81, h: 45 }, CROWD = { w: 155, h: 85 };
/* паспорт света: тёмный зал, жёсткий белый свет прожекторов сверху, тень прямо под ногами */
const LIGHT = { id: 'brawl', mul: '205,210,238', tint: '20,20,70', tintK: 0.08, key: { dx: 0, dy: -1, rgb: '255,250,235', k: 0.7 }, shade: { rgb: '8,10,40', k: 0.4 }, warm: '255,240,200', shadow: 'rgba(0,4,40,0.5)', shadowLen: 0 };
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export default {
  id: 'brawl',
  title: 'Драка',
  description: 'Королевская битва на ринге под рёв трибун, и последний, кто устоит на ногах, забирает слово.',
  cover: 'assets/covers/brawl.jpg',
  assets: ASSETS,
  duration: 20,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#0a0e1e'; ctx.fillRect(0, 0, w, h);
    const ring = plate(DIR + 'ring.png'); if (ring) ctx.drawImage(ring, 0, 100, 640, 260, 0, h - w * 0.41, w, w * 0.41);
    people.slice(0, 2).forEach((p, i) => drawSprite(ctx, p.person, 'slash' + (Math.floor(t * 8 + i) % 6), w * 0.25 + i * w * 0.3, h * 0.35, 1.5));
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const buffer = makeBuffer(canvas);
    const ctx = buffer.ctx;
    const img = (name) => plate(DIR + name + '.png');
    const n = participants.length;
    const rnd = mulberry32(seed);
    const victims = [...order].reverse().slice(0, n - 1);
    const base = n > 10 ? 0.9 : 1.7;
    const gaps = victims.map((_, i) => base + (2.4 - base) * Math.pow(i / Math.max(1, victims.length - 1), 2));
    const total = gaps.reduce((s, g) => s + g, 0);
    const k = total > 16 ? 16 / total : 1;
    const koAt = new Map(); let acc = 1.6;
    victims.forEach((id, i) => { acc += gaps[i] * k; koAt.set(id, acc); });
    const finalAt = acc + 2.6;
    const warp = makeWarp([...koAt.values()], n > 10 ? 0.2 : 0.35, 0.4);
    const particles = makeParticles();

    // состояние бойцов в нормированных координатах ринга (0..1)
    const F = participants.map((p, i) => ({
      p, id: p.id, x: 0.15 + (i % 4) * 0.23 + rnd() * 0.05, y: 0.22 + (Math.floor(i / 4) % 3) * 0.28 + ((i % 4) % 2) * 0.12 + rnd() * 0.08,
      vx: 0, vy: 0, dir: 1, target: null, retarget: 0, phase: 'chase', phaseT: 0, hitFlash: 0, hp: 1,
      speed: 0.22 + rnd() * 0.1, out: null, koTime: koAt.get(p.id) || null, ringside: rnd(),
    }));
    let simT = 0, start = null, raf = 0, stopped = false, koCount = 0, lastKo = -10;
    const alive = () => F.filter((f) => !f.out);

    function step(dt) {
      simT += dt;
      const live = alive();
      F.forEach((f) => {
        if (f.out) { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 1.2 * dt; return; }
        f.hitFlash = Math.max(0, f.hitFlash - dt);
        f.phaseT += dt;
        // здоровье: у обречённых тает к своему времени, у остальных держится
        const koT = f.koTime;
        f.hp = koT ? Math.max(0.05, 1 - simT / koT) : Math.max(0.35, 1 - simT / (finalAt * 2));
        // цель: ближайший живой, иногда меняем
        f.retarget -= dt;
        if (!f.target || f.target.out || f.retarget <= 0) {
          const others = live.filter((o) => o !== f);
          if (others.length) { others.sort((a, b) => Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y)); f.target = rnd() < 0.7 ? others[0] : others[Math.floor(rnd() * others.length)]; }
          f.retarget = 1 + rnd() * 1.5;
        }
        const tg = f.target;
        if (f.phase === 'attack') {
          if (f.phaseT >= 0.22 && !f.landed && tg && !tg.out) {
            f.landed = true;
            const d = Math.hypot(tg.x - f.x, tg.y - f.y);
            if (d < 0.16) {
              const ang = Math.atan2(tg.y - f.y, tg.x - f.x);
              tg.vx += Math.cos(ang) * 0.9; tg.vy += Math.sin(ang) * 0.6; tg.hitFlash = 0.25; tg.phase = 'stagger'; tg.phaseT = 0;
              tg.lastHit = { x: tg.x, y: tg.y, t: simT, by: f };
              if (onEvent) onEvent('pop');
            }
          }
          if (f.phaseT >= 0.45) { f.phase = 'recover'; f.phaseT = 0; f.landed = false; }
        } else if (f.phase === 'recover') {
          if (f.phaseT >= 0.3 + rnd() * 0.3) { f.phase = 'chase'; f.phaseT = 0; }
        } else if (f.phase === 'stagger') {
          if (f.phaseT >= 0.35) { f.phase = 'chase'; f.phaseT = 0; }
        } else if (tg && !tg.out) {
          const dx = tg.x - f.x, dy = tg.y - f.y, d = Math.hypot(dx, dy);
          if (d > 0.12) { f.vx += (dx / d) * f.speed * dt * 6; f.vy += (dy / d) * f.speed * dt * 6; }
          else if (f.phaseT > 0.2) { f.phase = 'attack'; f.phaseT = 0; f.landed = false; }
          if (Math.abs(dx) > 0.01) f.dir = dx > 0 ? 1 : -1;
        }
        // движение, трение, канаты
        f.x += f.vx * dt; f.y += f.vy * dt;
        f.vx *= Math.pow(0.02, dt); f.vy *= Math.pow(0.02, dt);
        if (f.x < 0.04) { f.x = 0.04; f.vx = Math.abs(f.vx) * 0.6; }
        if (f.x > 0.96) { f.x = 0.96; f.vx = -Math.abs(f.vx) * 0.6; }
        if (f.y < 0.05) { f.y = 0.05; f.vy = Math.abs(f.vy) * 0.6; }
        if (f.y > 0.95) { f.y = 0.95; f.vy = -Math.abs(f.vy) * 0.6; }
        // расталкивание
        live.forEach((o) => { if (o === f) return; const dx = f.x - o.x, dy = f.y - o.y, d = Math.hypot(dx, dy); if (d < 0.08 && d > 0) { f.x += (dx / d) * (0.08 - d) * 0.5; f.y += (dy / d) * (0.08 - d) * 0.5; } });
        // нокаут по расписанию
        if (f.koTime && simT >= f.koTime) {
          const by = f.lastHit && f.lastHit.by && !f.lastHit.by.out ? f.lastHit.by : live.find((o) => o !== f);
          const dir = by ? (f.x >= by.x ? 1 : -1) : (f.x > 0.5 ? 1 : -1);
          f.out = { t: simT, dir }; f.vx = dir * 1.4; f.vy = -1.0; koCount++; lastKo = simT;
          if (by) { by.phase = 'attack'; by.phaseT = 0; by.landed = true; by.dir = dir; }
          if (onEvent) onEvent('whoosh');
        }
      });
    }

    const frame = (now) => {
      if (stopped) return;
      const hit = img('hit'), stars = img('stars');
      if (start === null) start = now;
      const t = warp((now - start) / 1000);
      while (simT + STEP <= t) step(STEP);
      const { w, h } = buffer.fit();
      const x0 = Math.round((w - 640) / 2), yOff = h - 360;
      const winner = koCount === victims.length && t >= finalAt - 2.6;
      /* пол ринга на плите нарисован в перспективе: задняя кромка уже передней, бойцы ставятся по трапеции */
      const floorPos = (fx, fy) => { const xl = 140 - 88 * fy, xr = 500 + 88 * fy; return { x: x0 + xl + fx * (xr - xl), y: yOff + 180 + fy * 82 }; };
      const outs = F.filter((f) => f.out).sort((a, b) => a.out.t - b.out.t);
      beginCamera(ctx, w, h, simT, outs.map((f) => f.out.t), (i) => { const q = floorPos(Math.max(0, Math.min(1, outs[i].x)), Math.max(0, Math.min(1, outs[i].y))); return { x: q.x, y: q.y - 30 }; }, { level: 1.14, dur: 0.9, amp: 5 });

      // 1. ЗАЛ: плита с трибунами и прожекторами, надписи на табло, лучи ходят по рингу, вспышки в толпе
      ctx.fillStyle = '#070a16'; ctx.fillRect(0, 0, w, h);
      drawTiled(ctx, img('arena'), -x0, yOff, w);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = "8px 'Press Start 2P', monospace";
      ctx.fillStyle = '#ffd166'; ctx.fillText('FIGHT NIGHT', x0 + 320, yOff + 14); ctx.fillStyle = '#21a038'; ctx.fillText('B2Bсосы', x0 + 320, yOff + 26); ctx.fillStyle = '#ff5050'; ctx.fillText(`K.O. ${koCount}/${victims.length}`, x0 + 320, yOff + 40); ctx.textAlign = 'left';
      for (let s = Math.floor(t / 0.11) - 3; s <= Math.floor(t / 0.11); s++) { const age = t - s * 0.11; if (age < 0 || age > 0.28) continue; fxFrame(ctx, 'flash', (age / 0.28) * 6, x0 + 20 + hash(s * 7 + 3) * 600, yOff + 120 + hash(s * 13) * 120, 1); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      [[150, 0.8], [320, 1.3], [490, 0.6]].forEach(([lx, sp], i) => { const tx = x0 + 320 + Math.sin(t * sp + i * 2) * 170, a = winner ? 0.03 : 0.07; ctx.fillStyle = `rgba(200,215,255,${a})`; ctx.beginPath(); ctx.moveTo(x0 + lx - 6, yOff + 20); ctx.lineTo(x0 + lx + 6, yOff + 20); ctx.lineTo(tx + 70, yOff + 262); ctx.lineTo(tx - 70, yOff + 262); ctx.fill(); });
      ctx.restore();

      // 2. Зрители у ринга видны сквозь задние канаты, у них срабатывают вспышки
      const crowd = img('crowd');
      if (crowd) for (let k = 0; k * CROWD.w < w + CROWD.w; k++) { const fr = Math.floor(t * 3 + hash(k + Math.floor(t * 1.5) * 7) * 4) % 4; ctx.drawImage(crowd, fr * CROWD.w, 0, CROWD.w, CROWD.h, k * CROWD.w - 20, yOff + 132 + Math.round(Math.sin(t * 5 + k) * 1), CROWD.w, CROWD.h); ctx.fillStyle = '#0d1428'; ctx.fillRect(k * CROWD.w - 20, yOff + 216, CROWD.w, 54); }

      // 3. РИНГ, пятно света на холсте
      const ring = img('ring'); if (ring) ctx.drawImage(ring, x0, yOff);
      lightPool(ctx, x0 + 320, yOff + 222, 250, 50, '190,210,255', 0.22);


      // 4. БОЙЦЫ по глубине: свет зала, удары и звёзды нокаута с листа, полоски здоровья, имена без плашек
      const labels = [];
      [...F].sort((a, b) => a.y - b.y).forEach((f) => {
        const q = floorPos(Math.max(-0.4, Math.min(1.4, f.x)), Math.max(0, Math.min(1, f.y))); const px = Math.round(q.x) - 32, py = Math.round(q.y) - 62;
        if (f.out) {
          const age = simT - f.out.t; if (age > 1.3) return;
          const lift = Math.round(Math.sin(Math.min(1, age) * Math.PI) * 46);
          drawActor(ctx, f.p.person, 'hurt' + Math.min(5, Math.floor(age * 6)), px, py, LIGHT, { lift });
          if (stars) ctx.drawImage(stars, (1 + Math.floor(age * 10) % 3) * STARS.w, 0, STARS.w, STARS.h, px + 32 - STARS.w / 2, py - lift - 14, STARS.w, STARS.h);
          if (hit && age < 0.32) ctx.drawImage(hit, Math.min(3, Math.floor(age / 0.08)) * HIT.w, 0, HIT.w, HIT.h, px + 32 - HIT.w / 2 - f.out.dir * 14, py + 8, HIT.w, HIT.h);
          return;
        }
        let fr;
        if (winner) fr = Math.floor(t * 5) % 2 ? 'cheer' : 'cheer2';
        else if (f.phase === 'attack') fr = (f.dir < 0 ? 'slashl' : 'slash') + Math.min(5, Math.floor(f.phaseT / 0.45 * 6));
        else if (f.phase === 'stagger') fr = 'hurt0';
        else if (Math.hypot(f.vx, f.vy) > 0.05) fr = (f.dir < 0 ? 'left' : 'run') + (Math.floor(simT * 12 + f.ringside * 8) % 8);
        else fr = f.dir < 0 ? 'stand-left' : 'stand-right';
        const hop = winner ? Math.round(Math.abs(Math.sin(t * 6)) * 4) : 0;
        const shake = f.hitFlash > 0 ? Math.round(Math.sin(f.hitFlash * 90) * 2) : 0;
        drawActor(ctx, f.p.person, fr, px + shake, py, LIGHT, { lift: hop });
        if (hit && f.hitFlash > 0) ctx.drawImage(hit, Math.min(3, Math.floor((0.25 - f.hitFlash) / 0.0625)) * HIT.w, 0, HIT.w, HIT.h, px + 32 - HIT.w / 2, py + 10, HIT.w, HIT.h);
        if (!winner) { ctx.fillStyle = '#05050f'; ctx.fillRect(px + 20, py + 6, 24, 4); ctx.fillStyle = f.hp > 0.5 ? '#6ec85a' : f.hp > 0.25 ? '#ffd166' : '#ff5050'; ctx.fillRect(px + 21, py + 7, Math.max(1, Math.round(22 * f.hp)), 2); }
        labels.push({ text: f.p.name, cx: px + 32, y: py - hop - 7, index: F.indexOf(f), gold: winner });
      });
      if (winner) { const wf = F.find((f) => !f.out); if (wf) { const q = floorPos(wf.x, wf.y); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(255,240,200,0.16)'; ctx.beginPath(); ctx.moveTo(x0 + 314, yOff + 20); ctx.lineTo(x0 + 326, yOff + 20); ctx.lineTo(q.x + 46, q.y + 4); ctx.lineTo(q.x - 46, q.y + 4); ctx.fill(); ctx.restore(); lightPool(ctx, q.x, q.y, 60, 14, '255,235,190', 0.4); } }

      // 5. ПЕРЕДНИЕ КАНАТЫ поверх бойцов, стол судей с гонгом и камеры прессы на переднем плане
      const ropes = img('ropes'); if (ropes) ctx.drawImage(ropes, x0 + 37, yOff + 22);
      placeTags(ctx, labels);
      particles.draw(ctx, t);
      const fg = img('fg'); if (fg) ctx.drawImage(fg, x0, yOff + 18);
      const ringing = t < 1.4 || winner, bell = img('bell');
      if (bell && fg) ctx.drawImage(bell, (ringing ? 1 + Math.floor(t * 12) % 3 : 0) * BELL.w, 0, BELL.w, BELL.h, x0 + 376 - BELL.w / 2, yOff + 288, BELL.w, BELL.h);
      vignette(ctx, w, h, 0.55);
      ctx.restore();

      if (t < 1.4) bigText(ctx, w, h, 'FIGHT!', t, Math.floor(t * 8) % 2 ? '#ffd166' : '#ff6b6b', 28);
      if (simT - lastKo < 0.8 && koCount > 0 && !winner) bigText(ctx, w, h, 'K.O.', t, '#ff5050', 28);
      if (winner) { bigText(ctx, w, h, 'ЧЕМПИОН!', t, '#ffd166', 24); if (Math.floor(t * 6) % 3 === 0) particles.burst(x0 + 320, yOff + 120, t, rnd, { count: 8, speed: 120, colors: ['#21a038', '#ffffff', '#ffd166', '#2fc24f'], life: 1.4, gravity: 120, size: 2 }); }
      buffer.blit();
      if (t >= finalAt) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
