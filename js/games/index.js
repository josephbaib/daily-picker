import race from './race.js?v=1197198-1746';
import chairs from './chairs.js?v=1197198-1746';
import horror from './horror.js?v=1197198-1746';
import elevator from './elevator.js?v=1197198-1746';
import kart from './kart.js?v=1197198-1746';
import brawl from './brawl.js?v=1197198-1746';
import rooftops from './rooftops.js?v=1197198-1746';
import training from './training.js?v=1197198-1746';
import elbrus from './elbrus.js?v=1197198-1746';
import { mulberry32 } from '../rng.js?v=1197198-1746';

export const GAMES = [race, chairs, kart, rooftops, elbrus, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
