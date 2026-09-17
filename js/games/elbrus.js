import { drawSprite } from '../sprite.js?v=ddff8ed-1653';
import { mulberry32 } from '../rng.js?v=ddff8ed-1653';
import { makeParticles, nextFrame, cancelFrame, makeBuffer, plate, drawTiled, glow, placeLabels, pixLabel } from './scene.js?v=ddff8ed-1653';
import { drawActor, placeTags, makeFx, FX_ASSET } from './stage.js?v=ddff8ed-1653';
import { beginCamera, vignette, bigText } from './fx.js?v=ddff8ed-1653';

// Эльбрус: восхождение от дороги у Азау до вершины 5642 м. Камера едет вверх по четырём плитам склона,
// поставленным друг на друга: база, ледник, седловина, вершина. По пути трещина, лавина и буран.
// Собрано по схеме docs/BENCHMARK.md: фон из плит в буфере 640×360, код добавляет тропу, свет, погоду и движение.
const DIR = 'assets/scenes/elbrus/';
const NAMES = ['sky', 'far', 'summit', 'saddle', 'glacier', 'base', 'clouds', 'fg', 'flag', 'eagle', 'aval', 'cabin'];
const ASSETS = NAMES.map((n) => DIR + n + '.png').concat([FX_ASSET]);
const SECTIONS = ['summit', 'saddle', 'glacier', 'base'];   // сверху вниз, каждая 360 пикселей мира
const WORLD_H = 1440, START_WY = 1382, END_WY = 100, TOP_PAD = 130; // над вершиной запас неба, чтобы победитель не упирался в край
const BASE_ALT = 2350, TOP_ALT = 5642;
const HAZARDS = [[0.3, 'crack'], [0.55, 'avalanche'], [0.78, 'storm']];
const FLAG = { w: 47, h: 43 }, EAGLE = { w: 90, h: 53 }, AVAL = { w: 202, h: 146 }, CABIN = { w: 21, h: 33 };
const WINDOWS = [[497, 1172], [512, 1176], [534, 1202], [549, 1206], [571, 1228], [586, 1232], [606, 1256], [70, 1262], [131, 1272]]; // окна Бочек и станции
const CABLE = [[22, 1300], [96, 1128], [150, 1068]];          // линия троса канатки на плите базы

