import { avatarFor } from './avatar.js';
import { computeOrder } from './order.js';
import { randomSeed } from './rng.js';
import { GAMES, gameById, pickGame } from './games/index.js';
import { themeById } from './themes/index.js';
import { sound } from './sound.js';
import { mountParticipants } from './ui/participants.js';
import { mountResult } from './ui/result.js';
import * as db from './db.js';

const $ = (s) => document.querySelector(s);
const roomId = new URLSearchParams(location.search).get('room');

// ---------- Экран «создай комнату» ----------
if (!roomId) {
  $('#room-form').hidden = false;
  $('#app').hidden = true;
  $('#room-form form').onsubmit = (e) => {
    e.preventDefault();
    const v = $('#room-form input').value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (v) location.search = '?room=' + v;
  };
} else {
  boot().catch((err) => { console.error(err); toast('Не удалось подключиться к базе: ' + (err.message || err)); });
}

function toast(text, ms = 4000) {
  const el = $('#toast');
  el.textContent = text; el.hidden = false;
  clearTimeout(el._t); el._t = setTimeout(() => { el.hidden = true; }, ms);
}

// ---------- Основной экран ----------
async function boot() {
  const theme = themeById('pixel16');
  const canvas = $('#canvas');
  const overlay = $('#overlay');
  const startBtn = $('#start');
  const gameSel = $('#game');
  let room = null;
  let history = [];
  let participants = []; // с аватарами
  let state = 'idle';
  let running = null;
  let channel = null;
  const seenGames = new Set();

  $('#room-name').textContent = roomId;
  GAMES.forEach((g) => { const o = document.createElement('option'); o.value = g.id; o.textContent = g.title; gameSel.append(o); });
  const rnd = document.createElement('option'); rnd.value = 'random'; rnd.textContent = 'Случайная'; gameSel.append(rnd);
  gameSel.value = localStorage.getItem('dp:game') || 'race';
  gameSel.onchange = () => localStorage.setItem('dp:game', gameSel.value);

  // Кэш на случай, если база недоступна.
  const cacheKey = `dp:room:${roomId}`;
  try { room = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch (_) { room = null; }

  const panel = mountParticipants($('#participants'), {
    onChange: async (next) => {
      applyRoom({ ...room, participants: next });
      try { await db.saveParticipants(roomId, next); } catch (e) { toast('Не сохранилось: ' + e.message); }
    },
  });
  const result = mountResult($('#result'), { onClose: () => setState('idle') });

  // Имя первого в последней игре. exceptIds: игры, которые не считаем (например, только что сыгранную).
  function lastFirstName(exceptOrder = null) {
    const g = history.find((x) => !exceptOrder || x.order_ids.join() !== exceptOrder.join());
    if (!g) return '';
    const p = participants.find((x) => x.id === g.order_ids[0]);
    return p ? p.name : '';
  }

  function applyRoom(r) {
    room = r;
    participants = (r.participants || []).map((p) => ({ ...p, avatar: avatarFor(p.name) }));
    try { localStorage.setItem(cacheKey, JSON.stringify({ id: r.id, participants: r.participants, settings: r.settings })); } catch (_) {}
    panel.set(participants, lastFirstName());
    updateStart();
  }

  function present() { return participants.filter((p) => p.present !== false); }

  function updateStart() {
    const n = present().length;
    startBtn.disabled = state !== 'idle' || n < 2;
    $('#count').textContent = `${n} из ${participants.length}`;
  }

  function setState(s) { state = s; updateStart(); document.body.dataset.state = s; }

  // ---------- Размер холста ----------
  const scene = $('#scene');
  const fit = () => { canvas.width = scene.clientWidth; canvas.height = scene.clientHeight; if (state === 'idle') drawIdle(); };
  new ResizeObserver(fit).observe(scene);

  function drawIdle() {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    theme.drawSky(ctx, w, Math.round(h * 0.6), 0);
    theme.drawGround(ctx, Math.round(h * 0.6), w, h, 0);
    theme.drawTorch(ctx, w * 0.2, h * 0.6, 0); theme.drawTorch(ctx, w * 0.8, h * 0.6, 0);
    ctx.font = `14px ${theme.font}`; ctx.fillStyle = theme.colors.text; ctx.textBaseline = 'top';
    const msg = present().length < 2 ? 'Добавь хотя бы двух участников' : 'Нажми «Старт»';
    ctx.fillText(msg, Math.round(w / 2 - ctx.measureText(msg).width / 2), Math.round(h * 0.6 + 24));
  }

  // ---------- Старт ----------
  startBtn.onclick = async () => {
    if (state !== 'idle') return;
    const ps = present();
    if (ps.length < 2) return;
    const seed = randomSeed();
    const game = gameSel.value === 'random' ? pickGame(seed) : gameById(gameSel.value);
    const orderIds = computeOrder({ participants: ps, history, seed });
    setState('starting');
    const local = () => {
      history = [{ id: null, order_ids: orderIds }, ...history];
      runGame({ gameId: null, game: game.id, seed, orderIds, startAt: Date.now() + 3000 });
    };
    if (!channel) { local(); return; }
    try {
      const row = await db.insertGame({ room_id: roomId, game: game.id, seed, order_ids: orderIds });
      seenGames.add(row.id);
      await channel.sendStart({ gameId: row.id, game: game.id, seed, orderIds, startAt: db.serverNow() + 3000 });
    } catch (e) {
      toast('База недоступна, играем локально');
      local();
    }
  };

  // ---------- Игра по событию старта ----------
  async function runGame({ gameId, game: gid, seed, orderIds, startAt }) {
    if (state !== 'idle' && state !== 'starting') return;
    if (gameId) seenGames.add(gameId);
    const game = gameById(gid);
    const ordered = orderIds.map((id) => participants.find((p) => p.id === id)).filter(Boolean);
    if (!game || ordered.length < 1) return;
    const memo = lastFirstName(orderIds);
    setState('countdown');
    await countdown(startAt);
    setState('playing');
    sound.go();
    running = game.play({
      canvas, theme, participants: ordered, order: orderIds, seed,
      onEvent: (ev) => { if (ev === 'pop') sound.pop(); },
      onFreeze: async () => {
        setState('frozen');
        sound.rollStart();
        await countdown(Date.now() + 3000);
        sound.rollStop();
        sound.fanfare();
        setState('reveal');
        result.show(ordered, memo);
      },
    });
  }

  function countdown(untilMs, useServer = true) {
    return new Promise((resolve) => {
      let lastShown = null;
      const tick = () => {
        const now = useServer && state === 'countdown' ? db.serverNow() : Date.now();
        const left = Math.ceil((untilMs - now) / 1000);
        if (left <= 0) { overlay.textContent = ''; overlay.hidden = true; resolve(); return; }
        if (left !== lastShown) { lastShown = left; overlay.textContent = String(left); overlay.hidden = false; sound.tick(); }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }

  // ---------- Настройки в углу ----------
  const soundBtn = $('#sound'), crtBtn = $('#crt-toggle');
  const syncButtons = () => {
    soundBtn.textContent = sound.enabled ? 'Звук: вкл' : 'Звук: выкл';
    const crt = localStorage.getItem('dp:crt') === '1';
    crtBtn.textContent = crt ? 'ТВ: вкл' : 'ТВ: выкл';
    $('#crt').hidden = !crt;
  };
  sound.setEnabled(localStorage.getItem('dp:sound') === '1');
  soundBtn.onclick = () => { sound.setEnabled(!sound.enabled); localStorage.setItem('dp:sound', sound.enabled ? '1' : '0'); syncButtons(); };
  crtBtn.onclick = () => { localStorage.setItem('dp:crt', localStorage.getItem('dp:crt') === '1' ? '0' : '1'); syncButtons(); };
  $('#copy').onclick = async () => { try { await navigator.clipboard.writeText(location.href); toast('Ссылка скопирована'); } catch (_) { toast(location.href, 8000); } };
  $('#toggle-panel').onclick = () => document.body.classList.toggle('panel-hidden');
  syncButtons();

  // ---------- Данные ----------
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
        // Событие старта не дошло: показываем итог без анимации.
        if (state === 'idle') {
          const ordered = row.order_ids.map((id) => participants.find((p) => p.id === id)).filter(Boolean);
          if (ordered.length) { setState('reveal'); result.show(ordered, '', 'Игра уже прошла, показываю итог'); }
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
  fit();
}
