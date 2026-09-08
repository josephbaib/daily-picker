import { spriteCanvas, SPRITE_W } from '../sprite.js';
import { mulberry32 } from '../rng.js';
import { label, makeParticles } from './scene.js';

// Гонки на офисных стульях по коридору до переговорки.
const CARPET = '#3a4a6a', CARPET2 = '#34435f', WALL = '#e8e2d2', WALL2 = '#d8d0bc';

function drawChair(ctx, x, y, scale, color = '#2a2a34') {
  // x,y: левый верх сиденья. Пропорции в «пикселях» спрайта: сиденье 14×3, спинка 3×10, ножка, крестовина с колёсами
  const s = scale;
  ctx.fillStyle = '#1a1a22';
  ctx.fillRect(x - 2 * s, y - 11 * s, 3 * s, 12 * s);               // спинка (слева, персонаж смотрит вправо)
  ctx.fillStyle = color; ctx.fillRect(x - 1 * s, y - 10 * s, 2 * s, 10 * s);
  ctx.fillStyle = '#1a1a22'; ctx.fillRect(x - 2 * s, y, 15 * s, 3 * s);   // сиденье
  ctx.fillStyle = color; ctx.fillRect(x - 1 * s, y + 1 * s, 13 * s, 1 * s);
  ctx.fillStyle = '#8a8a9a'; ctx.fillRect(x + 5 * s, y + 3 * s, 2 * s, 5 * s); // газлифт
  ctx.fillStyle = '#2a2a34';
  ctx.fillRect(x - 1 * s, y + 8 * s, 14 * s, 1 * s);                   // крестовина
  ctx.fillRect(x + 2 * s, y + 7 * s, 8 * s, 1 * s);
  ctx.fillStyle = '#111'; [-1, 5, 12].forEach((k) => ctx.fillRect(x + k * s, y + 9 * s, 2 * s, 2 * s)); // колёса
}

const COLORS = { black: '#26262c', charcoal: '#3c3c44', navy: '#2a3a68', bluegray: '#55627e', slate: '#5a6478', orange: '#e0782a', brown: '#6b4a2e', white: '#e8e8e8', gray: '#8a8a94', forest: '#3a6a3a', tan: '#c8a878' };

function drawRider(ctx, person, x, y, scale, kick, tilt) {
  // персонаж сидит: верх тела из кадра «стоит вправо», ноги рисуем отдельно и они толкаются
  const src = spriteCanvas(person, 'stand-right', scale);
  const bodyRows = 42;
  ctx.save();
  ctx.translate(x + 12 * scale, y);
  ctx.rotate(tilt);
  drawChair(ctx, 0, 0, scale * 1.2);
  ctx.drawImage(src, 0, 0, SPRITE_W * scale, bodyRows * scale, -22 * scale, -bodyRows * scale + 3 * scale, SPRITE_W * scale, bodyRows * scale);
  const k = Math.sin(kick);
  ctx.fillStyle = COLORS[person.legs] || '#3c3c44';
  ctx.fillRect(10 * scale, -1 * scale, (9 + k * 4) * scale, 4 * scale);
  ctx.fillRect((16 + k * 4) * scale, 2 * scale, 4 * scale, (7 + Math.max(0, -k) * 3) * scale);
  ctx.fillStyle = COLORS[person.feet] || '#26262c';
  ctx.fillRect((16 + k * 4) * scale, (9 + Math.max(0, -k) * 3) * scale, 6 * scale, 3 * scale);
  ctx.restore();
}

