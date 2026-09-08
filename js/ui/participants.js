import { drawAvatar } from '../avatar.js';

function shortId() { return Math.random().toString(36).slice(2, 8); }

// Панель участников. Рисует список, отдаёт наружу новый список через onChange.
export function mountParticipants(root, { onChange }) {
  let list = [];
  let lastFirst = '';

  function render() {
    root.innerHTML = '';
    const ul = document.createElement('ul');
    ul.className = 'plist';
    list.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'prow' + (p.present === false ? ' away' : '');
      const cv = document.createElement('canvas');
      cv.width = 36; cv.height = 48; cv.className = 'pav';
      drawAvatar(cv.getContext('2d'), 0, 0, p.avatar, 3, 0);
      const name = document.createElement('button');
      name.className = 'pname'; name.textContent = p.name; name.title = 'Переименовать';
      name.onclick = () => edit(p, name);
      const here = document.createElement('label');
      here.className = 'phere';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.checked = p.present !== false;
      cb.onchange = () => update(list.map((q) => (q.id === p.id ? { ...q, present: cb.checked } : q)));
      here.append(cb, document.createTextNode(' тут'));
      const del = document.createElement('button');
      del.className = 'pdel'; del.textContent = '✕'; del.title = 'Удалить';
      del.onclick = () => { if (confirm(`Удалить ${p.name}?`)) update(list.filter((q) => q.id !== p.id)); };
      li.append(cv, name, here, del);
      ul.append(li);
    });
    root.append(ul);

    const form = document.createElement('form');
    form.className = 'padd';
    const input = document.createElement('input');
    input.placeholder = 'Имя'; input.maxLength = 20; input.required = true;
    const btn = document.createElement('button');
    btn.type = 'submit'; btn.textContent = 'Добавить';
    form.append(input, btn);
    form.onsubmit = (e) => {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) return;
      update([...list, { id: shortId(), name, present: true }]);
    };
    root.append(form);

    const memo = document.createElement('div');
    memo.className = 'pmemo';
    memo.textContent = lastFirst ? `Вчера первым был(а) ${lastFirst}` : 'Игр ещё не было';
    root.append(memo);
  }

  function edit(p, el) {
    const input = document.createElement('input');
    input.value = p.name; input.maxLength = 20; input.className = 'pedit';
    el.replaceWith(input); input.focus(); input.select();
    const done = () => {
      const name = input.value.trim() || p.name;
      update(list.map((q) => (q.id === p.id ? { ...q, name } : q)));
    };
    input.onblur = done;
    input.onkeydown = (e) => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = p.name; input.blur(); } };
  }

  function update(next) {
    onChange(next.map(({ id, name, present }) => ({ id, name, present })));
  }

  return {
    set(participants, lastFirstName) { list = participants; lastFirst = lastFirstName || ''; render(); },
  };
}
