import { hashString, mulberry32 } from './rng.js?v=ca3d9c3-2332';
import { ROSTER } from './roster.js?v=ca3d9c3-2332';
import { buildSheet, sheetOf, frameRect, LPC_CELL, preload, keyOf } from './lpc.js?v=ca3d9c3-2332';

// Персонаж занимает ячейку 64×64; тело внутри примерно 32 в ширину и 56 в высоту.
export const SPRITE_W = LPC_CELL;
export const SPRITE_H = LPC_CELL;
export const FRAMES = ['idle', 'run0', 'run1', 'run2', 'run3', 'run4', 'run5', 'run6', 'run7', 'cheer', 'cheer2', 'hurt0', 'hurt1', 'hurt2', 'hurt3', 'hurt4', 'hurt5', 'back', 'stand-right', 'stand-left'];

// Части, из которых собираются случайные персонажи (все файлы лежат в assets/lpc).
export const POOL = {
  skin: ['light', 'light', 'amber'],
  eyes: ['blue', 'brown', 'green', 'gray'],
  hairMale: ['parted/male/blonde', 'parted/male/dark_brown', 'parted/male/black', 'plain/male/black', 'plain/male/dark_brown', 'plain/male/blonde', 'spiked/male/black', 'curly_short/adult/dark_brown', 'curly_short/adult/black', 'natural/adult/black', null],
  hairFemale: ['long_straight/male/black', 'lob/male/light_brown', 'lob/male/chestnut', 'long_center_part/male/raven', 'long_center_part/male/dark_brown', 'bob/adult/black', 'bob/adult/dark_brown', 'curly_short/adult/dark_brown'],
  beard: [null, null, null, 'basic/dark_brown', 'basic/black', '5oclock_shadow/dark_brown', '5oclock_shadow/black'],
  glasses: [null, null, null, 'round/adult/black', 'nerd/adult/black', 'sunglasses/adult/black'],
  torsoMale: ['longsleeve/longsleeve/male/forest', 'longsleeve/longsleeve/male/white', 'longsleeve/longsleeve/male/tan', 'longsleeve/longsleeve/male/gray', 'longsleeve/longsleeve/male/black', 'longsleeve/longsleeve/male/orange'],
  torsoFemale: ['longsleeve/longsleeve/teen/tan', 'longsleeve/longsleeve/teen/white', 'longsleeve/longsleeve/teen/black', 'longsleeve/longsleeve/teen/forest', 'shortsleeve/tshirt/teen/black', 'shortsleeve/tshirt/teen/white', 'longsleeve/longsleeve2_polo/teen/white'],
  jacket: [null, null, 'gray', 'forest'],
  legsMale: ['black', 'charcoal', 'navy', 'bluegray'],
  legsFemale: ['black', 'slate', 'charcoal', 'navy'],
  feetMale: ['black', 'brown', 'white', 'navy'],
  feetFemale: ['black', 'white', 'brown'],
  earrings: [null, null, 'gold', 'silver'],
};

// Персонаж по имени: из состава команды, иначе случайный из частей по хэшу имени.
export function personFor(name) {
  const key = name.trim();
  const rosterKey = Object.keys(ROSTER).find((k) => k.toLowerCase() === key.toLowerCase());
  if (rosterKey) return { ...ROSTER[rosterKey] };
  const rnd = mulberry32(hashString(key.toLowerCase()) ^ 0x1bc);
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const female = rnd() < 0.5;
  const p = female ? { body: 'teen', head: 'female', skin: pick(POOL.skin), eyes: pick(POOL.eyes) } : { body: 'male', skin: pick(POOL.skin), eyes: pick(POOL.eyes) };
  p.hair = female ? pick(POOL.hairFemale) : pick(POOL.hairMale);
  if (!female) p.beard = pick(POOL.beard);
  p.glasses = pick(POOL.glasses);
  p.torso = female ? pick(POOL.torsoFemale) : pick(POOL.torsoMale);
  if (!female) p.jacket = pick(POOL.jacket);
  p.legs = female ? pick(POOL.legsFemale) : pick(POOL.legsMale);
  p.feet = female ? pick(POOL.feetFemale) : pick(POOL.feetMale);
  if (female) p.earrings = pick(POOL.earrings);
  Object.keys(p).forEach((k) => { if (p[k] === null) delete p[k]; });
  return p;
}

export { preload, buildSheet };

const cache = new Map();

// Кадр персонажа как холст 64×64·scale. Пока лист не собран, возвращает пустой холст.
export function spriteCanvas(p, frame, scale = 3, flip = false) {
  const sheet = sheetOf(p);
  const key = keyOf(p) + '|' + frame + '|' + scale + '|' + (flip ? 1 : 0) + '|' + (sheet ? 1 : 0);
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = SPRITE_W * scale; c.height = SPRITE_H * scale;
  if (!sheet) { buildSheet(p); return c; }
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const f = frameRect(flip && frame.startsWith('run') ? 'left' + frame.slice(3) : flip && frame === 'stand-right' ? 'stand-left' : frame);
  ctx.drawImage(sheet, f.sx, f.sy, f.w, f.h, 0, 0, c.width, c.height);
  cache.set(key, c);
  return c;
}

export function drawSprite(ctx, p, frame, x, y, scale = 3, flip = false) {
  ctx.drawImage(spriteCanvas(p, frame, scale, flip), Math.round(x), Math.round(y));
}

// Портрет: лицо крупно, из кадра анфас.
export function portraitCanvas(p, scale = 3) {
  const sheet = sheetOf(p);
  const key = 'portrait|' + keyOf(p) + '|' + scale + '|' + (sheet ? 1 : 0);
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = 32 * scale; c.height = 28 * scale;
  if (!sheet) { buildSheet(p); return c; }
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const f = frameRect('idle');
  ctx.drawImage(sheet, f.sx + 16, f.sy + 6, 32, 28, 0, 0, c.width, c.height);
  cache.set(key, c);
  return c;
}

export function runFrame(time, speed = 10, offset = 0) {
  return 'run' + (Math.floor(time * speed + offset) % 8);
}
