import { personFor, preload } from './sprite.js?v=3b8b1e8-1658';
import { computeOrder } from './order.js?v=3b8b1e8-1658';
import { randomSeed } from './rng.js?v=3b8b1e8-1658';
import { GAMES, gameById, pickGame } from './games/index.js?v=3b8b1e8-1658';
import { sound } from './sound.js?v=3b8b1e8-1658';
import { mountTeam, mountGameTiles } from './ui/hub.js?v=3b8b1e8-1658';
import { mountResult } from './ui/result.js?v=3b8b1e8-1658';
import * as db from './db.js?v=3b8b1e8-1658';
import { NPCS } from './games/scene.js?v=3b8b1e8-1658';

const $ = (s) => document.querySelector(s);
const roomId = new URLSearchParams(location.search).get('room');

function toast(text, ms = 4000) {
  const el = $('#toast');
  el.textContent = text; el.hidden = false;
  clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, ms);
}

// Плывущие кубы на фоне, как в меню приставки. Один холст, без теней и 3D: не грузит процессор.
(function cubes() {
  const cv = document.createElement('canvas');
  cv.id = 'fx-canvas';
  $('#fx').append(cv);
  const ctx = cv.getContext('2d');
  const N = 34;
  const cubes = Array.from({ length: N }, (_, i) => ({
    x: Math.random(), y: Math.random() * 1.2, s: 10 + Math.random() * 34, v: 0.012 + Math.random() * 0.03,
    r: Math.random() * Math.PI, w: (Math.random() - 0.5) * 0.6, a: 0.25 + Math.random() * 0.5, d: i % 3,
  }));
  // заготовка куба со свечением, рисуется один раз
  const sprite = document.createElement('canvas'); sprite.width = 96; sprite.height = 96;
  const sc = sprite.getContext('2d');
  const g = sc.createRadialGradient(48, 48, 6, 48, 48, 46);
  g.addColorStop(0, 'rgba(170,195,255,0.55)'); g.addColorStop(0.5, 'rgba(140,170,255,0.18)'); g.addColorStop(1, 'rgba(120,150,255,0)');
  sc.fillStyle = g; sc.fillRect(0, 0, 96, 96);
  sc.strokeStyle = 'rgba(200,215,255,0.9)'; sc.lineWidth = 1.5; sc.strokeRect(30, 30, 36, 36);
  sc.fillStyle = 'rgba(160,190,255,0.16)'; sc.fillRect(30, 30, 36, 36);
  let last = performance.now();
  function fit() { cv.width = innerWidth; cv.height = innerHeight; }
  addEventListener('resize', fit); fit();
  function tick(now) {
    requestAnimationFrame(tick);
    if ($('#game') && !$('#game').hidden) return; // во время игры фон не рисуем
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    const grd = ctx.createRadialGradient(w * 0.5, h * 1.1, 10, w * 0.5, h * 1.1, h * 0.9);
    grd.addColorStop(0, 'rgba(40,60,140,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    // тонкая световая полоса проходит по экрану раз в несколько секунд
    const sweep = (now / 1000) % 7;
    if (sweep < 1.6) { const sy = h * (0.15 + 0.7 * (sweep / 1.6)); const sg = ctx.createLinearGradient(0, 0, w, 0); sg.addColorStop(0, 'rgba(180,200,255,0)'); sg.addColorStop(0.5, 'rgba(200,215,255,0.5)'); sg.addColorStop(1, 'rgba(180,200,255,0)'); ctx.fillStyle = sg; ctx.fillRect(0, sy, w, 1); }
    cubes.forEach((c) => {
      c.y -= c.v * dt; c.r += c.w * dt;
      if (c.y < -0.15) { c.y = 1.15; c.x = Math.random(); }
      const px = c.x * w, py = c.y * h, size = c.s * (1 + c.d * 0.6);
      ctx.save(); ctx.translate(px, py); ctx.rotate(c.r); ctx.globalAlpha = c.a * (c.y < 0.1 ? c.y / 0.1 : 1);
      ctx.drawImage(sprite, -size * 1.4, -size * 1.4, size * 2.8, size * 2.8);
      ctx.restore();
    });
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(tick);
})();

// Затемнение на полсекунды между экранами.
function fadeTo(fn) {
  const f = $('#fade');
  return new Promise((resolve) => {
    f.classList.add('on');
    setTimeout(() => { fn(); setTimeout(() => { f.classList.remove('on'); resolve(); }, 60); }, 500);
  });
}

function show(screen) {
  ['room-form', 'hub', 'game', 'result'].forEach((id) => { $('#' + id).hidden = id !== screen; });
  document.body.dataset.screen = screen;
}

if (!roomId) {
  show('room-form');
  $('#room-form form').onsubmit = (e) => {
    e.preventDefault();
    const v = $('#room-form input').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (v) location.search = '?room=' + v;
  };
} else {
  boot().catch((err) => { console.error(err); toast('Ошибка: ' + (err.message || err)); });
}

async function boot() {
  show('hub');
  const canvas = $('#canvas');
  const overlay = $('#overlay');
  const startBtn = $('#start');
  let room = null, history = [], participants = [], channel = null, running = null, lastPayload = null;
  let state = 'idle';
  const seenGames = new Set();

  const roomTitle = () => (room && room.settings && room.settings.title) || roomId;
  $('#room-name').onclick = async () => {
    const v = prompt('Как называется команда?', roomTitle());
    if (v === null) return;
    const settings = { ...(room.settings || {}), title: v.trim() || undefined };
    applyRoom({ ...room, settings });
    try { await db.saveSettings(roomId, settings); } catch (e) { toast('Не сохранилось: ' + e.message); }
  };

  // ---------- Хаб ----------
  const team = mountTeam($('#team-grid'), {
    onChange: async (next) => {
      applyRoom({ ...room, participants: next });
      try { await db.saveParticipants(roomId, next); } catch (e) { toast('Не сохранилось: ' + e.message); }
    },
  });
  const tiles = mountGameTiles($('#game-tiles'), [...GAMES, { id: 'random', title: 'Случайная', description: 'Игра выбирается сама, каждый день по-разному.', preview: randomPreview }], {
    onSelect: (id, go, g) => {
      localStorage.setItem('dp:game', id);
      if (g) $('#game-desc').textContent = g.description || '';
      if (go) start();
    },
  });
  if (localStorage.getItem('dp:game')) tiles.select(localStorage.getItem('dp:game'));
  const result = mountResult($('#result'), {
    onAgain: () => { show('hub'); setState('idle'); start(); },
    onMenu: () => { show('hub'); setState('idle'); },
  });

  document.addEventListener('keydown', (e) => {
    if (document.body.dataset.screen !== 'hub' || e.target.tagName === 'INPUT') return;
    if (e.code === 'ArrowRight') tiles.move(1);
    if (e.code === 'ArrowLeft') tiles.move(-1);
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); start(); }
  });

  function randomPreview(ctx, w, h, t, people) {
    ctx.fillStyle = '#0a0b14'; ctx.fillRect(0, 0, w, h);
    ctx.font = "bold 64px 'Rubik', sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd166';
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(Math.sin(t * 2) * 0.2); ctx.fillText('?', 0, 0); ctx.restore();
    ctx.textAlign = 'left';
  }

  function lastFirstName(exceptOrder = null) {
    const g = history.find((x) => !exceptOrder || x.order_ids.join() !== exceptOrder.join());
    if (!g) return '';
    const p = participants.find((x) => x.id === g.order_ids[0]);
    return p ? p.name : '';
  }
  const memoText = (name) => (name ? `Вчера первым был(а) ${name}, сегодня первым не будет` : 'Игр ещё не было');

  const cacheKey = `dp:room:${roomId}`;
  try { room = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch (_) { room = null; }

  function applyRoom(r) {
    room = r;
    participants = (r.participants || []).map((p) => ({ ...p, person: personFor(p.name) }));
    try { localStorage.setItem(cacheKey, JSON.stringify({ id: r.id, participants: r.participants, settings: r.settings })); } catch (_) {}
    team.set(participants);
    $('#room-name').textContent = roomTitle();
    tiles.setPeople(present());
    preload(participants.map((p) => p.person)).then(() => { team.set(participants); tiles.setPeople(present()); });
    $('#memo').textContent = memoText(lastFirstName());
    updateStart();
  }
  function present() { return participants.filter((p) => p.present !== false); }
  function updateStart() {
    const n = present().length;
    startBtn.disabled = state !== 'idle' || n < 2;
    $('#count').textContent = `${n} из ${participants.length} сегодня`;
    startBtn.textContent = n < 2 ? 'Нужно хотя бы двое' : 'Играть';
  }
  function setState(s) { state = s; updateStart(); }

  // ---------- Холст ----------
  const fit = () => { const g = $('#game'); if (g.hidden) return; canvas.width = g.clientWidth || innerWidth || 1280; canvas.height = g.clientHeight || innerHeight || 720; };
  new ResizeObserver(fit).observe($('#game'));

  // ---------- Старт ----------
  startBtn.onclick = start;
  async function start() {
    if (state !== 'idle') return;
    const ps = present();
    if (ps.length < 2) return;
    const seed = randomSeed();
    const choice = tiles.selected === 'random' ? pickGame(seed) : gameById(tiles.selected);
    const orderIds = computeOrder({ participants: ps, history, seed });
    setState('starting');
    const local = () => {
      history = [{ id: null, order_ids: orderIds }, ...history];
      runGame({ gameId: null, game: choice.id, seed, orderIds, startAt: Date.now() + 3000 });
    };
    if (!channel) { local(); return; }
    try {
      const row = await db.insertGame({ room_id: roomId, game: choice.id, seed, order_ids: orderIds });
      seenGames.add(row.id);
      await channel.sendStart({ gameId: row.id, game: choice.id, seed, orderIds, startAt: db.serverNow() + 3000 });
    } catch (e) { toast('База недоступна, играем локально'); local(); }
  }

  async function runGame(payload) {
    if (state !== 'idle' && state !== 'starting') return;
    lastPayload = payload;
    if (payload.gameId) seenGames.add(payload.gameId);
    const game = gameById(payload.game);
    const ordered = payload.orderIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean);
    if (!game || ordered.length < 1) { setState('idle'); return; }
    const memo = lastFirstName(payload.orderIds);
    await preload(ordered.map((p) => p.person));
    await fadeTo(() => { show('game'); fit(); });
    await new Promise((r) => setTimeout(r, 50)); fit();
    $('#hud-title').textContent = game.title;
    setState('countdown');
    await countdown(payload.startAt, true);
    setState('playing');
    sound.go();
    const started = performance.now();
    const timer = setInterval(() => { $('#hud-time').textContent = ((performance.now() - started) / 1000).toFixed(1); }, 100);
    // Страховка: если игра зависла или упала, всё равно показываем итог.
    let frozen = false;
    const watchdog = setTimeout(() => { if (!frozen) { console.warn('игра не завершилась вовремя'); if (running) running.stop(); freeze(); } }, (game.duration + 8) * 1000);
    const freeze = async () => {
      if (frozen) return; frozen = true; clearTimeout(watchdog);
        clearInterval(timer);
        setState('frozen');
        await new Promise((r) => setTimeout(r, 900));
        sound.fanfare();
        setState('reveal');
        await fadeTo(() => { show('result'); result.show(ordered, memo ? `Вчера первым был(а) ${memo}` : ''); });
    };
    running = game.play({
      canvas, participants: ordered, order: payload.orderIds, seed: payload.seed,
      onEvent: (ev) => { if (ev === 'pop') sound.pop(); if (ev === 'tick') sound.tick(); if (ev === 'ding') sound.ding(); if (ev === 'whoosh') sound.whoosh(); },
      onFreeze: freeze,
    });
  }

  function countdown(untilMs, useServer) {
    return new Promise((resolve) => {
      let lastShown = null;
      const tick = () => {
        const now = useServer ? db.serverNow() : Date.now();
        const left = Math.ceil((untilMs - now) / 1000);
        if (left <= 0) { overlay.hidden = true; resolve(); return; }
        if (left !== lastShown) { lastShown = left; overlay.textContent = String(left); overlay.hidden = false; sound.tick(); }
        setTimeout(tick, 100);
      };
      tick();
    });
  }

  // ---------- Настройки ----------
  const soundBtn = $('#sound');
  const syncButtons = () => {
    soundBtn.textContent = sound.enabled ? 'Звук вкл' : 'Звук выкл'; soundBtn.classList.toggle('on', sound.enabled);
  };
  sound.setEnabled(localStorage.getItem('dp:sound') === '1');
  soundBtn.onclick = () => { sound.setEnabled(!sound.enabled); localStorage.setItem('dp:sound', sound.enabled ? '1' : '0'); syncButtons(); };
  $('#copy').onclick = async () => { try { await navigator.clipboard.writeText(location.href); toast('Ссылка скопирована'); } catch (_) { toast(location.href, 8000); } };
  syncButtons();

  // ---------- Данные ----------
  preload(NPCS);
  if (room) applyRoom(room);
  try {
    await db.measureClock();
    const [r, g] = await Promise.all([db.loadRoom(roomId), db.loadGames(roomId)]);
    history = g;
    applyRoom(r);
    channel = db.subscribeRoom(roomId, {
      onRoom: (row) => { if (state === 'idle') applyRoom(row); else room = row; },
      onGame: (row) => {
        history = [row, ...history.filter((x) => x.id !== row.id)];
        if (seenGames.has(row.id)) return;
        seenGames.add(row.id);
        if (state === 'idle') {
          const ordered = row.order_ids.map((id) => participants.find((p) => p.id === id)).filter(Boolean);
          if (ordered.length) { setState('reveal'); show('result'); result.show(ordered, 'Игра уже прошла, показываю итог'); }
        }
      },
      onStart: (payload) => runGame(payload),
    });
  } catch (e) {
    console.error(e);
    toast('База недоступна: работаем локально, история не сохраняется', 6000);
    if (!room) applyRoom({ id: roomId, participants: [], settings: {} });
  }
  setState('idle');
}
