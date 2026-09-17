import race from './race.js?v=b144995-1824';
import chairs from './chairs.js?v=b144995-1824';
import horror from './horror.js?v=b144995-1824';
import elevator from './elevator.js?v=b144995-1824';
import kart from './kart.js?v=b144995-1824';
import brawl from './brawl.js?v=b144995-1824';
import rooftops from './rooftops.js?v=b144995-1824';
import training from './training.js?v=b144995-1824';
import elbrus from './elbrus.js?v=b144995-1824';
import { mulberry32 } from '../rng.js?v=b144995-1824';

export const GAMES = [race, chairs, kart, rooftops, elbrus, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
