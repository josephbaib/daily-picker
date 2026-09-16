import race from './race.js?v=e4da4ae-1049';
import chairs from './chairs.js?v=e4da4ae-1049';
import horror from './horror.js?v=e4da4ae-1049';
import elevator from './elevator.js?v=e4da4ae-1049';
import kart from './kart.js?v=e4da4ae-1049';
import brawl from './brawl.js?v=e4da4ae-1049';
import rooftops from './rooftops.js?v=e4da4ae-1049';
import training from './training.js?v=e4da4ae-1049';
import elbrus from './elbrus.js?v=e4da4ae-1049';
import { mulberry32 } from '../rng.js?v=e4da4ae-1049';

export const GAMES = [race, chairs, kart, rooftops, elbrus, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
