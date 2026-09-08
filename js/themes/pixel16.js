import { mulberry32 } from '../rng.js';

// Тема А: 16-битный платформер. Закат, руины, факелы, кирпич.
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const SKY = [[16, 10, 44], [54, 22, 80], [118, 40, 88], [196, 86, 72], [238, 156, 92]];
const PX = 4; // размер «пикселя» фона

const cache = new Map();

function skyLayer(w, h) {
  const key = `sky:${w}x${h}`;
  if (cache.has(key)) return cache.get(key);
  const sw = Math.ceil(w / PX), sh = Math.ceil(h / PX);
  const off = document.createElement('canvas');
  off.width = sw; off.height = sh;
  const c = off.getContext('2d');
  const img = c.createImageData(sw, sh);
  const n = SKY.length - 1;
  const rnd = mulberry32(3);
  for (let y = 0; y < sh; y++) {
    const t = (y / Math.max(1, sh - 1)) * n;
    const k = Math.min(Math.floor(t), n - 1), f = t - k;
    for (let x = 0; x < sw; x++) {
      const th = (BAYER[y % 4][x % 4] + 0.5) / 16;
      let col = f > th ? SKY[k + 1] : SKY[k];
      if (y < sh * 0.5 && rnd() < 0.004) col = [230, 220, 255];
      const i = (y * sw + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  cache.set(key, off);
  return off;
}

// Слой силуэтов шириной period, рисуется тайлами со сдвигом камеры.
function silhouetteLayer(kind, period, height) {
  const key = `${kind}:${period}x${height}`;
  if (cache.has(key)) return cache.get(key);
  const off = document.createElement('canvas');
  off.width = period; off.height = height;
  const c = off.getContext('2d');
  const rnd = mulberry32(kind === 'far' ? 11 : kind === 'mid' ? 22 : 33);
  if (kind === 'far') {
    c.fillStyle = '#341c50';
    c.beginPath(); c.moveTo(0, height);
    let x = 0;
    while (x < period) { x += 60 + rnd() * 120; c.lineTo(Math.min(x, period), height * (0.25 + rnd() * 0.5)); }
    c.lineTo(period, height); c.closePath(); c.fill();
  } else if (kind === 'mid') {
    c.fillStyle = '#22143a';
    for (let x = 20; x < period - 60; x += 140 + rnd() * 160) {
      const tw = 40 + rnd() * 50, th = height * (0.35 + rnd() * 0.55);
      c.fillRect(x, height - th, tw, th);
      for (let bx = x; bx < x + tw; bx += 16) c.fillRect(bx, height - th - 12, 9, 12);
      for (let wy = height - th + 20; wy < height - 16; wy += 28) {
        for (let wx = x + 10; wx < x + tw - 10; wx += 22) {
          if (rnd() < 0.5) { c.fillStyle = '#ffbe5a'; c.fillRect(wx, wy, 6, 9); c.fillStyle = '#22143a'; }
        }
      }
    }
  } else {
    c.fillStyle = '#160c28';
    for (let x = -20; x < period + 20; x += 44 + rnd() * 30) {
      const th = height * (0.4 + rnd() * 0.6);
      c.beginPath(); c.moveTo(x, height); c.lineTo(x + 22, height - th); c.lineTo(x + 44, height); c.fill();
      c.beginPath(); c.moveTo(x + 6, height); c.lineTo(x + 22, height - th * 0.55); c.lineTo(x + 38, height); c.fill();
    }
  }
  cache.set(key, off);
  return off;
}

function tile(ctx, layer, x, y, camX, speed) {
  const p = layer.width;
  let off = -((camX * speed) % p);
  if (off > 0) off -= p;
  for (let tx = off; tx < ctx.canvas.width; tx += p) ctx.drawImage(layer, Math.floor(x + tx), Math.floor(y));
}

export default {
  id: 'pixel16',
  title: '16 бит',
  colors: {
    bg: '#0c0818', panel: '#1a0f2a', accent: '#ffd166', text: '#f4ecd8', muted: '#9a8ab8',
    danger: '#ff6b6b', brick: '#3a2e4c', brickLine: '#1e1630', grass: '#46963c', grassLight: '#6ec85a',
    label: '#1a0f2a',
  },
  font: "'Press Start 2P', 'Courier New', monospace",

  // Небо и три слоя параллакса до линии горизонта horizonY.
  drawSky(ctx, w, horizonY, camX = 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(skyLayer(w, horizonY), 0, 0, w, horizonY);
    const moonR = Math.min(48, horizonY * 0.18);
    ctx.fillStyle = '#ffe2aa'; ctx.fillRect(w - moonR * 3.2, horizonY * 0.18, moonR * 1.6, moonR * 1.6);
    ctx.fillStyle = '#fff0cc'; ctx.fillRect(w - moonR * 3.0, horizonY * 0.18 + moonR * 0.2, moonR * 1.2, moonR * 1.0);
    const farH = horizonY * 0.5, midH = horizonY * 0.62, nearH = horizonY * 0.4;
    tile(ctx, silhouetteLayer('far', 1200, farH), 0, horizonY - farH, camX, 0.1);
    tile(ctx, silhouetteLayer('mid', 1600, midH), 0, horizonY - midH, camX, 0.3);
    tile(ctx, silhouetteLayer('near', 900, nearH), 0, horizonY - nearH, camX, 0.6);
  },

  // Полоса земли: трава сверху, кирпич ниже. camX сдвигает кирпичи.
  drawGround(ctx, y, w, h, camX = 0) {
    ctx.fillStyle = this.colors.brick; ctx.fillRect(0, y, w, h);
    ctx.fillStyle = this.colors.brickLine;
    const bw = 48, bh = 16;
    const shift = Math.floor(camX) % (bw * 2);
    for (let by = y + 6, row = 0; by < y + h; by += bh, row++) {
      ctx.fillRect(0, by, w, 2);
      const o = (row % 2) * (bw / 2) - shift;
      for (let bx = o - bw * 2; bx < w + bw; bx += bw) ctx.fillRect(bx, by, 2, bh);
    }
    ctx.fillStyle = this.colors.grass; ctx.fillRect(0, y, w, 6);
    ctx.fillStyle = this.colors.grassLight;
    for (let gx = -(Math.floor(camX) % 12); gx < w; gx += 12) ctx.fillRect(gx, y - 2, 4, 5);
  },

  drawTorch(ctx, x, y, t) {
    const flick = 0.85 + 0.15 * Math.sin(t * 17 + x);
    ctx.fillStyle = 'rgba(255,140,50,0.10)'; ctx.fillRect(x - 40 * flick, y - 60 * flick, 84 * flick, 90 * flick);
    ctx.fillStyle = 'rgba(255,190,80,0.16)'; ctx.fillRect(x - 22 * flick, y - 40 * flick, 48 * flick, 60 * flick);
    ctx.fillStyle = '#5a3c28'; ctx.fillRect(x, y - 10, 4, 36);
    ctx.fillStyle = '#ffe07a'; ctx.fillRect(x - 3, y - 18 * flick, 10, 10 * flick);
    ctx.fillStyle = '#ff9a3c'; ctx.fillRect(x - 1, y - 12, 6, 6);
  },

  drawFinish(ctx, x, y, h) {
    ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x, y - h, 4, h);
    for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < 5; xx++) {
      ctx.fillStyle = (xx + yy) % 2 ? '#141414' : '#f0f0f0';
      ctx.fillRect(x + 4 + xx * 8, y - h + yy * 8, 8, 8);
    }
  },

  // Табличка с именем над героем.
  drawLabel(ctx, text, cx, y, size = 9, highlight = false) {
    ctx.font = `${size}px ${this.font}`;
    ctx.textBaseline = 'top';
    const tw = ctx.measureText(text).width;
    const pad = 5, w = tw + pad * 2, h = size + pad * 2;
    const x = Math.round(cx - w / 2);
    ctx.fillStyle = this.colors.label; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = highlight ? this.colors.accent : this.colors.text;
    ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2); ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
    ctx.fillText(text, x + pad, y + pad);
  },

  // Карточка участника для «последнего выжившего». state: alive | doomed | dead | winner
  drawCard(ctx, x, y, w, h, state, t) {
    const c = this.colors;
    ctx.fillStyle = state === 'dead' ? '#100a1c' : c.panel;
    ctx.fillRect(x, y, w, h);
    let border = '#5a4a7a';
    if (state === 'doomed') border = (Math.floor(t * 12) % 2) ? c.danger : '#5a4a7a';
    if (state === 'winner') border = c.accent;
    if (state === 'dead') border = '#241a34';
    ctx.fillStyle = border;
    ctx.fillRect(x, y, w, 4); ctx.fillRect(x, y + h - 4, w, 4); ctx.fillRect(x, y, 4, h); ctx.fillRect(x + w - 4, y, 4, h);
  },
};
