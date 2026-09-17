// Второй слой сцены (docs/STAGE.md): персонажи, имена и контакт с поверхностью подчиняются свету и палитре сцены.
import { spriteCanvas } from '../sprite.js?v=26561fc-1814';

const LIT = new WeakMap();
let work = null;
function workCanvas() { if (!work) { work = document.createElement('canvas'); work.width = 64; work.height = 64; } return work; }

// Внутренняя кромка со стороны (dx, dy): пиксели сразу под тёмным контуром спрайта, обращённые к источнику.
// Внешний контур не трогается, иначе кромка читается как белая обводка наклейки.
function edgeMask(base, dx, dy, rgb) {
  const t = workCanvas(), c = t.getContext('2d');
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 64, 64); c.drawImage(base, 0, 0);
  c.globalCompositeOperation = 'destination-in'; c.drawImage(base, -dx, -dy);
  c.globalCompositeOperation = 'destination-out'; c.drawImage(base, -2 * dx, -2 * dy);
  c.globalCompositeOperation = 'source-in'; c.fillStyle = `rgb(${rgb})`; c.fillRect(0, 0, 64, 64);
  c.globalCompositeOperation = 'source-over';
  return t;
}
function silhouette(base, rgb) {
  const t = workCanvas(), c = t.getContext('2d');
  c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 64, 64); c.drawImage(base, 0, 0);
  c.globalCompositeOperation = 'source-in'; c.fillStyle = `rgb(${rgb})`; c.fillRect(0, 0, 64, 64);
  c.globalCompositeOperation = 'source-over';
  return t;
}

// Кадр персонажа, освещённый сценой. light — паспорт света сцены, warm 0..3 — близость местного источника, warmSide — с какой он стороны.
// Результат кэшируется по кадру и варианту света, пересчёта на каждом кадре нет.
export function litSprite(p, frame, light, warm = 0, warmSide = 0, flip = false) {
  const base = spriteCanvas(p, frame, 1, flip);
  let variants = LIT.get(base); if (!variants) { variants = new Map(); LIT.set(base, variants); }
  const key = light.id + '|' + warm + '|' + warmSide;
  if (variants.has(key)) return variants.get(key);
  const out = document.createElement('canvas'); out.width = 64; out.height = 64;
  const c = out.getContext('2d'); c.imageSmoothingEnabled = false;
  c.drawImage(base, 0, 0);
  c.globalCompositeOperation = 'multiply'; c.fillStyle = `rgb(${light.mul})`; c.fillRect(0, 0, 64, 64);
  c.globalCompositeOperation = 'destination-in'; c.drawImage(base, 0, 0);
  c.globalCompositeOperation = 'source-atop';
  if (light.tintK) { c.fillStyle = `rgba(${light.tint},${light.tintK})`; c.fillRect(0, 0, 64, 64); }
  c.globalAlpha = light.shade.k; c.drawImage(edgeMask(base, -light.key.dx, -light.key.dy, light.shade.rgb), 0, 0);
  c.globalAlpha = light.key.k; c.drawImage(edgeMask(base, light.key.dx, light.key.dy, light.key.rgb), 0, 0);
  if (warm > 0) {
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.09 * warm; c.drawImage(silhouette(base, light.warm), 0, 0);
    c.globalCompositeOperation = 'source-atop'; c.globalAlpha = Math.min(0.7, 0.2 * warm); c.drawImage(edgeMask(base, warmSide || 1, 0, light.warmEdge || light.warm), 0, 0);
  }
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const d = c.getImageData(0, 0, 64, 64).data; let foot = 63;
  for (let y = 63; y > 30; y--) { let any = false; for (let x = 8; x < 56; x++) if (d[(y * 64 + x) * 4 + 3] > 40) { any = true; break; } if (any) { foot = y; break; } }
  out.footRow = foot;
  variants.set(key, out);
  return out;
}

// Персонаж в сцене: тень от ключевого света, утопление в поверхность, освещённый спрайт. x, y — левый верхний угол кадра 64×64.
export function drawActor(ctx, p, frame, x, y, light, { warm = 0, warmSide = 0, flip = false, sink = 0, shadow = true, lift = 0 } = {}) {
  const spr = litSprite(p, frame, light, warm, warmSide, flip);
  const fy = y + spr.footRow + 1;
  if (shadow) groundShadow(ctx, x + 32, fy, light, warm ? -warmSide : 0, lift);
  const rows = spr.footRow + 1 - sink;
  ctx.drawImage(spr, 0, 0, 64, rows, Math.round(x), Math.round(y - lift), 64, rows);
  if (sink && !lift && light.surface) { ctx.fillStyle = light.surface; ctx.fillRect(Math.round(x) + 23, fy - sink - 1, 4, 1); ctx.fillRect(Math.round(x) + 36, fy - sink - 1, 4, 1); ctx.fillRect(Math.round(x) + 27, fy - sink, 10, 1); }
  return spr;
}

