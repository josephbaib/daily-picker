import { drawSprite } from '../sprite.js?v=26561fc-1814';
import { mulberry32 } from '../rng.js?v=26561fc-1814';
import { makeParticles, threatTarget, stepRandom, nextFrame, cancelFrame, makeBuffer, plate, drawTiled, glow, pixLabel } from './scene.js?v=26561fc-1814';
import { drawActor, placeTags, threatMark, FX_ASSET, makeTitles } from './stage.js?v=26561fc-1814';
import { makeWarp, beginCamera, vignette, bigText } from './fx.js?v=26561fc-1814';

// Лифт: все едут наверх, на каждом этаже перегруз и кого-то высаживают. Последний доезжает до переговорки.
// Отрисовка по схеме docs/BENCHMARK.md и docs/STAGE.md: этажи плитами друг над другом, кабина и двери с плит, шкив и лампа перегруза с листа.
const DIR = 'assets/scenes/elevator/';
const ASSETS = ['floorA', 'floorB', 'top', 'cabin', 'doors', 'lamp', 'pulley', 'building'].map((n) => DIR + n + '.png').concat([FX_ASSET]);
const LAMP = { w: 42, h: 42 }, PULLEY = { w: 42, h: 42 };
/* паспорт света: ровный холодный свет потолочной панели кабины и офисных ламп */
const LIGHT = { id: 'elevator', mul: '238,242,255', tintK: 0, key: { dx: 0, dy: -1, rgb: '240,248,255', k: 0.5 }, shade: { rgb: '30,36,70', k: 0.3 }, warm: '255,230,180', shadow: 'rgba(8,10,30,0.4)', shadowLen: 0 };

