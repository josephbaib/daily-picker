import { spriteCanvas, SPRITE_W } from '../sprite.js?v=018888a-1722';
import { mulberry32 } from '../rng.js?v=018888a-1722';
import { label, makeParticles, drawDesk, drawPlant, drawNpc, drawNpcBust, drawCloud, nextFrame, cancelFrame } from './scene.js?v=018888a-1722';
import { makeWarp, beginCamera, impactRing, drawAmbient, vignette, speedLines, bigText } from './fx.js?v=018888a-1722';

// Картинг: два круга по кольцу вокруг офиса Сбера. Вид сбоку, машинки с сидящими персонажами,
// четыре участка трассы с препятствиями. Порядок финиша задан заранее, препятствия только для зрелища.
const KART_COLORS = ['#e53935', '#3c8cdc', '#ffd166', '#6ec85a', '#9650c8', '#ff8c42', '#2bd4c8', '#f06292', '#8d6e63', '#cfd8dc', '#ffee58', '#26a69a', '#ab47bc', '#ef5350', '#42a5f5', '#66bb6a', '#ffa726', '#26c6da', '#ec407a', '#78909c'];
const LAPS = 2;
// препятствия на круге: доля круга, тип
const OBSTACLES = [[0.08, 'cone'], [0.17, 'pad'], [0.31, 'coffee'], [0.42, 'papers'], [0.55, 'ramp'], [0.66, 'coffee'], [0.78, 'pad'], [0.9, 'cone']];

function drawKartSide(ctx, person, x, y, scale, color, tilt, wheelSpin, boost) {
  // x,y: точка под задним колесом
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  const s = scale;
  if (boost) { ctx.fillStyle = Math.floor(wheelSpin * 3) % 2 ? '#ff8c42' : '#ffd166'; ctx.fillRect(-16 * s, -6 * s, 12 * s, 4 * s); ctx.fillRect(-12 * s, -8 * s, 6 * s, 8 * s); }
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-10 * s, 2 * s, 34 * s, 2 * s);
  // корпус
  ctx.fillStyle = color; ctx.fillRect(-8 * s, -9 * s, 30 * s, 8 * s);
  ctx.fillRect(-2 * s, -13 * s, 16 * s, 5 * s);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-8 * s, -9 * s, 30 * s, 2 * s);
  ctx.fillStyle = '#222'; ctx.fillRect(20 * s, -11 * s, 4 * s, 4 * s); // фара
  ctx.fillStyle = '#ffd166'; ctx.fillRect(22 * s, -10 * s, 3 * s, 2 * s);
  ctx.fillStyle = '#1a1a22'; ctx.fillRect(-12 * s, -15 * s, 6 * s, 3 * s); ctx.fillRect(-11 * s, -12 * s, 2 * s, 4 * s); // спойлер
  // сидящий персонаж: верх тела из кадра «стоит вправо»
  const src = spriteCanvas(person, 'stand-right', Math.max(1, Math.round(s)));
  const sc = Math.max(1, Math.round(s)), rows = 40;
  ctx.drawImage(src, 0, 0, SPRITE_W * sc, rows * sc, -4 * s - (SPRITE_W * sc) / 2 + 10 * s, -13 * s - rows * sc + 4 * s, SPRITE_W * sc, rows * sc);
  ctx.fillStyle = color; ctx.fillRect(-2 * s, -13 * s, 16 * s, 4 * s); // борт кабины поверх ног
  ctx.fillStyle = '#333'; ctx.fillRect(10 * s, -16 * s, 6 * s, 2 * s); ctx.fillRect(14 * s, -18 * s, 2 * s, 3 * s); // руль
  // колёса
  const wheel = (wx, r) => { ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(wx, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8a8a8a'; ctx.beginPath(); ctx.arc(wx, 0, r * 0.45, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#cfcfcf'; ctx.fillRect(wx - 1, -r * 0.4, 2, r * 0.8 * Math.abs(Math.cos(wheelSpin))); };
  wheel(0, 6 * s); wheel(18 * s, 4.5 * s);
  ctx.restore();
}

