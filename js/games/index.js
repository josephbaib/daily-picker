import race from './race.js?v=efefaaa-1351';
import chairs from './chairs.js?v=efefaaa-1351';
import horror from './horror.js?v=efefaaa-1351';
import elevator from './elevator.js?v=efefaaa-1351';
import kart from './kart.js?v=efefaaa-1351';
import brawl from './brawl.js?v=efefaaa-1351';
import rooftops from './rooftops.js?v=efefaaa-1351';
import training from './training.js?v=efefaaa-1351';
import elbrus from './elbrus.js?v=efefaaa-1351';
import { mulberry32 } from '../rng.js?v=efefaaa-1351';

export const GAMES = [race, chairs, kart, rooftops, elbrus, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