function drawCorridor(ctx, w, h, camX, t, floorY) {
  // потолок с лампами
  ctx.fillStyle = '#c8c4b8'; ctx.fillRect(0, 0, w, floorY * 0.18);
  ctx.fillStyle = '#f8f8f0';
  for (let x = -((camX * 0.5) % 260) - 260; x < w; x += 260) ctx.fillRect(x + 40, floorY * 0.1, 140, 8);
  // стена, окна и двери
  ctx.fillStyle = WALL; ctx.fillRect(0, floorY * 0.18, w, floorY * 0.82);
  ctx.fillStyle = WALL2; ctx.fillRect(0, floorY * 0.18, w, 6); ctx.fillRect(0, floorY - 10, w, 10);
  const rnd = mulberry32(21);
  for (let x = -((camX * 0.5) % 320) - 320; x < w; x += 320) {
    const kind = Math.floor(rnd() * 3);
    if (kind === 0) { // окно с городом
      ctx.fillStyle = '#7fb0e0'; ctx.fillRect(x + 30, floorY * 0.28, 120, floorY * 0.35);
      ctx.fillStyle = '#4a6a9a'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 40 + i * 28, floorY * 0.42 + (i % 2) * 14, 18, floorY * 0.21 - (i % 2) * 14);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 88, floorY * 0.28, 4, floorY * 0.35); ctx.fillRect(x + 30, floorY * 0.45, 120, 4);
    } else if (kind === 1) { // дверь кабинета
      ctx.fillStyle = '#8a6a4a'; ctx.fillRect(x + 60, floorY * 0.3, 70, floorY * 0.7);
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x + 66, floorY * 0.34, 58, floorY * 0.62);
      ctx.fillStyle = '#e0c060'; ctx.fillRect(x + 114, floorY * 0.62, 6, 6);
    } else { // плакат и доска
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 40, floorY * 0.3, 90, 60);
      ctx.fillStyle = '#ff6b6b'; ctx.fillRect(x + 48, floorY * 0.3 + 8, 74, 12);
      ctx.fillStyle = '#3c8cdc'; ctx.fillRect(x + 48, floorY * 0.3 + 26, 40, 8); ctx.fillRect(x + 48, floorY * 0.3 + 40, 60, 8);
    }
    // реквизит у стены: кулер, фикус, принтер
    const prop = Math.floor(rnd() * 3);
    const px = x + 210;
    if (prop === 0) { ctx.fillStyle = '#c0d8f0'; ctx.fillRect(px, floorY * 0.55, 26, 34); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(px - 2, floorY * 0.55 + 34, 30, floorY * 0.45 - 34); ctx.fillStyle = '#3c8cdc'; ctx.fillRect(px + 6, floorY * 0.55 + 42, 6, 6); }
    else if (prop === 1) { ctx.fillStyle = '#b06a3a'; ctx.fillRect(px + 4, floorY * 0.8, 22, floorY * 0.2); ctx.fillStyle = '#3c9a3c'; ctx.fillRect(px - 8, floorY * 0.5, 46, floorY * 0.3); ctx.fillStyle = '#58b858'; ctx.fillRect(px, floorY * 0.44, 28, 20); }
    else { ctx.fillStyle = '#d0d0d0'; ctx.fillRect(px, floorY * 0.72, 44, 22); ctx.fillStyle = '#a0a0a0'; ctx.fillRect(px, floorY * 0.72 + 22, 44, floorY * 0.28 - 22); ctx.fillStyle = '#58b858'; ctx.fillRect(px + 34, floorY * 0.72 + 6, 4, 4); }
  }
  // ковролин с полосками
  ctx.fillStyle = CARPET; ctx.fillRect(0, floorY, w, h - floorY);
  ctx.fillStyle = CARPET2;
  for (let x = -((camX) % 40) - 40; x < w; x += 40) ctx.fillRect(x, floorY, 20, h - floorY);
  ctx.fillStyle = '#2c3a54'; for (let y = floorY; y < h; y += 26) ctx.fillRect(0, y, w, 2);
}

