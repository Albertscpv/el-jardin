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

/* ------------------------------------------------------------------ */
/* Farola                                                              */
/* ------------------------------------------------------------------ */

/**
 * La farola no sale de una matriz extruida como el resto: es un poste fino
 * con una lampara arriba, y una losa extruida tiene el mismo espesor en
 * todo el dibujo, asi que el poste quedaba tan ancho como la lampara. Se
 * arma con cajas, en unidades de mundo, con el pie en el origen.
 *
 * El vidrio no esta aca: va aparte porque brilla de noche.
 */
export const ALTURA_LUZ_FAROLA = 2.25;

const HIERRO = '#3b3a40';
const HIERRO_CLARO = '#4d4c54';

function centrada(ancho: number, alto: number, y: number, color: string, fondo = ancho) {
  return { x: -ancho / 2, y, z: -fondo / 2, ancho, alto, fondo, color };
}

export function cajasFarola() {
  const cajas = [
    // Pie escalonado
    centrada(0.36, 0.1, 0, HIERRO),
    centrada(0.26, 0.1, 0.1, HIERRO_CLARO),
    // Poste y anillo bajo la lampara
    centrada(0.09, 1.78, 0.2, HIERRO_CLARO),
    centrada(0.17, 0.06, 1.98, HIERRO),
    // Piso de la lampara
    centrada(0.34, 0.05, 2.04, HIERRO),
    // Techo en tres escalones y remate
    centrada(0.42, 0.06, 2.41, HIERRO),
    centrada(0.28, 0.06, 2.47, HIERRO_CLARO),
    centrada(0.14, 0.06, 2.53, HIERRO),
    centrada(0.04, 0.07, 2.59, HIERRO),
  ];
  // Los cuatro parantes que enmarcan el vidrio
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cajas.push({ x: sx * 0.15 - 0.02, y: 2.09, z: sz * 0.15 - 0.02, ancho: 0.04, alto: 0.32, fondo: 0.04, color: HIERRO });
    }
  }
  return cajas;
}

/** El vidrio: alto y ancho, centrado en la lampara. */
export const VIDRIO_FAROLA = { ancho: 0.26, alto: 0.32, y: 2.09 };
export const COLOR_VIDRIO_DIA = '#d9cfa6';
export const COLOR_VIDRIO_NOCHE = '#ffe39a';

/** La farola como icono, para la tienda y la barra. El modelo 3D es el de cajas. */
export const FAROLA_ICONO: Matrix = [
  '.......dd.......',
  '......dddd......',
  '....dddddddd....',
  '.....dlllld.....',
  '.....dlllld.....',
  '.....dlllld.....',
  '.....dddddd.....',
  '.......dd.......',
  '.......DD.......',
  '.......DD.......',
  '.......DD.......',
  '.......DD.......',
  '.......DD.......',
  '......dddd......',
  '.....dddddd.....',
  '................',
];

export const PALETA_FAROLA_ICONO: Palette = {
  d: '#3b3a40',
  D: '#5a5962',
  l: '#ffe39a',
};