// Тень: мягкий пиксельный эллипс из строк, вытянутый от источника света. Рядом с местным источником уходит от него. В прыжке меньше и бледнее.
export function groundShadow(ctx, cx, fy, light, awaySide = 0, lift = 0) {
  const dirX = awaySide || -light.key.dx, len = light.shadowLen || 3, k = Math.max(0.35, 1 - lift / 50);
  ctx.fillStyle = light.shadow; ctx.globalAlpha = k;
  for (let r = 0; r < 4; r++) { const wRow = Math.round((20 - r * 4) * k), off = Math.round(dirX * r * len); ctx.fillRect(Math.round(cx - wRow / 2 + off), fy - 2 + r, wRow, 1); }
  ctx.globalAlpha = 1;
}

// Имя без плашки: пиксельный шрифт с тёмной обводкой и цветной меткой участника. Победитель золотой со свечением.
const PIPS = ['#ff6b6b', '#ffd166', '#6ec85a', '#4aa8ff', '#c78bff', '#ff9f43', '#2bd4c8', '#f78fb3'];
export function nameTag(ctx, text, cx, y, index = 0, gold = false) {
  ctx.font = "8px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  const tw = Math.ceil(ctx.measureText(text).width), w = tw + 7, x = Math.round(cx - w / 2);
  ctx.fillStyle = 'rgba(6,6,20,0.16)'; ctx.fillRect(x - 2, y - 1, w + 4, 11); ctx.fillRect(x - 1, y - 2, w + 2, 13);
  if (gold) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(cx, y + 4, 0, cx, y + 4, w * 0.7); g.addColorStop(0, 'rgba(255,200,80,0.45)'); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.fillRect(cx - w, y - 12, w * 2, 32); ctx.restore(); }
  ctx.fillStyle = '#05050f'; ctx.fillRect(x - 1, y + 1, 6, 6); ctx.fillStyle = gold ? '#ffd166' : PIPS[index % PIPS.length]; ctx.fillRect(x, y + 2, 4, 4);
  ctx.fillStyle = '#05050f'; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 2; dy++) if (dx || dy) ctx.fillText(text, x + 7 + dx, y + dy);
  ctx.fillStyle = gold ? '#ffd166' : '#f6f0e0'; ctx.fillText(text, x + 7, y);
}
// Расстановка имён без наложений: каждое следующее поднимается, пока не найдёт свободное место.
export function placeTags(ctx, items) {
  ctx.font = "8px 'Press Start 2P', monospace"; const placed = [];
  items.forEach((it) => { const w = Math.ceil(ctx.measureText(it.text).width) + 9; const x = Math.round(it.cx - w / 2); let y = it.y, guard = 0;
    while (guard++ < 10 && placed.some((q) => x < q.x + q.w + 1 && x + w + 1 > q.x && y < q.y + 12 && y + 12 > q.y)) y -= 12;
    placed.push({ x, y, w }); nameTag(ctx, it.text, it.cx, y, it.index, it.gold); });
}

