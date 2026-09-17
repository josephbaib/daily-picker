import race from './race.js?v=64a89a0-1027';
import chairs from './chairs.js?v=64a89a0-1027';
import horror from './horror.js?v=64a89a0-1027';
import elevator from './elevator.js?v=64a89a0-1027';
import kart from './kart.js?v=64a89a0-1027';
import brawl from './brawl.js?v=64a89a0-1027';
import rooftops from './rooftops.js?v=64a89a0-1027';
import training from './training.js?v=64a89a0-1027';
import elbrus from './elbrus.js?v=64a89a0-1027';
import { mulberry32 } from '../rng.js?v=64a89a0-1027';

export const GAMES = [race, chairs, kart, rooftops, elbrus, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