// Три плана: дальний (небо, горы, силуэт города, скорость 0.15), средний (участки трассы вокруг офиса, 0.6),
// ближний (дорога, поребрики, ограждение, фонари, 1.0). Всё привязано к мировой координате.
function drawFar(ctx, w, h, camX, groundY, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, groundY); sky.addColorStop(0, '#24306a'); sky.addColorStop(0.55, '#7a5aa0'); sky.addColorStop(1, '#ffb070'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, groundY);
  ctx.fillStyle = 'rgba(255,220,150,0.25)'; ctx.beginPath(); ctx.arc(w * 0.72, groundY * 0.55, 90, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffe2aa'; ctx.beginPath(); ctx.arc(w * 0.72, groundY * 0.55, 46, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 6; i++) drawCloud(ctx, ((i * 300 - camX * 0.08 + t * 6) % (w + 300)) - 150, 20 + (i % 3) * 32, 6 + (i % 2) * 3, 'rgba(255,230,230,0.85)');
  // горы двумя слоями
  ctx.fillStyle = '#4a3a7a'; ctx.beginPath(); ctx.moveTo(0, groundY);
  for (let x = -((camX * 0.12) % 260) - 260; x < w + 260; x += 260) { ctx.lineTo(x + 90, groundY - groundY * 0.42); ctx.lineTo(x + 180, groundY - groundY * 0.2); }
  ctx.lineTo(w, groundY); ctx.fill();
  ctx.fillStyle = '#3a2c62'; ctx.beginPath(); ctx.moveTo(0, groundY);
  for (let x = -((camX * 0.18) % 200) - 200; x < w + 200; x += 200) { ctx.lineTo(x + 70, groundY - groundY * 0.3); ctx.lineTo(x + 140, groundY - groundY * 0.14); }
  ctx.lineTo(w, groundY); ctx.fill();
  // силуэт города с окнами
  const rr = mulberry32(5);
  for (let x = -((camX * 0.25) % 120) - 120; x < w; x += 120) { const bh = groundY * (0.12 + ((x + camX * 0.25) / 120 % 4) * 0.05); ctx.fillStyle = '#2a2050'; ctx.fillRect(x, groundY - bh, 90, bh); ctx.fillStyle = '#ffd98a'; for (let wy = groundY - bh + 8; wy < groundY - 6; wy += 10) for (let wx = x + 8; wx < x + 84; wx += 12) if (((wx * 7 + wy * 13) % 10) < 5) ctx.fillRect(wx, wy, 5, 5); ctx.fillStyle = '#1e1640'; ctx.fillRect(x + 10, groundY - bh - 12, 18, 12); }
}

function drawTree(ctx, x, y, s, t) {
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x - 4 * s, y - 30 * s, 8 * s, 30 * s);
  const sway = Math.sin(t * 1.5 + x * 0.01) * 2;
  [[0, -44, 26, '#2f7a34'], [-12 + sway, -36, 20, '#3a8f3e'], [12 + sway, -34, 20, '#3a8f3e'], [0, -28, 22, '#46a84a'], [-4 + sway, -50, 14, '#5cbf5e']].forEach(([dx, dy, r, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x, y, 22 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
}

function drawCar(ctx, x, y, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - 2, y + 2, 60, 6);
  ctx.fillStyle = color; ctx.fillRect(x, y - 18, 56, 18); ctx.fillRect(x + 12, y - 28, 30, 10);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y - 18, 56, 3);
  ctx.fillStyle = '#9ad0ff'; ctx.fillRect(x + 15, y - 26, 11, 8); ctx.fillRect(x + 29, y - 26, 11, 8);
  ctx.fillStyle = '#222'; ctx.fillRect(x + 6, y - 4, 12, 8); ctx.fillRect(x + 38, y - 4, 12, 8);
  ctx.fillStyle = '#888'; ctx.fillRect(x + 9, y - 1, 6, 3); ctx.fillRect(x + 41, y - 1, 6, 3);
  ctx.fillStyle = '#ffd166'; ctx.fillRect(x + 52, y - 14, 4, 4); ctx.fillStyle = '#ff5050'; ctx.fillRect(x, y - 14, 3, 4);
}

