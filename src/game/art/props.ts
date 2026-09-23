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

/** Una casa como icono, para la tienda y la barra. Los modelos 3D son de cajas. */
export const CASA_ICONO: Matrix = [
  '................',
  '.......rr.......',
  '.....rrrrrr.....',
  '...rrrrrrrrrr...',
  '.rrrrrrrrrrrrrr.',
  '..wwwwwwwwwwww..',
  '..wggwwwwwwggw..',
  '..wggwwwwwwggw..',
  '..wwwwwwwwwwww..',
  '..wwwwwddwwwww..',
  '..wggwwddwwggw..',
  '..wggwwddwwggw..',
  '..wwwwwddwwwww..',
  '..zzzzzzzzzzzz..',
  '................',
  '................',
];

export const PALETA_CASA_ICONO: Palette = {
  r: '#7a4a2e',
  w: '#f4efe6',
  g: '#9cc4df',
  d: '#6b4326',
  z: '#d6cbb8',
};

/** Nenufar: una hoja redonda con su hendidura, vista desde arriba. */
export const NENUFAR: Matrix = [
  '................',
  '................',
  '.....aaaaaa.....',
  '...aaaaaaaaaa...',
  '..aaaaaaaaaaaa..',
  '..aaaabaaaaaaa..',
  '.aaaaabaaaaaaaa.',
  '.aaaaabaaaaaaaa.',
  '.aaaaaabaaaaaaa.',
  '..aaaaaaaaaaaa..',
  '..aaaaaaaaaaaa..',
  '...aaaaaaaaaa...',
  '.....aaaaaa.....',
  '................',
  '................',
  '................',
];

export const PALETA_NENUFAR: Palette = { a: '#4f9a46', b: '#356e30' };

/* ------------------------------------------------------------------ */
/* Juegos para chicos                                                  */
/* ------------------------------------------------------------------ */

/**
 * Los juegos se dibujan de costado, como el farol, y se extruyen poco:
 * son estructuras de caños, no bloques. Letras comunes a todos:
 *   c/C caño y su sombra · a asiento o tabla · s cuerda o soga
 *   r detalle de color · n arena
 */

/**
 * Los juegos vienen partidos en dos: lo que se queda quieto y lo que se
 * mueve. El mundo arma una malla por parte y hace girar la segunda, que es
 * lo que los hace parecer en uso en vez de adornos.
 */

/** Columpio: el caballete. */
export const COLUMPIO: Matrix = [
  '................',
  '................',
  '..cccccccccccc..',
  '..c..........c..',
  '..c..........c..',
  '..c..........c..',
  '..c..........c..',
  '..c..........c..',
  '..c..........c..',
  '.Cc..........cC.',
  '.c............c.',
  '.c............c.',
  'Cc............cC',
  'C..............C',
  '................',
  '................',
];

/** Las dos hamacas, que cuelgan de la barra de arriba (fila 2). */
export const COLUMPIO_HAMACAS: Matrix = [
  '................',
  '................',
  '................',
  '....s.s..s.s....',
  '....s.s..s.s....',
  '....s.s..s.s....',
  '....s.s..s.s....',
  '....rrr..rrr....',
  '....rrr..rrr....',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

export const PALETA_COLUMPIO: Palette = {
  c: '#c85a4a',
  C: '#8f3a2e',
  s: '#3f342c',
  r: '#f2b33a',
};

/** Tobogan: escalera de un lado, rampa que baja del otro. */
export const TOBOGAN: Matrix = [
  '................',
  '................',
  '.....ccccc......',
  '.....c...c......',
  '.....caaac......',
  '.....c...c......',
  '.....caaac.r....',
  '.....c...crr....',
  '.....caaarr.....',
  '.....c..rr......',
  '.....caarr......',
  '.....c.rr.......',
  '.....cCrr.......',
  '....CC..rr......',
  '.........rr.....',
  '................',
];

/**
 * Lo que baja por la rampa: una pelota que alguien dejó ir. Se dibuja
 * arriba de todo, donde empieza el recorrido.
 */
export const TOBOGAN_PELOTA: Matrix = [
  '................',
  '................',
  '................',
  '................',
  '..........ppp...',
  '.........ppppp..',
  '.........ppppp..',
  '.........ppppp..',
  '..........ppp...',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

export const PALETA_TOBOGAN: Palette = {
  c: '#4a8ad8',
  C: '#2f5f99',
  a: '#e8e4d8',
  r: '#f2b33a',
  p: '#e0584a',
};

/** Subibaja: el pivote. */
export const SUBIBAJA: Matrix = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '........cc......',
  '.......cccc.....',
  '......cc..cc....',
  '.....cc....cc...',
  '....CC......CC..',
  '................',
  '................',
  '................',
];

/** La tabla, que bascula sobre el pivote (columna 8, fila 8). */
export const SUBIBAJA_TABLA: Matrix = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '..rrrrrrrrrrrr..',
  '..rrrrrrrrrrrr..',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

export const PALETA_SUBIBAJA: Palette = {
  c: '#6aa83a',
  C: '#3f6e22',
  r: '#e0785a',
};

/** Arenero: el cajon con su arena. */
export const ARENERO: Matrix = [
  '................',
  '................',
  '................',
  '................',
  '...cccccccccc...',
  '..cnnnnnnnnnnc..',
  '..cnnnnnnnnnnc..',
  '..cnnnnnnnnnnc..',
  '..cnnnnnnnnnnc..',
  '..cnnnnnnnnnnc..',
  '..cnnnnnnnnnnc..',
  '..CCCCCCCCCCCC..',
  '..C..........C..',
  '................',
  '................',
  '................',
];

/** La palita, clavada en la arena y asomando por arriba del cajón. */
export const ARENERO_PALITA: Matrix = [
  '................',
  '.......mm.......',
  '.......mm.......',
  '.......mm.......',
  '......rrrr......',
  '......rrrr......',
  '.......rr.......',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
];

export const PALETA_ARENERO: Palette = {
  c: '#b8864a',
  C: '#8a6238',
  n: '#f0dca8',
  r: '#e0584a',
  m: '#c9a06a',
};
