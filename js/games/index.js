import race from './race.js?v=ed139c8-1737';
import chairs from './chairs.js?v=ed139c8-1737';
import horror from './horror.js?v=ed139c8-1737';
import elevator from './elevator.js?v=ed139c8-1737';
import kart from './kart.js?v=ed139c8-1737';
import brawl from './brawl.js?v=ed139c8-1737';
import rooftops from './rooftops.js?v=ed139c8-1737';
import training from './training.js?v=ed139c8-1737';
import { mulberry32 } from '../rng.js?v=ed139c8-1737';

export const GAMES = [race, chairs, kart, rooftops, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
