import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarFor, SPRITE_W, SPRITE_H, spritePixels } from '../js/avatar.js';

test('одно имя даёт одного героя', () => {
  assert.deepEqual(avatarFor('Юсуф'), avatarFor('Юсуф'));
});

test('разные имена дают разных героев в большинстве случаев', () => {
  const names = ['Юсуф', 'Айдар', 'Лена', 'Макс', 'Оля', 'Дима', 'Саша', 'Катя', 'Игорь', 'Анна'];
  const keys = new Set(names.map((n) => JSON.stringify(avatarFor(n))));
  assert.ok(keys.size >= 8);
});

test('спрайт имеет нужный размер и содержит все части', () => {
  const px = spritePixels(avatarFor('Лена'), 0);
  assert.equal(px.length, SPRITE_H);
  px.forEach((row) => assert.equal(row.length, SPRITE_W));
  const chars = new Set(px.flat());
  for (const c of ['H', 'S', 'T', 'P', 'E']) assert.ok(chars.has(c), 'нет ' + c);
});
