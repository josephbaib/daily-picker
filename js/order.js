import { mulberry32 } from './rng.js?v=018888a-1722';

// Вес на первое место: 1 + сколько игр прошло с тех пор, как участник был первым.
// Кто никогда не был первым, весит на единицу больше самого давнего.
// history: игры комнаты, новые первыми, каждая с полем order_ids.
export function firstWeights(present, history) {
  const since = new Map();
  present.forEach((p) => since.set(p.id, null));
  history.forEach((g, i) => {
    const first = g.order_ids && g.order_ids[0];
    if (since.has(first) && since.get(first) === null) since.set(first, i);
  });
  let maxSince = 0;
  since.forEach((v) => { if (v !== null && v > maxSince) maxSince = v; });
  const weights = new Map();
  since.forEach((v, id) => weights.set(id, 1 + (v === null ? maxSince + 1 : v)));
  return weights;
}

export function computeOrder({ participants, history = [], seed }) {
  const present = participants.filter((p) => p.present !== false);
  if (present.length === 0) return [];
  if (present.length === 1) return [present[0].id];

  const rnd = mulberry32(seed);
  const weights = firstWeights(present, history);

  let candidates = present.map((p) => p.id);
  const lastFirst = history[0] && history[0].order_ids && history[0].order_ids[0];
  if (present.length >= 3 && candidates.includes(lastFirst)) {
    candidates = candidates.filter((id) => id !== lastFirst);
  }

  const total = candidates.reduce((s, id) => s + weights.get(id), 0);
  let r = rnd() * total;
  let first = candidates[candidates.length - 1];
  for (const id of candidates) {
    r -= weights.get(id);
    if (r < 0) { first = id; break; }
  }

  const rest = present.map((p) => p.id).filter((id) => id !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [first, ...rest];
}
