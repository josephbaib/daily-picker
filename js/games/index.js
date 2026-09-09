import race from './race.js?v=6eebc1b-1545';
import chairs from './chairs.js?v=6eebc1b-1545';
import horror from './horror.js?v=6eebc1b-1545';
import elevator from './elevator.js?v=6eebc1b-1545';
import kart from './kart.js?v=6eebc1b-1545';
import brawl from './brawl.js?v=6eebc1b-1545';
import { mulberry32 } from '../rng.js?v=6eebc1b-1545';

export const GAMES = [race, chairs, kart, horror, elevator, brawl];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