// ---------- Эффекты с общего листа assets/fx/fx.png: 8 рядов по 6 кадров, ячейка 96×48 ----------
import { plate } from './scene.js?v=26561fc-1814';
export const FX_ASSET = 'assets/fx/fx.png';
const FX_ROWS = { dust: 0, snow: 1, ring: 2, smoke: 3, spark: 4, flash: 5, shuriken: 6, leaf: 7 };
const FX_W = 96, FX_H = 48;
// Лист эффектов в общем тоне сцены: тот же множитель цвета, что у персонажей. Считается один раз на сцену.
const TINTED = new Map();
function fxSheet(light) {
  const base = plate(FX_ASSET); if (!base || !light) return base;
  if (TINTED.has(light.id)) return TINTED.get(light.id);
  const c = document.createElement('canvas'); c.width = base.width; c.height = base.height; const x = c.getContext('2d');
  x.drawImage(base, 0, 0); x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgb(${light.mul})`; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(base, 0, 0);
  TINTED.set(light.id, c); return c;
}
// Один кадр эффекта по центру точки (x, y). Для зацикленных (сюрикен, лист) кадр задаётся снаружи. light — паспорт света сцены; без него эффект светится сам (вспышка, искры).
export function fxFrame(ctx, kind, frame, x, y, scale = 1, alpha = 1, light = null) {
  const sheet = fxSheet(light); if (!sheet) return;
  const f = Math.max(0, Math.min(5, Math.floor(frame)));
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(sheet, f * FX_W, FX_ROWS[kind] * FX_H, FX_W, FX_H, Math.round(x - (FX_W * scale) / 2), Math.round(y - (FX_H * scale) / 2), FX_W * scale, FX_H * scale);
  if (alpha < 1) ctx.globalAlpha = 1;
}
// Разовые эффекты в мировых координатах: знают момент рождения, кадр считается от возраста.
export function makeFx() {
  const list = [];
  return {
    spawn(kind, x, y, born, { dur = 0.45, scale = 1, vx = 0, vy = 0 } = {}) { list.push({ kind, x, y, born, dur, scale, vx, vy }); },
    draw(ctx, time, camX = 0, camY = 0, light = null) {
      for (let i = list.length - 1; i >= 0; i--) { const q = list[i], age = time - q.born; if (age < 0) continue; if (age >= q.dur) { list.splice(i, 1); continue; } fxFrame(ctx, q.kind, (age / q.dur) * 6, q.x + q.vx * age - camX, q.y + q.vy * age - camY, q.scale, 1, light); }
    },
  };
}

// Метка угрозы в пиксельной сетке: уголки рамки вокруг головы и стрелка сверху, мигает. Общая для игр на выбывание.
export function threatMark(ctx, cx, top, t, color = '#ff5050') {
  const on = Math.floor(t * 8) % 2 === 0, c = on ? color : 'rgba(255,255,255,0.55)', x = Math.round(cx), y = Math.round(top), r = 15, bob = Math.round(Math.sin(t * 10) * 2);
  ctx.fillStyle = '#05050f';
  [[-r - 1, -1, 8, 4], [-r - 1, -1, 4, 8], [r - 6, -1, 8, 4], [r - 2, -1, 4, 8], [-r - 1, 2 * r - 3, 8, 4], [-r - 1, 2 * r - 7, 4, 8], [r - 6, 2 * r - 3, 8, 4], [r - 2, 2 * r - 7, 4, 8]].forEach(([dx, dy, w, h]) => ctx.fillRect(x + dx, y + dy, w, h));
  ctx.fillStyle = c;
  [[-r, 0, 6, 2], [-r, 0, 2, 6], [r - 5, 0, 6, 2], [r - 1, 0, 2, 6], [-r, 2 * r - 2, 6, 2], [-r, 2 * r - 6, 2, 6], [r - 5, 2 * r - 2, 6, 2], [r - 1, 2 * r - 6, 2, 6]].forEach(([dx, dy, w, h]) => ctx.fillRect(x + dx, y + dy, w, h));
  for (let k = 0; k < 5; k++) { ctx.fillStyle = '#05050f'; ctx.fillRect(x - 5 + k - 1, y - 16 + bob + k - 1, 11 - k * 2 + 2, 3); ctx.fillStyle = c; ctx.fillRect(x - 5 + k, y - 16 + bob + k, 11 - k * 2, 1); }
}

// ---------- Надписи событий в материале сцены ----------
// Буквы рисуются в родном размере шрифта (8 px), красятся в два тона с обводкой и увеличиваются в целое число раз,
// поэтому лежат в той же пиксельной сетке, что и сцена. Материал: золото, лак, лёд, снег, кровь и так далее.
const TITLE_STYLES = {
  gold: { fill: ['#fff3b0', '#f2b53a'], edge: '#ffffff', outline: '#2a1400', glow: '255,200,80' },
  danger: { fill: ['#ffb0a0', '#e0322a'], edge: '#ffe0d8', outline: '#2a0505', glow: '255,60,40' },
  lacquer: { fill: ['#ff9a6a', '#c8261e'], edge: '#ffd9b0', outline: '#1a0508', glow: '255,120,40' },
  ice: { fill: ['#f4fbff', '#6aa6f0'], edge: '#ffffff', outline: '#0f2466', glow: '140,190,255', cap: '#ffffff' },
  snow: { fill: ['#ffffff', '#b9cbe8'], edge: '#ffffff', outline: '#23305a', glow: '220,235,255', cap: '#ffffff' },
  summit: { fill: ['#fff3b0', '#f2b53a'], edge: '#ffffff', outline: '#2a1400', glow: '255,210,120', cap: '#ffffff' },
  green: { fill: ['#d6ffe0', '#21a038'], edge: '#ffffff', outline: '#04220c', glow: '60,220,110' },
  steel: { fill: ['#eef6ff', '#6f8fb8'], edge: '#ffffff', outline: '#0a1428', glow: '150,190,255' },
  blood: { fill: ['#ff7a6a', '#8a0e0e'], edge: '#ffc0b0', outline: '#120202', glow: '200,20,20', drip: true },
};
const TITLE_CACHE = new Map();
function renderTitle(text, styleName) {
  const key = styleName + '|' + text; if (TITLE_CACHE.has(key)) return TITLE_CACHE.get(key);
  const st = TITLE_STYLES[styleName] || TITLE_STYLES.gold, font = "8px 'Press Start 2P', monospace";
  const probe = document.createElement('canvas').getContext('2d'); probe.font = font;
  const tw = Math.ceil(probe.measureText(text).width), W = tw + 6, H = 18;
  const glyph = document.createElement('canvas'); glyph.width = W; glyph.height = H; const g = glyph.getContext('2d');
  g.font = font; g.textBaseline = 'top'; g.fillStyle = '#fff'; g.fillText(text, 3, 3);
  const id = g.getImageData(0, 0, W, H), d = id.data; /* жёсткая альфа: буквы без сглаживания */
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0;
  if (st.drip) for (let x = 0; x < W; x++) { const hsh = Math.sin(x * 12.9898 + text.length * 78.233) * 43758.5453, r = hsh - Math.floor(hsh); if (r < 0.72 || !d[((10) * W + x) * 4 + 3]) continue; const len = 1 + Math.floor(r * 10) % 4; for (let y = 11; y < 11 + len && y < H; y++) { const o = (y * W + x) * 4; d[o] = 255; d[o + 1] = 255; d[o + 2] = 255; d[o + 3] = 255; } }
  g.putImageData(id, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = st.fill[0]; g.fillRect(0, 0, W, 7); g.fillStyle = st.fill[1]; g.fillRect(0, 7, W, H);
  g.fillStyle = st.edge; g.fillRect(0, 3, W, 1);
  if (st.cap) { g.fillStyle = st.cap; g.fillRect(0, 3, W, 2); }
  const sil = document.createElement('canvas'); sil.width = W; sil.height = H; const s = sil.getContext('2d');
  s.drawImage(glyph, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = st.outline; s.fillRect(0, 0, W, H);
  const out = document.createElement('canvas'); out.width = W; out.height = H; const o = out.getContext('2d');
  [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [0, 2], [1, 2], [-1, 2]].forEach(([dx, dy]) => o.drawImage(sil, dx, dy));
  o.drawImage(glyph, 0, 0);
  out.titleStyle = st;
  if (document.fonts && document.fonts.check(font)) TITLE_CACHE.set(key, out);
  return out;
}
// Надписи одной игры: помнят, когда надпись появилась, чтобы сыграть удар при появлении. show() вызывается каждый кадр, пока надпись нужна.
export function makeTitles() {
  const seen = new Map();
  return {
    show(ctx, w, h, text, t, styleName = 'gold') {
      let rec = seen.get(text); if (!rec || t - rec.last > 0.4) { rec = { first: t, last: t }; seen.set(text, rec); } rec.last = t;
      const age = t - rec.first, img = renderTitle(text, styleName), st = img.titleStyle;
      const base = Math.max(1, Math.min(3, Math.floor((w * 0.86) / img.width))), scale = age < 0.07 ? base + 1 : base;
      const dw = img.width * scale, dh = img.height * scale;
      const shake = age < 0.3 ? Math.round(Math.sin(age * 90) * (1 - age / 0.3) * 3) : 0;
      const x = Math.round((w - dw) / 2) + shake, y = Math.round(h * 0.3 - dh / 2);
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = 'lighter'; const gl = ctx.createRadialGradient(w / 2, y + dh / 2, 0, w / 2, y + dh / 2, dw * 0.6); gl.addColorStop(0, `rgba(${st.glow},${age < 0.15 ? 0.4 : 0.22})`); gl.addColorStop(1, `rgba(${st.glow},0)`); ctx.fillStyle = gl; ctx.fillRect(x - dw * 0.2, y - dh, dw * 1.4, dh * 3);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.45; ctx.fillStyle = '#05050f'; ctx.fillRect(x + scale * 3, y + dh - scale * 2, dw - scale * 6, scale); ctx.globalAlpha = 1;
      ctx.drawImage(img, x, y, dw, dh);
      ctx.restore();
    },
  };
}
