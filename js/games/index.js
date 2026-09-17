import race from './race.js?v=83b88d3-1828';
import chairs from './chairs.js?v=83b88d3-1828';
import horror from './horror.js?v=83b88d3-1828';
import elevator from './elevator.js?v=83b88d3-1828';
import kart from './kart.js?v=83b88d3-1828';
import brawl from './brawl.js?v=83b88d3-1828';
import rooftops from './rooftops.js?v=83b88d3-1828';
import training from './training.js?v=83b88d3-1828';
import elbrus from './elbrus.js?v=83b88d3-1828';
import { mulberry32 } from '../rng.js?v=83b88d3-1828';

export const GAMES = [race, chairs, kart, rooftops, elbrus, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
