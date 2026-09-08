import DATA from './sprite-data.js';
import { hashString, mulberry32 } from './rng.js';
import { ROSTER } from './roster.js';

export const SPRITE_W = DATA.W;
export const SPRITE_H = DATA.H;
export const FRAMES = Object.keys(DATA.BODY);

const SKINS = ['#f4d2b3', '#f0c8a0', '#e6b98f', '#e0b48c', '#d9a878', '#c88a5a', '#a86a3a', '#7a4a2a'];
const HAIR_COLORS = ['#2a1a10', '#101010', '#3a2410', '#6b4a2a', '#c8703a', '#e8d080', '#8a2a2a', '#4a3a8a', '#e65090', '#a0a0a0'];
const TOP_COLORS = ['#3c5aa0', '#d24a6a', '#f0f0f0', '#8a4fd0', '#404050', '#2bd4c8', '#78c85a', '#3c8cdc', '#f0be3c', '#8a2a4a', '#dc3c3c', '#ff8c42'];
const PANTS_COLORS = ['#26304a', '#3a3a4a', '#2f2f3a', '#2a3a5a', '#1e1e28', '#5a3278', '#6b3a2a', '#c8c8c8'];
const SHOES_COLORS = ['#f2f2f2', '#2a2a2a', '#6b3a2a', '#c8c8c8', '#dc3c3c'];
const HATS = ['none', 'none', 'none', 'none', 'none', 'cap', 'beanie'];
const GLASSES = ['none', 'none', 'none', 'round', 'square'];
const BEARDS = ['none', 'none', 'none', 'stubble', 'moustache', 'goatee', 'beard'];

// Персонаж по имени: из состава команды, иначе случайный из частей по хэшу имени.
export function personFor(name) {
  const key = name.trim();
  const fixed = ROSTER[key] || ROSTER[key.toLowerCase()];
  const rnd = mulberry32(hashString(key.toLowerCase()) ^ 0x5a5a);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const hairs = Object.keys(DATA.HAIR);
  const base = {
    skin: pick(SKINS), hair: pick(hairs), hairColor: pick(HAIR_COLORS),
    beard: pick(BEARDS), glasses: pick(GLASSES), hat: pick(HATS), hatColor: pick(TOP_COLORS),
    top: pick(Object.keys(DATA.TOP)), topColor: pick(TOP_COLORS), accent: '#ffffff',
    pantsColor: pick(PANTS_COLORS), shoesColor: pick(SHOES_COLORS),
  };
  if (base.top === 'dress' && rnd() < 0.5) base.top = 'tshirt';
  return { ...base, ...(fixed || {}) };
}

const hex = (s) => [0, 2, 4].map((i) => parseInt(s.slice(1 + i, 3 + i), 16));
const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
const darken = (c, k) => c.map((v) => Math.max(0, Math.floor(v * k)));
const lighten = (c, k) => c.map((v) => Math.min(255, Math.floor(v + (255 - v) * k)));

function palette(p) {
  const skin = hex(p.skin), hair = hex(p.hairColor), top = hex(p.topColor), pants = hex(p.pantsColor), shoes = hex(p.shoesColor);
  const accent = hex(p.accent || '#ffffff'), hat = hex(p.hatColor || '#333344'), beard = hex(p.beardColor || p.hairColor);
  return {
    '#': rgb([26, 20, 40]), s: rgb(skin), S: rgb(darken(skin, 0.78)), $: rgb(lighten(skin, 0.25)),
    e: rgb([30, 24, 40]), m: rgb(darken(skin, 0.6)),
    t: rgb(top), T: rgb(darken(top, 0.72)), '+': rgb(lighten(top, 0.28)), a: rgb(accent),
    p: rgb(pants), P: rgb(darken(pants, 0.7)), b: rgb(shoes), B: rgb(darken(shoes, 0.65)),
    h: rgb(hair), H: rgb(darken(hair, 0.7)), f: rgb(beard), g: rgb([40, 36, 60]),
    c: rgb(hat), C: rgb(darken(hat, 0.72)),
  };
}

// Собирает слои в сетку 24×32 символов.
export function composeGrid(p, frame) {
  const rows = DATA.BODY[frame].map((r) => r.split(''));
  const side = frame.startsWith('run');
  const dy = frame === 'run1' || frame === 'run3' ? 1 : 0;
  const blit = (grid, y0, dx = 0) => {
    grid.forEach((r, j) => {
      const y = y0 + j;
      if (y < 0 || y >= SPRITE_H) return;
      for (let i = 0; i < r.length; i++) {
        const x = i + dx;
        if (r[i] !== '.' && x >= 0 && x < SPRITE_W) rows[y][x] = r[i];
      }
    });
  };
  if (!side) blit(DATA.TOP[p.top] || [], 13);
  blit(DATA.BEARD[p.beard] || [], 1 + DATA.BEARD_Y[p.beard] + dy, side ? 2 : 0);
  blit(DATA.GLASSES[p.glasses] || [], 1 + DATA.GLASSES_Y + dy, side ? 2 : 0);
  blit(DATA.HAIR[p.hair] || [], 1 + dy, side ? 1 : 0);
  if (p.hat !== 'none') blit(DATA.HAT[p.hat] || [], dy, side ? 1 : 0);
  return rows;
}

const cache = new Map();

// Кадр персонажа как готовый холст, кэшируется по параметрам, кадру и масштабу.
export function spriteCanvas(p, frame, scale = 4, flip = false) {
  const key = JSON.stringify(p) + '|' + frame + '|' + scale + '|' + (flip ? 1 : 0);
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = SPRITE_W * scale; c.height = SPRITE_H * scale;
  const ctx = c.getContext('2d');
  const pal = palette(p);
  composeGrid(p, frame).forEach((row, j) => {
    row.forEach((ch, i) => {
      if (ch === '.') return;
      ctx.fillStyle = pal[ch] || '#ff00ff';
      const x = flip ? SPRITE_W - 1 - i : i;
      ctx.fillRect(x * scale, j * scale, scale, scale);
    });
  });
  cache.set(key, c);
  return c;
}

export function drawSprite(ctx, p, frame, x, y, scale = 4, flip = false) {
  ctx.drawImage(spriteCanvas(p, frame, scale, flip), Math.round(x), Math.round(y));
}

// Портрет: голова и плечи, для плиток меню.
export function portraitCanvas(p, scale = 4) {
  const key = 'portrait|' + JSON.stringify(p) + '|' + scale;
  if (cache.has(key)) return cache.get(key);
  const full = spriteCanvas(p, 'idle', scale);
  const c = document.createElement('canvas');
  c.width = SPRITE_W * scale; c.height = 17 * scale;
  c.getContext('2d').drawImage(full, 0, 0, full.width, 17 * scale, 0, 0, full.width, 17 * scale);
  cache.set(key, c);
  return c;
}

export function runFrame(time, speed = 10, offset = 0) {
  return 'run' + (Math.floor(time * speed + offset) % 4);
}
