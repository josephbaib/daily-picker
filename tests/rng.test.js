import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, hashString, randomSeed } from '../js/rng.js';

test('один сид даёт одну и ту же последовательность', () => {
  const a = mulberry32(12345), b = mulberry32(12345);
  for (let i = 0; i < 20; i++) assert.equal(a(), b());
});

test('разные сиды дают разные последовательности', () => {
  const a = mulberry32(1), b = mulberry32(2);
  assert.notEqual(a(), b());
});

test('значения лежат в [0, 1)', () => {
  const r = mulberry32(99);
  for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

test('hashString стабилен и различает строки', () => {
  assert.equal(hashString('Юсуф'), hashString('Юсуф'));
  assert.notEqual(hashString('Юсуф'), hashString('Айдар'));
  assert.ok(Number.isInteger(hashString('x')) && hashString('x') >= 0);
});

test('randomSeed возвращает 32-битное целое', () => {
  const s = randomSeed();
  assert.ok(Number.isInteger(s) && s >= 0 && s <= 0xffffffff);
});
