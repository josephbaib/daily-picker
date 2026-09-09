// Сочность: замедление времени в ключевые моменты, тряска и наезд камеры, кольца удара,
// атмосферные частицы и виньетка. Всё детерминировано от времени, у всех зрителей одинаково.

// Карта реального времени в игровое: после каждого события игра идёт медленнее slowDur игровых
// секунд с множителем factor. События задаются в игровом времени, поэтому расписание не меняется.
export function makeWarp(times, slowDur = 0.35, factor = 0.4) {
  const segs = []; let g = 0, r = 0;
  [...times].sort((a, b) => a - b).forEach((e) => {
    if (e <= g) return;
    segs.push({ g0: g, r0: r, r1: r + (e - g), rate: 1 }); r += e - g; g = e;
    segs.push({ g0: g, r0: r, r1: r + slowDur / factor, rate: factor }); r += slowDur / factor; g += slowDur;
  });
  const fn = (real) => { for (const s of segs) if (real < s.r1) return s.g0 + (real - s.r0) * s.rate; return g + (real - r); };
  fn.extra = r - g; // на сколько реальных секунд игра стала длиннее
  return fn;
}

// Тряска: затухающая после каждого события из списка.
export function shakeOffset(t, times, amp = 8, dur = 0.45) {
  let dx = 0, dy = 0;
  for (const e of times) { const age = t - e; if (age >= 0 && age < dur) { const k = (1 - age / dur) * amp; dx += Math.sin(age * 70) * k; dy += Math.cos(age * 53) * k * 0.7; } }
  return { dx, dy };
}

// Камера: наезд на точку после события и тряска. Вызывать после очистки холста, закрывать ctx.restore().
export function beginCamera(ctx, w, h, t, times, focus, { level = 1.3, dur = 0.8, amp = 8 } = {}) {
  ctx.save();
  let zoom = 1, fx = w / 2, fy = h / 2;
  for (let i = 0; i < times.length; i++) {
    const age = t - times[i];
    if (age >= 0 && age < dur) { const k = Math.sin(Math.min(1, age / dur) * Math.PI); zoom = 1 + (level - 1) * k; const p = focus(i); if (p) { fx = p.x; fy = p.y; } }
  }
  const { dx, dy } = shakeOffset(t, times, amp);
  ctx.translate(dx, dy);
  if (zoom !== 1) { ctx.translate(fx, fy); ctx.scale(zoom, zoom); ctx.translate(-fx, -fy); }
}

// Кольцо удара: расширяется и тает.
export function impactRing(ctx, x, y, age, color = '#ffffff', size = 60) {
  if (age < 0 || age > 0.5) return;
  const k = age / 0.5;
  ctx.strokeStyle = color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 6 * (1 - k) + 1;
  ctx.beginPath(); ctx.arc(x, y, size * k, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
}

// Атмосферные частицы без состояния: положение считается от номера и времени.
const AMBIENT = {
  rain: (i, t, w, h) => ({ x: ((i * 97 + t * 40) % (w + 40)) - 20, y: ((i * 61 + t * 520) % (h + 40)) - 20, w: 1, h: 10, color: 'rgba(180,200,255,0.35)' }),
  leaves: (i, t, w, h) => ({ x: ((i * 131 + t * 30 + Math.sin(t * 2 + i) * 20) % (w + 60)) - 30, y: ((i * 83 + t * 45) % (h + 40)) - 20, w: 4, h: 3, color: i % 2 ? 'rgba(120,180,80,0.8)' : 'rgba(200,150,60,0.8)' }),
  petals: (i, t, w, h) => ({ x: ((i * 113 + t * 25 + Math.sin(t * 1.5 + i) * 30) % (w + 60)) - 30, y: ((i * 71 + t * 35) % (h + 40)) - 20, w: 3, h: 3, color: 'rgba(255,170,200,0.8)' }),
  embers: (i, t, w, h) => ({ x: ((i * 127 + Math.sin(t * 1.3 + i) * 25) % (w + 40)) - 20, y: h - ((i * 53 + t * 40) % (h + 40)), w: 2, h: 2, color: i % 3 ? 'rgba(255,160,60,0.9)' : 'rgba(255,220,120,0.9)' }),
  dust: (i, t, w, h) => ({ x: ((i * 89 + t * 8 + Math.sin(t * 0.7 + i) * 10) % (w + 40)) - 20, y: ((i * 67 + t * 6) % (h + 40)) - 20, w: 2, h: 2, color: 'rgba(255,240,200,0.25)' }),
  paper: (i, t, w, h) => ({ x: ((i * 151 + t * 120) % (w + 80)) - 40, y: ((i * 79 + Math.sin(t * 3 + i) * 40 + t * 20) % (h + 40)) - 20, w: 10, h: 12, color: 'rgba(245,245,245,0.85)' }),
  sparks: (i, t, w, h) => ({ x: ((i * 107 + t * 200) % (w + 40)) - 20, y: h * 0.6 + ((i * 41 + t * 90) % (h * 0.4)), w: 3, h: 2, color: 'rgba(255,200,80,0.9)' }),
  confetti: (i, t, w, h) => ({ x: ((i * 101 + Math.sin(t * 2 + i) * 30) % (w + 40)) - 20, y: ((i * 59 + t * 70) % (h + 40)) - 20, w: 5, h: 4, color: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#fff'][i % 5] }),
  snow: (i, t, w, h) => ({ x: ((i * 97 + t * 15 + Math.sin(t + i) * 15) % (w + 40)) - 20, y: ((i * 61 + t * 30) % (h + 40)) - 20, w: 3, h: 3, color: 'rgba(255,255,255,0.8)' }),
};
export function drawAmbient(ctx, kind, w, h, t, count = 40, camX = 0) {
  const fn = AMBIENT[kind]; if (!fn) return;
  for (let i = 0; i < count; i++) { const p = fn(i, t + camX * 0.002, w, h); ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h); }
}

// Виньетка и цветовой тон поверх кадра.
export function vignette(ctx, w, h, strength = 0.6) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
export function tint(ctx, w, h, color, alpha) { ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; }

// Полосы скорости за быстрым объектом.
export function speedLines(ctx, x, y, n = 5, len = 26, color = 'rgba(255,255,255,0.5)') {
  ctx.fillStyle = color; for (let k = 0; k < n; k++) ctx.fillRect(x - 8 - k * (len * 0.6), y + k * 7 - n * 3, len - k * 3, 2);
}

// Крупная надпись по центру с дрожанием: «K.O.», «ФИНИШ», «ЗАМЕНА!»
export function bigText(ctx, w, h, text, t, color = '#ffd166', size = 40) {
  ctx.save(); ctx.font = `${size}px 'Press Start 2P', monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(text, w / 2 + 4, h * 0.32 + 4 + Math.sin(t * 40) * 2);
  ctx.fillStyle = color; ctx.fillText(text, w / 2, h * 0.32 + Math.sin(t * 40) * 2); ctx.restore();
}
