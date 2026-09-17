import { drawSprite, runFrame, SPRITE_W, SPRITE_H } from '../sprite.js?v=bf6c143-0945';
import { mulberry32 } from '../rng.js?v=bf6c143-0945';
import { label, makeParticles, drawCloud, drawNpc, nextFrame, cancelFrame } from './scene.js?v=bf6c143-0945';
import { beginCamera, drawAmbient, vignette, speedLines, bigText, impactRing } from './fx.js?v=bf6c143-0945';

// Эльбрус: восхождение по зигзагу от Азау до западной вершины 5642 м. Камера едет вверх за лидером.
// По пути канатка и Бочки, трещина, скалы Пастухова, лавина, буран на седловине. Первый на вершине говорит первым.
const BASE_ALT = 2350, TOP_ALT = 5642;
const HAZARDS = [[0.3, 'crevasse'], [0.55, 'avalanche'], [0.78, 'storm']];
const PX = 2; // пиксельный шаг всей сцены

function pathX(u, w) { return w * 0.5 + Math.sin(u * Math.PI * 3.2 - 0.628) * w * 0.24; } // зигзаг тропы по доле подъёма
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function rock(ctx, x, y, s) { rect(ctx, x, y, 14 * s, 9 * s, '#4e4e5c'); rect(ctx, x, y, 14 * s, 2 * s, '#7c7c8c'); rect(ctx, x, y, 3 * s, 9 * s, '#6a6a7a'); rect(ctx, x, y + 7 * s, 14 * s, 2 * s, '#30303c'); rect(ctx, x - 2 * s, y + 6 * s, 18 * s, 3 * s, 'rgba(255,255,255,0.7)'); }

