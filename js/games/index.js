import race from './race.js?v=0a3148a-1452';
import chairs from './chairs.js?v=0a3148a-1452';
import horror from './horror.js?v=0a3148a-1452';
import elevator from './elevator.js?v=0a3148a-1452';
import kart from './kart.js?v=0a3148a-1452';
import brawl from './brawl.js?v=0a3148a-1452';
import { mulberry32 } from '../rng.js?v=0a3148a-1452';

export const GAMES = [race, chairs, kart, horror, elevator, brawl];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