function drawSection(ctx, w, h, camX, L, groundY, t, seed) {
  drawFar(ctx, w, h, camX, groundY, t);
  const mid = camX * 0.6;
  const seg = L / 4;
  const x0 = Math.floor(mid / L) * L - L;
  for (let lap = 0; lap < 3; lap++) {
    const base = x0 + lap * L;
    // 1. штаб-квартира Сбера и парковка
    const sx1 = base - mid;
    if (sx1 < w && sx1 + seg > 0) {
      const bh = groundY * 0.82, bx = sx1 + seg * 0.18, bw = seg * 0.64;
      ctx.fillStyle = '#146a2a'; ctx.fillRect(bx + 10, groundY - bh + 10, bw, bh); // тень корпуса
      ctx.fillStyle = '#21a038'; ctx.fillRect(bx, groundY - bh, bw, bh);
      ctx.fillStyle = '#4fc86a'; ctx.fillRect(bx, groundY - bh, 10, bh); ctx.fillRect(bx, groundY - bh, bw, 8);
      for (let fx = bx + 18; fx < bx + bw - 18; fx += 34) for (let fy = groundY - bh + 22; fy < groundY - 30; fy += 26) { const lit = ((fx * 3 + fy * 7 + lap) % 9) < 5; ctx.fillStyle = lit ? '#fff2c0' : '#0f4a1e'; ctx.fillRect(fx, fy, 22, 14); ctx.fillStyle = lit ? '#fff' : '#1a6a30'; ctx.fillRect(fx, fy, 22, 3); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(fx + 2, fy + 4, 6, 8); }
      ctx.fillStyle = '#d8f0dc'; ctx.fillRect(bx + bw * 0.3, groundY - 50, bw * 0.4, 50); ctx.fillStyle = '#9ad0ff'; ctx.fillRect(bx + bw * 0.34, groundY - 44, bw * 0.32, 40); ctx.fillStyle = '#0f4a1e'; ctx.fillRect(bx + bw * 0.5 - 2, groundY - 44, 4, 40);
      ctx.fillStyle = '#21a038'; ctx.fillRect(bx + bw * 0.24, groundY - 58, bw * 0.52, 10);
      ctx.fillStyle = 'rgba(33,160,56,0.25)'; ctx.fillRect(bx + bw * 0.4 - 30, groundY - bh - 60, bw * 0.2 + 60, 60);
      ctx.fillStyle = '#fff'; ctx.fillRect(bx + bw * 0.4, groundY - bh - 40, bw * 0.2, 30); ctx.fillStyle = '#21a038'; ctx.font = "12px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('СБЕР', bx + bw * 0.4 + 14, groundY - bh - 31);
      ctx.fillStyle = '#21a038'; ctx.beginPath(); ctx.arc(bx + bw * 0.4 - 16, groundY - bh - 25, 12, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx + bw * 0.4 - 16, groundY - bh - 25, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#21a038'; ctx.fillRect(bx + bw * 0.4 - 19, groundY - bh - 28, 6, 6);
      [0.06, 0.12, 0.88, 0.94].forEach((f) => drawTree(ctx, sx1 + seg * f, groundY, 1.1, t));
      [0.2, 0.8].forEach((f, i) => { const fx = sx1 + seg * f; ctx.fillStyle = '#ddd'; ctx.fillRect(fx, groundY - 120, 3, 120); const wave = Math.sin(t * 4 + i) * 3; ctx.fillStyle = '#21a038'; ctx.beginPath(); ctx.moveTo(fx + 3, groundY - 118); ctx.lineTo(fx + 40, groundY - 112 + wave); ctx.lineTo(fx + 40, groundY - 92 + wave); ctx.lineTo(fx + 3, groundY - 96); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(fx + 14, groundY - 108 + wave / 2, 14, 8); });
      // парковка: асфальт с разметкой и машины в три тона
      ctx.fillStyle = '#5a5a62'; ctx.fillRect(sx1, groundY - 26, seg, 26); ctx.fillStyle = '#6a6a72'; ctx.fillRect(sx1, groundY - 26, seg, 3);
      ctx.fillStyle = '#e8e8e8'; for (let px = sx1; px < sx1 + seg; px += 90) ctx.fillRect(px, groundY - 26, 3, 26);
      for (let px = sx1 + 30; px < sx1 + seg - 60; px += 90) drawCar(ctx, px, groundY - 6, ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#8e44ad'][Math.abs(Math.round((px + mid) / 90)) % 5]);
    }
    // 2. коридор офиса за стеклом
    const sx2 = base + seg - mid;
    if (sx2 < w && sx2 + seg > 0) {
      ctx.fillStyle = '#d6d2c6'; ctx.fillRect(sx2, groundY * 0.12, seg, groundY * 0.1);
      ctx.fillStyle = '#c4c0b4'; for (let px = sx2; px < sx2 + seg; px += 60) ctx.fillRect(px, groundY * 0.12, 2, groundY * 0.1);
      ctx.fillStyle = '#e8e2d2'; ctx.fillRect(sx2, groundY * 0.22, seg, groundY * 0.78);
      ctx.fillStyle = '#cfc9b8'; ctx.fillRect(sx2, groundY * 0.22, seg, 6); ctx.fillRect(sx2, groundY - 12, seg, 12);
      for (let px = sx2 + 40; px < sx2 + seg; px += 200) { ctx.fillStyle = 'rgba(255,255,240,0.22)'; ctx.fillRect(px - 20, groundY * 0.2, 140, groundY * 0.5); ctx.fillStyle = '#fbfbf2'; ctx.fillRect(px, groundY * 0.17, 100, 6); }
      for (let px = sx2 + 20, i = 0; px + 140 < sx2 + seg; px += 160, i++) { ctx.fillStyle = '#e9f1f7'; ctx.fillRect(px, groundY * 0.3, 140, groundY * 0.6); ctx.fillStyle = '#b9c8d6'; ctx.fillRect(px, groundY * 0.3, 140, 3); ctx.fillRect(px + 68, groundY * 0.3, 4, groundY * 0.6); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(px + 10, groundY * 0.32, 26, groundY * 0.56); drawDesk(ctx, px + 12, groundY * 0.88, 1, i + lap * 3, t); drawDesk(ctx, px + 78, groundY * 0.88, 1, i + lap * 3 + 7, t); }
      drawPlant(ctx, sx2 + seg - 40, groundY - 12, 1); drawPlant(ctx, sx2 + 8, groundY - 12, 1);
      ctx.fillStyle = 'rgba(33,160,56,0.35)'; ctx.fillRect(sx2 + seg - 92, groundY * 0.2, 64, 26); ctx.fillStyle = '#21a038'; ctx.fillRect(sx2 + seg - 80, groundY * 0.22, 40, 14); ctx.fillStyle = '#fff'; ctx.font = "5px 'Press Start 2P', monospace"; ctx.fillText('EXIT', sx2 + seg - 76, groundY * 0.22 + 4);
    }
    // 3. столовая
    const sx3 = base + 2 * seg - mid;
    if (sx3 < w && sx3 + seg > 0) {
      ctx.fillStyle = '#f2e6c8'; ctx.fillRect(sx3, groundY * 0.15, seg, groundY * 0.85);
      ctx.fillStyle = '#e0c9a0'; for (let px = sx3; px < sx3 + seg; px += 24) ctx.fillRect(px, groundY * 0.15, 2, groundY * 0.85); for (let py = groundY * 0.15; py < groundY; py += 24) ctx.fillRect(sx3, py, seg, 1);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(sx3 + 30, groundY * 0.2, 150, 60); ctx.fillStyle = '#f8f0d8'; ctx.font = "6px 'Press Start 2P', monospace"; ['КОФЕ 0 ₽', 'ЛАТТЕ 0 ₽', 'ДЕЙЛИК 1'].forEach((l, i) => ctx.fillText(l, sx3 + 40, groundY * 0.2 + 12 + i * 16));
      for (let px = sx3 + 40; px + 100 < sx3 + seg; px += 170) { ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(px + 4, groundY * 0.62 + 40, 90, 6); ctx.fillStyle = '#8a5a3a'; ctx.fillRect(px, groundY * 0.62, 90, 8); ctx.fillStyle = '#a87a52'; ctx.fillRect(px, groundY * 0.62, 90, 2); ctx.fillStyle = '#6a4224'; ctx.fillRect(px + 6, groundY * 0.62 + 8, 6, 30); ctx.fillRect(px + 78, groundY * 0.62 + 8, 6, 30); ctx.fillStyle = '#fff'; ctx.fillRect(px + 20, groundY * 0.62 - 10, 14, 10); ctx.fillRect(px + 50, groundY * 0.62 - 10, 14, 10); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(px + 22, groundY * 0.62 - 8, 10, 3); ctx.fillRect(px + 52, groundY * 0.62 - 8, 10, 3); drawNpc(ctx, 7 + lap, 'idle', px + 100, groundY * 0.62 - 50, 1.2); for (let k = 0; k < 3; k++) { ctx.fillStyle = `rgba(255,255,255,${0.35 - k * 0.1})`; ctx.fillRect(px + 26 + Math.sin(t * 3 + k) * 3, groundY * 0.62 - 20 - k * 8 - (t * 20 % 8), 3, 6); } }
      const cm = sx3 + seg - 90; ctx.fillStyle = '#2a2a30'; ctx.fillRect(cm, groundY * 0.45, 50, 60); ctx.fillStyle = '#3c3c44'; ctx.fillRect(cm, groundY * 0.45, 50, 4); ctx.fillStyle = Math.floor(t * 2) % 2 ? '#ff5050' : '#802020'; ctx.fillRect(cm + 8, groundY * 0.45 + 8, 8, 8); ctx.fillStyle = 'rgba(255,80,80,0.2)'; ctx.fillRect(cm - 6, groundY * 0.45 - 2, 62, 24); ctx.fillStyle = '#fff'; ctx.font = "5px 'Press Start 2P', monospace"; ctx.fillText('КОФЕ', cm + 6, groundY * 0.45 + 24); ctx.fillStyle = '#e8e8e8'; ctx.fillRect(cm + 16, groundY * 0.45 + 44, 18, 10);
      drawPlant(ctx, sx3 + 10, groundY * 0.98, 1);
    }
    // 4. серверная и башня ночью
    const sx4 = base + 3 * seg - mid;
    if (sx4 < w && sx4 + seg > 0) {
      ctx.fillStyle = '#141a34'; ctx.fillRect(sx4, groundY * 0.12, seg, groundY * 0.88);
      ctx.fillStyle = '#1c2446'; for (let py = groundY * 0.12; py < groundY; py += 18) ctx.fillRect(sx4, py, seg, 1);
      const tw = seg * 0.28, tx = sx4 + seg * 0.62; ctx.fillStyle = '#1e2a58'; ctx.fillRect(tx, groundY * 0.14, tw, groundY * 0.86); ctx.fillStyle = '#2e3c7a'; ctx.fillRect(tx, groundY * 0.14, 8, groundY * 0.86); for (let fy = groundY * 0.18; fy < groundY - 10; fy += 14) for (let fx = tx + 14; fx < tx + tw - 8; fx += 16) { ctx.fillStyle = ((fx * 5 + fy * 3) % 7) < 4 ? '#ffe9a0' : '#101830'; ctx.fillRect(fx, fy, 9, 8); }
      ctx.fillStyle = 'rgba(33,160,56,0.3)'; ctx.fillRect(tx - 20, groundY * 0.06, tw + 40, 40); ctx.fillStyle = '#fff'; ctx.fillRect(tx, groundY * 0.08, tw, 24); ctx.fillStyle = '#21a038'; ctx.font = "9px 'Press Start 2P', monospace"; ctx.fillText('СБЕР ТРЕК', tx + 10, groundY * 0.08 + 8);
      for (let px = sx4 + 20; px + 60 < tx - 20; px += 80) { ctx.fillStyle = '#20284a'; ctx.fillRect(px, groundY * 0.25, 50, groundY * 0.75); ctx.fillStyle = '#2c3660'; ctx.fillRect(px, groundY * 0.25, 50, 4); ctx.fillRect(px, groundY * 0.25, 4, groundY * 0.75); for (let ly = groundY * 0.28; ly < groundY * 0.95; ly += 12) { const on = Math.floor(t * 6 + px / 40 + ly) % 3; ctx.fillStyle = on ? '#21a038' : '#0a3a14'; ctx.fillRect(px + 8, ly, 4, 4); ctx.fillStyle = on === 1 ? '#3aa0ff' : '#0a2a5a'; ctx.fillRect(px + 16, ly, 4, 4); ctx.fillStyle = '#3a4470'; ctx.fillRect(px + 24, ly, 20, 4); } ctx.fillStyle = 'rgba(58,160,255,0.08)'; ctx.fillRect(px - 6, groundY * 0.22, 62, groundY * 0.8); }
      ctx.fillStyle = '#3a4470'; for (let px = sx4 + 20; px < tx; px += 40) ctx.fillRect(px, groundY - 8, 30, 3);
    }
  }
  // ближний план: дорога с текстурой, поребрики, ограждение со зрителями, фонари
  ctx.fillStyle = '#4a4a52'; ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = '#3e3e46'; for (let i = 0; i < 160; i++) { const px = ((i * 137 - camX) % (w + 20) + (w + 20)) % (w + 20) - 10, py = groundY + ((i * 71) % (h - groundY)); ctx.fillRect(px, py, 3, 2); }
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = groundY + 10; y < h; y += 8) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let px = -((camX * 1.3) % 500) - 500; px < w; px += 500) { ctx.fillRect(px, groundY + (h - groundY) * 0.3, 90, 4); ctx.fillRect(px + 20, groundY + (h - groundY) * 0.7, 70, 4); }
  ctx.fillStyle = '#e8e8e8'; for (let px = -((camX) % 80) - 80; px < w; px += 80) ctx.fillRect(px, groundY + (h - groundY) * 0.5, 40, 3);
  for (let px = -((camX) % 40) - 40; px < w; px += 40) { ctx.fillStyle = (Math.floor((px + camX) / 40) % 2) ? '#e53935' : '#f4f4f4'; ctx.fillRect(px, groundY, 40, 8); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(px, groundY + 6, 40, 2); }
  ctx.fillStyle = '#c9c9d0'; ctx.fillRect(0, groundY - 14, w, 6); ctx.fillStyle = '#8a8a94'; ctx.fillRect(0, groundY - 8, w, 8);
  for (let px = -((camX) % 34) - 34; px < w; px += 34) { ctx.fillStyle = '#7a7a84'; ctx.fillRect(px, groundY - 14, 3, 14); }
  for (let px = -((camX) % 260) - 260 + 30; px < w; px += 260) { ctx.fillStyle = 'rgba(255,230,160,0.12)'; ctx.beginPath(); ctx.moveTo(px + 3, groundY - 150); ctx.lineTo(px - 50, groundY); ctx.lineTo(px + 56, groundY); ctx.fill(); ctx.fillStyle = '#5a5a64'; ctx.fillRect(px, groundY - 150, 6, 136); ctx.fillStyle = '#fff6d0'; ctx.fillRect(px - 8, groundY - 158, 22, 8); }
  for (let px = -((camX) % 520) - 520 + 120; px < w; px += 520) for (let k = 0; k < 3; k++) drawNpcBust(ctx, (Math.floor((px + camX) / 520) * 3 + k) % 12, px + k * 30, groundY - 44 + Math.round(Math.sin(t * 5 + k) * 2), 1, 30);
  ctx.fillStyle = '#222'; for (let px = -((camX) % 360) - 360 + 200; px < w; px += 360) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(px + k * 14, groundY - 6, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.arc(px + k * 14, groundY - 6, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; }
}

function drawObstacle(ctx, kind, x, y, t) {
  if (kind === 'cone') { ctx.fillStyle = '#ff8c42'; ctx.fillRect(x + 8, y - 24, 8, 24); ctx.fillRect(x + 4, y - 12, 16, 4); ctx.fillStyle = '#fff'; ctx.fillRect(x + 8, y - 16, 8, 3); ctx.fillStyle = '#222'; ctx.fillRect(x, y - 3, 24, 3); }
  else if (kind === 'coffee') { ctx.fillStyle = '#5a3a1a'; ctx.beginPath(); ctx.ellipse(x + 20, y - 2, 26, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x + 30, y - 22, 12, 16); ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 32, y - 20, 8, 3); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x + 34, y - 30 - Math.sin(t * 3) * 2, 2, 6); }
  else if (kind === 'papers') { ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) ctx.fillRect(x + i * 3, y - 6 - i * 3, 22, 4); ctx.fillStyle = '#333'; ctx.fillRect(x + 6, y - 16, 10, 1); ctx.fillRect(x + 6, y - 13, 12, 1); }
  else if (kind === 'ramp') { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 50, y - 22); ctx.lineTo(x + 50, y); ctx.fill(); ctx.fillStyle = '#222'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * 10, y - 4 - i * 4, 4, 2); }
  else if (kind === 'pad') { ctx.fillStyle = Math.floor(t * 8) % 2 ? '#21a038' : '#6ec85a'; ctx.fillRect(x, y - 4, 60, 4); ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.fillRect(x + 10 + i * 16, y - 3, 6, 2); ctx.fillRect(x + 14 + i * 16, y - 4, 2, 4); } }
}