export default {
  id: 'elevator',
  title: 'Лифт',
  cover: 'assets/covers/elevator.jpg',
  assets: ASSETS,
  description: 'Перегруженный лифт ползёт на совещание, и на каждом этаже кому-то придётся выйти раньше времени.',
  duration: 20,
  minPlayers: 2,
  maxPlayers: 20,

  preview(ctx, w, h, t, people) {
    ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#14161f'; ctx.fillRect(0, 0, w, h);
    const cab = plate(DIR + 'cabin.png'); if (cab) ctx.drawImage(cab, 0, 0, 194, 249, w / 2 - 60, h * 0.15, 120, 154);
    people.slice(0, 3).forEach((p, i) => drawSprite(ctx, p.person, 'idle', w / 2 - 70 + i * 40, h * 0.4, 1.5));
  },

  play({ canvas, participants, order, seed, startAt, onFreeze, onEvent }) {
    const buffer = makeBuffer(canvas);
    const ctx = buffer.ctx;
    const img = (name) => plate(DIR + name + '.png');
    const n = participants.length;
    const rnd = mulberry32(seed);
    const victims = [...order].reverse().slice(0, n - 1);
    const particles = makeParticles();
    const titles = makeTitles();
    // раунд: едем этаж (drive) → тревога 0.7 → двери 0.4 → выход 0.9 → двери 0.4
    const drive = n > 10 ? 0.6 : 1.0, alarmT = 0.7, openT = 0.4, exitT = 0.9, closeT = 0.4;
    const roundLen = drive + alarmT + openT + exitT + closeT;
    const total = victims.length * roundLen;
    const k = total > 17 ? 17 / total : 1;
    const rounds = victims.map((id, i) => ({ id, at: 0.6 + i * roundLen * k, side: i % 2 }));
    const finalAt = 0.6 + victims.length * roundLen * k + drive * k + 2.2;
    const exited = [];
    const warp = makeWarp(rounds.map((r) => r.at + (drive + alarmT + openT) * k), n > 10 ? 0.2 : 0.3, 0.45);
    let start = null, raf = 0, stopped = false;
    const dinged = new Set();
    const sr = stepRandom(seed ^ 0x99);

    // пройдено этажей к моменту t: первый переезд до раунда 0, потом по одному за раунд, потом последний к переговорке
    const travelAt = (t) => {
      let tr = Math.min(1, Math.max(0, t / 0.6));
      rounds.forEach((r) => { const local = (t - r.at) / k; tr += Math.min(1, Math.max(0, local / drive)); });
      const lastEnd = rounds.length ? rounds[rounds.length - 1].at + roundLen * k : 0.6;
      tr += Math.min(1, Math.max(0, (t - lastEnd) / (drive * k)));
      return tr;
    };

    const frame = (now) => {
      if (stopped) return;
      if (start === null) start = typeof startAt === 'number' ? startAt : now;
      const t = warp(Math.max(0, now - start) / 1000);
      const { w, h } = buffer.fit();
      const x0 = Math.round((w - 640) / 2), yOff = h - 360;
      const cols = Math.min(6, Math.ceil(Math.sqrt(n * 1.6))), rowsN = Math.ceil(n / cols);
      const cabX = x0 + 223, cabY = yOff + 37, floorLine = yOff + 282;

      // фаза раунда: события фиксируются по прошедшему времени, даже если кадр пропущен
      let doors = 0, alarm = false, floorNo = 1, moving = true, finale = false, threat = null;
      rounds.forEach((r, i) => {
        const local = (t - r.at) / k;
        if (local < 0) return;
        floorNo = i + 2;
        const ph = local - drive;
        if (ph >= alarmT && !dinged.has(r.id)) { dinged.add(r.id); if (onEvent) onEvent('ding'); }
        if (ph >= alarmT + openT && !exited.find((e) => e.id === r.id)) { exited.push({ id: r.id, p: participants.find((p) => p.id === r.id), time: r.at + (drive + alarmT + openT) * k, floor: i + 2, side: r.side }); if (onEvent) onEvent('pop'); }
        if (local < drive) { moving = true; }
        else if (local < roundLen) {
          moving = false;
          if (ph < alarmT) { alarm = true; const insideIds = participants.filter((p) => !exited.find((e) => e.id === p.id)).map((p) => p.id); threat = threatTarget(insideIds, r.id, ph, 0, alarmT * 0.9, (kk) => sr(i * 41 + kk)); }
          else if (ph < alarmT + openT) doors = (ph - alarmT) / openT;
          else if (ph < alarmT + openT + exitT) doors = 1;
          else doors = 1 - (ph - alarmT - openT - exitT) / closeT;
        }
      });
      const lastEnd = rounds.length ? rounds[rounds.length - 1].at + roundLen * k : 0.6;
      if (t >= lastEnd + drive * k) { finale = true; moving = false; doors = Math.min(1, (t - lastEnd - drive * k) / 0.5); floorNo = victims.length + 2; if (!dinged.has('final')) { dinged.add('final'); if (onEvent) onEvent('ding'); } }
      const travel = travelAt(t), topFloor = victims.length + 2; /* проезжаем: разгон до первой остановки, по этажу на раунд и последний перегон до переговорки */

      beginCamera(ctx, w, h, t, exited.map((e) => e.time), () => ({ x: x0 + 320, y: yOff + 170 }), { level: 1.1, dur: 0.9, amp: 3 });

      // 1. ЗДАНИЕ: этажи плитами друг над другом едут вниз мимо кабины; вышедшие остаются стоять на своих этажах
      ctx.fillStyle = '#14161f'; ctx.fillRect(0, 0, w, h);
      for (let f = Math.max(0, Math.floor(travel) - 1); f <= Math.min(topFloor, Math.ceil(travel) + 1); f++) {
        const fy = Math.round(yOff - (f - travel) * 360); if (fy > h || fy + 360 < 0) continue;
        const name = f === topFloor ? 'top' : f % 2 ? 'floorB' : 'floorA';
        drawTiled(ctx, img(name), -x0, fy, w);
        if (name === 'floorB') for (let q = 0; q < 10; q++) glow(ctx, x0 + 20 + (q % 5) * 44, fy + 130 + Math.floor(q / 5) * 60, 10, '80,150,255', 0.25 + 0.25 * Math.sin(t * 5 + q * 1.9 + f));
        [50, 305].forEach((ly, q) => glow(ctx, x0 + 320, fy + ly, 18, '255,190,110', 0.4 + 0.08 * Math.sin(t * 6 + q + f)));
        exited.forEach((e) => { if (e.floor !== f || t - e.time <= exitT) return; const ex = e.side === 0 ? x0 + 120 - (e.floor % 3) * 26 : x0 + 470 + (e.floor % 3) * 26; drawActor(ctx, e.p.person, e.side === 0 ? 'stand-right' : 'stand-left', ex - 32, fy + 282 - 62, LIGHT); });
      }

      // 2. ТРОСЫ и КАБИНА: шкив на крыше крутится на ходу, лампа перегруза мигает в тревогу
      const shake = alarm ? Math.round(Math.sin(t * 70) * 2) : 0;
      ctx.save(); ctx.translate(shake, moving ? Math.round(Math.sin(t * 18) * 0.6) : 0);
      [80, 112].forEach((dx) => { ctx.fillStyle = '#0c0d14'; ctx.fillRect(cabX + dx, 0, 3, cabY); ctx.fillStyle = '#3a3f52'; ctx.fillRect(cabX + dx, 0, 1, cabY); });
      const pulley = img('pulley'), lamp = img('lamp'), cabin = img('cabin'), doorsImg = img('doors');
      if (pulley) ctx.drawImage(pulley, (Math.floor(travel * 28) % 4) * PULLEY.w, 0, PULLEY.w, PULLEY.h, cabX + 97 - PULLEY.w / 2, cabY - PULLEY.h + 6, PULLEY.w, PULLEY.h);
      if (lamp) { const fr = alarm ? 1 + Math.floor(t * 10) % 2 : 0; ctx.drawImage(lamp, fr * LAMP.w, 0, LAMP.w, LAMP.h, cabX + 150, cabY - LAMP.h + 8, LAMP.w, LAMP.h); if (alarm) glow(ctx, cabX + 171, cabY - 14, 60, '255,40,30', 0.55 + 0.25 * Math.sin(t * 20)); }
      if (cabin) ctx.drawImage(cabin, cabX, cabY);
      if (alarm) { ctx.fillStyle = `rgba(255,30,20,${(0.10 + 0.08 * Math.sin(t * 20)).toFixed(2)})`; ctx.fillRect(cabX + 22, cabY + 26, 150, 212); }

      // 3. КОМАНДА в кабине рядами; выходящий идёт из дверей в комнату этажа
      const inside = participants.filter((p) => !exited.find((e) => e.id === p.id));
      const labels = [];
      const spanX = 150 - 40, step = cols > 1 ? Math.min(30, spanX / (cols - 1)) : 0, rowStep = rowsN > 1 ? Math.min(30, 84 / (rowsN - 1)) : 0;
      participants.map((p, i) => ({ p, i, row: Math.floor(i / cols) })).sort((a, b) => a.row - b.row).forEach(({ p, i, row }) => {
        const col = i % cols, inRow = Math.min(cols, n - row * cols);
        const bx = cabX + 97 - ((inRow - 1) * step) / 2 + col * step - 32 + (row % 2) * 5;
        const by = cabY + 236 - 62 - (rowsN - 1 - row) * rowStep;
        const e = exited.find((q) => q.id === p.id);
        if (e) {
          const age = t - e.time; if (age > exitT) return;
          const dir = e.side === 0 ? -1 : 1, u = age / exitT;
          const tx = e.side === 0 ? x0 + 120 - (e.floor % 3) * 26 - 32 : x0 + 470 + (e.floor % 3) * 26 - 32;
          drawActor(ctx, p.person, (dir < 0 ? 'left' : 'run') + (Math.floor(age * 10) % 8), Math.round(bx + (tx - bx) * u) - shake, Math.round(by + (floorLine - 62 - by) * Math.min(1, u * 3)), LIGHT);
          labels.push({ text: p.name, cx: bx + (tx - bx) * u + 32, y: by - 2, index: i, gold: false });
          return;
        }
        const bob = moving ? Math.round(Math.sin(t * 10 + i) * 0.7) : 0;
        const win = finale && inside.length === 1, hop = win ? Math.round(Math.abs(Math.sin(t * 6)) * 4) : 0;
        drawActor(ctx, p.person, win ? (Math.floor(t * 5) % 2 ? 'cheer' : 'cheer2') : 'idle', bx, by + bob, LIGHT, { lift: hop, shadow: row === rowsN - 1 });
        if (threat === p.id) threatMark(ctx, bx + 32, by + bob + 12, t);
        labels.push({ text: p.name, cx: bx + 32, y: by + bob - hop - (threat === p.id ? 12 : 2), index: i, gold: win });
      });

      // 4. ДВЕРИ: створки стеклянные, команду видно всю поездку; на остановке разъезжаются в стороны и уходят в раму
      if (doorsImg && doors < 1) { const open = Math.round(doors * 74); ctx.save(); ctx.globalAlpha = 0.32; ctx.beginPath(); ctx.rect(cabX + 24, cabY + 26, 146, 214); ctx.clip(); ctx.drawImage(doorsImg, 24, 26, 73, 214, cabX + 24 - open, cabY + 26, 73, 214); ctx.drawImage(doorsImg, 97, 26, 73, 214, cabX + 97 + open, cabY + 26, 73, 214); ctx.restore(); }
      ctx.restore();
      placeTags(ctx, labels);
      particles.draw(ctx, t);
      if (finale && doors > 0.9 && Math.floor(t * 6) % 3 === 0) particles.burst(x0 + 320, yOff + 60, t, rnd, { count: 8, speed: 120, colors: ['#21a038', '#ffffff', '#ffd166', '#2fc24f'], life: 1.4, gravity: 120, size: 2 });
      vignette(ctx, w, h, 0.4);
      ctx.restore();

      // 5. СХЕМА ЗДАНИЯ в углу: где сейчас кабина, и номер этажа
      const bld = img('building');
      if (bld) { const bx = w - 138, by = 8; ctx.fillStyle = '#05050f'; ctx.fillRect(bx - 2, by - 2, 132, 76); ctx.drawImage(bld, bx, by); const my = by + 66 - Math.round((travel / Math.max(1, topFloor)) * 58); ctx.fillStyle = '#05050f'; ctx.fillRect(bx + 60, my - 1, 8, 8); ctx.fillStyle = alarm && Math.floor(t * 8) % 2 ? '#ff5050' : '#ffd166'; ctx.fillRect(bx + 61, my, 6, 6); }
      pixLabel(ctx, finale ? 'ПЕРЕГОВОРКА' : `ЭТАЖ ${Math.max(1, Math.min(Math.round(travel) + 1, topFloor))}`, w - 72, 90, '#ffd166', '#ffd166');
      if (alarm) titles.show(ctx, w, h, 'ПЕРЕГРУЗ!', t, 'danger');
      const lastExit = exited.length ? exited[exited.length - 1] : null;
      if (lastExit && t - lastExit.time < 1.0 && !finale) titles.show(ctx, w, h, 'НА ВЫХОД!', t, 'steel');
      if (finale && doors > 0.9) titles.show(ctx, w, h, 'ДОЕХАЛ!', t, 'gold');
      buffer.blit();
      if (t >= finalAt) { stopped = true; onFreeze(); return; }
      raf = nextFrame(frame);
    };
    raf = nextFrame(frame);
    return { stop() { stopped = true; cancelFrame(raf); } };
  },
};
