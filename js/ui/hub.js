import { portraitCanvas, personFor } from '../sprite.js?v=ca3d9c3-2332';

function shortId() { return Math.random().toString(36).slice(2, 8); }

// Плитки команды: клик по плитке переключает «сегодня тут», иконки: переименовать и удалить.
export function mountTeam(root, { onChange }) {
  let list = [];

  function render() {
    root.innerHTML = '';
    list.forEach((p) => {
      const tile = document.createElement('div');
      tile.className = 'tile' + (p.present === false ? ' away' : '');
      tile.title = p.present === false ? 'Отметить, что сегодня тут' : 'Отметить, что сегодня нет';
      const cv = document.createElement('canvas');
      const src = portraitCanvas(p.person, 3);
      cv.width = src.width; cv.height = src.height;
      cv.getContext('2d').drawImage(src, 0, 0);
      const name = document.createElement('div'); name.className = 'tname'; name.textContent = p.name;
      const state = document.createElement('div'); state.className = 'tstate'; state.textContent = p.present === false ? 'нет' : 'тут';
      const btns = document.createElement('div'); btns.className = 'tbtns';
      const ren = document.createElement('button'); ren.textContent = '✎'; ren.title = 'Переименовать';
      const del = document.createElement('button'); del.textContent = '✕'; del.title = 'Удалить';
      ren.onclick = (e) => { e.stopPropagation(); rename(p, name); };
      del.onclick = (e) => { e.stopPropagation(); if (confirm(`Удалить ${p.name}?`)) update(list.filter((q) => q.id !== p.id)); };
      btns.append(ren, del);
      tile.append(btns, cv, name, state);
      tile.onclick = () => update(list.map((q) => (q.id === p.id ? { ...q, present: q.present === false } : q)));
      root.append(tile);
    });
    const add = document.createElement('div');
    add.className = 'tile add'; add.textContent = 'Добавить';
    add.onclick = () => {
      if (add.querySelector('input')) return;
      add.textContent = ''; add.classList.add('editing');
      const input = document.createElement('input'); input.placeholder = 'Имя'; input.maxLength = 20;
      add.append(input); input.focus();
      const done = () => {
        const v = input.value.trim();
        if (v) update([...list, { id: shortId(), name: v, present: true }]); else render();
      };
      input.onkeydown = (e) => { if (e.key === 'Enter') done(); if (e.key === 'Escape') render(); };
      input.onblur = done;
    };
    root.append(add);
  }

  function rename(p, el) {
    const input = document.createElement('input'); input.className = 'rename'; input.value = p.name; input.maxLength = 20;
    el.replaceWith(input); input.focus(); input.select();
    input.onclick = (e) => e.stopPropagation();
    const done = () => update(list.map((q) => (q.id === p.id ? { ...q, name: input.value.trim() || p.name } : q)));
    input.onblur = done;
    input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = p.name; input.blur(); } };
  }

  function update(next) { onChange(next.map(({ id, name, present }) => ({ id, name, present }))); }

  return { set(participants) { list = participants; render(); } };
}

// Плитки игр с живым превью. Возвращает выбранный id.
export function mountGameTiles(root, games, { onSelect }) {
  let selected = games[0].id;
  let people = [];
  const tiles = new Map();

  games.forEach((g) => {
    const tile = document.createElement('div');
    tile.className = 'gtile'; tile.dataset.id = g.id;
    const cover = document.createElement('div'); cover.className = 'cover';
    cover.innerHTML = `<div class="cband"><span class="cplat">B2Bсосы</span><span class="cps">дейлик</span></div>
      <div class="cart"><canvas width="260" height="190"></canvas><div class="cshade"></div><div class="ctitle"></div></div>
      <div class="cfoot"><span class="csber">Сбер</span><span class="cage">6+</span></div>`;
    const cv = cover.querySelector('canvas');
    cover.querySelector('.ctitle').textContent = g.title;
    const body = document.createElement('div'); body.className = 'gbody';
    body.innerHTML = `<div class="gtitle"></div><div class="gdesc"></div><div class="gmeta"></div>`;
    body.querySelector('.gtitle').textContent = g.title;
    body.querySelector('.gdesc').textContent = g.description || '';
    tile.append(cover, body);
    tile.onclick = () => select(g.id);
    tile.ondblclick = () => onSelect(g.id, true);
    root.append(tile);
    tiles.set(g.id, { tile, cv, g });
  });

  function select(id) {
    selected = id;
    tiles.forEach((t, k) => t.tile.classList.toggle('selected', k === id));
    const g = tiles.get(id) && tiles.get(id).g;
    onSelect(id, false, g);
  }

  function paint() {
    tiles.forEach(({ cv, g }) => {
      if (g.preview) g.preview(cv.getContext('2d'), cv.width, cv.height, 4.2, people);
    });
  }
  select(selected);

  return {
    get selected() { return selected; },
    select,
    move(dir) {
      const ids = games.map((g) => g.id);
      select(ids[(ids.indexOf(selected) + dir + ids.length) % ids.length]);
    },
    setPeople(ps) { people = ps.length ? ps : ['Аня', 'Боря', 'Вера', 'Гоша'].map((n) => ({ name: n, person: personFor(n) })); paint(); },
  };
}
