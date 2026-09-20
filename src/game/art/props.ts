import type { Matrix } from './matrices';
import type { Palette } from './render';

/**
 * Objetos solidos del jardin, dibujados de frente y extruidos a voxels.
 *
 * Al ser simetricos de frente, la losa extruida se lee bien desde cualquier
 * angulo de la camara.
 */

export const FAROL: Matrix = [
  '................',
  '.......dd.......',
  '......d..d......',
  '......d..d......',
  '....dddddddd....',
  '...dddddddddd...',
  '...d........d...',
  '...d.gggggg.d...',
  '...d.gllllg.d...',
  '...d.gllllg.d...',
  '...d.gllllg.d...',
  '...d.gggggg.d...',
  '...d........d...',
  '...dddddddddd...',
  '....dddddddd....',
  '......dddd......',
];

export const PALETA_FAROL: Palette = {
  d: '#4a4038',
  g: '#6b5a48',
  l: '#ffe9a8',
};

export const MACETA: Matrix = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '...dddddddddd...',
  '...dddddddddd...',
  '....cccccccc....',
  '....cccccccc....',
  '....cccccccc....',
  '.....cccccc.....',
  '.....cccccc.....',
  '......cccc......',
  '................',
  '................',
];

export const PALETA_MACETA: Palette = {
  d: '#b8663f',
  c: '#9c5433',
};

export const REGADERA: Matrix = [
  '................',
  '................',
  '................',
  '.....aa.........',
  '....a..a...ddd..',
  '...aaaaaa.dd....',
  '...aaaaaadd.....',
  '...aaaaaaa......',
  '..caaaaaaa......',
  '..caaaaaaa......',
  '..caaaaaaa......',
  '...aaaaaaa......',
  '....aaaaa.......',
  '................',
  '................',
  '................',
];

export const PALETA_REGADERA: Palette = {
  a: '#6f96d8',
  c: '#4a6ea8',
  d: '#8fb4e8',
};
