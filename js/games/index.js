import race from './race.js?v=5271d64-1818';
import chairs from './chairs.js?v=5271d64-1818';
import horror from './horror.js?v=5271d64-1818';
import elevator from './elevator.js?v=5271d64-1818';
import kart from './kart.js?v=5271d64-1818';
import brawl from './brawl.js?v=5271d64-1818';
import rooftops from './rooftops.js?v=5271d64-1818';
import training from './training.js?v=5271d64-1818';
import elbrus from './elbrus.js?v=5271d64-1818';
import { mulberry32 } from '../rng.js?v=5271d64-1818';

export const GAMES = [race, chairs, kart, rooftops, elbrus, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
