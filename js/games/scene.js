// Общие куски сцен: дизеринг неба, толпа, прожектор, частицы. Всё считается от времени, а не от кадров.
import { mulberry32 } from '../rng.js?v=9a65e5d-1745';

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const cache = new Map();

// Небо с дизерингом между цветами stops, «пиксель» px.
export function skyLayer(w, h, stops, px = 4, key = 'sky') {
  const k = `${key}:${w}x${h}`;
  if (cache.has(k)) return cache.get(k);
  const sw = Math.max(1, Math.ceil(w / px)), sh = Math.max(1, Math.ceil(h / px));
  const off = document.createElement('canvas'); off.width = sw; off.height = sh;
  const c = off.getContext('2d');
  const img = c.createImageData(sw, sh);
  const n = stops.length - 1;
  for (let y = 0; y < sh; y++) {
    const t = (y / Math.max(1, sh - 1)) * n;
    const kk = Math.min(Math.floor(t), n - 1), f = t - kk;
    for (let x = 0; x < sw; x++) {
      const th = (BAYER[y % 4][x % 4] + 0.5) / 16;
      const col = f > th ? stops[kk + 1] : stops[kk];
      const i = (y * sw + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  cache.set(k, off);
  return off;
}

// Толпа на трибуне: ряды голов, подпрыгивают волной.
export function drawCrowd(ctx, x, y, w, rows, t, seed = 5, px = 6) {
  const rnd = mulberry32(seed);
  const colors = ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#f4ecd8', '#9650c8', '#ff8c42', '#2bd4c8'];
  for (let r = 0; r < rows; r++) {
    for (let cx = x + (r % 2) * (px / 2); cx < x + w; cx += px * 1.6) {
      const c = colors[Math.floor(rnd() * colors.length)];
      const phase = rnd() * 6.28;
      const bounce = Math.max(0, Math.sin(t * 3 + phase + cx * 0.01)) * px * 0.8;
      const yy = y + r * px * 1.4 - bounce;
      ctx.fillStyle = '#2a2040'; ctx.fillRect(cx, yy - px * 0.2, px, px * 1.2);
      ctx.fillStyle = c; ctx.fillRect(cx, yy - px * 1.1, px, px);
    }
  }
}

export function drawSpotlight(ctx, x, yTop, xFloor, yFloor, width, color = 'rgba(255,230,160,0.16)') {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - 6, yTop); ctx.lineTo(x + 6, yTop);
  ctx.lineTo(xFloor + width / 2, yFloor); ctx.lineTo(xFloor - width / 2, yFloor);
  ctx.closePath(); ctx.fill();
}

// Пиксельный шрифт для подписей внутри сцены.
export function label(ctx, text, cx, y, size = 10, fg = '#f4ecd8', bg = 'rgba(12,8,24,0.85)', border = null) {
  ctx.font = `${size}px 'Press Start 2P', monospace`;
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  const tw = ctx.measureText(text).width;
  const pad = 5, w = tw + pad * 2, h = size + pad * 2;
  const x = Math.round(cx - w / 2);
  ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
  if (border) { ctx.fillStyle = border; ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h); }
  ctx.fillStyle = fg; ctx.fillText(text, x + pad, y + pad);
}

// Частицы по времени: каждая знает момент рождения, положение считается из возраста.
export function makeParticles() {
  const list = [];
  return {
    burst(x, y, born, rnd, { count = 24, speed = 220, colors = ['#ffd166'], life = 0.7, gravity = 300, size = 5 } = {}) {
      for (let i = 0; i < count; i++) {
        const a = rnd() * Math.PI * 2, s = speed * (0.4 + rnd() * 0.8);
        list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.3, born, life, gravity, size, color: colors[Math.floor(rnd() * colors.length)] });
      }
    },
    puff(x, y, born, rnd, color = 'rgba(200,180,160,0.7)') {
      list.push({ x, y, vx: -40 - rnd() * 40, vy: -20 - rnd() * 30, born, life: 0.5, gravity: -20, size: 4 + rnd() * 4, color });
    },
    draw(ctx, t) {
      for (let i = list.length - 1; i >= 0; i--) {
        const q = list[i], age = t - q.born;
        if (age < 0) continue;
        if (age > q.life) { list.splice(i, 1); continue; }
        const k = 1 - age / q.life;
        ctx.fillStyle = q.color;
        const s = Math.max(1, Math.round(q.size * (0.4 + 0.6 * k)));
        ctx.fillRect(Math.round(q.x + q.vx * age), Math.round(q.y + q.vy * age + q.gravity * age * age * 0.5), s, s);
      }
    },
    get length() { return list.length; },
  };
}

// ---------- Статисты и реквизит для детализации сцен ----------
import { personFor, drawSprite as drawPerson, spriteCanvas as personCanvas, SPRITE_W as PW, SPRITE_H as PH } from '../sprite.js?v=9a65e5d-1745';
import { mulberry32 as seededRnd } from '../rng.js?v=9a65e5d-1745';

