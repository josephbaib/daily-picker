// Персонажи из набора Universal LPC: слои-листы 64×64 накладываются по zPos.
// Кадры берём из стандартной части листа: ходьба (ряды 8–11), «руки вверх» (ряд 2), падение (ряд 20).
const BASE = 'assets/lpc/';
const CELL = 64;
const ROWS = { cheer: 2, up: 8, left: 9, down: 10, right: 11, slashRight: 15, slashLeft: 13, hurt: 20 };

const images = new Map();
function loadImage(path) {
  if (images.has(path)) return images.get(path);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => { console.warn('нет слоя', path); resolve(null); };
    img.src = BASE + path;
  });
  images.set(path, p);
  return p;
}

// Список слоёв персонажа в порядке отрисовки (zPos по правилам набора).
export function layersOf(p) {
  if (p.sheet) return [p.sheet];
  const bt = p.body; // male | female | teen (teen: стройное тело, голова женская или мужская по p.head)
  const legsDir = bt === 'male' ? 'male' : 'thin';
  const feetDir = bt === 'male' ? 'male' : 'female';
  const headDir = p.head || (bt === 'male' ? 'male' : 'female');
  const L = [];
  L.push([10, `body/bodies/${bt}/${p.skin}.png`]);
  if (p.feet) L.push([15, `feet/shoes/${feetDir}/${p.feet}.png`]);
  if (p.legs) L.push([20, `legs/pants/${legsDir}/${p.legs}.png`]);
  if (p.torso) L.push([35, `torso/clothes/${p.torso}.png`]);
  if (p.jacket) L.push([55, `torso/jacket/collared/male/${p.jacket}.png`]);
  L.push([100, `head/heads/human/${headDir}/${p.skin}.png`]);
  if (p.eyes) L.push([105, `eyes/human/adult/${p.eyes}.png`]);
  if (p.beard) L.push([110, `beards/beard/${p.beard}.png`]);
  if (p.glasses) L.push([115, `facial/glasses/${p.glasses}.png`]);
  if (p.earrings) L.push([116, `facial/earrings/stud/${headDir}/${p.earrings}.png`]);
  if (p.hair) L.push([120, `hair/${p.hair}.png`]);
  if (p.headband) L.push([125, `hat/headband/thick/adult/${p.headband}.png`]);
  (p.layers || []).forEach(([z, path]) => L.push([z, path]));
  return L.sort((a, b) => a[0] - b[0]).map((x) => x[1]);
}

const keys = new WeakMap();
export function keyOf(p) {
  let k = keys.get(p);
  if (!k) { k = JSON.stringify(p); keys.set(p, k); }
  return k;
}

const sheets = new Map(); // key -> canvas 832×1344 (или null, пока грузится)
const pending = new Map();

// Собирает лист персонажа. Возвращает промис холста; повторные вызовы кэшируются.
export function buildSheet(p) {
  const key = keyOf(p);
  if (sheets.has(key)) return Promise.resolve(sheets.get(key));
  if (pending.has(key)) return pending.get(key);
  const pr = Promise.all(layersOf(p).map(loadImage)).then((imgs) => {
    const c = document.createElement('canvas');
    c.width = 13 * CELL; c.height = 21 * CELL;
    const ctx = c.getContext('2d');
    imgs.forEach((img) => { if (img) ctx.drawImage(img, 0, 0, c.width, Math.min(img.height, c.height), 0, 0, c.width, Math.min(img.height, c.height)); });
    sheets.set(key, c);
    pending.delete(key);
    return c;
  });
  pending.set(key, pr);
  return pr;
}

export function sheetOf(p) { return sheets.get(keyOf(p)) || null; }

export async function preload(people) {
  await Promise.all(people.map((p) => buildSheet(p)));
}

// Кадр: имя вида idle | run0..run7 | left0..left7 | cheer | hurt0..hurt5
export function frameRect(name) {
  let row = ROWS.down, col = 0;
  if (name === 'idle') { row = ROWS.down; col = 0; }
  else if (name.startsWith('run')) { row = ROWS.right; col = 1 + (parseInt(name.slice(3), 10) % 8); }
  else if (name.startsWith('left')) { row = ROWS.left; col = 1 + (parseInt(name.slice(4), 10) % 8); }
  else if (name === 'stand-right') { row = ROWS.right; col = 0; }
  else if (name === 'stand-left') { row = ROWS.left; col = 0; }
  else if (name === 'back') { row = ROWS.up; col = 0; }
  else if (name === 'cheer') { row = ROWS.down; col = 0; }
  else if (name === 'cheer2') { row = ROWS.down; col = 4; }
  else if (name.startsWith('slashl')) { row = ROWS.slashLeft; col = Math.min(5, parseInt(name.slice(6), 10) || 0); }
  else if (name.startsWith('slash')) { row = ROWS.slashRight; col = Math.min(5, parseInt(name.slice(5), 10) || 0); }
  else if (name.startsWith('hurt')) { row = ROWS.hurt; col = Math.min(5, parseInt(name.slice(4), 10) || 0); }
  return { sx: col * CELL, sy: row * CELL, w: CELL, h: CELL };
}

export const LPC_CELL = CELL;