export default {
  id: 'kart',
  title: 'Картинг',
  description: 'Два круга вокруг офиса на картах: парковка, коридор, столовая и серверная, а на трассе конусы, кофе и рампы.',
  cover: 'assets/covers/kart.jpg',
  duration: 18,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    const groundY = h * 0.68;
    drawSection(ctx, w, h, t * 90 + 200, 1400, groundY, t, 5);
    drawObstacle(ctx, 'cone', ((400 - t * 90) % w + w) % w, groundY + 30, t);
    people.slice(0, 3).forEach((p, i) => drawKartSide(ctx, p.person, 40 + i * 80, groundY + 20 + i * 8, 1.2, KART_COLORS[i], Math.sin(t * 8 + i) * 0.03, t * 10, i === 0));
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rank = new Map(order.map((id, i) => [id, i]));
    const rnd = mulberry32(seed);
    const rows = Math.min(n, 4);
    const karts = participants.map((p, i) => ({
      p, rank: rank.get(p.id), color: KART_COLORS[i % KART_COLORS.length], row: i % rows,
      final: LAPS - rank.get(p.id) * (0.12 / n), f: 1 + rnd() * 1.4, phase: rnd() * 6.28, amp: 0.05 + rnd() * 0.05, spinSeed: rnd() * 6.28,
    }));
    const particles = makeParticles();
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, flashAt = null, lastSmoke = 0;
    const progress = (k, t) => { const ease = 1 - Math.pow(1 - t, 2); const noise = k.amp * Math.sin(2 * Math.PI * (k.f * t + k.phase)) * Math.pow(1 - t, 1.4) * Math.pow(t, 0.4); return Math.max(0, Math.min(k.final, k.final * ease + noise)); };
    const events = new Set();

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const time = (now - start) / 1000, t = Math.min(1, time / dur);
      const w = canvas.width, h = canvas.height;
      const L = w * 3.2; // длина круга в пикселях
      const groundY = Math.round(h * 0.6);
      const scale = n <= 8 ? Math.max(2, Math.min(3, Math.floor(h / 300))) : 2;
      const rowH = (h - groundY - 30 * scale) / Math.max(1, rows);
      const ps = karts.map((k) => progress(k, t));
      const leader = Math.max(...ps);
      const startX = 120;
      const camX = Math.max(0, startX + leader * L - w * 0.6);

      ctx.imageSmoothingEnabled = false;
      const finishPoint = { x: Math.round(startX + LAPS * L - camX) + 10, y: groundY + 40 };
      beginCamera(ctx, w, h, time, flashAt !== null ? [flashAt] : [], () => finishPoint, { level: 1.25, dur: 1.1, amp: 10 });
      drawSection(ctx, w, h, camX, L, groundY, time, seed);
      drawAmbient(ctx, 'leaves', w, h, time, 16, camX);
      // препятствия на каждом круге и линия финиша
      for (let lap = 0; lap < LAPS; lap++) OBSTACLES.forEach(([f, kind]) => { for (let r = 0; r < rows; r++) { const ox = startX + (lap + f) * L - camX + r * 30; if (ox > -80 && ox < w + 80) drawObstacle(ctx, kind, ox, groundY + 22 + r * rowH + rowH * 0.5, time); } });
      const fx = Math.round(startX + LAPS * L - camX);
      for (let y = groundY; y < h; y += 8) for (let k2 = 0; k2 < 2; k2++) { ctx.fillStyle = ((y / 8 + k2) % 2) ? '#141414' : '#f4f4f4'; ctx.fillRect(fx + k2 * 8, y, 8, 8); }
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(fx - 6, groundY - 100, 6, 100); ctx.fillRect(fx + 16, groundY - 100, 6, 100);
      ctx.fillStyle = '#21a038'; ctx.fillRect(fx - 10, groundY - 108, 36, 16); ctx.fillStyle = '#fff'; ctx.font = "8px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('ФИНИШ', fx - 6, groundY - 105);
      // табло
      ctx.fillStyle = '#111'; ctx.fillRect(w - 230, 16, 214, 40); ctx.fillStyle = '#ffd166'; ctx.font = "9px 'Press Start 2P', monospace";
      ctx.fillText(`КРУГ ${Math.min(LAPS, Math.floor(leader) + 1)} / ${LAPS}`, w - 218, 24); ctx.fillStyle = '#6ec85a'; ctx.fillText('B2Bсосы GP', w - 218, 40);
      // мини-карта кольца
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(16, h - 70, 150, 54); ctx.strokeStyle = '#aaa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(30, h - 58, 122, 30, 15); ctx.stroke();
      karts.forEach((k, i) => { const u = ps[i] % 1; const per = 2 * 122 + 2 * 30; let d = u * per, mx, my; if (d < 122) { mx = 30 + d; my = h - 28; } else if (d < 122 + 30) { mx = 152; my = h - 28 - (d - 122); } else if (d < 244 + 30) { mx = 152 - (d - 152); my = h - 58; } else { mx = 30; my = h - 58 + (d - 274); } ctx.fillStyle = k.color; ctx.fillRect(mx - 3, my - 3, 6, 6); });

      if (time - lastSmoke > 0.1 && t < 1) { lastSmoke = time; karts.forEach((k, i) => { const x = startX + ps[i] * L - camX; if (x > -50 && x < w + 50) particles.puff(x - 6, groundY + 22 + k.row * rowH + rowH * 0.5, time, rnd, 'rgba(200,200,210,0.5)'); }); }
      particles.draw(ctx, time);
      const orderDraw = [...karts.keys()].sort((a, b) => karts[a].row - karts[b].row);
      orderDraw.forEach((i) => {
        const k = karts[i];
        const x = Math.round(startX + ps[i] * L - camX);
        if (x < -120 || x > w + 120) return;
        const y = Math.round(groundY + 22 + k.row * rowH + rowH * 0.5);
        // реакция на препятствия: прыжок, вращение, буст, бумаги
        const lapPos = ps[i] % 1; let jump = 0, spin = 0, boost = false;
        OBSTACLES.forEach(([f, kind]) => {
          const d = (lapPos - f) * L; // пикселей после препятствия
          if (d >= 0 && d < 90) {
            const u = d / 90;
            if (kind === 'cone' || kind === 'ramp') jump = Math.sin(u * Math.PI) * (kind === 'ramp' ? 60 : 30);
            if (kind === 'coffee') spin = u * Math.PI * 2;
            if (kind === 'pad') boost = true;
            if (kind === 'papers' && u < 0.2 && !events.has(`${i}-${Math.floor(ps[i])}-p`)) { events.add(`${i}-${Math.floor(ps[i])}-p`); particles.burst(x, y - 20, time, rnd, { count: 12, speed: 160, colors: ['#fff', '#eee'], life: 1.0, gravity: 120, size: 5 }); }
            if ((kind === 'cone' || kind === 'coffee') && u < 0.1 && onEvent && !events.has(`${i}-${Math.floor(ps[i])}-${f}`)) { events.add(`${i}-${Math.floor(ps[i])}-${f}`); onEvent('whoosh'); }
          }
        });
        const tilt = spin || (t < 1 ? Math.sin(time * 10 + k.spinSeed) * 0.02 : 0);
        drawKartSide(ctx, k.p.person, x, y - jump, scale, k.color, tilt, time * 14 * (0.7 + k.f * 0.3), boost && t < 1);
        const first = t >= 1 && k.rank === 0;
        label(ctx, k.p.name, x + 10 * scale, y - jump - 46 * scale - 8, scale >= 3 ? 9 : 8, first ? '#ffd166' : '#f4ecd8', 'rgba(12,8,24,0.85)', first ? '#ffd166' : null);
      });
      if (t < 1) { const li = ps.indexOf(leader); const lx = Math.round(startX + ps[li] * L - camX); if (lx > 0 && lx < w) speedLines(ctx, lx - 10, groundY + 22 + karts[li].row * rowH + rowH * 0.5 - 12 * scale, 5, 30); }
      vignette(ctx, w, h, 0.35);
      ctx.restore();
      if (flashAt !== null && time - flashAt < 1.4) bigText(ctx, w, h, 'ФИНИШ!', time);
      if (flashAt === null && leader >= LAPS - 0.01) { flashAt = time; particles.burst(fx + 8, groundY - 40, time, rnd, { count: 70, speed: 260, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#fff', '#21a038'], life: 1.5 }); }
      if (flashAt !== null) { const a = Math.max(0, 0.8 - (time - flashAt) * 2); if (a > 0) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, w, h); } }
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