export const NPC_COUNT = 16;
export const NPCS = Array.from({ length: NPC_COUNT }, (_, i) => personFor('статист-' + i));

export function drawNpc(ctx, i, frame, x, y, scale = 2, flip = false) {
  drawPerson(ctx, NPCS[((i % NPC_COUNT) + NPC_COUNT) % NPC_COUNT], frame, x, y, scale, flip);
}

// Голова и плечи статиста (для трибун, окон, портретов): верх кадра анфас.
export function drawNpcBust(ctx, i, x, y, scale = 2, rows = 34) {
  const src = personCanvas(NPCS[((i % NPC_COUNT) + NPC_COUNT) % NPC_COUNT], 'idle', scale);
  ctx.drawImage(src, 0, 0, PW * scale, rows * scale, Math.round(x), Math.round(y), PW * scale, rows * scale);
}

export function drawCloud(ctx, x, y, s, color = 'rgba(255,255,255,0.85)') {
  ctx.fillStyle = color;
  [[0, 0, 3, 1.4], [0.8, -0.8, 2.2, 1.6], [2, -0.4, 2.4, 1.5], [3.2, 0.2, 2, 1.1]].forEach(([dx, dy, w, h]) => ctx.fillRect(Math.round(x + dx * s), Math.round(y + dy * s), Math.round(w * s), Math.round(h * s)));
}

export function drawPlant(ctx, x, y, s = 1) {
  ctx.fillStyle = '#b06a3a'; ctx.fillRect(x + 6 * s, y - 14 * s, 18 * s, 14 * s);
  ctx.fillStyle = '#8a4e28'; ctx.fillRect(x + 6 * s, y - 14 * s, 18 * s, 3 * s);
  ctx.fillStyle = '#2f8a3a'; ctx.fillRect(x, y - 34 * s, 30 * s, 20 * s);
  ctx.fillStyle = '#3fae4a'; ctx.fillRect(x + 4 * s, y - 42 * s, 10 * s, 12 * s); ctx.fillRect(x + 16 * s, y - 40 * s, 10 * s, 10 * s);
  ctx.fillStyle = '#227a2c'; ctx.fillRect(x + 10 * s, y - 24 * s, 12 * s, 8 * s);
}

// Рабочий стол с монитором и сотрудником за ним (анфас, виден по пояс).
export function drawDesk(ctx, x, y, s, npc, t) {
  drawNpcBust(ctx, npc, x + 18 * s, y - 52 * s, s, 30);
  ctx.fillStyle = '#c9b89a'; ctx.fillRect(x, y - 20 * s, 96 * s, 6 * s);
  ctx.fillStyle = '#a58f6e'; ctx.fillRect(x, y - 14 * s, 96 * s, 3 * s);
  ctx.fillStyle = '#8a775a'; ctx.fillRect(x + 6 * s, y - 11 * s, 6 * s, 11 * s); ctx.fillRect(x + 84 * s, y - 11 * s, 6 * s, 11 * s);
  ctx.fillStyle = '#1d2230'; ctx.fillRect(x + 54 * s, y - 46 * s, 34 * s, 24 * s);
  ctx.fillStyle = (Math.floor(t * 2 + npc) % 5 === 0) ? '#2b7ad6' : '#3aa0ff'; ctx.fillRect(x + 57 * s, y - 43 * s, 28 * s, 18 * s);
  ctx.fillStyle = '#dfe8ff'; ctx.fillRect(x + 60 * s, y - 40 * s, 14 * s, 2 * s); ctx.fillRect(x + 60 * s, y - 35 * s, 20 * s, 2 * s); ctx.fillRect(x + 60 * s, y - 30 * s, 10 * s, 2 * s);
  ctx.fillStyle = '#5a6070'; ctx.fillRect(x + 68 * s, y - 22 * s, 6 * s, 3 * s);
  ctx.fillStyle = '#e8e8f0'; ctx.fillRect(x + 20 * s, y - 24 * s, 26 * s, 3 * s);
  ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x + 6 * s, y - 30 * s, 8 * s, 10 * s); ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x + 7 * s, y - 27 * s, 6 * s, 5 * s);
}

export function drawFlag(ctx, x, y, t, color, text) {
  ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x, y, 3, 70);
  ctx.fillStyle = color;
  for (let i = 0; i < 40; i += 2) { const dy = Math.sin(t * 6 + i * 0.25) * 3; ctx.fillRect(x + 3 + i, y + 2 + dy, 2, 22); }
  if (text) { ctx.fillStyle = '#111'; ctx.font = "7px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText(text, x + 6, y + 9); }
}

