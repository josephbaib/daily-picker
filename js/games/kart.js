import { portraitCanvas } from '../sprite.js';
import { mulberry32 } from '../rng.js';
import { label, makeParticles, drawNpcBust } from './scene.js';

// Картинг: овальная трасса сверху, три круга, лидер меняется, финиш по рассчитанному порядку.
const KART_COLORS = ['#e53935', '#3c8cdc', '#ffd166', '#6ec85a', '#9650c8', '#ff8c42', '#2bd4c8', '#f06292', '#8d6e63', '#cfd8dc', '#ffee58', '#26a69a', '#ab47bc', '#ef5350', '#42a5f5', '#66bb6a', '#ffa726', '#26c6da', '#ec407a', '#78909c'];

// Точка на овале по параметру u∈[0,1): старт внизу, едем против часовой (вправо по нижней прямой).
function trackPoint(u, cx, cy, rx, ry, straight) {
  const per = 2 * straight + 2 * Math.PI * ry; // приблизительно: две прямые и два полукруга радиуса ry
  let d = (u % 1) * per;
  if (d < straight) return { x: cx - straight / 2 + d, y: cy + ry, a: 0 };
  d -= straight;
  if (d < Math.PI * ry) { const a = -Math.PI / 2 + d / ry; return { x: cx + straight / 2 + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, a: a + Math.PI / 2 }; }
  d -= Math.PI * ry;
  if (d < straight) return { x: cx + straight / 2 - d, y: cy - ry, a: Math.PI };
  d -= straight;
  const a = Math.PI / 2 + d / ry; return { x: cx - straight / 2 + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, a: a + Math.PI / 2 };
}

function drawTrack(ctx, w, h, cx, cy, rx, ry, straight, width, t) {
  // трава и трибуны по периметру
  ctx.fillStyle = '#3f8a3a'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#3a7f35'; for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) ctx.fillRect(x, y, 8, 8);
  const path = (r) => { ctx.beginPath(); ctx.moveTo(cx - straight / 2, cy - (ry + r)); ctx.lineTo(cx + straight / 2, cy - (ry + r)); ctx.ellipse(cx + straight / 2, cy, rx + r, ry + r, 0, -Math.PI / 2, Math.PI / 2); ctx.lineTo(cx - straight / 2, cy + (ry + r)); ctx.ellipse(cx - straight / 2, cy, rx + r, ry + r, 0, Math.PI / 2, Math.PI * 1.5); ctx.closePath(); };
  ctx.lineCap = 'butt';
  ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = width + 14; path(0); ctx.stroke();
  ctx.strokeStyle = '#555'; ctx.lineWidth = width; path(0); ctx.stroke();
  // поребрики
  ctx.setLineDash([12, 12]); ctx.lineWidth = 6;
  ctx.strokeStyle = '#e53935'; path(width / 2 + 2); ctx.stroke(); path(-width / 2 - 2); ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineDashOffset = 12; path(width / 2 + 2); ctx.stroke(); path(-width / 2 - 2); ctx.stroke();
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  // разметка по центру
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([16, 18]); path(0); ctx.stroke(); ctx.setLineDash([]);
  // стартовая клетчатая линия внизу
  const sx = cx - straight / 2 + 20, sy = cy + ry - width / 2;
  for (let i = 0; i < width / 8; i++) for (let k = 0; k < 2; k++) { ctx.fillStyle = (i + k) % 2 ? '#111' : '#fff'; ctx.fillRect(sx + k * 8, sy + i * 8, 8, 8); }
  // шины и трибуна внутри овала
  ctx.fillStyle = '#222'; for (let i = 0; i < 14; i++) { const p = trackPoint(i / 14 + 0.02, cx, cy, rx - width / 2 - 26, ry - width / 2 - 26, straight); ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#4a4060'; ctx.fillRect(cx - straight / 2, cy - 40, straight, 80);
  ctx.fillStyle = '#3a3050'; ctx.fillRect(cx - straight / 2, cy - 40, straight, 10);
  for (let i = 0; i < Math.floor(straight / 26); i++) { const bob = Math.round(Math.sin(t * 5 + i) * 1.5); drawNpcBust(ctx, i, cx - straight / 2 + i * 26 - 6, cy - 30 + bob + (i % 2) * 22, 1, 26); }
  ctx.fillStyle = '#21a038'; ctx.fillRect(cx - 70, cy + 44, 140, 22); ctx.fillStyle = '#fff'; ctx.font = "9px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('СБЕР КАРТ', cx - 56, cy + 50);
  // пит-лейн и табло
  ctx.fillStyle = '#6a6a6a'; ctx.fillRect(cx - straight / 2, cy + ry + width / 2 + 16, straight, 26);
  ctx.fillStyle = '#e8e8e8'; for (let x = cx - straight / 2; x < cx + straight / 2; x += 40) ctx.fillRect(x, cy + ry + width / 2 + 28, 20, 2);
}

function drawKart(ctx, x, y, angle, color, portrait, scale) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  const L = 22 * scale, W = 12 * scale;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-L / 2 + 2, -W / 2 + 3, L, W);
  ctx.fillStyle = '#222'; [[-L / 2 + 2, -W / 2 - 3], [L / 2 - 8, -W / 2 - 3], [-L / 2 + 2, W / 2 - 1], [L / 2 - 8, W / 2 - 1]].forEach(([wx, wy]) => ctx.fillRect(wx, wy, 6 * Math.max(1, scale * 0.7), 4 * Math.max(1, scale * 0.7)));
  ctx.fillStyle = color; ctx.fillRect(-L / 2, -W / 2, L, W);
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-L / 2, -W / 2, L, 2);
  ctx.fillStyle = '#111'; ctx.fillRect(L / 2 - 6, -W / 2 + 2, 4, W - 4);
  ctx.restore();
  // голова водителя всегда анфас
  const pw = 14 * scale, ph = 12 * scale;
  ctx.drawImage(portrait, 0, 0, portrait.width, portrait.height, Math.round(x - pw / 2), Math.round(y - ph / 2 - 2 * scale), pw, ph);
}

