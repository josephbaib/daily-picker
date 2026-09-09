import race from './race.js?v=9a65e5d-1745';
import chairs from './chairs.js?v=9a65e5d-1745';
import horror from './horror.js?v=9a65e5d-1745';
import elevator from './elevator.js?v=9a65e5d-1745';
import kart from './kart.js?v=9a65e5d-1745';
import brawl from './brawl.js?v=9a65e5d-1745';
import rooftops from './rooftops.js?v=9a65e5d-1745';
import training from './training.js?v=9a65e5d-1745';
import { mulberry32 } from '../rng.js?v=9a65e5d-1745';

export const GAMES = [race, chairs, kart, rooftops, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
