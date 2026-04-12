// game/entities/characters/index.js
import { Rico }   from './Rico.js';
import { Razz }   from './Razz.js';
import { Munchy } from './Munchy.js';
import { Dex }    from './Dex.js';
import { Boomer } from './Boomer.js';
import { Slicer } from './Slicer.js';

export const CHARACTER_CLASSES = {
  rico: Rico, razz: Razz, munchy: Munchy, dex: Dex,
  boomer: Boomer, slicer: Slicer,
};

export function createFighter(id, scene, x, y, config, playerIndex, voiceSystem) {
  const Cls = CHARACTER_CLASSES[id];
  if (!Cls) throw new Error(`Unknown character: ${id}`);
  return new Cls(scene, x, y, config, playerIndex, voiceSystem);
}
