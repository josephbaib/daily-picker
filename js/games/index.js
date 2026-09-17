import race from './race.js?v=edc8964-1702';
import chairs from './chairs.js?v=edc8964-1702';
import horror from './horror.js?v=edc8964-1702';
import elevator from './elevator.js?v=edc8964-1702';
import kart from './kart.js?v=edc8964-1702';
import brawl from './brawl.js?v=edc8964-1702';
import rooftops from './rooftops.js?v=edc8964-1702';
import training from './training.js?v=edc8964-1702';
import elbrus from './elbrus.js?v=edc8964-1702';
import { mulberry32 } from '../rng.js?v=edc8964-1702';

export const GAMES = [race, chairs, kart, rooftops, elbrus, horror, elevator, brawl, training];

export function gameById(id) {
  return GAMES.find((g) => g.id === id) || null;
}

// «Случайная игра»: выбор по сиду, чтобы у всех совпал.
export function pickGame(seed) {
  return GAMES[Math.floor(mulberry32(seed ^ 0x5eed)() * GAMES.length)];
}
