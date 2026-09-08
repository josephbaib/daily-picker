import race from './race.js?v=ca3d9c3-2332';
import chairs from './chairs.js?v=ca3d9c3-2332';
import horror from './horror.js?v=ca3d9c3-2332';
import elevator from './elevator.js?v=ca3d9c3-2332';
import kart from './kart.js?v=ca3d9c3-2332';
import brawl from './brawl.js?v=ca3d9c3-2332';
import { mulberry32 } from '../rng.js?v=ca3d9c3-2332';

export const GAMES = [race, chairs, kart, horror, elevator, brawl];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
