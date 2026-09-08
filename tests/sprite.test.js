import test from 'node:test';
import assert from 'node:assert/strict';
import { personFor } from '../js/sprite.js';
import { layersOf, frameRect } from '../js/lpc.js';
import { ROSTER } from '../js/roster.js';
import fs from 'node:fs';

test('одно имя даёт одного персонажа', () => {
  assert.deepEqual(personFor('Юсуф'), personFor('юсуф '));
  assert.deepEqual(personFor('Кто-то'), personFor('кто-то'));
});

test('разные имена дают разных персонажей', () => {
  const names = ['Аня', 'Боря', 'Вера', 'Гоша', 'Даша', 'Егор', 'Жанна', 'Зина', 'Ира', 'Костя'];
  assert.ok(new Set(names.map((n) => JSON.stringify(personFor(n)))).size >= 9);
});

test('все слои состава и случайных персонажей лежат в assets/lpc', () => {
  const people = [...Object.values(ROSTER), ...['Аня', 'Боря', 'Вера', 'Гоша', 'Даша', 'Егор', 'Жанна', 'Зина'].map(personFor)];
  for (const p of people) for (const path of layersOf(p)) assert.ok(fs.existsSync('assets/lpc/' + path), 'нет файла ' + path);
});

test('кадры попадают в стандартный лист 13×21', () => {
  for (const f of ['idle', 'run0', 'run7', 'left3', 'cheer', 'hurt5', 'back']) {
    const r = frameRect(f);
    assert.ok(r.sx >= 0 && r.sx < 13 * 64 && r.sy >= 0 && r.sy < 21 * 64, f);
  }
});