export default {
  id: 'kart',
  title: 'Картинг',
  description: 'Три круга по овалу на картах, где обгон на последнем повороте решает, кто откроет дейлик.',
  duration: 16,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    const cx = w / 2, cy = h / 2, rx = 40, ry = 40, straight = w * 0.4;
    drawTrack(ctx, w, h, cx, cy, rx, ry, straight, 26, t);
    people.slice(0, 4).forEach((p, i) => { const q = trackPoint(t * 0.12 + i * 0.07, cx, cy, rx, ry, straight); drawKart(ctx, q.x, q.y + (i % 2) * 6 - 3, q.a, KART_COLORS[i], portraitCanvas(p.person, 1), 0.8); });
  },

  play({ canvas, participants, order, seed, onFreeze }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rank = new Map(order.map((id, i) => [id, i]));
    const rnd = mulberry32(seed);
    const laps = 3;
    const karts = participants.map((p, i) => ({
      p, rank: rank.get(p.id), color: KART_COLORS[i % KART_COLORS.length], lane: (i % 3) - 1,
      final: laps - rank.get(p.id) * (0.35 / n), f: 1 + rnd() * 1.5, phase: rnd() * 6.28, amp: 0.08 + rnd() * 0.08,
    }));
    const particles = makeParticles();
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, flashAt = null, lastSmoke = 0;
    const progress = (k, t) => { const ease = 1 - Math.pow(1 - t, 1.8); const noise = k.amp * Math.sin(2 * Math.PI * (k.f * t + k.phase)) * Math.pow(1 - t, 1.4) * Math.pow(t, 0.4); return Math.max(0, Math.min(k.final, k.final * ease + noise)); };

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const time = (now - start) / 1000, t = Math.min(1, time / dur);
      const w = canvas.width, h = canvas.height;
      const width = Math.max(44, Math.min(90, h * 0.11));
      const ry = h * 0.3, rx = ry, straight = w * 0.5, cx = w / 2, cy = h * 0.47;
      const scale = Math.max(1, Math.min(2.2, h / 420));
      ctx.imageSmoothingEnabled = false;
      drawTrack(ctx, w, h, cx, cy, rx, ry, straight, width, time);
      // табло с кругами лидера
      const ps = karts.map((k) => progress(k, t));
      const leader = Math.max(...ps);
      ctx.fillStyle = '#111'; ctx.fillRect(w - 230, 16, 214, 40); ctx.fillStyle = '#ffd166'; ctx.font = "9px 'Press Start 2P', monospace"; ctx.textBaseline = 'top';
      ctx.fillText(`КРУГ ${Math.min(laps, Math.floor(leader) + 1)} / ${laps}`, w - 218, 24); ctx.fillStyle = '#6ec85a'; ctx.fillText('B2Bсосы GP', w - 218, 40);
      // дым от шин
      if (time - lastSmoke > 0.1 && t < 1) { lastSmoke = time; karts.forEach((k, i) => { const q = trackPoint(ps[i], cx, cy, rx, ry, straight); particles.puff(q.x - Math.cos(q.a) * 12, q.y - Math.sin(q.a) * 12 + k.lane * width * 0.28, time, rnd, 'rgba(230,230,230,0.5)'); }); }
      particles.draw(ctx, time);
      // карты: дальние по y первыми
      const drawOrder = [...karts.keys()].sort((a, b) => { const qa = trackPoint(ps[a], cx, cy, rx, ry, straight), qb = trackPoint(ps[b], cx, cy, rx, ry, straight); return (qa.y + karts[a].lane) - (qb.y + karts[b].lane); });
      drawOrder.forEach((i) => {
        const k = karts[i]; const q = trackPoint(ps[i], cx, cy, rx, ry, straight);
        const nx = -Math.sin(q.a), ny = Math.cos(q.a); // нормаль к траектории для полос
        const off = k.lane * width * 0.28;
        drawKart(ctx, q.x + nx * off, q.y + ny * off, q.a, k.color, portraitCanvas(k.p.person, 2), scale);
        const first = t >= 1 && k.rank === 0;
        label(ctx, k.p.name, q.x + nx * off, q.y + ny * off - 16 * scale - 8, 8, first ? '#ffd166' : '#f4ecd8', 'rgba(12,8,24,0.8)', first ? '#ffd166' : null);
      });
      if (flashAt === null && leader >= laps - 0.02) { flashAt = time; particles.burst(cx - straight / 2 + 24, cy + ry, time, rnd, { count: 70, speed: 260, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#fff'], life: 1.5 }); }
      if (flashAt !== null) { const a = Math.max(0, 0.8 - (time - flashAt) * 2); if (a > 0) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, w, h); } }
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  },
};
