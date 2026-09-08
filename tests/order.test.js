import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOrder, firstWeights } from '../js/order.js';

const P = (n) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, name: 'Имя' + i, present: true }));

test('один сид и список дают один порядок', () => {
  const a = computeOrder({ participants: P(6), history: [], seed: 42 });
  const b = computeOrder({ participants: P(6), history: [], seed: 42 });
  assert.deepEqual(a, b);
});

test('порядок полный, без повторов, только присутствующие', () => {
  const ps = P(6); ps[2].present = false;
  const order = computeOrder({ participants: ps, history: [], seed: 7 });
  assert.equal(order.length, 5);
  assert.equal(new Set(order).size, 5);
  assert.ok(!order.includes('p2'));
});

test('работает на 1 и на 20 участниках', () => {
  assert.deepEqual(computeOrder({ participants: P(1), history: [], seed: 1 }), ['p0']);
  const big = computeOrder({ participants: P(20), history: [], seed: 1 });
  assert.equal(new Set(big).size, 20);
});

test('вчерашний первый не первый сегодня при 3 и больше', () => {
  const history = [{ order_ids: ['p1', 'p0', 'p2'] }];
  for (let seed = 0; seed < 200; seed++) {
    const order = computeOrder({ participants: P(3), history, seed });
    assert.notEqual(order[0], 'p1', 'seed ' + seed);
  }
});

test('при 2 участниках правило про вчерашнего не применяется', () => {
  const history = [{ order_ids: ['p1', 'p0'] }];
  const firsts = new Set();
  for (let seed = 0; seed < 100; seed++) firsts.add(computeOrder({ participants: P(2), history, seed })[0]);
  assert.equal(firsts.size, 2);
});

test('давно не начинавшие весят больше', () => {
  const history = [
    { order_ids: ['p0', 'p1', 'p2', 'p3'] },
    { order_ids: ['p1', 'p0', 'p2', 'p3'] },
    { order_ids: ['p2', 'p0', 'p1', 'p3'] },
  ];
  const w = firstWeights(P(4), history);
  assert.ok(w.get('p3') > w.get('p2'), 'никогда не был первым весит больше всех');
  assert.ok(w.get('p2') > w.get('p1') && w.get('p1') > w.get('p0'));
});

test('порядок на новом сиде меняется', () => {
  const a = computeOrder({ participants: P(8), history: [], seed: 1 });
  const b = computeOrder({ participants: P(8), history: [], seed: 2 });
  assert.notDeepEqual(a, b);
});
