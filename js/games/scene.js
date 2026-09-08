// Общие куски сцен: дизеринг неба, толпа, прожектор, частицы. Всё считается от времени, а не от кадров.
import { mulberry32 } from '../rng.js';

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const cache = new Map();

// Небо с дизерингом между цветами stops, «пиксель» px.
export function skyLayer(w, h, stops, px = 4, key = 'sky') {
  const k = `${key}:${w}x${h}`;
  if (cache.has(k)) return cache.get(k);
  const sw = Math.ceil(w / px), sh = Math.ceil(h / px);
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
