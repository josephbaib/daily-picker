import { drawSprite, SPRITE_W, SPRITE_H } from '../sprite.js?v=0a3148a-1452';
import { mulberry32 } from '../rng.js?v=0a3148a-1452';
import { label, makeParticles, drawStands } from './scene.js?v=0a3148a-1452';

// Драка: все на ринге дерутся одновременно. Симуляция идёт фиксированным шагом от сида,
// поэтому у всех зрителей картинка одинаковая. Кто и когда вылетает, задано порядком заранее.
const STEP = 1 / 30;

export default {
  id: 'brawl',
  title: 'Драка',
  description: 'Королевская битва на ринге под рёв трибун, и последний, кто устоит на ногах, забирает слово.',
  duration: 20,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1a1626'; ctx.fillRect(0, 0, w, h);
    drawStands(ctx, 0, h * 0.05, w, 2, t, 0, 1);
    ctx.fillStyle = '#c9c0a8'; ctx.fillRect(w * 0.1, h * 0.5, w * 0.8, h * 0.45);
    ctx.fillStyle = '#e53935'; for (let i = 0; i < 3; i++) ctx.fillRect(w * 0.1, h * 0.5 - 10 - i * 10, w * 0.8, 3);
    people.slice(0, 3).forEach((p, i) => drawSprite(ctx, p.person, i === 1 ? 'hurt' + (Math.floor(t * 4) % 3) : 'slash' + (Math.floor(t * 8 + i) % 6), w * 0.2 + i * w * 0.24, h * 0.5 - SPRITE_H * 1.5 + 20, 1.5));
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const ctx = canvas.getContext('2d');
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
    const particles = makeParticles();

    // состояние бойцов в нормированных координатах ринга (0..1)
    const F = participants.map((p, i) => ({
      p, id: p.id, x: 0.15 + (i % 4) * 0.23 + rnd() * 0.05, y: 0.2 + Math.floor(i / 4) * 0.3 + rnd() * 0.1,
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
      if (start === null) start = now;
      const t = (now - start) / 1000;
      while (simT + STEP <= t) step(STEP);
      const w = canvas.width, h = canvas.height;
      const scale = Math.max(2, Math.min(4, Math.floor(h / 260)));
      const ringX = w * 0.12, ringY = h * 0.4, ringW = w * 0.76, ringH = h * 0.5;
      const winner = koCount === victims.length && t >= finalAt - 2.6;

      // зал, трибуны, ринг
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#12101c'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,240,200,0.06)'; ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.02, h); ctx.lineTo(w * 0.98, h); ctx.fill();
      drawStands(ctx, 0, h * 0.04, w, 2, t, 0, Math.max(1, scale - 1));
      ctx.fillStyle = '#ffd166'; ctx.fillRect(w / 2 - 110, h * 0.02, 220, 22); ctx.fillStyle = '#111'; ctx.font = "9px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('B2Bсосы FIGHT NIGHT', w / 2 - 100, h * 0.02 + 7);
      ctx.fillStyle = '#2a2436'; ctx.fillRect(ringX - 24, ringY - 34, ringW + 48, ringH + 70);
      ctx.fillStyle = '#d8cfb6'; ctx.fillRect(ringX - 10, ringY - 24, ringW + 20, ringH + 44);
      ctx.fillStyle = '#21a038'; ctx.beginPath(); ctx.arc(ringX + ringW / 2, ringY + ringH / 2, 46, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d8cfb6'; ctx.beginPath(); ctx.arc(ringX + ringW / 2, ringY + ringH / 2, 34, 0, Math.PI * 2); ctx.fill();
      [0, 1, 2].forEach((i) => { ctx.fillStyle = i === 1 ? '#fff' : '#e53935'; ctx.fillRect(ringX - 10, ringY - 36 - i * 14, ringW + 20, 4); });
      ctx.fillStyle = '#eee'; [ringX - 10, ringX + ringW + 10].forEach((px) => ctx.fillRect(px - 5, ringY - 76, 10, 96));
      // счётчик нокаутов и надпись FIGHT
      ctx.fillStyle = '#fff'; ctx.font = "10px 'Press Start 2P', monospace"; ctx.fillText(`K.O. ${koCount} / ${victims.length}`, 20, h * 0.36);
      if (t < 1.4) { ctx.fillStyle = Math.floor(t * 8) % 2 ? '#ffd166' : '#ff6b6b'; ctx.font = "48px 'Press Start 2P', monospace"; ctx.textAlign = 'center'; ctx.fillText('FIGHT!', w / 2, h * 0.5); ctx.textAlign = 'left'; }
      if (simT - lastKo < 0.8 && koCount > 0) { ctx.fillStyle = '#ff6b6b'; ctx.font = "40px 'Press Start 2P', monospace"; ctx.textAlign = 'center'; ctx.fillText('K.O.', w / 2, h * 0.3); ctx.textAlign = 'left'; }

      // выбывшие лежат у ринга
      F.filter((f) => f.out && simT - f.out.t > 1.3).forEach((f) => {
        const rx = f.out.dir > 0 ? w - 60 - f.ringside * 30 : 10 + f.ringside * 30;
        drawSprite(ctx, f.p.person, 'hurt5', rx, ringY + ringH + 50 - SPRITE_H * scale + f.ringside * 10, Math.max(2, scale - 1));
      });
      // бойцы по глубине
      const drawOrder = [...F].sort((a, b) => a.y - b.y);
      drawOrder.forEach((f) => {
        const px = Math.round(ringX + f.x * ringW - SPRITE_W * scale / 2), py = Math.round(ringY + f.y * ringH - SPRITE_H * scale + 10);
        if (f.out) {
          const age = simT - f.out.t;
          if (age > 1.3) return;
          drawSprite(ctx, f.p.person, 'hurt' + Math.min(5, Math.floor(age * 6)), px, py - Math.sin(Math.min(1, age) * Math.PI) * 60, scale);
          for (let s = 0; s < 4; s++) { ctx.fillStyle = '#ffd166'; const ang = age * 16 + s * 1.6; ctx.fillRect(px + SPRITE_W * scale / 2 + Math.cos(ang) * 26, py + 14 * scale + Math.sin(ang) * 14, 6, 6); }
          return;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px + 18 * scale, py + SPRITE_H * scale - 6 * scale, 28 * scale, 4 * scale);
        let fr;
        if (winner) fr = Math.floor(t * 5) % 2 ? 'cheer' : 'cheer2';
        else if (f.phase === 'attack') fr = (f.dir < 0 ? 'slashl' : 'slash') + Math.min(5, Math.floor(f.phaseT / 0.45 * 6));
        else if (f.phase === 'stagger') fr = 'hurt0';
        else if (Math.hypot(f.vx, f.vy) > 0.05) fr = (f.dir < 0 ? 'left' : 'run') + (Math.floor(simT * 12 + f.ringside * 8) % 8);
        else fr = f.dir < 0 ? 'stand-left' : 'stand-right';
        if (f.hitFlash > 0 && Math.floor(f.hitFlash * 30) % 2) ctx.globalAlpha = 0.5;
        drawSprite(ctx, f.p.person, fr, px, py, scale);
        ctx.globalAlpha = 1;
        if (f.hitFlash > 0.15) { ctx.fillStyle = '#ffd166'; for (let s = 0; s < 3; s++) { const ang = simT * 20 + s * 2.1; ctx.fillRect(px + SPRITE_W * scale / 2 + Math.cos(ang) * 22, py + 10 * scale + Math.sin(ang) * 12, 5, 5); } }
        // здоровье и имя
        const bw = 44 * scale / 2;
        ctx.fillStyle = '#1a1020'; ctx.fillRect(px + SPRITE_W * scale / 2 - bw / 2, py - 8, bw, 5);
        ctx.fillStyle = f.hp > 0.5 ? '#6ec85a' : f.hp > 0.25 ? '#ffd166' : '#ff6b6b'; ctx.fillRect(px + SPRITE_W * scale / 2 - bw / 2, py - 8, bw * f.hp, 5);
        label(ctx, f.p.name, px + SPRITE_W * scale / 2, py - 24, scale >= 3 ? 9 : 8, winner ? '#ffd166' : '#f4ecd8', 'rgba(12,8,24,0.85)', winner ? '#ffd166' : null);
      });
      [0, 1, 2].forEach((i) => { ctx.fillStyle = i === 1 ? 'rgba(255,255,255,0.9)' : 'rgba(229,57,53,0.9)'; ctx.fillRect(ringX - 10, ringY + ringH + 22 + i * 12, ringW + 20, 4); });
      particles.draw(ctx, t);
      if (winner) { ctx.fillStyle = 'rgba(255,230,160,0.08)'; ctx.fillRect(0, 0, w, h); if (Math.floor(t * 6) % 3 === 0) particles.burst(w / 2, ringY - 60, t, rnd, { count: 10, speed: 200, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc'], life: 1.3, gravity: 200, size: 4 }); }

      if (t >= finalAt) { stopped = true; onFreeze(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  },
};