/* паспорт света сцены: рассвет, низкое тёплое солнце справа сверху, холодная тень, поверхность — снег */
const LIGHT = { id: 'elbrus', mul: '226,226,255', tint: '120,140,220', tintK: 0.08, key: { dx: 1, dy: -1, rgb: '255,226,170', k: 0.55 }, shade: { rgb: '40,50,130', k: 0.3 }, warm: '255,200,140', shadow: 'rgba(40,60,140,0.34)', shadowLen: 5, surface: '#ffffff' };
const wyOf = (u) => START_WY - u * (START_WY - END_WY);
const pathX = (u) => 320 + 25 * u * u + Math.sin(u * Math.PI * 6) * 55 * Math.pow(1 - u, 0.9) * Math.min(1, u * 8);
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export default {
  id: 'elbrus',
  title: 'Эльбрус',
  cover: 'assets/covers/elbrus.jpg',
  assets: ASSETS,
  description: 'Восхождение на Эльбрус: канатка, Бочки, трещина, лавина и буран на седловине, а флаг на вершине ставит тот, кто говорит первым.',
  duration: 16,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h) {
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#16307a'; ctx.fillRect(0, 0, w, h);
    const s = plate(DIR + 'summit.png'); if (s) ctx.drawImage(s, 160, 0, 320, 360, 0, 0, w, h);
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const buffer = makeBuffer(canvas);
    const ctx = buffer.ctx;
    const n = participants.length;
    const rank = new Map(order.map((id, i) => [id, i]));
    const rnd = mulberry32(seed);
    const cols = Math.min(n, 3);
    const climbers = participants.map((p, i) => ({
      p, rank: rank.get(p.id), side: (i % cols) - (cols - 1) / 2, lag: Math.floor(i / cols) * 0.034 + (i % cols) * 0.009,
      final: 1 - rank.get(p.id) * Math.min(0.04, 0.1 / Math.max(1, n - 1)), /* на финише вся колонна помещается в кадр под вершиной */ f: 1 + rnd() * 1.2, phase: rnd() * 6.28, amp: 0.05 + rnd() * 0.05, gait: Math.floor(rnd() * 8),
      slipAt: rnd() < 0.5 ? 0.2 + rnd() * 0.5 : null,
    }));
    const particles = makeParticles();
    const fx = makeFx();
    const beltCv = document.createElement('canvas'); // рабочий холст для поясов облаков
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, flashAt = null, lastPuff = 0;
    const fired = new Map(); // доля подъёма → время срабатывания
    const progress = (c, t) => { const ease = 1 - Math.pow(1 - t, 2.2); const noise = c.amp * Math.sin(2 * Math.PI * (c.f * t + c.phase)) * Math.pow(1 - t, 1.6) * Math.pow(t, 0.5); return Math.max(0, Math.min(c.final, c.final * ease + noise)); };
    const img = (name) => plate(DIR + name + '.png');

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const time = (now - start) / 1000, t = Math.min(1, time / dur);
      const { w, h } = buffer.fit();
      const x0 = Math.round((w - 640) / 2);                     // плиты по центру; на широком окне по бокам зеркальные копии
      const ps = climbers.map((c) => progress(c, t));
      const leader = Math.max(...ps);
      const camMin = -TOP_PAD, camMax = WORLD_H - h;
      const camY = Math.round(Math.max(camMin, Math.min(camMax, wyOf(leader) - h * 0.6)) + Math.sin(time * 0.6) * 1.2);
      const sy = (wy) => Math.round(wy - camY);
      HAZARDS.forEach(([u, kind]) => { if (!fired.has(u) && leader >= u - (kind === 'crack' ? 0.04 : 0)) { fired.set(u, time); if (onEvent) onEvent(kind === 'avalanche' ? 'pop' : 'whoosh'); } });
      const crackAge = fired.has(0.3) ? time - fired.get(0.3) : -1;
      const avalanche = fired.has(0.55) ? time - fired.get(0.55) : -1;
      const stormAge = fired.has(0.78) ? time - fired.get(0.78) : -1, storm = stormAge >= 0 && stormAge < 3.2;
      const camTimes = [...fired.values()]; /* на финише камера не дёргается: последний кадр остаётся в чистой пиксельной сетке */
      beginCamera(ctx, w, h, time, camTimes, () => ({ x: w / 2, y: h / 2 }), { level: 1.08, dur: 0.9, amp: avalanche >= 0 && avalanche < 1 ? 6 : 3 });

      // 1. НЕБО и ДАЛЬНИЙ ХРЕБЕТ над морем облаков: видны вокруг вершинного конуса
      const topVisible = camY < 300;
      if (topVisible) {
        ctx.fillStyle = '#0a1a4c'; ctx.fillRect(0, 0, w, h);
        const sky = img('sky'); if (sky) drawTiled(ctx, sky, -x0, h - 360 - 96 + Math.round((camY - camMin) * 0.05), w);
        for (let i = 0; i < 24; i++) { const tw = Math.sin(time * 2.5 + i * 1.9); if (tw < 0.5) continue; ctx.fillStyle = '#ffffff'; ctx.fillRect((i * 89) % w, (i * 37) % 110, 1, 1); }
        glow(ctx, x0 + 560, h - 360 - 96 + 305 + Math.round((camY - camMin) * 0.05), 150, '255,190,120', 0.35);
        drawTiled(ctx, img('far'), -x0 + time * 1.5, h - 360 + 34 + Math.round((camY - camMin) * 0.3), w);
      }

      // 2. СКЛОН: четыре плиты друг над другом
      SECTIONS.forEach((name, i) => { const y = sy(i * 360); if (y > h || y + 360 < 0) return; drawTiled(ctx, img(name), -x0, y, w); });

      // живое на базе: окна Бочек, маячок ратрака, кабинка на тросе
      if (camY > 600) {
        WINDOWS.forEach(([wx, wy], i) => glow(ctx, x0 + wx, sy(wy), 9, '255,190,90', 0.35 + 0.2 * Math.sin(time * 3 + i * 1.7)));
        if (Math.floor(time * 2.5) % 2) glow(ctx, x0 + 527, sy(1262), 14, '255,150,40', 0.8);
        const cabin = img('cabin');
        if (cabin) [0, 0.5].forEach((ph, i) => { const q = (time * 0.06 + ph) % 1, seg = q < 0.62 ? 0 : 1, f = seg === 0 ? q / 0.62 : (q - 0.62) / 0.38; const [ax, ay] = CABLE[seg], [bx, by] = CABLE[seg + 1]; ctx.drawImage(cabin, (Math.floor(time * 2 + i) % 2) * CABIN.w, 0, CABIN.w, CABIN.h, Math.round(x0 + ax + (bx - ax) * f - 10), sy(ay + (by - ay) * f), CABIN.w, CABIN.h); });
      }

      // 3. ТРОПА кодом поверх снега: утоптанная полоса и следы остаются только за прошедшими, впереди снег нетронут
      for (let wy = START_WY; wy >= END_WY; wy -= 3) { const y = sy(wy); if (y < -4 || y > h + 4) continue; const u = (START_WY - wy) / (START_WY - END_WY); if (u > leader + 0.004) continue; const x = Math.round(x0 + pathX(u)), half = Math.round(9 - 4 * u); ctx.fillStyle = 'rgba(120,140,200,0.16)'; ctx.fillRect(x - half - 2, y, half * 2 + 4, 3); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x - half, y, half * 2, 3); }
      for (let k = 0; k < 215; k++) { const wy = START_WY - k * 6, y = sy(wy); if (y < -4 || y > h + 4) continue; const u = (START_WY - wy) / (START_WY - END_WY); if (u > leader + 0.004) continue; const x = Math.round(x0 + pathX(u)); ctx.fillStyle = '#8a9ad0'; ctx.fillRect(x + (k % 2 ? 2 : -4), y, 2, 1); ctx.fillStyle = '#b6c2ea'; ctx.fillRect(x + (k % 2 ? 2 : -4), y + 1, 2, 1); }
      const flag = img('flag'), depth = []; /* всё, что стоит на склоне, рисуется в общем порядке по нижнему краю */
      if (flag) for (let k = 1; k < 12; k++) { const u = k / 12.5, y = sy(wyOf(u)); if (y < -10 || y > h + 50) continue; const x = Math.round(x0 + pathX(u) + (k % 2 ? 24 : -30)); depth.push({ fy: y, draw: () => { ctx.fillStyle = LIGHT.shadow; for (let r = 0; r < 3; r++) ctx.fillRect(x - 3 - r * 5, y - 1 + r, 10 - r * 2, 1); ctx.drawImage(flag, (Math.floor(time * 7 + k) % 4) * FLAG.w, 0, FLAG.w, FLAG.h, x - 4, y - FLAG.h, FLAG.w, FLAG.h); } }); }

      // трещина открывается перед лидером на леднике
      if (crackAge >= 0) { const y = sy(wyOf(0.3)); if (y > -20 && y < h + 20) { const open = Math.min(1, crackAge / 0.5), xa = x0 + 226, xb = x0 + 436; for (let x = xa; x < xb; x += 2) { const j = Math.round(Math.sin(x * 0.09) * 3 + Math.sin(x * 0.023) * 5), hh = Math.max(1, Math.round((5 + Math.sin(x * 0.05) * 3 + hash(x) * 2) * open * Math.pow(Math.sin(((x - xa) / (xb - xa)) * Math.PI), 0.6))); ctx.fillStyle = '#f6f8ff'; ctx.fillRect(x, y + j - 2, 2, 2); ctx.fillStyle = '#0f2466'; ctx.fillRect(x, y + j, 2, hh); ctx.fillStyle = '#2f59b0'; ctx.fillRect(x, y + j + Math.max(1, hh - 2), 2, 2); ctx.fillStyle = '#9db4e6'; ctx.fillRect(x, y + j + hh, 2, 1); } } }

      // блики на снегу
      for (let i = 0; i < 40; i++) { const wy = 120 + hash(i * 17) * 1250, y = sy(wy); if (y < 0 || y > h) continue; const a = Math.sin(time * 3 + i * 1.7); if (a < 0.6) continue; const x = Math.round(x0 + 215 + hash(i * 17 + 1) * 215); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1); if (a > 0.9) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } }

      // пояса облаков закрывают стыки плит: по краям плотные, в центре, где идёт команда, почти прозрачные
      const clouds = img('clouds');
      const seamY = [360, 720, 1080].map((v) => sy(v) - 178).filter((y) => y < h && y + 360 > 0);
      const belt = (y, scroll, side, center) => {
        if (beltCv.width !== w) { beltCv.width = w; beltCv.height = 360; }
        const bc = beltCv.getContext('2d'); bc.globalCompositeOperation = 'source-over'; bc.clearRect(0, 0, w, 360); drawTiled(bc, clouds, scroll, 0, w);
        const g = bc.createLinearGradient(x0, 0, x0 + 640, 0);
        [[0, side], [0.3, side], [0.42, center], [0.58, center], [0.7, side], [1, side]].forEach(([q, al]) => g.addColorStop(q, `rgba(0,0,0,${al})`));
        bc.globalCompositeOperation = 'destination-in'; bc.fillStyle = g; bc.fillRect(0, 0, w, 360);
        ctx.drawImage(beltCv, 0, y);
      };
      if (clouds) seamY.forEach((y, i) => belt(y, time * 6 + i * 200, 0.95, 0.3));

      // 4. АЛЬПИНИСТЫ: длинные синие тени от низкого солнца, пар изо рта
      const posOf = (c, u) => { const uu = Math.max(0, u - c.lag * (1 - u)); return { uu, x: Math.round(x0 + pathX(uu) + c.side * 24 * (1 - 0.35 * uu)) - 32, y: sy(wyOf(uu)) - 62 }; };
      if (time - lastPuff > 0.35 && t < 1) { lastPuff = time; climbers.forEach((c, i) => { const q = posOf(c, ps[i]); particles.puff(q.x + 18, q.y + 24, time, rnd, 'rgba(255,255,255,0.7)'); }); }
      const labels = [];
      climbers.forEach((c, i) => {
        const q = posOf(c, ps[i]); let { x, y } = q; const u = q.uu;
        if (y < -80 || y > h + 10) return;
        let jump = 0; if (crackAge >= 0 && Math.abs(u - 0.3) < 0.022) jump = Math.round(Math.sin(((u - 0.278) / 0.044) * Math.PI) * 22);
        const slipping = c.slipAt !== null && Math.abs(t - c.slipAt) < 0.035 && !jump;
        const ducked = avalanche >= 0.1 && avalanche < 1.3;
        if (slipping) y += 6; if (ducked) y += 3;
        if (t < 1 && !jump && time - (c.kick || 0) > 0.5) { c.kick = time; fx.spawn('snow', x + 32, y + 56 + camY, time, { dur: 0.4 }); }
        const leanX = storm ? -2 : 0; /* в буран фигуры клонит ветром */
        const first = t >= 1 && c.rank === 0;
        const hop = first ? Math.round(Math.abs(Math.sin(time * 6)) * 4) : 0;
        const fr = t < 1 ? (slipping || ducked ? 'hurt0' : 'up' + ((Math.floor(time * (storm ? 3 : 5 + c.f)) + c.gait) % 8)) : (c.rank === 0 ? (Math.floor(time * 5) % 2 ? 'cheer' : 'cheer2') : 'idle');
        depth.push({ fy: y + 62 + (first ? 1000 : 0), draw: () => {
          drawActor(ctx, c.p.person, fr, x + leanX, y, LIGHT, { sink: jump || hop ? 0 : 2, lift: jump + hop });
          if (slipping) { ctx.fillStyle = '#ff4040'; ctx.font = "8px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('!', x + 44, y + 6); }
        } });
        const lw = c.p.name.length * 8 + 9, dirL = c.side < 0 ? -1 : c.side > 0 ? 1 : 0; /* крайние колонны подписаны сбоку, средняя над головой */
        labels[i] = { text: c.p.name, cx: x + 32 + dirL * (20 + lw / 2), y: y - jump - hop + (dirL ? 26 : 2), index: i, gold: first };
      });
      particles.draw(ctx, time); /* пар и снежная пыль позади фигур: люди идут спиной к камере */
      fx.draw(ctx, time, 0, camY, LIGHT);
      depth.sort((m, k) => m.fy - k.fy).forEach((m) => m.draw());
      placeTags(ctx, labels.filter(Boolean));

      // флаг Сбера на вершине, когда дошёл первый
      if (flashAt !== null) { const fx = x0 + 336, fy = sy(-26), rise = Math.min(1, (time - flashAt) / 0.5); ctx.fillStyle = '#d9d9e6'; ctx.fillRect(fx, fy + Math.round(40 * (1 - rise)), 1, Math.round(40 * rise)); if (rise >= 1) for (let k = 0; k < 18; k++) { const wv = Math.round(Math.sin(time * 7 - k * 0.5) * 1.5); ctx.fillStyle = k % 5 === 0 ? '#2fc24f' : '#21a038'; ctx.fillRect(fx + 1 + k, fy + 1 + wv, 1, 10); } }

      // 5. ПОВЕРХ: передний слой облаков, орёл с тенью, лавина, буран
      if (clouds) seamY.forEach((y, i) => belt(y + 12, -time * 11 + 300 + i * 140, 0.5, 0.1));
      const eagle = img('eagle');
      if (eagle) [3.5, 10.5].forEach((at, i) => { const age = (time * (16 / dur) - at) / 3.2; if (age < 0 || age > 1) return; const ex = i ? w + 60 - age * (w + 200) : -120 + age * (w + 200), ey = h * (0.25 + 0.15 * i) + Math.sin(age * 5) * 14, f = Math.floor(time * 7) % 4; ctx.fillStyle = 'rgba(40,60,140,0.22)'; ctx.fillRect(Math.round(ex) + 10, Math.round(ey) + 110, 60, 4); ctx.fillRect(Math.round(ex) + 22, Math.round(ey) + 108, 36, 8); ctx.save(); if (i) { ctx.translate(Math.round(ex) + EAGLE.w, Math.round(ey)); ctx.scale(-1, 1); } else ctx.translate(Math.round(ex), Math.round(ey)); ctx.drawImage(eagle, f * EAGLE.w, 0, EAGLE.w, EAGLE.h, 0, 0, EAGLE.w, EAGLE.h); ctx.restore(); });
      const aval = img('aval');
      if (aval && avalanche >= 0 && avalanche < 2) {
        const base = sy(wyOf(0.55));
        for (let k = 0; k < 7; k++) { const a = avalanche - k * 0.09; if (a < 0) continue; const f = Math.min(3, Math.floor(a * 5)), ax = w + 40 - a * (w + 320) * 0.75 + (k % 2) * 30, ay = base - 250 + k * 22 + a * 30; /* вал проходит перед лидером, идущие ниже остаются на виду */ ctx.globalAlpha = Math.max(0, Math.min(1, (1.9 - a) * 2)); ctx.drawImage(aval, f * AVAL.w, 0, AVAL.w, AVAL.h, Math.round(ax), Math.round(ay), AVAL.w, AVAL.h); }
        ctx.globalAlpha = 1; for (let k = 0; k < 10; k++) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(Math.round(w - avalanche * (w + 200) * 0.8 - k * 40), base - 60 + (k % 5) * 26, 50, 1); }
      }
      const gust = Math.sin(time * 0.7) > 0.85;
      if (storm) { const sa = Math.min(1, stormAge * 3) * Math.min(1, (3.2 - stormAge) * 1.5); ctx.fillStyle = `rgba(110,130,190,${(0.5 * sa).toFixed(2)})`; ctx.fillRect(0, 0, w, h); }
      for (let i = 0; i < (storm ? 110 : 26); i++) { const px = ((i * 97 - time * (storm ? 190 : 24) + Math.sin(time + i) * 10) % (w + 40) + w + 40) % (w + 40) - 20, py = ((i * 61 + time * (storm ? 70 : 28)) % (h + 20)) - 10; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(Math.round(px), Math.round(py), i % 3 ? 1 : 2, i % 3 ? 1 : 2); }
      if (gust || storm) for (let k = 0; k < (storm ? 16 : 5); k++) { ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(Math.round(((k * 211 - time * 420) % (w + 200) + w + 200) % (w + 200) - 100), (k * 47 + Math.round(time * 20)) % h, 34 + (k % 3) * 16, 1); }
      glow(ctx, w - 30, 20, 240, '255,200,140', 0.10);                // тёплый свет низкого солнца справа сверху

      ctx.restore();

      // РАМКА переднего плана рисуется вне камеры, поэтому наезд и тряска её не обрезают. Левая часть прижата к левому краю кадра,
      // правая к правому: на любом соотношении сторон скала, валун и карниз упираются в край, а не висят срезом.
      const fg = img('fg');
      if (fg) {
        const k = Math.min(1, Math.min(camMax - camY, camY - camMin) / 170), shift = Math.round(k * k * (3 - 2 * k) * 230);
        if (shift < 225) {
          ctx.drawImage(fg, 0, 0, 200, 130, 0, -shift, 200, 130); ctx.drawImage(fg, 200, 0, 440, 130, w - 440, -shift, 440, 130);
          ctx.drawImage(fg, 0, 150, 320, 210, 0, h - 210 + shift, 320, 210); ctx.drawImage(fg, 320, 150, 320, 210, w - 320, h - 210 + shift, 320, 210);
        }
      }
      vignette(ctx, w, h, 0.32);
      if (flashAt !== null) { const warm = Math.max(0, 0.35 - (time - flashAt) * 0.7); if (warm > 0) { ctx.fillStyle = `rgba(255,210,140,${warm.toFixed(2)})`; ctx.fillRect(0, 0, w, h); } }

      // высотомер и крупные надписи
      pixLabel(ctx, `${Math.round(BASE_ALT + leader * (TOP_ALT - BASE_ALT))} м`, w - 40, 8, '#ffd166', '#ffd166');
      if (crackAge >= 0 && crackAge < 1.2) bigText(ctx, w, h, 'ТРЕЩИНА!', time, '#7fb6ff', 22);
      if (avalanche >= 0 && avalanche < 1.3) bigText(ctx, w, h, 'ЛАВИНА!', time, '#ff6b6b', 24);
      if (storm && stormAge < 1.2) bigText(ctx, w, h, 'БУРАН!', time, '#dfe8ff', 24);
      if (flashAt === null && leader >= 0.985) { flashAt = time; particles.burst(x0 + 345, sy(70), time, rnd, { count: 70, speed: 140, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#fff'], life: 1.6, gravity: 150, size: 3 }); }
      if (flashAt !== null && time - flashAt < 1.6) bigText(ctx, w, h, 'ВЕРШИНА!', time, '#ffd166', 24);
      buffer.blit();
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
