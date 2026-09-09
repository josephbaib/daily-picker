import race from './race.js?v=3e26475-1555';
import chairs from './chairs.js?v=3e26475-1555';
import horror from './horror.js?v=3e26475-1555';
import elevator from './elevator.js?v=3e26475-1555';
import kart from './kart.js?v=3e26475-1555';
import brawl from './brawl.js?v=3e26475-1555';
import rooftops from './rooftops.js?v=3e26475-1555';
import training from './training.js?v=3e26475-1555';
import { mulberry32 } from '../rng.js?v=3e26475-1555';

export const GAMES = [race, chairs, kart, rooftops, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
