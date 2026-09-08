import race from './race.js';
import chairs from './chairs.js';
import horror from './horror.js';
import elevator from './elevator.js';
import kart from './kart.js';
import brawl from './brawl.js';
import { mulberry32 } from '../rng.js';

export const GAMES = [race, chairs, kart, horror, elevator, brawl];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
