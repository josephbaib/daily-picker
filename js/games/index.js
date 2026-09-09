import race from './race.js?v=018888a-1722';
import chairs from './chairs.js?v=018888a-1722';
import horror from './horror.js?v=018888a-1722';
import elevator from './elevator.js?v=018888a-1722';
import kart from './kart.js?v=018888a-1722';
import brawl from './brawl.js?v=018888a-1722';
import rooftops from './rooftops.js?v=018888a-1722';
import training from './training.js?v=018888a-1722';
import { mulberry32 } from '../rng.js?v=018888a-1722';

export const GAMES = [race, chairs, kart, rooftops, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