export default {
  id: 'elbrus',
  title: 'Эльбрус',
  cover: 'assets/covers/elbrus.jpg',
  description: 'Восхождение на Эльбрус: канатка, Бочки, трещина, лавина и буран на седловине, а флаг на вершине ставит тот, кто говорит первым.',
  duration: 16,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0e2a5a'); sky.addColorStop(1, '#8ac0f0'); ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#e8f0f8'; ctx.beginPath(); ctx.moveTo(-20, h); ctx.lineTo(w * 0.35, h * 0.2); ctx.lineTo(w * 0.5, h * 0.35); ctx.lineTo(w * 0.7, h * 0.15); ctx.lineTo(w + 20, h); ctx.fill();
    ctx.fillStyle = '#c8d8ea'; ctx.beginPath(); ctx.moveTo(w * 0.35, h * 0.2); ctx.lineTo(w * 0.5, h * 0.35); ctx.lineTo(w * 0.42, h); ctx.lineTo(w * 0.2, h); ctx.fill();
    drawAmbient(ctx, 'snow', w, h, t, 30);
    people.slice(0, 3).forEach((p, i) => drawSprite(ctx, p.person, runFrame(t, 6, i), w * 0.3 + i * 50, h * 0.75 - i * 22, 1.5));
    ctx.fillStyle = '#21a038'; ctx.fillRect(w * 0.7, h * 0.05, 3, 26); ctx.fillRect(w * 0.7, h * 0.05, 16, 10);
  },

  play({ canvas, participants, order, seed, onFreeze, onEvent }) {
    const ctx = canvas.getContext('2d');
    const n = participants.length;
    const rank = new Map(order.map((id, i) => [id, i]));
    const rnd = mulberry32(seed);
    const cols = Math.min(n, 3);
    const climbers = participants.map((p, i) => ({
      p, rank: rank.get(p.id), side: (i % cols) - (cols - 1) / 2, lag: Math.floor(i / cols) * 0.022 + (i % cols) * 0.006,
      final: 1 - rank.get(p.id) * (0.15 / n), f: 1 + rnd() * 1.2, phase: rnd() * 6.28, amp: 0.05 + rnd() * 0.05, gait: rnd() * 8,
      slipAt: rnd() < 0.5 ? 0.2 + rnd() * 0.5 : null,
    }));
    const particles = makeParticles();
    const dur = this.duration;
    let start = null, raf = 0, stopped = false, flashAt = null, lastPuff = 0;
    const fired = new Map(); // доля подъёма → время срабатывания
    const progress = (c, t) => { const ease = 1 - Math.pow(1 - t, 2.2); const noise = c.amp * Math.sin(2 * Math.PI * (c.f * t + c.phase)) * Math.pow(1 - t, 1.6) * Math.pow(t, 0.5); return Math.max(0, Math.min(c.final, c.final * ease + noise)); };

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = now;
      const time = (now - start) / 1000, t = Math.min(1, time / dur);
      const w = canvas.width, h = canvas.height;
      const scale = n <= 8 ? Math.max(2, Math.min(3, Math.floor(h / 300))) : 2;
      const sprH = SPRITE_H * scale, sprW = SPRITE_W * scale;
      const Hw = h * 2.8, TOP = h * 0.42, BOT = h * 0.3; // высота горы, запас над вершиной, полоса подножия
      const ps = climbers.map((c) => progress(c, t));
      const leader = Math.max(...ps);
      const worldY = (u) => TOP + Hw - u * Hw; // мировая y: вершина = TOP, подножие = TOP + Hw
      const camY = Math.max(0, Math.min(TOP + Hw + BOT - h, worldY(leader) - h * 0.58));
      const sy = (wy) => Math.round(wy - camY);
      const summitY = sy(TOP), baseY = sy(TOP + Hw);
      const alt = camY / (TOP + Hw + BOT - h); // 0 внизу, 1 у вершины
      HAZARDS.forEach(([u, kind]) => { if (!fired.has(u) && leader >= u) { fired.set(u, time); if (onEvent) onEvent(kind === 'avalanche' ? 'pop' : 'whoosh'); } });
      const avalanche = fired.has(0.55) ? time - fired.get(0.55) : -1;
      const storm = fired.has(0.78) && time - fired.get(0.78) < 3.2;
      const camTimes = [...fired.values()].concat(flashAt !== null ? [flashAt] : []);
      ctx.imageSmoothingEnabled = false;
      beginCamera(ctx, w, h, time, camTimes, () => ({ x: w * 0.5, y: h * 0.5 }), { level: 1.12, dur: 0.9, amp: avalanche >= 0 && avalanche < 1 ? 10 : 5 });

      // ДАЛЬНИЙ ПЛАН: небо темнеет с высотой, солнце с ореолом, звёзды у вершины, дальние пики, море облаков внизу
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, `rgb(${Math.round(70 - 55 * alt)},${Math.round(120 - 80 * alt)},${Math.round(200 - 100 * alt)})`);
      skyGrad.addColorStop(1, `rgb(${Math.round(150 - 40 * alt)},${Math.round(195 - 40 * alt)},${Math.round(240 - 20 * alt)})`);
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);
      if (alt > 0.45) for (let i = 0; i < 50; i++) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + i)); ctx.fillStyle = `rgba(255,255,255,${((alt - 0.45) * 1.6 * tw).toFixed(2)})`; ctx.fillRect((i * 173) % w, ((i * 91) % (h * 0.5)) - camY * 0.02, 2, 2); }
      const sunX = w * 0.8, sunY = 120 - camY * 0.04 + h * 0.15 * alt;
      for (let r = 110; r > 40; r -= 14) { ctx.fillStyle = `rgba(255,236,190,${(0.06).toFixed(2)})`; ctx.beginPath(); ctx.arc(sunX, sunY, r, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(sunX, sunY, 34, 0, Math.PI * 2); ctx.fill();
      const eagleX = ((time * 26) % (w + 200)) - 100, eagleY = 150 + Math.sin(time * 0.8) * 30 - camY * 0.06 + h * 0.3 * (1 - alt); const flap = Math.sin(time * 5) * 4;
      ctx.strokeStyle = '#1a1a26'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(eagleX - 14, eagleY - flap); ctx.lineTo(eagleX, eagleY); ctx.lineTo(eagleX + 14, eagleY - flap); ctx.stroke();
      const farShift = camY * 0.22; // параллакс дальних планов: у вершины они внизу кадра, у подножия скрыты за долиной
      [[0.06, 260, '#b9c8dc'], [0.2, 330, '#c5d3e5'], [0.9, 300, '#c0cfe2'], [0.72, 230, '#b4c3d8']].forEach(([fx, ph, col]) => {
        const px = w * fx, py = h * 0.62 - ph * 0.5 + farShift;
        if (py > h) return;
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(px - ph * 0.75, py + ph); ctx.lineTo(px - ph * 0.2, py + ph * 0.35); ctx.lineTo(px, py); ctx.lineTo(px + ph * 0.25, py + ph * 0.4); ctx.lineTo(px + ph * 0.8, py + ph); ctx.fill();
        ctx.fillStyle = '#eef4fb'; ctx.beginPath(); ctx.moveTo(px - ph * 0.12, py + ph * 0.24); ctx.lineTo(px, py); ctx.lineTo(px + ph * 0.14, py + ph * 0.26); ctx.lineTo(px + ph * 0.05, py + ph * 0.3); ctx.fill();
        ctx.fillStyle = 'rgba(60,80,120,0.25)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + ph * 0.25, py + ph * 0.4); ctx.lineTo(px + ph * 0.8, py + ph); ctx.lineTo(px, py + ph); ctx.fill();
      });
      for (let i = 0; i < 14; i++) { const cy = h * 0.8 + (i % 3) * 30 + farShift * 1.3; if (cy > h + 40) continue; drawCloud(ctx, ((i * 190 + time * 8 + hash(i) * 200) % (w + 360)) - 180, cy, 12 + (i % 3) * 5, 'rgba(255,255,255,0.94)'); }
      // СРЕДНИЙ ПЛАН: склон конусом — у подножия шире экрана, у вершины узкий, по бокам небо и облака под ногами.
      const halfW = (u) => w * (0.3 + 1.1 * Math.pow(1 - u, 1.3)), jag = (wy) => Math.sin(wy * 0.035) * 14 + Math.sin(wy * 0.011) * 26;
      const edgeR = (wy) => pathX(1 - (wy - TOP) / Hw, w) + 26 * scale;
      const slopePath = () => { ctx.beginPath(); ctx.moveTo(w * 0.5, summitY - 70); for (let wy = TOP; wy <= TOP + Hw; wy += 24) { const u = 1 - (wy - TOP) / Hw; ctx.lineTo(w * 0.5 + halfW(u) + jag(wy), sy(wy)); } ctx.lineTo(w + 400, baseY); ctx.lineTo(-400, baseY); for (let wy = TOP + Hw; wy >= TOP; wy -= 24) { const u = 1 - (wy - TOP) / Hw; ctx.lineTo(w * 0.5 - halfW(u) - jag(wy + 300), sy(wy)); } ctx.closePath(); };
      ctx.save(); slopePath(); ctx.fillStyle = '#dbe6f2'; ctx.fill(); ctx.clip();
      ctx.fillStyle = '#f4f8fc'; ctx.beginPath(); ctx.moveTo(w * 0.5, summitY - 70); ctx.lineTo(w + 400, summitY - 70); ctx.lineTo(w + 400, baseY); ctx.lineTo(-400, baseY);
      for (let wy = TOP + Hw; wy >= TOP; wy -= 32) ctx.lineTo(edgeR(wy) + Math.sin(wy * 0.05) * 10, sy(wy)); ctx.fill();
      ctx.fillStyle = 'rgba(120,150,200,0.18)'; ctx.beginPath(); ctx.moveTo(w * 0.5, summitY - 70); for (let wy = TOP; wy <= TOP + Hw; wy += 24) { const u = 1 - (wy - TOP) / Hw; ctx.lineTo(w * 0.5 - halfW(u) - jag(wy + 300) + 40, sy(wy)); } ctx.lineTo(-400, baseY + 10); ctx.lineTo(-400, summitY - 70); ctx.fill();
      // заструги: короткие штрихи ветра по всему склону, по мировой координате
      for (let i = 0; i < 160; i++) { const wy = TOP + hash(i * 3) * Hw, wx = hash(i * 3 + 1) * w; const y = sy(wy); if (y < -10 || y > h + 10) continue; const sun = wx > edgeR(wy); ctx.fillStyle = sun ? '#ffffff' : '#c6d6e8'; ctx.fillRect(Math.round(wx), y, 8 + Math.round(hash(i * 3 + 2) * 14), PX); ctx.fillStyle = sun ? '#dfe9f4' : '#b3c6dc'; ctx.fillRect(Math.round(wx) + 2, y + PX, 6, PX); }
      for (let i = 0; i < 24; i++) { const u = 0.82 + hash(i * 19) * 0.16, wy = worldY(u), y = sy(wy); if (y < -10 || y > h + 10) continue; const x = w * 0.5 + (hash(i * 19 + 1) - 0.5) * halfW(u) * 1.6; ctx.fillStyle = '#c3d5ea'; ctx.fillRect(Math.round(x), y, 30 + Math.round(hash(i * 19 + 2) * 40), PX * 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x) + 6, y - PX, 20, PX); }
      // ледовые пятна и трещины по высоте 0.2–0.42 (ледник), сераки
      for (let i = 0; i < 26; i++) { const u = 0.18 + hash(i * 7) * 0.24, wy = worldY(u), x = hash(i * 7 + 1) * w; const y = sy(wy); if (y < -40 || y > h + 40) continue; ctx.fillStyle = '#9fc3e6'; ctx.fillRect(Math.round(x), y, 24 + Math.round(hash(i * 7 + 2) * 30), 6); ctx.fillStyle = '#cfe2f4'; ctx.fillRect(Math.round(x) + 4, y + 2, 12, 2); if (i % 3 === 0) { ctx.strokeStyle = '#2a3c5c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 30, y + 10); ctx.lineTo(x + 10, y + 14); ctx.lineTo(x + 60, y + 8); ctx.stroke(); } }
      for (let i = 0; i < 8; i++) { const u = 0.38 + hash(i * 11) * 0.05, wy = worldY(u), x = (i < 4 ? 0.05 : 0.7) * w + hash(i * 11 + 1) * w * 0.25; const y = sy(wy); if (y < -60 || y > h + 60) continue; rect(ctx, x, y - 30, 40, 34, '#bcd4ec'); rect(ctx, x, y - 30, 40, 6, '#e6f0fa'); rect(ctx, x, y - 30, 6, 34, '#d6e6f5'); rect(ctx, x + 6, y - 2, 34, 6, '#8fb3d6'); }
      // скалы Пастухова 0.46–0.56 и одиночные камни
      for (let i = 0; i < 34; i++) { const u = 0.46 + hash(i * 5) * 0.1, wy = worldY(u), px = pathX(u, w), x = px + (hash(i * 5 + 1) < 0.5 ? -1 : 1) * (60 + hash(i * 5 + 2) * w * 0.35); const y = sy(wy); if (y < -30 || y > h + 30 || x < -20 || x > w) continue; rock(ctx, x, y, 1 + (i % 2)); }
      for (let i = 0; i < 18; i++) { const u = hash(i * 13) * 0.95, wy = worldY(u), x = hash(i * 13 + 1) * w; const y = sy(wy); if (y < -30 || y > h + 30 || Math.abs(x - pathX(u, w)) < 70) continue; rock(ctx, x, y, 1); }
      // тропа: утоптанный снег, следы, вешки с флажками, перила на крутом участке
      ctx.strokeStyle = '#cbd9e8'; ctx.lineWidth = 20 * scale; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      for (let wy = TOP + Hw, k = 0; wy >= TOP; wy -= 16, k++) { const x = pathX(1 - (wy - TOP) / Hw, w); if (k === 0) ctx.moveTo(x, sy(wy)); else ctx.lineTo(x, sy(wy)); } ctx.stroke();
      ctx.strokeStyle = '#e2ebf4'; ctx.lineWidth = 14 * scale; ctx.stroke();
      for (let wy = TOP + Hw; wy >= TOP; wy -= 18) { const y = sy(wy); if (y < -10 || y > h + 10) continue; const x = pathX(1 - (wy - TOP) / Hw, w); rect(ctx, x - 12 + (Math.round(wy / 18) % 2) * 16, y, 5, 3, '#a9bccf'); }
      for (let i = 0; i < 26; i++) { const u = 0.04 + i * 0.037, wy = worldY(u), x = pathX(u, w) + 20 * scale; const y = sy(wy); if (y < -40 || y > h + 40) continue; rect(ctx, x, y - 30, 3, 30, '#6a4a2a'); rect(ctx, x + 3, y - 30 + Math.sin(time * 6 + i) * 1.5, 12, 7, i % 2 ? '#e53935' : '#ffd166'); rect(ctx, x + 3, y - 30 + Math.sin(time * 6 + i) * 1.5, 12, 2, i % 2 ? '#ff7b78' : '#ffe6a0'); }
      for (let i = 0; i < 20; i++) { const u = 0.6 + i * 0.016, wy = worldY(u), x = pathX(u, w) - 20 * scale; const y = sy(wy); if (y < -40 || y > h + 60) continue; rect(ctx, x, y - 22, 3, 22, '#5a5a66'); if (i > 0) { const pu = 0.6 + (i - 1) * 0.016, py = sy(worldY(pu)), pxx = pathX(pu, w) - 20 * scale; ctx.strokeStyle = '#f4a020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pxx + 1, py - 20); ctx.quadraticCurveTo((pxx + x) / 2, (py + y) / 2 - 14, x + 1, y - 20); ctx.stroke(); } }
      // трещина на 0.3: рваные края, синий лёд в глубине, снежный мост на тропе
      { const y = sy(worldY(0.3)); if (y > -60 && y < h + 60) { const cx1 = pathX(0.3, w), x0 = cx1 - w * 0.34, x1 = cx1 + w * 0.34;
        ctx.fillStyle = '#16253f'; ctx.beginPath(); ctx.moveTo(x0, y); for (let k = 0; k <= 16; k++) ctx.lineTo(x0 + (x1 - x0) * k / 16, y - 6 - hash(k) * 12 - k * 0.6); for (let k = 16; k >= 0; k--) ctx.lineTo(x0 + (x1 - x0) * k / 16, y + 10 + hash(k + 40) * 14); ctx.fill();
        ctx.fillStyle = '#2d5a92'; for (let k = 0; k < 16; k++) ctx.fillRect(x0 + (x1 - x0) * k / 16 + 4, y + 2 + hash(k + 80) * 6, 14, 3);
        ctx.fillStyle = '#7fb0e0'; for (let k = 0; k < 8; k++) ctx.fillRect(x0 + (x1 - x0) * k / 8 + 10, y - 2, 6, 2);
        ctx.fillStyle = '#ffffff'; for (let k = 0; k <= 16; k++) ctx.fillRect(x0 + (x1 - x0) * k / 16, y - 8 - hash(k) * 12 - k * 0.6, 10, 2);
        rect(ctx, cx1 - 20 * scale, y - 12, 40 * scale, 30, '#dfe9f3'); rect(ctx, cx1 - 20 * scale, y + 14, 40 * scale, 4, '#b9cadb'); rect(ctx, cx1 - 20 * scale, y - 12, 40 * scale, 3, '#ffffff');
        rect(ctx, cx1 - 26 * scale, y - 36, 3, 28, '#6a4a2a'); rect(ctx, cx1 - 26 * scale + 3, y - 36, 12, 7, '#e53935'); } }
      ctx.restore();
      // ПОДНОЖИЕ: Азау, канатка с кабинками, Бочки, ратрак
      if (baseY > -260) {
        ctx.fillStyle = '#e8eef5'; ctx.fillRect(0, baseY, w, h - baseY + 40); ctx.fillStyle = '#c5d2e0'; ctx.fillRect(0, baseY, w, 3);
        for (let i = 0; i < 30; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#d3dde8'; ctx.fillRect((i * 97) % w, baseY + 20 + (i * 37) % Math.max(20, h - baseY), 10, 2); }
        rect(ctx, 0, baseY + 60, w, 12, '#8e98a6'); for (let i = 0; i < w; i += 40) rect(ctx, i, baseY + 65, 18, 2, '#e6ebf0');
        for (let i = 0; i < 40; i++) { const px = (i * 53 + hash(i) * 30) % (w + 40) - 20, py = baseY + 78 + hash(i + 50) * Math.max(10, h - baseY - 90), s2 = 1 + Math.round(hash(i + 90)); ctx.fillStyle = '#1f4d2e'; ctx.beginPath(); ctx.moveTo(px, py + 30 * s2); ctx.lineTo(px + 12 * s2, py); ctx.lineTo(px + 24 * s2, py + 30 * s2); ctx.fill(); ctx.fillStyle = '#2f6b3f'; ctx.beginPath(); ctx.moveTo(px + 12 * s2, py); ctx.lineTo(px + 24 * s2, py + 30 * s2); ctx.lineTo(px + 12 * s2, py + 30 * s2); ctx.fill(); rect(ctx, px + 4 * s2, py + 4 * s2, 8 * s2, 3, '#ffffff'); rect(ctx, px + 10 * s2, py + 30 * s2, 4, 6, '#3d2a1a'); }
        const stX = w * 0.12, stY = baseY;
        rect(ctx, stX, stY - 70, 150, 70, '#6b7280'); rect(ctx, stX, stY - 70, 150, 8, '#9aa3b2'); rect(ctx, stX, stY - 82, 150, 12, '#21a038'); rect(ctx, stX + 8, stY - 52, 134, 30, '#2a3342');
        for (let k = 0; k < 6; k++) rect(ctx, stX + 12 + k * 22, stY - 48, 14, 22, Math.floor(time + k) % 4 ? '#ffe9a0' : '#7a6a40');
        rect(ctx, stX + 8, stY - 30, 60, 14, '#ffffff'); ctx.fillStyle = '#21a038'; ctx.font = "7px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('АЗАУ 2350', stX + 11, stY - 26);
        const towers = [[stX + 150, stY - 60], [w * 0.45, sy(TOP + Hw - 200)], [w * 0.7, sy(TOP + Hw - 420)], [w * 0.92, sy(TOP + Hw - 640)]];
        towers.forEach(([tx, ty], k) => { if (k === 0) return; rect(ctx, tx - 3, ty - 110, 6, 110, '#7d8592'); rect(ctx, tx - 20, ty - 110, 40, 5, '#9aa3b2'); rect(ctx, tx - 1, ty - 110, 2, 110, '#b5bcc7'); });
        ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 2; ctx.beginPath(); towers.forEach(([tx, ty], k) => { const yy = ty - (k ? 110 : 0); if (k === 0) ctx.moveTo(tx, yy); else ctx.lineTo(tx, yy); }); ctx.stroke();
        [0.18, 0.52, 0.86].forEach((cu, k) => { const cc = (cu + time * 0.035) % 1; const seg = Math.min(2, Math.floor(cc * 3)), f = cc * 3 - seg; const [ax, ay] = towers[seg], [bx, by] = towers[seg + 1]; const cx0 = ax + (bx - ax) * f, cy0 = (ay - (seg ? 110 : 0)) + ((by - 110) - (ay - (seg ? 110 : 0))) * f + 6; rect(ctx, cx0 - 1, cy0 - 6, 2, 6, '#3a3f4a'); rect(ctx, cx0 - 11, cy0, 22, 18, k % 2 ? '#e53935' : '#21a038'); rect(ctx, cx0 - 8, cy0 + 3, 16, 7, '#9ad0ff'); rect(ctx, cx0 - 11, cy0 + 15, 22, 3, '#7a1f1f'); });
        const barrelX = pathX(0.1, w) > w * 0.5 ? w * 0.04 : w * 0.66; [0, 1, 2, 3].forEach((i) => { const bx = barrelX + i * 62, by = sy(TOP + Hw - 90); rect(ctx, bx, by - 30, 50, 30, '#e8a040'); rect(ctx, bx, by - 30, 50, 7, '#f6c470'); rect(ctx, bx, by - 8, 50, 8, '#b56d1a'); rect(ctx, bx + 8, by - 20, 8, 12, '#4a4a56'); rect(ctx, bx + 32, by - 20, 8, 8, Math.floor(time * 2 + i) % 3 ? '#ffe9a0' : '#7a6a40'); if (i === 1) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; for (let s = 0; s < 4; s++) ctx.fillRect(bx + 40 - s * 3, by - 36 - s * 9 - (time * 20) % 9, 6, 6); } });
        rect(ctx, barrelX, sy(TOP + Hw - 90) - 44, 3, 14, '#ddd'); rect(ctx, barrelX + 3, sy(TOP + Hw - 90) - 44, 12, 7, '#21a038');
        const rx = w * 0.3 + Math.sin(time * 0.25) * w * 0.12, ry = sy(TOP + Hw - 30), rdir = Math.cos(time * 0.25) >= 0 ? 1 : -1;
        rect(ctx, rx, ry - 30, 64, 22, '#e53935'); rect(ctx, rx, ry - 30, 64, 5, '#ff7b78'); rect(ctx, rx + (rdir > 0 ? 40 : 6), ry - 26, 18, 10, '#9ad0ff'); rect(ctx, rx - 4, ry - 10, 72, 10, '#222'); for (let k = 0; k < 6; k++) rect(ctx, rx + ((k * 12 + time * 30 * rdir) % 66 + 66) % 66 - 2, ry - 8, 6, 6, '#666'); rect(ctx, rx + (rdir > 0 ? 64 : -14), ry - 20, 14, 12, '#b0b8c4');
        drawNpc(ctx, 3, 'idle', stX + 160, baseY - SPRITE_H * 2 + 8, 2); drawNpc(ctx, 6, 'idle', stX + 200, baseY - SPRITE_H * 2 + 12, 2); drawNpc(ctx, 9, 'idle', barrelX + 60, sy(TOP + Hw - 90) - SPRITE_H * 2 + 6, 2);
      }
      // ВЕРШИНА: скальный лоб, табличка, флаг, иней
      if (summitY > -100) {
        rect(ctx, w * 0.5 - 60, summitY - 34, 120, 40, '#5a5a66'); rect(ctx, w * 0.5 - 60, summitY - 34, 120, 6, '#8a8a98'); rect(ctx, w * 0.5 - 60, summitY - 34, 8, 40, '#7a7a88'); rect(ctx, w * 0.5 - 60, summitY, 120, 6, '#30303c');
        for (let k = 0; k < 8; k++) rect(ctx, w * 0.5 - 56 + k * 15, summitY - 40 + (k % 2) * 3, 8, 6, '#ffffff');
        rect(ctx, w * 0.5 - 34, summitY - 64, 68, 26, '#ffffff'); rect(ctx, w * 0.5 - 34, summitY - 64, 68, 3, '#c7d2dd'); ctx.fillStyle = '#e53935'; ctx.font = "7px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText('5642 м', w * 0.5 - 24, summitY - 56);
        rect(ctx, w * 0.5 - 36, summitY - 38, 3, 8, '#5a5a66'); rect(ctx, w * 0.5 + 33, summitY - 38, 3, 8, '#5a5a66');
        rect(ctx, w * 0.5 + 44, summitY - 110, 3, 80, '#ddd'); ctx.fillStyle = '#21a038'; ctx.beginPath(); ctx.moveTo(w * 0.5 + 47, summitY - 108); ctx.lineTo(w * 0.5 + 84, summitY - 100 + Math.sin(time * 5) * 3); ctx.lineTo(w * 0.5 + 47, summitY - 84); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = "6px 'Press Start 2P', monospace"; ctx.fillText('Сбер', w * 0.5 + 50, summitY - 100);
      }
      // блики на снегу
      for (let i = 0; i < 18; i++) { const wy = TOP + hash(i * 17) * Hw, x = hash(i * 17 + 1) * w; const y = sy(wy); if (y < 0 || y > h) continue; const a = Math.max(0, Math.sin(time * 3 + i * 1.7)); ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`; ctx.fillRect(Math.round(x) - 1, y, 4, 2); ctx.fillRect(Math.round(x), y - 1, 2, 4); }

      // АЛЬПИНИСТЫ: по тропе, каждый со своим смещением от неё
      const drawOrder = [...climbers.keys()].sort((a, b) => ps[a] - ps[b]);
      const posOf = (c, u) => { const uu = Math.max(0, u - c.lag); const dir = Math.cos(uu * Math.PI * 3.2 - 0.628) >= 0 ? 1 : -1; return { uu, dir, x: Math.round(pathX(uu, w) + c.side * 22 * scale - sprW / 2), y: Math.round(sy(worldY(uu)) - sprH + 6) }; };
      if (time - lastPuff > 0.3 && t < 1) { lastPuff = time; climbers.forEach((c, i) => { const q = posOf(c, ps[i]); particles.puff(q.x + sprW / 2 + q.dir * 6, q.y + sprH * 0.3, time, rnd, 'rgba(255,255,255,0.75)'); }); }
      particles.draw(ctx, time);
      drawOrder.forEach((i) => {
        const c = climbers[i]; const q = posOf(c, ps[i]); let { x, y } = q; const u = q.uu, dir = q.dir;
        let jump = 0, slipping = false;
        if (Math.abs(u - 0.3) < 0.02) jump = Math.sin(((u - 0.28) / 0.04) * Math.PI) * 40;
        if (c.slipAt !== null && Math.abs(t - c.slipAt) < 0.035) { slipping = true; y += 12; }
        const ducked = avalanche >= 0 && avalanche < 1.2 && u > 0.5 && u < 0.64;
        if (ducked) y += Math.sin(avalanche / 1.2 * Math.PI) * 20;
        ctx.fillStyle = 'rgba(30,50,90,0.25)'; ctx.fillRect(x + 20 * scale, y + sprH - 4, 24 * scale, 3);
        const fr = t < 1 ? (jump > 5 ? (dir > 0 ? 'run3' : 'left3') : (slipping || ducked) ? 'hurt0' : runFrame(time, 6 + c.f, c.gait)) : (c.rank === 0 ? (Math.floor(time * 5) % 2 ? 'cheer' : 'cheer2') : 'idle');
        drawSprite(ctx, c.p.person, fr, x, y - jump, scale, dir < 0 && t < 1 && !fr.startsWith('left'));
        if (slipping) { ctx.fillStyle = '#ff5050'; ctx.font = "10px 'Press Start 2P', monospace"; ctx.fillText('!', x + sprW / 2, y - 26); }
        const first = t >= 1 && c.rank === 0;
        label(ctx, c.p.name, x + sprW / 2, y - jump - 6, scale >= 3 ? 9 : 8, first ? '#ffd166' : '#f4ecd8', 'rgba(12,8,24,0.85)', first ? '#ffd166' : null);
      });
      // ЛАВИНА: вал снега справа налево с тенью и пылевым облаком, летящие камни; БУРАН: синяя мгла, плотный снег, ветер
      if (avalanche >= 0 && avalanche < 1.6) {
        const k0 = avalanche / 1.6, ay0 = sy(worldY(0.58));
        ctx.fillStyle = 'rgba(110,130,165,0.45)'; for (let k = 0; k < 12; k++) { const ax = w + 260 - k0 * (w + 600) + k * 90, ay = ay0 - 150 + k0 * 120 + (k % 3) * 40; ctx.beginPath(); ctx.arc(ax, ay, 64, 0, Math.PI * 2); ctx.fill(); }
        for (let k = 0; k < 18; k++) { const ax = w + 80 - k0 * (w + 400) + (k % 6) * 70 + Math.sin(avalanche * 7 + k) * 8, ay = ay0 - 60 + k0 * 160 + Math.floor(k / 6) * 44, r = 36 + (k % 4) * 12; ctx.fillStyle = '#b7c9de'; ctx.beginPath(); ctx.arc(ax + 6, ay + 8, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e4edf6'; ctx.beginPath(); ctx.arc(ax, ay, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(ax - r * 0.3, ay - r * 0.35, r * 0.45, 0, Math.PI * 2); ctx.fill(); }
        for (let k = 0; k < 10; k++) { const ax = w + 40 - k0 * (w + 500) + k * 110, ay = ay0 - 90 + k0 * 140 + Math.sin(avalanche * 9 + k * 2) * 30; rect(ctx, ax, ay, 10, 8, '#3a3a48'); rect(ctx, ax, ay, 10, 2, '#7a7a8a'); }
        for (let k = 0; k < 8; k++) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(w - k0 * (w + 300) - k * 60, ay0 - 40 + (k % 4) * 30, 80, 2); }
        if (avalanche < 0.5) impactRing(ctx, w * 0.5, sy(worldY(0.56)), avalanche, '#ffffff', 220);
      }
      if (storm) { const sa = Math.min(1, (time - fired.get(0.78)) * 3) * Math.min(1, (3.2 - (time - fired.get(0.78))) * 1.5); ctx.fillStyle = `rgba(120,140,175,${(0.55 * sa).toFixed(2)})`; ctx.fillRect(0, 0, w, h); }
      const gust = Math.max(0, Math.sin(time * 0.7)) > 0.85;
      drawAmbient(ctx, 'snow', w, h, time, storm ? 180 : 40);
      if (gust || storm) for (let k = 0; k < (storm ? 24 : 6); k++) { const yy = (k * 131 + time * 40) % h; ctx.fillStyle = storm ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)'; ctx.fillRect(((k * 211 + time * 700) % (w + 200)) - 100, yy, 60 + (k % 3) * 30, PX); if (storm) { ctx.fillStyle = 'rgba(170,190,220,0.8)'; ctx.fillRect(((k * 211 + time * 700) % (w + 200)) - 100, yy + PX, 40, PX); } }
      if (t < 1) { const li = ps.indexOf(leader); const q = posOf(climbers[li], leader); speedLines(ctx, q.x + (q.dir > 0 ? -8 : sprW + 8), q.y + sprH * 0.4, 4, 24, 'rgba(255,255,255,0.45)'); }
      vignette(ctx, w, h, 0.35);
      ctx.restore();
      // высотомер
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(w - 190, 16, 174, 40); ctx.fillStyle = '#ffd166'; ctx.font = "9px 'Press Start 2P', monospace"; ctx.textBaseline = 'top'; ctx.fillText(`${Math.round(BASE_ALT + leader * (TOP_ALT - BASE_ALT))} м`, w - 178, 24); ctx.fillStyle = '#9ccbf2'; ctx.fillText('ЭЛЬБРУС', w - 178, 40);
      if (avalanche >= 0 && avalanche < 1.2) bigText(ctx, w, h, 'ЛАВИНА!', time, '#ff6b6b', 34);
      if (storm && time - fired.get(0.78) < 1.2) bigText(ctx, w, h, 'БУРАН!', time, '#dfe8ff', 34);
      if (flashAt === null && leader >= 0.985) { flashAt = time; particles.burst(w * 0.5, summitY - 60, time, rnd, { count: 80, speed: 280, colors: ['#ffd166', '#ff6b6b', '#6ec85a', '#3c8cdc', '#fff'], life: 1.6 }); }
      if (flashAt !== null) { const a = Math.max(0, 0.8 - (time - flashAt) * 2); if (a > 0) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(0, 0, w, h); } if (time - flashAt < 1.4) bigText(ctx, w, h, 'ВЕРШИНА!', time); }
      if (t >= 1 && time >= dur + 0.8) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
