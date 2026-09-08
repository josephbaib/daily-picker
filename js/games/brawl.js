import { drawSprite, SPRITE_W, SPRITE_H } from '../sprite.js';
import { mulberry32 } from '../rng.js';
import { label, makeParticles, drawStands } from './scene.js';
import { frameRect } from '../lpc.js';

// Драка: все на ринге, каждый раунд один вылетает за канаты. Последний на ногах говорит первым.
function slashFrame(i) { return 'slash' + (i % 6); }

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
    people.slice(0, 3).forEach((p, i) => drawSprite(ctx, p.person, i === 1 ? 'hurt' + (Math.floor(t * 4) % 3) : 'idle', w * 0.2 + i * w * 0.24, h * 0.5 - SPRITE_H * 1.5 + 20, 1.5));
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rnd = mulberry32(seed);
    const victims = [...order].reverse().slice(0, n - 1);
    const base = n > 10 ? 0.9 : 1.6;
    const gaps = victims.map((_, i) => base + (2.4 - base) * Math.pow(i / Math.max(1, victims.length - 1), 2));
    const total = gaps.reduce((s, g) => s + g, 0);
    const k = total > 17 ? 17 / total : 1;
    const fights = []; let acc = 1.0;
    victims.forEach((id, i) => {
      const alive = participants.filter((p) => p.id !== id && !victims.slice(0, i).includes(p.id));
      const attacker = alive[Math.floor(rnd() * alive.length)];
      fights.push({ victim: id, attacker: attacker.id, at: acc + gaps[i] * k, side: rnd() < 0.5 ? -1 : 1 });
      acc += gaps[i] * k;
    });
    const finalAt = acc + 2.4;
    const particles = makeParticles();
    const out = new Map(); // id -> {time, dir}
    let start = null, raf = 0, stopped = false, fired = 0;
    const jit = participants.map(() => rnd() * 6.28);

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const t = (now - start) / 1000;
      const w = canvas.width, h = canvas.height;
      const cols = Math.ceil(Math.sqrt(n * 1.6)), rows = Math.ceil(n / cols);
      const ringTop = h * 0.42, ringBottom = h * 0.9;
      const scale = Math.max(2, Math.min(4, Math.floor(Math.min((w * 0.6) / cols / (SPRITE_W * 0.7), (ringBottom - ringTop) / rows / (SPRITE_H * 0.8)))));
      const cellW = (w * 0.6) / cols, rowH = (ringBottom - ringTop - SPRITE_H * scale * 0.5) / Math.max(1, rows);
      const pos = participants.map((p, i) => { const r = Math.floor(i / cols), c = i % cols; const inRow = Math.min(cols, n - r * cols); return { x: Math.round(w * 0.2 + (cols - inRow) * cellW / 2 + c * cellW + cellW / 2 - SPRITE_W * scale / 2), y: Math.round(ringTop + r * rowH), r }; });

      while (fired < fights.length && t >= fights[fired].at) { const f = fights[fired]; out.set(f.victim, { time: t, dir: f.side }); fired++; if (onEvent) onEvent('pop'); }
      const cur = fired < fights.length ? fights[fired] : null;
      const winner = fired === fights.length && t >= finalAt - 2.4;

      // зал, трибуны, ринг с канатами
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#12101c'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,240,200,0.06)'; ctx.beginPath(); ctx.moveTo(w * 0.5, 0); ctx.lineTo(w * 0.05, ringBottom); ctx.lineTo(w * 0.95, ringBottom); ctx.fill();
      drawStands(ctx, 0, h * 0.04, w, 2, t, 0, Math.max(1, scale - 1));
      ctx.fillStyle = '#ffd166'; ctx.fillRect(w / 2 - 110, h * 0.02, 220, 22); ctx.fillStyle = '#111'; ctx.font = "9px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('B2Bсосы FIGHT NIGHT', w / 2 - 100, h * 0.02 + 7);
      ctx.fillStyle = '#2a2436'; ctx.fillRect(w * 0.08, ringTop - 30, w * 0.84, ringBottom - ringTop + 60);
      ctx.fillStyle = '#d8cfb6'; ctx.fillRect(w * 0.1, ringTop - 20, w * 0.8, ringBottom - ringTop + 40);
      ctx.fillStyle = '#21a038'; ctx.beginPath(); ctx.arc(w / 2, (ringTop + ringBottom) / 2, 40, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#d8cfb6'; ctx.beginPath(); ctx.arc(w / 2, (ringTop + ringBottom) / 2, 30, 0, Math.PI * 2); ctx.fill();
      [0, 1, 2].forEach((i) => { ctx.fillStyle = i === 1 ? '#fff' : '#e53935'; ctx.fillRect(w * 0.1, ringTop - 32 - i * 14, w * 0.8, 4); });
      ctx.fillStyle = '#eee'; [w * 0.1, w * 0.9].forEach((px) => ctx.fillRect(px - 5, ringTop - 70, 10, 90));
      [0, 1, 2].forEach((i) => { ctx.fillStyle = i === 1 ? 'rgba(255,255,255,0.9)' : 'rgba(229,57,53,0.9)'; ctx.fillRect(w * 0.1, ringBottom + 12 + i * 12, w * 0.8, 4); });

      const drawOrder = [...participants.keys()].sort((a, b) => pos[a].r - pos[b].r);
      drawOrder.forEach((i) => {
        const p = participants[i], { x, y } = pos[i];
        const o = out.get(p.id);
        if (o) {
          const age = t - o.time;
          if (age > 1.4) return;
          // вылетает за канаты, кувыркаясь
          const fx = x + o.dir * age * 420, fy = y - Math.sin(Math.min(1, age / 1.2) * Math.PI) * 140 + age * age * 60;
          drawSprite(ctx, p.person, 'hurt' + Math.min(5, Math.floor(age * 6)), fx, fy, scale);
          if (age < 0.3) { for (let s = 0; s < 3; s++) { ctx.fillStyle = '#ffd166'; const ang = age * 20 + s * 2.1; ctx.fillRect(x + SPRITE_W * scale / 2 + Math.cos(ang) * 30, y + 10 * scale + Math.sin(ang) * 20, 6, 6); } }
          return;
        }
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 18 * scale, y + SPRITE_H * scale - 6 * scale, 28 * scale, 4 * scale);
        let fr = 'idle', dx = 0;
        const bob = Math.round(Math.sin(t * 6 + jit[i]) * 1.5);
        if (cur && cur.attacker === p.id) {
          // нападающий подбегает и бьёт
          const vi = participants.findIndex((q) => q.id === cur.victim); const vx = pos[vi].x;
          const local = Math.max(0, t - (cur.at - 0.9));
          const dir = vx > x ? 1 : -1;
          dx = Math.min(1, local / 0.6) * (vx - x - dir * SPRITE_W * scale * 0.6);
          fr = local < 0.6 ? 'run' + (Math.floor(local * 12) % 8) : slashFrame(Math.floor((local - 0.6) * 20));
          drawSprite(ctx, p.person, fr, x + dx, y + bob, scale, dir < 0 && fr.startsWith('run'));
        } else {
          if (cur && cur.victim === p.id && t > cur.at - 0.4) dx = Math.round(Math.sin(t * 40) * 2);
          drawSprite(ctx, p.person, winner ? (Math.floor(t * 5) % 2 ? 'cheer' : 'cheer2') : 'idle', x + dx, y + bob, scale);
        }
        label(ctx, p.name, x + dx + SPRITE_W * scale / 2, y - 4 + bob, scale >= 3 ? 9 : 8, winner ? '#ffd166' : '#f4ecd8', 'rgba(12,8,24,0.85)', winner ? '#ffd166' : null);
      });
      particles.draw(ctx, t);
      if (winner) { ctx.fillStyle = 'rgba(255,230,160,0.08)'; ctx.fillRect(0, 0, w, h); if (Math.floor(t * 6) % 3 === 0) particles.burst(w / 2, ringTop - 60, t, rnd, { count: 10, speed: 200, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc'], life: 1.3, gravity: 200, size: 4 }); }

      if (t >= finalAt) { stopped = true; onFreeze(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  },
};
