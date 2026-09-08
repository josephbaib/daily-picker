import { spriteCanvas, SPRITE_W } from '../sprite.js';
import { mulberry32 } from '../rng.js';
import { label, makeParticles, drawDesk, drawPlant, drawNpc } from './scene.js';

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
  // потолок: плиты, лампы, вентиляция
  ctx.fillStyle = '#d6d2c6'; ctx.fillRect(0, 0, w, floorY * 0.2);
  ctx.fillStyle = '#c4c0b4'; for (let x = -((camX * 0.5) % 60); x < w; x += 60) ctx.fillRect(x, 0, 2, floorY * 0.2); for (let y = 0; y < floorY * 0.2; y += 30) ctx.fillRect(0, y, w, 2);
  for (let x = -((camX * 0.5) % 260) - 260; x < w; x += 260) {
    ctx.fillStyle = 'rgba(255,255,240,0.18)'; ctx.fillRect(x + 20, floorY * 0.12, 180, floorY * 0.5);
    ctx.fillStyle = '#fbfbf2'; ctx.fillRect(x + 40, floorY * 0.1, 140, 8);
    ctx.fillStyle = '#9a9a90'; ctx.fillRect(x + 210, floorY * 0.06, 30, 10); ctx.fillStyle = '#7a7a70'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 212, floorY * 0.06 + 2 + k * 2, 26, 1);
  }
  // стена: стеклянные перегородки с опенспейсом, двери, доска, кулер, принтер
  ctx.fillStyle = WALL; ctx.fillRect(0, floorY * 0.2, w, floorY * 0.8);
  ctx.fillStyle = WALL2; ctx.fillRect(0, floorY * 0.2, w, 6); ctx.fillRect(0, floorY - 10, w, 10);
  ctx.fillStyle = '#c8c2b0'; ctx.fillRect(0, floorY * 0.62, w, 3);
  const rnd = mulberry32(21);
  let seg = 0;
  for (let x = -((camX * 0.5) % 420) - 420; x < w; x += 420, seg++) {
    const kind = Math.floor(rnd() * 3);
    if (kind === 0) {
      // опенспейс за стеклом: столы, мониторы, коллеги
      ctx.fillStyle = '#e9f1f7'; ctx.fillRect(x + 20, floorY * 0.26, 260, floorY * 0.6);
      ctx.fillStyle = '#b9c8d6'; ctx.fillRect(x + 20, floorY * 0.26, 260, 4); ctx.fillRect(x + 148, floorY * 0.26, 4, floorY * 0.6);
      drawDesk(ctx, x + 30, floorY * 0.84, 1, seg * 3 + 1, t); drawDesk(ctx, x + 160, floorY * 0.84, 1, seg * 3 + 2, t);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 30, floorY * 0.28, 40, floorY * 0.56);
    } else if (kind === 1) {
      // дверь кабинета с табличкой и выходом
      ctx.fillStyle = '#8a6a4a'; ctx.fillRect(x + 60, floorY * 0.3, 70, floorY * 0.7);
      ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x + 66, floorY * 0.34, 58, floorY * 0.62);
      ctx.fillStyle = '#e0c060'; ctx.fillRect(x + 114, floorY * 0.62, 6, 6);
      ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x + 72, floorY * 0.4, 46, 12); ctx.fillStyle = '#333'; ctx.font = "5px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('B2B', x + 84, floorY * 0.4 + 3);
      ctx.fillStyle = '#21a038'; ctx.fillRect(x + 150, floorY * 0.24, 40, 14); ctx.fillStyle = '#fff'; ctx.fillText('EXIT', x + 154, floorY * 0.24 + 4);
      drawNpc(ctx, seg + 5, 'back', x + 220, floorY - 64 * 1.6 + 4, 1.6);
      ctx.fillStyle = '#c0d8f0'; ctx.fillRect(x + 300, floorY * 0.55, 26, 34); ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x + 298, floorY * 0.55 + 34, 30, floorY * 0.45 - 34); ctx.fillStyle = '#3c8cdc'; ctx.fillRect(x + 306, floorY * 0.55 + 42, 6, 6);
    } else {
      // доска с заметками, кофемашина, огнетушитель, часы
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 40, floorY * 0.3, 110, 70); ctx.fillStyle = '#c8c8c8'; ctx.fillRect(x + 40, floorY * 0.3, 110, 3);
      [['#ff6b6b', 48, 8], ['#3c8cdc', 74, 12], ['#ffd166', 100, 6], ['#6ec85a', 60, 36], ['#ff8c42', 96, 40]].forEach(([c, dx, dy]) => { ctx.fillStyle = c; ctx.fillRect(x + dx, floorY * 0.3 + dy, 22, 22); });
      ctx.fillStyle = '#21a038'; ctx.fillRect(x + 124, floorY * 0.3 + 40, 20, 20); ctx.fillStyle = '#fff'; ctx.fillRect(x + 128, floorY * 0.3 + 46, 12, 3);
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(x + 200, floorY * 0.6, 40, 50); ctx.fillStyle = '#ff5050'; ctx.fillRect(x + 206, floorY * 0.6 + 8, 6, 6); ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x + 214, floorY * 0.6 + 30, 14, 10);
      ctx.fillStyle = '#d02020'; ctx.fillRect(x + 280, floorY * 0.7, 14, 34); ctx.fillStyle = '#222'; ctx.fillRect(x + 284, floorY * 0.7 - 6, 6, 8);
      ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x + 340, floorY * 0.28, 34, 34); ctx.fillStyle = '#222'; ctx.fillRect(x + 356, floorY * 0.28 + 6, 2, 12); ctx.fillRect(x + 356, floorY * 0.28 + 17, 9, 2);
      drawPlant(ctx, x + 380, floorY, 1);
    }
  }
  // ковролин с полосками и тенью от стены
  ctx.fillStyle = CARPET; ctx.fillRect(0, floorY, w, h - floorY);
  ctx.fillStyle = CARPET2; for (let x = -((camX) % 40) - 40; x < w; x += 40) ctx.fillRect(x, floorY, 20, h - floorY);
  ctx.fillStyle = '#2c3a54'; for (let y = floorY; y < h; y += 26) ctx.fillRect(0, y, w, 2);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, floorY, w, 10);
}

export default {
  id: 'chairs',
  title: 'Гонки на стульях',
  description: 'Безумный заезд на офисных креслах по коридору, где на кону не кубок, а первое слово на дейлике.',
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