export default {
  id: 'chairs',
  title: 'Гонки на стульях',
  description: 'Офисный коридор, кресла на колёсиках, финиш в переговорке. Кто вкатился первым, тот первым говорит.',
  duration: 13,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    drawCorridor(ctx, w, h, t * 120, t, h * 0.6);
    people.slice(0, 3).forEach((p, i) => {
      const x = ((t * 70 + i * 90) % (w + 120)) - 80;
      drawRider(ctx, p.person, x, h * 0.62 + i * 14, 2, t * 12 + i, Math.sin(t * 6 + i) * 0.04);
    });
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rank = new Map(order.map((id, i) => [id, i]));
    const rnd = mulberry32(seed);
    const rows = Math.min(n, 4);
    const riders = participants.map((p, i) => ({
      p, rank: rank.get(p.id), row: i % rows,
      final: 1 - rank.get(p.id) * (0.22 / n),
      f: 1.1 + rnd() * 1.3, phase: rnd() * Math.PI * 2, amp: 0.07 + rnd() * 0.07,
      spinAt: 2 + rnd() * 8, kick: rnd() * 6,
    }));
    const particles = makeParticles();
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, lastPuff = 0, doorOpened = null;

    const progress = (r, t) => {
      const ease = 1 - Math.pow(1 - t, 2.4);
      const noise = r.amp * Math.sin(2 * Math.PI * (r.f * t + r.phase)) * Math.pow(1 - t, 1.6) * Math.pow(t, 0.5);
      return Math.max(0, Math.min(r.final, r.final * ease + noise));
    };

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const time = (now - start) / 1000;
      const t = Math.min(1, time / dur);
      const w = canvas.width, h = canvas.height;
      const scale = n <= 8 ? Math.max(2, Math.min(4, Math.floor(h / 260))) : Math.max(2, Math.min(3, Math.floor(h / 330)));
      const floorY = Math.round(h * 0.52);
      const rowH = (h - floorY - 20 * scale) / Math.max(1, rows);
      const startX = 100, L = w * 2.6, finishX = startX + L;
      const ps = riders.map((r) => progress(r, t));
      const leader = Math.max(...ps);
      const camX = Math.max(0, Math.min(finishX + 260 - w, startX + leader * L - w * 0.6));

      ctx.imageSmoothingEnabled = false;
      drawCorridor(ctx, w, h, camX, time, floorY);
      // переговорка в конце коридора
      const fx = Math.round(finishX - camX);
      const open = doorOpened !== null ? Math.min(1, (time - doorOpened) * 3) : 0;
      ctx.fillStyle = '#8a6a4a'; ctx.fillRect(fx, floorY * 0.26, 120, h - floorY * 0.26);
      ctx.fillStyle = '#ffe9a0'; ctx.fillRect(fx + 8, floorY * 0.3, 104 * open, h - floorY * 0.3);
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(fx + 8 + 104 * open, floorY * 0.3, 104 * (1 - open), h - floorY * 0.3);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(fx + 12, floorY * 0.12, 96, 26);
      ctx.fillStyle = '#1a1428'; ctx.font = "8px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('ПЕРЕГОВОРКА', fx + 16, floorY * 0.12 + 9);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(fx - 4, floorY, 4, h - floorY);

      const orderDraw = [...riders.keys()].sort((a, b) => riders[a].row - riders[b].row);
      if (time - lastPuff > 0.1 && t < 1) {
        lastPuff = time;
        riders.forEach((r, i) => {
          const x = startX + ps[i] * L - camX;
          if (x > -50 && x < w + 50) particles.puff(x, floorY + r.row * rowH + 11 * scale + 8, time, rnd, 'rgba(120,130,160,0.6)');
        });
      }
      particles.draw(ctx, time);
      orderDraw.forEach((i) => {
        const r = riders[i];
        const x = Math.round(startX + ps[i] * L - camX);
        if (x < -120 || x > w + 120) return;
        const y = Math.round(floorY + r.row * rowH + 40 * scale);
        const speed = t < 1 ? 1 : 0;
        const spinning = time > r.spinAt && time < r.spinAt + 0.7 && t < 0.9;
        const tilt = spinning ? ((time - r.spinAt) / 0.7) * Math.PI * 2 : Math.sin(time * 8 + r.kick) * 0.03 * speed;
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 4 * scale, y + 14 * scale, 34 * scale, scale);
        drawRider(ctx, r.p.person, x, y, scale, time * 12 * (0.7 + r.f * 0.3) + r.kick, tilt);
        const first = t >= 1 && r.rank === 0;
        label(ctx, r.p.name, x + 12 * scale, y - 46 * scale, scale >= 4 ? 10 : 8, first ? '#ffd166' : '#f4ecd8', 'rgba(12,8,24,0.85)', first ? '#ffd166' : null);
      });

      if (doorOpened === null && leader >= 0.975) { doorOpened = time; if (onEvent) onEvent('pop'); particles.burst(fx + 40, floorY * 0.5, time, rnd, { count: 50, speed: 240, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#ffffff'], life: 1.4 }); }
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  },
};
