import { mulberry32 } from '../rng.js?v=66513dd-1803';
import { makeParticles, nextFrame, cancelFrame, makeBuffer, plate, drawTiled, glow, pixLabel } from './scene.js?v=66513dd-1803';
import { litSprite, placeTags, makeFx, fxFrame, FX_ASSET } from './stage.js?v=66513dd-1803';
import { beginCamera, vignette, bigText } from './fx.js?v=66513dd-1803';

// Картинг: два круга по кольцу вокруг офиса Сбера. Вид сбоку, карты с сидящими водителями,
// четыре зоны за сетчатым забором: парковка, коридор, столовая, серверная. Порядок финиша задан заранее, препятствия только для зрелища.
// Собрано по схеме docs/BENCHMARK.md и docs/STAGE.md. Финишная арка и пушки взяты из плит стадиона.
const DIR = 'assets/scenes/kart/', RACE = 'assets/scenes/race/';
const ASSETS = ['sky', 'far', 'zone0', 'zone1', 'zone2', 'zone3', 'road', 'kart', 'cone', 'pad', 'ramp', 'coffee'].map((n) => DIR + n + '.png').concat([RACE + 'finish.png', RACE + 'cannon.png', FX_ASSET]);
const KART_COLORS = ['#e53935', '#3c8cdc', '#ffd166', '#6ec85a', '#9650c8', '#ff8c42', '#2bd4c8', '#f06292', '#8d6e63', '#cfd8dc', '#ffee58', '#26a69a', '#ab47bc', '#ef5350', '#42a5f5', '#66bb6a', '#ffa726', '#26c6da', '#ec407a', '#78909c'];
const LAPS = 2, L = 2560, QUARTER = L / 4, START_X = 150, ZONE_P = 0.8;
const OBSTACLES = [[0.08, 'cone'], [0.17, 'pad'], [0.31, 'coffee'], [0.42, 'cone'], [0.55, 'ramp'], [0.66, 'coffee'], [0.78, 'pad'], [0.9, 'cone']];
const KART = { w: 76, h: 41, ground: 37 }, CONE = { w: 68, h: 37 }, PAD = { w: 80, h: 44 }, RAMP = { w: 88, h: 48 }, COFFEE = { w: 68, h: 37 }, CANNON = { w: 69, h: 51 };
const FAR_Y = -125, ZONE_Y = -95, GANTRY_Y = -52;
/* паспорта света по зонам: день на парковке, лампы в коридоре и столовой, холодный синий в серверной */
const LIGHTS = [
  { id: 'kart0', mul: '255,250,240', tintK: 0, key: { dx: 1, dy: -1, rgb: '255,245,210', k: 0.5 }, shade: { rgb: '40,50,90', k: 0.25 }, warm: '255,230,180' },
  { id: 'kart1', mul: '250,240,225', tintK: 0, key: { dx: 0, dy: -1, rgb: '255,240,200', k: 0.4 }, shade: { rgb: '50,40,60', k: 0.25 }, warm: '255,230,180' },
  { id: 'kart2', mul: '255,236,212', tintK: 0, key: { dx: 0, dy: -1, rgb: '255,230,180', k: 0.45 }, shade: { rgb: '60,40,50', k: 0.25 }, warm: '255,230,180' },
  { id: 'kart3', mul: '165,188,255', tint: '20,60,160', tintK: 0.12, key: { dx: 0, dy: -1, rgb: '140,200,255', k: 0.6 }, shade: { rgb: '5,10,40', k: 0.4 }, warm: '140,200,255' },
];
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* лист карта, перекрашенный в цвет участника и свет зоны; считается один раз на пару «цвет, зона» */
const KART_CACHE = new Map();
function kartSheet(color, light) {
  const base = plate(DIR + 'kart.png'); if (!base) return null;
  const key = color + '|' + light.id; if (KART_CACHE.has(key)) return KART_CACHE.get(key);
  const c = document.createElement('canvas'); c.width = base.width; c.height = base.height; const x = c.getContext('2d');
  x.drawImage(base, 0, 0);
  x.globalCompositeOperation = 'multiply'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 0.22; x.fillRect(0, 0, c.width, c.height); x.globalAlpha = 1;
  x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgb(${light.mul})`; x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(base, 0, 0);
  KART_CACHE.set(key, c); return c;
}

export default {
  id: 'kart',
  title: 'Картинг',
  cover: 'assets/covers/kart.jpg',
  assets: ASSETS,
  description: 'Два круга вокруг офиса на картах: парковка, коридор, столовая и серверная, а на трассе конусы, кофе и рампы.',
  duration: 18,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h) {
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#4aa0e8'; ctx.fillRect(0, 0, w, h);
    const road = plate(DIR + 'road.png'); if (road) ctx.drawImage(road, 0, 180, 320, 180, 0, h - 90, 160, 90);
  },

  play({ canvas, participants, order, seed, startAt, onFreeze, onEvent }) {
    const buffer = makeBuffer(canvas);
    const ctx = buffer.ctx;
    const n = participants.length;
    const rank = new Map(order.map((id, i) => [id, i]));
    const rnd = mulberry32(seed);
    const rows = Math.min(n, 4);
    const karts = participants.map((p, i) => ({
      p, rank: rank.get(p.id), color: KART_COLORS[i % KART_COLORS.length], row: i % rows,
      final: LAPS - rank.get(p.id) * (0.12 / n), f: 1 + rnd() * 1.4, phase: rnd() * 6.28, amp: 0.05 + rnd() * 0.05, lastDust: 0,
    }));
    const particles = makeParticles();
    const fx = makeFx();
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, flashAt = null;
    const progress = (k, t) => { const ease = 1 - Math.pow(1 - t, 2); const noise = k.amp * Math.sin(2 * Math.PI * (k.f * t + k.phase)) * Math.pow(1 - t, 1.4) * Math.pow(t, 0.4); return Math.max(0, Math.min(k.final, k.final * ease + noise)); };
    const events = new Map(); /* ключ события → время: кто и когда задел конус, пролил кофе, приземлился */
    const img = (name) => plate(DIR + name + '.png');

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = (typeof startAt === 'number' && startAt < now) ? startAt : now;
      const time = (now - start) / 1000, t = Math.min(1, time / dur);
      const { w, h } = buffer.fit();
      const yOff = h - 360;
      const ps = karts.map((k) => progress(k, t));
      const leader = Math.max(...ps);
      const finishWX = START_X + LAPS * L;
      const camX = Math.round(Math.max(0, Math.min(finishWX - w * 0.66, START_X + leader * L - w * 0.5)) + Math.sin(time * 0.7) * 1.2);
      const rowY = (row) => yOff + (rows === 1 ? 300 : 270 + Math.round(row * (58 / (rows - 1))));
      const finX = finishWX - camX;
      beginCamera(ctx, w, h, time, flashAt !== null ? [flashAt] : [], () => ({ x: finX, y: yOff + 290 }), { level: 1.1, dur: 1.1, amp: 4 });

      // 1. НЕБО, солнце, салют после финиша; 2. ГОРОД с зелёной башней
      ctx.fillStyle = '#3f8fe0'; ctx.fillRect(0, 0, w, h);
      const sky = img('sky'); if (sky) ctx.drawImage(sky, Math.round(-30 - camX * 0.008), Math.min(0, yOff) - 20);
      glow(ctx, 590 - camX * 0.008, Math.min(0, yOff) + 50, 90, '255,250,220', 0.35 + 0.05 * Math.sin(time * 1.3));
      if (flashAt !== null) for (let k = 0; k < 9; k++) { const born = flashAt + 0.15 + k * 0.28, age = time - born; if (age < 0 || age > 0.7) continue; fxFrame(ctx, 'spark', (age / 0.7) * 6, 40 + hash(k + seed % 97) * (w - 80), 14 + hash(k * 3 + 1) * 60, 2); }
      drawTiled(ctx, img('far'), camX * 0.12, yOff + FAR_Y, w);

      // 3. ЗОНЫ за забором: четверть круга на зону, между зонами бетонная колонна закрывает стык
      const zScroll = camX * ZONE_P, zLen = QUARTER * ZONE_P, zShift = START_X * ZONE_P;
      for (let k = Math.floor((zScroll - zShift) / zLen) - 1; k * zLen + zShift - zScroll < w; k++) {
        const zx = Math.round(k * zLen + zShift - zScroll), zone = ((k % 4) + 4) % 4, zi = img('zone' + zone);
        if (zi) ctx.drawImage(zi, 64, 0, zLen, 360, zx, yOff + ZONE_Y, zLen, 360);
        if (zone > 0) { ctx.fillStyle = '#2c3140'; ctx.fillRect(zx, yOff + ZONE_Y + 182, zLen, 6); ctx.fillStyle = '#4a5166'; ctx.fillRect(zx, yOff + ZONE_Y + 182, zLen, 2); }
        if (zone === 3) for (let q = 0; q < 8; q++) glow(ctx, zx + 40 + q * 60, yOff + ZONE_Y + 250 + (q % 2) * 20, 16, '90,160,255', 0.25 + 0.2 * Math.sin(time * 5 + q * 1.3));
        ctx.fillStyle = '#5b6274'; ctx.fillRect(zx - 7, yOff + ZONE_Y + 176, 14, 170); ctx.fillStyle = '#7d8598'; ctx.fillRect(zx - 7, yOff + ZONE_Y + 176, 3, 170); ctx.fillStyle = '#3c4252'; ctx.fillRect(zx + 4, yOff + ZONE_Y + 176, 3, 170); ctx.fillStyle = '#8f98ac'; ctx.fillRect(zx - 9, yOff + ZONE_Y + 174, 18, 4);
      }

      // 4. ТРАССА, арка старта и финиша, препятствия
      drawTiled(ctx, img('road'), camX, yOff, w, false);
      const gantry = plate(RACE + 'finish.png'), lapNow = Math.min(LAPS, Math.floor(leader) + 1);
      for (let g = 0; g <= LAPS; g++) { const gx = Math.round(START_X + g * L - camX - 320); if (!gantry || gx > w || gx + 640 < 0) continue; const gy = yOff + GANTRY_Y; ctx.drawImage(gantry, gx, gy); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = "16px 'Press Start 2P', monospace"; ctx.fillStyle = '#1d6b35'; ctx.fillText('B2Bсосы GP', gx + 322, gy + 82); ctx.font = "8px 'Press Start 2P', monospace"; ctx.fillStyle = '#ffb347'; ctx.fillText(`КРУГ ${lapNow}/${LAPS}`, gx + 320, gy + 144); ctx.textAlign = 'left'; for (let y = yOff + 250; y < yOff + 336; y += 4) { const odd = Math.floor((y - yOff) / 4) % 2; ctx.fillStyle = odd ? '#f4f4f4' : '#22222c'; ctx.fillRect(gx + 318, y, 3, 4); ctx.fillStyle = odd ? '#22222c' : '#f4f4f4'; ctx.fillRect(gx + 321, y, 3, 4); } }
      const sprites = { cone: img('cone'), pad: img('pad'), ramp: img('ramp'), coffee: img('coffee') };
      for (let lap = 0; lap < LAPS; lap++) OBSTACLES.forEach(([f, kind], oi) => { for (let r = 0; r < rows; r++) {
        const ox = Math.round(START_X + (lap + f) * L - camX + r * 14), oy = rowY(r) + 3; if (ox < -90 || ox > w + 90 || !sprites[kind]) continue;
        const hitAt = events.get(`${kind}-${lap}-${oi}-${r}`), age = hitAt === undefined ? -1 : time - hitAt;
        if (kind === 'cone') { const fr = age < 0 ? 0 : Math.min(3, 1 + Math.floor(age / 0.12)); ctx.drawImage(sprites.cone, fr * CONE.w, 0, CONE.w, CONE.h, ox - CONE.w / 2 + (age < 0 ? 0 : Math.min(30, age * 120)), oy - CONE.h + 2, CONE.w, CONE.h); }
        if (kind === 'pad') { ctx.drawImage(sprites.pad, (Math.floor(time * 8 + r) % 4) * PAD.w, 0, PAD.w, PAD.h, ox - PAD.w / 2, oy - PAD.h + 8, PAD.w, PAD.h); glow(ctx, ox, oy - 8, 26, '60,160,255', 0.35 + 0.2 * Math.sin(time * 8 + r)); }
        if (kind === 'ramp') ctx.drawImage(sprites.ramp, 0, 0, RAMP.w, RAMP.h, ox - RAMP.w / 2 - 10, oy - RAMP.h + 8, RAMP.w, RAMP.h);
        if (kind === 'coffee') ctx.drawImage(sprites.coffee, (age < 0 ? 0 : 1) * COFFEE.w, 0, COFFEE.w, COFFEE.h, ox - COFFEE.w / 2, oy - COFFEE.h + 6, COFFEE.w, COFFEE.h);
      } });
      const cannon = plate(RACE + 'cannon.png');
      if (cannon && finX < w + 300) [-170, 110].forEach((dx, i) => { const age = flashAt === null ? -1 : time - flashAt - i * 0.12, f = age < 0 ? 0 : age < 0.6 ? 1 + Math.floor((age / 0.6) * 3) % 3 : 0; ctx.save(); if (i) { ctx.translate(Math.round(finX + dx) + CANNON.w, yOff + 246 - CANNON.h); ctx.scale(-1, 1); } else ctx.translate(Math.round(finX + dx), yOff + 246 - CANNON.h); ctx.drawImage(cannon, f * CANNON.w, 0, CANNON.w, CANNON.h, 0, 0, CANNON.w, CANNON.h); ctx.restore(); });

      // 5. КАРТЫ: лист карта в цвете участника и свете зоны, водитель посажен в кресло, пыль и искры с листа эффектов
      fx.draw(ctx, time, camX, 0);
      const labels = [];
      [...karts.keys()].sort((a, b) => karts[a].row - karts[b].row).forEach((i) => {
        const k = karts[i]; const worldX = START_X + ps[i] * L, lap = Math.floor(ps[i]), lapPos = ps[i] % 1; const x = Math.round(worldX - camX);
        const gy = rowY(k.row);
        let jump = 0, spin = 0, boost = false;
        if (t < 1) OBSTACLES.forEach(([f, kind], oi) => {
          const d = (lapPos - f) * L - k.row * 14; if (d < 0 || d >= 110) return; const u = d / 110, key = `${kind}-${lap}-${oi}-${k.row}`;
          if (kind === 'cone') { jump = Math.max(jump, Math.sin(u * Math.PI) * 12); if (!events.has(key)) { events.set(key, time); fx.spawn('flash', worldX + 20, gy - 12, time, { dur: 0.25 }); if (onEvent) onEvent('whoosh'); } }
          if (kind === 'ramp') { jump = Math.max(jump, Math.sin(u * Math.PI) * 34); if (u > 0.92 && !events.has(key)) { events.set(key, time); fx.spawn('ring', worldX, gy - 6, time, { dur: 0.4 }); } }
          if (kind === 'coffee') { spin = u * Math.PI * 2; if (!events.has(key)) { events.set(key, time); if (onEvent) onEvent('whoosh'); } }
          if (kind === 'pad') boost = true;
        });
        if (t < 1 && time - k.lastDust > (boost ? 0.08 : 0.3)) { k.lastDust = time; fx.spawn(boost ? 'spark' : 'dust', worldX - 34, gy - (boost ? 12 : 6), time, { dur: 0.36, vx: -60 }); }
        if (x < -90 || x > w + 90) return;
        const first = t >= 1 && k.rank === 0;
        const hop = first ? Math.round(Math.abs(Math.sin(time * 6)) * 3) : 0, lift = Math.round(jump) + hop;
        const light = LIGHTS[Math.floor(lapPos * 4) % 4];
        const sheet = kartSheet(k.color, light), driver = litSprite(k.p.person, 'stand-right', light);
        const shW = Math.round(54 * Math.max(0.5, 1 - lift / 60)); ctx.fillStyle = 'rgba(8,8,24,0.38)'; ctx.fillRect(x - shW / 2, gy - 1, shW, 2); ctx.fillRect(x - shW / 2 + 4, gy + 1, shW - 8, 1);
        const fr = t < 1 ? (boost ? 2 + Math.floor(time * 16) % 2 : Math.floor(time * 12 + i) % 2) : 0;
        const bob = t < 1 ? Math.round(Math.sin(time * 18 + i) * 0.6) : 0;
        ctx.save(); ctx.translate(x, gy - lift - 14 + bob); if (spin) ctx.rotate(spin);
        if (sheet) ctx.drawImage(sheet, fr * KART.w, 0, KART.w, KART.h, -38, -23, KART.w, KART.h);
        ctx.drawImage(driver, 0, 0, 64, 45, -38 - 1, -23 - 18, 64, 45);
        if (sheet) ctx.drawImage(sheet, fr * KART.w, 25, KART.w, KART.h - 25, -38, 2, KART.w, KART.h - 25);
        ctx.restore();
        labels[i] = { text: k.p.name, cx: x - 6, y: gy - lift - 66, index: i, gold: first };
      });
      particles.draw(ctx, time);
      placeTags(ctx, labels.filter(Boolean));
      vignette(ctx, w, h, 0.3);
      if (flashAt !== null) { const warm = Math.max(0, 0.35 - (time - flashAt) * 0.7); if (warm > 0) { ctx.fillStyle = `rgba(255,240,200,${warm.toFixed(2)})`; ctx.fillRect(0, 0, w, h); } }
      ctx.restore();

      // показания: круг и схема кольца с точками участников
      pixLabel(ctx, `КРУГ ${lapNow}/${LAPS}`, w - 46, 8, '#ffd166', '#ffd166');
      const mx = 10, my = h - 34, mw = 76, mh = 22; ctx.fillStyle = 'rgba(6,6,20,0.55)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
      ctx.fillStyle = '#9aa3b8'; ctx.fillRect(mx + 3, my, mw - 6, 1); ctx.fillRect(mx + 3, my + mh - 1, mw - 6, 1); ctx.fillRect(mx, my + 3, 1, mh - 6); ctx.fillRect(mx + mw - 1, my + 3, 1, mh - 6); ctx.fillRect(mx + 1, my + 1, 2, 2); ctx.fillRect(mx + mw - 3, my + 1, 2, 2); ctx.fillRect(mx + 1, my + mh - 3, 2, 2); ctx.fillRect(mx + mw - 3, my + mh - 3, 2, 2);
      karts.forEach((k, i) => { const per = 2 * (mw + mh); let d = (ps[i] % 1) * per, px, py; if (d < mw) { px = mx + d; py = my + mh - 1; } else if (d < mw + mh) { px = mx + mw - 1; py = my + mh - 1 - (d - mw); } else if (d < 2 * mw + mh) { px = mx + mw - 1 - (d - mw - mh); py = my; } else { px = mx; py = my + (d - 2 * mw - mh); } ctx.fillStyle = '#05050f'; ctx.fillRect(Math.round(px) - 2, Math.round(py) - 2, 4, 4); ctx.fillStyle = k.color; ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 3, 3); });

      if (flashAt !== null && time - flashAt < 1.6) bigText(ctx, w, h, 'ФИНИШ!', time, '#ffd166', 24);
      if (flashAt === null && leader >= LAPS - 0.01) { flashAt = time; [-150, 150].forEach((dx) => particles.burst(finX + dx, yOff + 210, time, rnd, { count: 50, speed: 170, colors: ['#21a038', '#ffffff', '#ffd166', '#2fc24f'], life: 1.8, gravity: 120, size: 2 })); }
      buffer.blit();
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
