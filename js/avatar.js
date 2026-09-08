import { hashString, mulberry32 } from './rng.js';

export const SPRITE_W = 12;
export const SPRITE_H = 16;

export const PALETTE = {
  skin: ['#f0c8a0', '#e6be96', '#d8a878', '#c08858', '#8d5a3a'],
  hair: ['#3c281e', '#1e1e1e', '#c87832', '#6e4628', '#e65090', '#f0f0c8', '#7a4fd0', '#d94b3d'],
  shirt: ['#dc3c3c', '#3c8cdc', '#78c85a', '#f0be3c', '#fafafa', '#9650c8', '#ff8c42', '#2bd4c8'],
  pants: ['#28325a', '#323240', '#5a3278', '#282828', '#3c5aa0', '#6b3a2a'],
};

// 6 причёсок: верхние три ряда спрайта.
const HAIR = [
  ['....HHHH....', '...HHHHHH...', '...HHHHHH...'],
  ['...HHHHHH...', '..HHHHHHHH..', '..HHHHHHHH..'],
  ['.....HH.....', '...HHHHHH...', '...HHHHHH...'],
  ['....HHHH....', '...HHHHHH...', '..HHHHHHHH..'],
  ['..HHHHHHHH..', '..HHHHHHHH..', '..HHHHHHHH..'],
  ['....H.H.....', '...HHHHHH...', '...HHHHHH...'],
];
const BODY = [
  '...HSSSSH...',
  '...SESSES...',
  '....SSSS....',
  '.....SS.....',
  '...TTTTTT...',
  '..TTTTTTTT..',
  '.STTTTTTTTS.',
  '...TTTTTT...',
  '...PPPPPP...',
];
const LEGS = [
  ['...PP..PP...', '...PP..PP...', '...PP..PP...', '...BB..BB...'],
  ['...PP..PP...', '..PP....PP..', '.PP......PP.', '.BB......BB.'],
  ['...PP..PP...', '....PPPP....', '....PPPP....', '....BBBB....'],
];

export function avatarFor(name) {
  const rnd = mulberry32(hashString(name.trim().toLowerCase()));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  return {
    hair: Math.floor(rnd() * HAIR.length),
    hairColor: pick(PALETTE.hair),
    skin: pick(PALETTE.skin),
    shirt: pick(PALETTE.shirt),
    pants: pick(PALETTE.pants),
  };
}

// frame: 0 стоит, 1 и 2 кадры бега.
export function spritePixels(avatar, frame = 0) {
  return [...HAIR[avatar.hair], ...BODY, ...LEGS[frame % LEGS.length]].map((r) => r.split(''));
}

export function colorFor(avatar, ch) {
  switch (ch) {
    case 'H': return avatar.hairColor;
    case 'S': return avatar.skin;
    case 'E': return '#14141e';
    case 'T': return avatar.shirt;
    case 'P': return avatar.pants;
    case 'B': return '#1e1919';
    default: return null;
  }
}

export function drawAvatar(ctx, x, y, avatar, scale = 4, frame = 0) {
  const px = spritePixels(avatar, frame);
  for (let j = 0; j < px.length; j++) {
    for (let i = 0; i < px[j].length; i++) {
      const col = colorFor(avatar, px[j][i]);
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x + i * scale, y + j * scale, scale, scale);
    }
  }
}
