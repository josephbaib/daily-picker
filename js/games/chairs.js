import { spriteCanvas, SPRITE_W } from '../sprite.js?v=ed139c8-1737';
import { mulberry32 } from '../rng.js?v=ed139c8-1737';
import { label, makeParticles, drawDesk, drawPlant, drawNpc, drawNpcBust, nextFrame, cancelFrame } from './scene.js?v=ed139c8-1737';
import { makeWarp, beginCamera, impactRing, drawAmbient, vignette, speedLines, bigText } from './fx.js?v=ed139c8-1737';

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

function darken(hex) { const n = parseInt(hex.slice(1), 16); const r = (n >> 16) * 0.6, g = ((n >> 8) & 255) * 0.6, b = (n & 255) * 0.6; return `rgb(${r | 0},${g | 0},${b | 0})`; }
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
  // две ноги в противофазе: дальняя темнее
  [[Math.sin(kick + Math.PI), 0.7, 1], [Math.sin(kick), 1, 0]].forEach(([k, shade, front]) => {
    const pants = COLORS[person.legs] || '#3c3c44', shoes = COLORS[person.feet] || '#26262c';
    ctx.fillStyle = shade < 1 ? darken(pants) : pants;
    ctx.fillRect((10 - front) * scale, (-1 - front) * scale, (9 + k * 4) * scale, 4 * scale);
    ctx.fillRect((16 + k * 4 - front) * scale, (2 - front) * scale, 4 * scale, (7 + Math.max(0, -k) * 3) * scale);
    ctx.fillStyle = shade < 1 ? darken(shoes) : shoes;
    ctx.fillRect((16 + k * 4 - front) * scale, (9 + Math.max(0, -k) * 3 - front) * scale, 6 * scale, 3 * scale);
  });
  ctx.restore();
}

