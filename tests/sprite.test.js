import test from 'node:test';
import assert from 'node:assert/strict';
import { personFor, composeGrid, SPRITE_W, SPRITE_H, FRAMES } from '../js/sprite.js';

test('одно имя даёт одного персонажа', () => {
  assert.deepEqual(personFor('Юсуф'), personFor('юсуф '));
});

test('разные имена дают разных персонажей', () => {
  const names = ['Юсуф', 'Айдар', 'Лена', 'Макс', 'Оля', 'Дима', 'Саша', 'Катя', 'Игорь', 'Анна'];
  assert.ok(new Set(names.map((n) => JSON.stringify(personFor(n)))).size >= 9);
});

test('все кадры собираются в сетку 24×32 без неизвестных символов', () => {
  const p = personFor('Тест');
  for (const f of FRAMES) {
    const g = composeGrid({ ...p, hair: 'long', beard: 'beard', glasses: 'round', hat: 'cap', top: 'hoodie' }, f);
    assert.equal(g.length, SPRITE_H);
    g.forEach((r) => { assert.equal(r.length, SPRITE_W); r.forEach((ch) => assert.ok('.#sS$emtT+apPbBhHfgcC'.includes(ch), ch)); });
  }
});
