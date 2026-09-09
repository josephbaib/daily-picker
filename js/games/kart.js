import { spriteCanvas, SPRITE_W } from '../sprite.js?v=0a3148a-1452';
import { mulberry32 } from '../rng.js?v=0a3148a-1452';
import { label, makeParticles, drawDesk, drawPlant, drawNpc, drawCloud } from './scene.js?v=0a3148a-1452';

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

function drawSection(ctx, w, h, camX, L, groundY, t, seed) {
  // мир повторяется каждый круг: рисуем участки по мировой координате
  const rnd = mulberry32(seed);
  const x0 = Math.floor(camX / L) * L - L;
  ctx.fillStyle = '#7fb3e6'; ctx.fillRect(0, 0, w, groundY); // небо
  for (let i = 0; i < 5; i++) drawCloud(ctx, ((i * 300 - camX * 0.1 + t * 6) % (w + 300)) - 150, 20 + (i % 3) * 30, 6 + (i % 2) * 3);
  for (let lap = 0; lap < 3; lap++) {
    const base = x0 + lap * L;
    const seg = L / 4;
    // 1. парковка у офиса
    const sx1 = base - camX;
    if (sx1 < w && sx1 + seg > 0) {
      ctx.fillStyle = '#21a038'; ctx.fillRect(sx1, groundY * 0.18, seg, groundY * 0.82);
      ctx.fillStyle = '#1b8a2f'; for (let fx = sx1 + 10; fx < sx1 + seg; fx += 34) for (let fy = groundY * 0.24; fy < groundY * 0.95; fy += 26) ctx.fillRect(fx, fy, 22, 16);
      ctx.fillStyle = '#e8f4ff'; for (let fx = sx1 + 14; fx < sx1 + seg; fx += 34) for (let fy = groundY * 0.28; fy < groundY * 0.9; fy += 26) ctx.fillRect(fx, fy, 14, 9);
      ctx.fillStyle = '#fff'; ctx.fillRect(sx1 + seg * 0.4, groundY * 0.06, 140, 26); ctx.fillStyle = '#21a038'; ctx.font = "10px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('СБЕР', sx1 + seg * 0.4 + 14, groundY * 0.06 + 8);
      ctx.fillStyle = '#5a5a5a'; ctx.fillRect(sx1, groundY - 34, seg, 34);
      for (let px = sx1 + 30; px < sx1 + seg - 60; px += 90) { ctx.fillStyle = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1'][Math.abs(Math.round((px + camX) / 90)) % 4]; ctx.fillRect(px, groundY - 30, 56, 18); ctx.fillStyle = '#222'; ctx.fillRect(px + 6, groundY - 14, 12, 8); ctx.fillRect(px + 38, groundY - 14, 12, 8); ctx.fillStyle = '#9ad0ff'; ctx.fillRect(px + 14, groundY - 28, 28, 8); }
      ctx.fillStyle = '#fff'; for (let px = sx1; px < sx1 + seg; px += 90) ctx.fillRect(px, groundY - 34, 4, 34);
    }
    // 2. коридор офиса за стеклом
    const sx2 = base + seg - camX;
    if (sx2 < w && sx2 + seg > 0) {
      ctx.fillStyle = '#e8e2d2'; ctx.fillRect(sx2, groundY * 0.15, seg, groundY * 0.85);
      ctx.fillStyle = '#d6d2c6'; ctx.fillRect(sx2, groundY * 0.15, seg, 12);
      ctx.fillStyle = '#fbfbf2'; for (let px = sx2 + 40; px < sx2 + seg; px += 200) ctx.fillRect(px, groundY * 0.2, 100, 6);
      for (let px = sx2 + 20, i = 0; px + 120 < sx2 + seg; px += 150, i++) { ctx.fillStyle = '#e9f1f7'; ctx.fillRect(px, groundY * 0.3, 130, groundY * 0.6); ctx.fillStyle = '#b9c8d6'; ctx.fillRect(px, groundY * 0.3, 130, 3); drawDesk(ctx, px + 16, groundY * 0.88, 1, i + lap * 3, t); }
      ctx.fillStyle = '#21a038'; ctx.fillRect(sx2 + seg - 80, groundY * 0.22, 40, 14); ctx.fillStyle = '#fff'; ctx.font = "5px 'Press Start 2P', monospace"; ctx.fillText('EXIT', sx2 + seg - 76, groundY * 0.22 + 4);
    }
    // 3. столовая
    const sx3 = base + 2 * seg - camX;
    if (sx3 < w && sx3 + seg > 0) {
      ctx.fillStyle = '#f2e6c8'; ctx.fillRect(sx3, groundY * 0.15, seg, groundY * 0.85);
      ctx.fillStyle = '#e0c9a0'; for (let px = sx3; px < sx3 + seg; px += 24) ctx.fillRect(px, groundY * 0.15, 2, groundY * 0.85);
      for (let px = sx3 + 40; px + 100 < sx3 + seg; px += 170) { ctx.fillStyle = '#8a5a3a'; ctx.fillRect(px, groundY * 0.62, 90, 8); ctx.fillRect(px + 6, groundY * 0.62 + 8, 6, 30); ctx.fillRect(px + 78, groundY * 0.62 + 8, 6, 30); ctx.fillStyle = '#fff'; ctx.fillRect(px + 20, groundY * 0.62 - 10, 14, 10); ctx.fillRect(px + 50, groundY * 0.62 - 10, 14, 10); drawNpc(ctx, 7 + lap, 'idle', px + 100, groundY * 0.62 - 50, 1.2); }
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(sx3 + seg - 90, groundY * 0.45, 50, 60); ctx.fillStyle = '#ff5050'; ctx.fillRect(sx3 + seg - 82, groundY * 0.45 + 8, 8, 8); ctx.fillStyle = '#fff'; ctx.font = "5px 'Press Start 2P', monospace"; ctx.fillText('КОФЕ', sx3 + seg - 86, groundY * 0.45 + 24);
      drawPlant(ctx, sx3 + 10, groundY * 0.98, 1);
    }
    // 4. серверная и башня ночью
    const sx4 = base + 3 * seg - camX;
    if (sx4 < w && sx4 + seg > 0) {
      ctx.fillStyle = '#141a34'; ctx.fillRect(sx4, groundY * 0.12, seg, groundY * 0.88);
      for (let px = sx4 + 20; px + 60 < sx4 + seg; px += 80) { ctx.fillStyle = '#26304a'; ctx.fillRect(px, groundY * 0.25, 50, groundY * 0.7); for (let ly = groundY * 0.28; ly < groundY * 0.9; ly += 12) { ctx.fillStyle = Math.floor(t * 6 + px / 40 + ly) % 3 ? '#21a038' : '#0a3a14'; ctx.fillRect(px + 6, ly, 4, 4); ctx.fillStyle = '#3aa0ff'; ctx.fillRect(px + 14, ly, 4, 4); } }
      ctx.fillStyle = '#fff'; ctx.fillRect(sx4 + seg * 0.5, groundY * 0.03, 160, 24); ctx.fillStyle = '#21a038'; ctx.font = "9px 'Press Start 2P', monospace"; ctx.fillText('СБЕР ТРЕК', sx4 + seg * 0.5 + 12, groundY * 0.03 + 8);
    }
  }
  // дорога общая
  ctx.fillStyle = '#4a4a52'; ctx.fillRect(0, groundY, w, h - groundY);
  ctx.fillStyle = '#5a5a62'; ctx.fillRect(0, groundY, w, 6);
  ctx.fillStyle = '#e8e8e8'; for (let px = -((camX) % 80) - 80; px < w; px += 80) ctx.fillRect(px, groundY + (h - groundY) * 0.5, 40, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = groundY + 10; y < h; y += 8) ctx.fillRect(0, y, w, 1);
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
      drawSection(ctx, w, h, camX, L, groundY, time, seed);
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
      if (flashAt === null && leader >= LAPS - 0.01) { flashAt = time; particles.burst(fx + 8, groundY - 40, time, rnd, { count: 70, speed: 260, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#fff', '#21a038'], life: 1.5 }); }
      if (flashAt !== null) { const a = Math.max(0, 0.8 - (time - flashAt) * 2); if (a > 0) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, w, h); } }
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); } };
  },
};
