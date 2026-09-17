import race from './race.js?v=bf6c143-0945';
import chairs from './chairs.js?v=bf6c143-0945';
import horror from './horror.js?v=bf6c143-0945';
import elevator from './elevator.js?v=bf6c143-0945';
import kart from './kart.js?v=bf6c143-0945';
import brawl from './brawl.js?v=bf6c143-0945';
import rooftops from './rooftops.js?v=bf6c143-0945';
import training from './training.js?v=bf6c143-0945';
import elbrus from './elbrus.js?v=bf6c143-0945';
import { mulberry32 } from '../rng.js?v=bf6c143-0945';

export const GAMES = [race, chairs, kart, rooftops, elbrus, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