// Панорама офиса: шесть фиксированных сегментов по 420 px, привязаны к мировой координате,
// поэтому при движении камеры ничего не перескакивает. Параллакс 0.5 к дорожке.
const SEG = 420;
function drawSegment(ctx, kind, x, floorY, t, idx) {
  const top = floorY * 0.2;
  if (kind === 0) {
    // опенспейс за стеклом
    ctx.fillStyle = '#e9f1f7'; ctx.fillRect(x + 16, floorY * 0.26, SEG - 32, floorY * 0.6);
    ctx.fillStyle = '#b9c8d6'; ctx.fillRect(x + 16, floorY * 0.26, SEG - 32, 4); ctx.fillRect(x + SEG / 2 - 2, floorY * 0.26, 4, floorY * 0.6);
    drawDesk(ctx, x + 40, floorY * 0.84, 1, idx * 3 + 1, t); drawDesk(ctx, x + 220, floorY * 0.84, 1, idx * 3 + 2, t);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 30, floorY * 0.28, 40, floorY * 0.56);
    drawPlant(ctx, x + SEG - 60, floorY * 0.86, 1);
  } else if (kind === 1) {
    // переговорка: стол, люди, телевизор с графиком
    ctx.fillStyle = '#e4ecf2'; ctx.fillRect(x + 16, floorY * 0.26, SEG - 32, floorY * 0.6);
    ctx.fillStyle = '#b9c8d6'; ctx.fillRect(x + 16, floorY * 0.26, SEG - 32, 4);
    ctx.fillStyle = '#1d2230'; ctx.fillRect(x + 40, floorY * 0.32, 90, 56); ctx.fillStyle = '#3aa0ff'; ctx.fillRect(x + 44, floorY * 0.32 + 4, 82, 48);
    ctx.fillStyle = '#21a038'; for (let i = 0; i < 6; i++) { const bh = 8 + (i * 7) % 30 + Math.round(Math.sin(t * 2 + i) * 3); ctx.fillRect(x + 50 + i * 12, floorY * 0.32 + 44 - bh, 8, bh); } ctx.fillStyle = '#fff'; ctx.fillRect(x + 48, floorY * 0.32 + 44, 74, 1);
    ctx.fillStyle = '#c9b89a'; ctx.fillRect(x + 150, floorY * 0.6, 200, 10); ctx.fillStyle = '#a58f6e'; ctx.fillRect(x + 160, floorY * 0.6 + 10, 8, 30); ctx.fillRect(x + 332, floorY * 0.6 + 10, 8, 30);
    [0, 1, 2].forEach((i) => drawNpcBust(ctx, idx * 4 + i, x + 160 + i * 64, floorY * 0.6 - 44, 1, 30));
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 150, floorY * 0.62, 30, 2); ctx.fillRect(x + 240, floorY * 0.62, 30, 2);
  } else if (kind === 2) {
    // кухня: холодильник, кофемашина, стойка, микроволновка
    ctx.fillStyle = '#f2e6c8'; ctx.fillRect(x + 16, floorY * 0.26, SEG - 32, floorY * 0.6);
    ctx.fillStyle = '#e0c9a0'; for (let px = x + 16; px < x + SEG - 16; px += 24) ctx.fillRect(px, floorY * 0.26, 2, floorY * 0.6);
    ctx.fillStyle = '#d8d8e0'; ctx.fillRect(x + 40, floorY * 0.32, 60, floorY * 0.54); ctx.fillStyle = '#b8b8c4'; ctx.fillRect(x + 40, floorY * 0.52, 60, 3); ctx.fillStyle = '#888'; ctx.fillRect(x + 90, floorY * 0.4, 4, 16);
    ctx.fillStyle = '#c9b89a'; ctx.fillRect(x + 120, floorY * 0.62, 240, 10); ctx.fillStyle = '#a58f6e'; ctx.fillRect(x + 120, floorY * 0.62 + 10, 240, floorY * 0.24);
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(x + 140, floorY * 0.62 - 50, 40, 50); ctx.fillStyle = '#ff5050'; ctx.fillRect(x + 146, floorY * 0.62 - 42, 6, 6); ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x + 154, floorY * 0.62 - 20, 14, 10);
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x + 200, floorY * 0.62 - 30, 50, 30); ctx.fillStyle = '#222'; ctx.fillRect(x + 206, floorY * 0.62 - 24, 30, 18);
    ctx.fillStyle = '#fff'; [270, 292, 314].forEach((dx, j) => { ctx.fillRect(x + dx, floorY * 0.62 - 14, 12, 14); for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(255,255,255,${0.35 - k * 0.1})`; ctx.fillRect(x + dx + 4 + Math.sin(t * 3 + k + j) * 2, floorY * 0.62 - 22 - k * 7 - ((t * 15 + j * 5) % 7), 3, 5); } ctx.fillStyle = '#fff'; });
    drawNpc(ctx, idx + 9, 'back', x + 330, floorY * 0.86 - 64 * 1.4 + 4, 1.4);
  } else if (kind === 3) {
    // ресепшен: стойка, логотип, кресла
    ctx.fillStyle = '#e8ecf0'; ctx.fillRect(x + 16, floorY * 0.26, SEG - 32, floorY * 0.6);
    ctx.fillStyle = '#21a038'; ctx.beginPath(); ctx.arc(x + SEG / 2, floorY * 0.42, 26, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e8ecf0'; ctx.beginPath(); ctx.arc(x + SEG / 2, floorY * 0.42, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#21a038'; ctx.fillRect(x + SEG / 2 - 6, floorY * 0.42 - 6, 12, 12);
    ctx.fillStyle = '#1a1428'; ctx.font = "9px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('B2Bсосы', x + SEG / 2 - 34, floorY * 0.52);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 120, floorY * 0.64, 180, floorY * 0.22); ctx.fillStyle = '#21a038'; ctx.fillRect(x + 120, floorY * 0.64, 180, 6);
    drawNpcBust(ctx, idx * 2 + 5, x + 190, floorY * 0.64 - 44, 1, 30);
    ctx.fillStyle = '#6a4a8a'; ctx.fillRect(x + 40, floorY * 0.7, 40, 30); ctx.fillRect(x + 340, floorY * 0.7, 40, 30); ctx.fillStyle = '#5a3a7a'; ctx.fillRect(x + 40, floorY * 0.62, 10, 40); ctx.fillRect(x + 370, floorY * 0.62, 10, 40);
  } else if (kind === 4) {
    // принтерная и шкафы с папками
    ctx.fillStyle = '#ede8dc'; ctx.fillRect(x + 16, floorY * 0.26, SEG - 32, floorY * 0.6);
    for (let sx = x + 30; sx < x + 200; sx += 60) { ctx.fillStyle = '#8a6a4a'; ctx.fillRect(sx, floorY * 0.3, 50, floorY * 0.56); for (let sy = floorY * 0.34; sy < floorY * 0.82; sy += 14) { ['#e53935', '#3c8cdc', '#ffd166', '#6ec85a'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(sx + 4 + i * 11, sy, 9, 10); }); } }
    ctx.fillStyle = '#d0d0d0'; ctx.fillRect(x + 240, floorY * 0.6, 70, 26); ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x + 240, floorY * 0.6, 70, 3); ctx.fillStyle = '#a0a0a0'; ctx.fillRect(x + 240, floorY * 0.6 + 26, 70, floorY * 0.26 - 26); ctx.fillStyle = Math.floor(t * 4) % 2 ? '#58b858' : '#2a6a2a'; ctx.fillRect(x + 298, floorY * 0.6 + 6, 4, 4); ctx.fillStyle = 'rgba(88,184,88,0.25)'; ctx.fillRect(x + 292, floorY * 0.6 + 2, 16, 12);
    ctx.fillStyle = '#fff'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 250 + i * 2, floorY * 0.6 - 4 - i * 2, 40, 3);
    ctx.fillStyle = '#d02020'; ctx.fillRect(x + 350, floorY * 0.7, 14, 34); ctx.fillStyle = '#222'; ctx.fillRect(x + 354, floorY * 0.7 - 6, 6, 8);
  } else {
    // лаунж: диван, кресла-мешки, картина, торшер
    ctx.fillStyle = '#efe4d0'; ctx.fillRect(x + 16, floorY * 0.26, SEG - 32, floorY * 0.6);
    ctx.fillStyle = '#d0b090'; ctx.fillRect(x + 60, floorY * 0.34, 100, 60); ctx.fillStyle = '#21a038'; ctx.fillRect(x + 66, floorY * 0.34 + 6, 88, 48); ctx.fillStyle = '#ffd166'; ctx.fillRect(x + 90, floorY * 0.34 + 20, 24, 24);
    ctx.fillStyle = '#4a6a9a'; ctx.fillRect(x + 190, floorY * 0.6, 160, 30); ctx.fillRect(x + 190, floorY * 0.5, 160, 14); ctx.fillStyle = '#3a5a8a'; ctx.fillRect(x + 190, floorY * 0.5, 14, 40); ctx.fillRect(x + 336, floorY * 0.5, 14, 40);
    drawNpcBust(ctx, idx + 11, x + 230, floorY * 0.5 - 30, 1, 30);
    ctx.fillStyle = '#ff8c42'; ctx.beginPath(); ctx.ellipse(x + 60, floorY * 0.8, 28, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.fillRect(x + 380, floorY * 0.44, 3, floorY * 0.42); ctx.fillStyle = '#ffe9a0'; ctx.fillRect(x + 366, floorY * 0.36, 30, 16);
  }
}

function drawCorridor(ctx, w, h, camX, t, floorY) {
  // потолок: плиты, лампы, вентиляция, привязаны к мировой координате
  ctx.fillStyle = '#d6d2c6'; ctx.fillRect(0, 0, w, floorY * 0.2);
  ctx.fillStyle = '#c4c0b4'; for (let x = -(((camX * 0.5) % 60) + 60); x < w; x += 60) ctx.fillRect(x, 0, 2, floorY * 0.2); for (let y = 0; y < floorY * 0.2; y += 30) ctx.fillRect(0, y, w, 2);
  for (let x = -(((camX * 0.5) % 260) + 260); x < w; x += 260) {
    ctx.fillStyle = 'rgba(255,255,240,0.18)'; ctx.fillRect(x + 20, floorY * 0.12, 180, floorY * 0.5);
    ctx.fillStyle = '#fbfbf2'; ctx.fillRect(x + 40, floorY * 0.1, 140, 8);
    ctx.fillStyle = '#9a9a90'; ctx.fillRect(x + 210, floorY * 0.06, 30, 10); ctx.fillStyle = '#7a7a70'; for (let k = 0; k < 4; k++) ctx.fillRect(x + 212, floorY * 0.06 + 2 + k * 2, 26, 1);
    ctx.save(); ctx.translate(x + 130, floorY * 0.12); ctx.rotate(t * 6); ctx.fillStyle = '#8a8a80'; for (let b = 0; b < 3; b++) { ctx.rotate(Math.PI * 2 / 3); ctx.fillRect(-2, -14, 4, 14); } ctx.restore();
  }
  ctx.fillStyle = WALL; ctx.fillRect(0, floorY * 0.2, w, floorY * 0.8);
  ctx.fillStyle = WALL2; ctx.fillRect(0, floorY * 0.2, w, 6); ctx.fillRect(0, floorY - 10, w, 10);
  ctx.fillStyle = '#c8c2b0'; ctx.fillRect(0, floorY * 0.88, w, 3);
  const world = camX * 0.5;
  const first = Math.floor(world / SEG);
  for (let i = first; i * SEG < world + w; i++) {
    const x = i * SEG - world;
    drawSegment(ctx, ((i % 6) + 6) % 6, x, floorY, t, ((i % 6) + 6) % 6);
    // стойка перегородки между сегментами и указатель
    ctx.fillStyle = '#cfc9b8'; ctx.fillRect(x + SEG - 6, floorY * 0.2, 6, floorY * 0.8);
    if (i % 2 === 0) { ctx.fillStyle = 'rgba(33,160,56,0.3)'; ctx.fillRect(x + 2, floorY * 0.2, 52, 22); ctx.fillStyle = '#21a038'; ctx.fillRect(x + 8, floorY * 0.22, 40, 14); ctx.fillStyle = '#fff'; ctx.font = "5px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('EXIT', x + 12, floorY * 0.22 + 4); }
    ctx.fillStyle = '#c8c2b0'; ctx.fillRect(x, floorY - 16, SEG, 6); ctx.fillStyle = '#e4dccc'; ctx.fillRect(x, floorY - 16, SEG, 2);
    ctx.fillStyle = '#d8d0c0'; ctx.fillRect(x + SEG - 30, floorY - 40, 10, 8); ctx.fillStyle = '#555'; ctx.fillRect(x + SEG - 28, floorY - 38, 2, 3); ctx.fillRect(x + SEG - 24, floorY - 38, 2, 3);
  }
  ctx.fillStyle = CARPET; ctx.fillRect(0, floorY, w, h - floorY);
  ctx.fillStyle = CARPET2; for (let x = -((camX % 40) + 40); x < w; x += 40) ctx.fillRect(x, floorY, 20, h - floorY);
  ctx.fillStyle = '#2c3a54'; for (let y = floorY; y < h; y += 26) ctx.fillRect(0, y, w, 2);
  ctx.fillStyle = '#44557a'; for (let y = floorY + 8; y < h; y += 26) for (let x = -((camX % 40) + 40) + 6; x < w; x += 40) ctx.fillRect(x, y, 3, 3);
  for (let x = -(((camX * 0.5) % 260) + 260); x < w; x += 260) { ctx.fillStyle = 'rgba(255,255,230,0.06)'; ctx.fillRect(x + 50, floorY, 120, h - floorY); }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, floorY, w, 10);
  for (let x = -((camX % 700) + 700) + 120; x < w; x += 700) { ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x, floorY + 40, 16, 12); ctx.fillRect(x + 22, floorY + 46, 14, 10); ctx.fillStyle = '#888'; ctx.fillRect(x + 3, floorY + 43, 10, 1); ctx.fillRect(x + 3, floorY + 46, 8, 1); ctx.fillStyle = '#f4f4f4'; ctx.fillRect(x + 300, h - 30, 10, 12); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 302, h - 28, 6, 2); ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x + 310, h - 26, 3, 6); }
}

export default {
  id: 'chairs',
  title: 'Гонки на стульях',
  description: 'Безумный заезд на офисных креслах по коридору, где на кону не кубок, а первое слово на дейлике.',
  cover: 'assets/covers/chairs.jpg',
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
      const doorPoint = { x: Math.round(finishX - camX) + 60, y: floorY };
      beginCamera(ctx, w, h, time, doorOpened !== null ? [doorOpened] : [], () => doorPoint, { level: 1.25, dur: 1.1, amp: 8 });
      drawCorridor(ctx, w, h, camX, time, floorY);
      drawAmbient(ctx, 'paper', w, h, time, 14, camX);
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

      vignette(ctx, w, h, 0.35);
      ctx.restore();
      if (doorOpened !== null && time - doorOpened < 1.4) bigText(ctx, w, h, 'ПЕРЕГОВОРКА!', time, '#6ec85a', 28);
      if (doorOpened === null && leader >= 0.975) { doorOpened = time; if (onEvent) onEvent('pop'); particles.burst(fx + 40, floorY * 0.5, time, rnd, { count: 50, speed: 240, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#ffffff'], life: 1.4 }); }
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