// Трибуна: ряды сидений с болельщиками, волна бежит по времени.
export function drawStands(ctx, x0, yTop, w, rows, t, camX, scale = 2) {
  const seatW = 34 * scale, rowH = 30 * scale;
  const rnd = seededRnd(77);
  const colors = ['#d94b3d', '#3c8cdc', '#f0be3c', '#2bd4c8', '#9650c8', '#78c85a'];
  for (let r = rows - 1; r >= 0; r--) {
    const y = yTop + r * rowH;
    ctx.fillStyle = r % 2 ? '#3b3450' : '#443c5c'; ctx.fillRect(x0, y, w, rowH);
    ctx.fillStyle = '#2c2740'; ctx.fillRect(x0, y + rowH - 4, w, 4);
    const off = -((camX * (0.25 + r * 0.03)) % seatW);
    for (let x = x0 + off - seatW; x < x0 + w + seatW; x += seatW) {
      const idx = Math.abs(Math.floor((x - off) / seatW)) + r * 7;
      const wave = Math.sin(t * 2.2 - (x - off) / 160 + r) > 0.85 ? -8 * scale / 2 : 0;
      ctx.fillStyle = colors[idx % colors.length]; ctx.fillRect(x + 4 * scale, y + 14 * scale, seatW - 8 * scale, 12 * scale);
      const bob = Math.round(Math.sin(t * 5 + idx) * 1.5) + wave;
      drawNpcBust(ctx, idx, x + 1 * scale, y - 10 * scale + bob, scale, 32);
    }
  }
}

// ---------- кадры для трансляции ----------
// Игры рисуются с пониженной частотой (по умолчанию 24 кадра в секунду): при шаринге экрана
// кодек звонка не успевает за 60, а ровные 24 передаются без рывков. ?fps=NN в адресе меняет.
const FPS = Math.max(10, Math.min(60, parseInt(new URLSearchParams(location.search).get('fps') || '24', 10) || 24));
const FRAME_MS = 1000 / FPS;
let lastFrameAt = 0;
// Кадр приходит через requestAnimationFrame, а если вкладка в фоне и кадров нет, через таймер:
// игра не должна замирать у зрителя, который переключился на другое окно.
export function nextFrame(cb) {
  const handle = { raf: 0, timer: 0, done: false };
  const run = () => {
    if (handle.done) return; handle.done = true;
    cancelAnimationFrame(handle.raf); clearTimeout(handle.timer);
    const now = performance.now();
    if (now - lastFrameAt < FRAME_MS - 2) { const again = nextFrame(cb); handle.raf = again.raf; handle.timer = again.timer; handle.done = false; handle.inner = again; return; }
    lastFrameAt = now;
    try { cb(now); } catch (e) { console.error('кадр упал', e); if (window.__errs) window.__errs.push(String(e && e.stack || e)); throw e; }
  };
  handle.raf = requestAnimationFrame(run);
  handle.timer = setTimeout(run, 120);
  return handle;
}
export function cancelFrame(h) { if (!h) return; h.done = true; cancelAnimationFrame(h.raf); clearTimeout(h.timer); if (h.inner) cancelFrame(h.inner); }

// ---------- напряжение: кто следующий ----------
// Метка угрозы над персонажем: мигающая рамка с треугольником. Ставится на кандидатов по очереди,
// чтобы зритель гадал, кого выберут, и замирает на жертве перед событием.
export function drawThreat(ctx, x, y, w, t, color = '#ff5050') {
  const on = Math.floor(t * 8) % 2 === 0;
  ctx.strokeStyle = on ? color : 'rgba(255,80,80,0.35)'; ctx.lineWidth = 2;
  ctx.strokeRect(x - 4, y - 4, w + 8, 8);
  ctx.fillStyle = on ? color : 'rgba(255,80,80,0.5)';
  ctx.beginPath(); ctx.moveTo(x + w / 2 - 7, y - 16); ctx.lineTo(x + w / 2 + 7, y - 16); ctx.lineTo(x + w / 2, y - 8); ctx.fill();
}

// Кто под меткой в момент t: перебор кандидатов с замедлением и остановкой на жертве к моменту stopAt.
export function threatTarget(candidates, victim, t, startAt, stopAt, rnd) {
  if (t < startAt) return null;
  if (t >= stopAt) return victim;
  const u = (t - startAt) / (stopAt - startAt);
  const hops = Math.floor(Math.pow(u, 2) * 14);
  const idx = Math.floor(rnd(hops) * candidates.length);
  return u > 0.85 ? victim : candidates[idx];
}

// Детерминированный «случайный» по номеру шага: одинаков у всех зрителей.
export function stepRandom(seed) {
  return (k) => { let a = (seed + k * 0x9E3779B1) >>> 0; a = Math.imul(a ^ (a >>> 15), a | 1); a ^= a + Math.imul(a ^ (a >>> 7), a | 61); return ((a ^ (a >>> 14)) >>> 0) / 4294967296; };
}

// Дым от техники замены: облако из кружков, расходится и тает
export function drawPuff(ctx, x, y, age, size = 30) {
  const k = Math.min(1, age / 0.5);
  ctx.fillStyle = `rgba(230,230,240,${0.9 * (1 - k)})`;
  for (let i = 0; i < 7; i++) { const a = i * 0.9, r = size * (0.5 + 0.5 * k); ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * k, y + Math.sin(a) * r * k * 0.6, size * 0.45 * (1 - k * 0.4), 0, Math.PI * 2); ctx.fill(); }
}
