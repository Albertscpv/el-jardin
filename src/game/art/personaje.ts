/**
 * Personajes: el jugador y el vecino.
 *
 * Se arman por capas sobre una grilla de 16x20: cuerpo, pelo, accesorio y
 * sombrero, en ese orden. Cada capa solo pinta donde no tiene '.', asi que
 * cualquier peinado va con cualquier sombrero sin dibujar combinaciones.
 *
 * El contorno no es negro: sale de oscurecer la piel, y eso es lo que le
 * saca lo "rudo" al dibujo. La cabeza es grande a proposito (chibi), con
 * mejillas, para que a 16 px de ancho todavia se lea una cara amable.
 *
 * Las poses cambian solo lo necesario (ojos, brazos, piernas) sobre la
 * misma base: caminar, parpadear, festejar y trabajar.
 *
 *   o contorno · k/K piel · c mejillas · e ojos · m boca
 *   h/H/j pelo (base, sombra, brillo) · b cinta o moño del pelo
 *   r/R ropa · p/P pantalon · z zapatos
 *   s/S sombrero · t cinta del sombrero · f flor del sombrero
 *   a/A accesorio (flor, lentes, pañuelo) · y centro de la flor
 */

import type { Matrix } from './matrices';
import type { Palette } from './render';
import type { Accesorio, AvatarState, Peinado, Prenda, Sombrero } from '../../state/types';

export const ANCHO_PERSONAJE = 16;
export const ALTO_PERSONAJE = 20;

export type Pose = 'quieto' | 'pasoA' | 'pasoB' | 'parpadeo' | 'festejo' | 'trabajo';

/** Lo que define el aspecto; el vecino tiene uno fijo. */
export type Apariencia = Pick<
  AvatarState,
  'piel' | 'pelo' | 'ropa' | 'pantalon' | 'sombrero' | 'colorSombrero'
> &
  Partial<Pick<AvatarState, 'peinado' | 'prenda' | 'accesorio' | 'colorAccesorio'>>;

/* ------------------------------------------------------------------ */
/* Cabeza y cuerpo                                                     */
/* ------------------------------------------------------------------ */

const CABEZA: Matrix = [
  '................',
  '................',
  '................',
  '.....oooooo.....',
  '....okkkkkko....',
  '...okkkkkkkko...',
  '...okkkkkkkko...',
  '...okkekkekko...',
  '...okkekkekko...',
  '...ockkkkkkco...',
  '...okkkmmkkko...',
  '....okkkkkko....',
  '.....ooKKoo.....',
];

const TORSO: Record<Prenda, Matrix> = {
  remera: [
    '....orrrrrro....',
    '...orrrrrrrro...',
    '...orRrrrrRro...',
    '...okRRRRRRko...',
    '....oppppppo....',
  ],
  jardinero: [
    '....orprrpro....',
    '...orrpppprro...',
    '...orRppppRro...',
    '...okPppppPko...',
    '....oppppppo....',
  ],
  vestido: [
    '....orrrrrro....',
    '...orrrrrrrro...',
    '...orRrrrrRro...',
    '..okrrrrrrrrko..',
    '..oRRRRRRRRRRo..',
  ],
};

const PIERNAS: Record<'quieto' | 'pasoA' | 'pasoB', Matrix> = {
  quieto: ['.....pp..pp.....', '....zzz..zzz....'],
  pasoA: ['.....zz..pp.....', '.........zzz....'],
  pasoB: ['.....pp..zz.....', '....zzz.........'],
};

/* ------------------------------------------------------------------ */
/* Pelo                                                                */
/* ------------------------------------------------------------------ */

/** Lo que tienen en comun los peinados cortos: coronilla y flequillo. */
const CORONILLA: Matrix = [
  '................',
  '................',
  '.....hhhhhh.....',
  '....hhjjhhhh....',
  '...hhjhhhhhhh...',
  '...hhhhhhhhhh...',
  '...hHh.hh.hHh...',
  '...hH......Hh...',
  '...h........h...',
];

const PEINADOS: Record<Peinado, Matrix> = {
  corto: CORONILLA,
  largo: [
    ...CORONILLA.slice(0, 6),
    '..hhHh.hh.hHhh..',
    '..hhH......Hhh..',
    '..hh........hh..',
    '..hh........hh..',
    '..hH........Hh..',
    '..hH........Hh..',
    '..HH........HH..',
    '...H........H...',
  ],
  coletas: [
    ...CORONILLA.slice(0, 6),
    '..bhHh.hh.hHhb..',
    '..hhH......Hhh..',
    '.hhh........hhh.',
    '.hhH........Hhh.',
    '.hH..........Hh.',
    '..H..........H..',
  ],
  rodete: [
    '......hhhh......',
    '.....hjhhhh.....',
    '.....bHHHHb.....',
    ...CORONILLA.slice(3),
  ],
  rulos: [
    '................',
    '.....h.hh.h.....',
    '...hhhhhhhhhh...',
    '..hhjjhhhhhhhh..',
    '..hjhhhhhhhhhh..',
    '..hhhhhhhhhhhh..',
    '..hhHh.hh.hHhh..',
    '..hhH......Hhh..',
    '..hH........Hh..',
    '..HH........HH..',
    '...H........H...',
  ],
};

/* ------------------------------------------------------------------ */
/* Sombreros y accesorios                                              */
/* ------------------------------------------------------------------ */

const SOMBREROS: Record<Exclude<Sombrero, 'ninguno'>, Matrix> = {
  paja: [
    '................',
    '.....ssssss.....',
    '....ssssssss....',
    '....tttttttt....',
    '..SSSSSSSSSSSS..',
  ],
  gorro: [
    '.......tt.......',
    '.....ssssss.....',
    '....ssssssss....',
    '...ssssssssss...',
    '...SSSSSSSSSS...',
  ],
  capelina: [
    '................',
    '.....ssssss.....',
    '....ssssssss....',
    '....ttttttft....',
    '.SSSSSSSSSSSSSS.',
  ],
  gorra: [
    '................',
    '.....ssssss.....',
    '....sssstsss....',
    '....ssssssss....',
    '...SSSSSSSSSSS..',
  ],
};

const ACCESORIOS: Record<Exclude<Accesorio, 'ninguno'>, Matrix> = {
  flor: [
    '................',
    '................',
    '................',
    '............a...',
    '...........aya..',
    '............a...',
  ],
  // Un marco fino a la altura de los ojos, del color del accesorio: se ve en
  // cualquier piel y deja los ojos a la vista.
  lentes: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '....AA.AA.AA....',
  ],
  panuelo: [
    ...Array(12).fill('................'),
    '.....aaaaaa.....',
    '......aAAa......',
    '.......aa.......',
  ],
};

/* ------------------------------------------------------------------ */
/* Armado                                                              */
/* ------------------------------------------------------------------ */

function vacia(): string[][] {
  return Array.from({ length: ALTO_PERSONAJE }, () => Array(ANCHO_PERSONAJE).fill('.'));
}

function pintar(lienzo: string[][], capa: Matrix, desdeFila = 0): void {
  capa.forEach((fila, i) => {
    const y = desdeFila + i;
    if (y >= ALTO_PERSONAJE) return;
    [...fila].forEach((ch, x) => {
      if (ch !== '.' && x < ANCHO_PERSONAJE) lienzo[y][x] = ch;
    });
  });
}

/** El sprite de un personaje en una pose. */
export function spritePersonaje(ap: Apariencia, pose: Pose = 'quieto'): Matrix {
  const prenda = ap.prenda ?? 'remera';
  const lienzo = vacia();

  pintar(lienzo, CABEZA);
  pintar(lienzo, TORSO[prenda], 13);

  const piernas = PIERNAS[pose === 'pasoA' || pose === 'pasoB' ? pose : 'quieto'];
  // Con vestido se ven las piernas, no el pantalon.
  pintar(lienzo, prenda === 'vestido' ? piernas.map((f) => f.replace(/p/g, 'k')) : piernas, 18);

  // Ojos cerrados: queda la linea de abajo.
  if (pose === 'parpadeo' || pose === 'festejo') {
    lienzo[7][6] = 'k';
    lienzo[7][9] = 'k';
  }

  // Donde estan las manos en reposo, y que queda en su lugar si se mueven.
  const [manoI, manoD] = prenda === 'vestido' ? [3, 12] : [4, 11];
  const sinMano = prenda === 'jardinero' ? 'P' : prenda === 'vestido' ? 'r' : 'R';

  if (pose === 'festejo') {
    // Brazos arriba: las manos suben al costado de la cabeza.
    lienzo[16][manoI] = lienzo[16][manoD] = sinMano;
    // Un brazo continuo desde el hombro: manga en diagonal y la mano arriba.
    for (const [x, y] of [[3, 13], [12, 13], [2, 12], [13, 12], [2, 11], [13, 11]]) lienzo[y][x] = 'r';
    for (const [x, y] of [[2, 10], [13, 10]]) lienzo[y][x] = 'k';
  }

  if (pose === 'trabajo') {
    // Manos juntas adelante, como sosteniendo la regadera.
    lienzo[16][manoI] = lienzo[16][manoD] = sinMano;
    lienzo[16][7] = lienzo[16][8] = 'k';
  }

  pintar(lienzo, PEINADOS[ap.peinado ?? 'corto']);
  const accesorio = ap.accesorio ?? 'ninguno';
  if (accesorio !== 'ninguno') pintar(lienzo, ACCESORIOS[accesorio]);
  if (ap.sombrero !== 'ninguno') pintar(lienzo, SOMBREROS[ap.sombrero] ?? SOMBREROS.paja);

  return lienzo.map((f) => f.join(''));
}

/* ------------------------------------------------------------------ */
/* Colores                                                             */
/* ------------------------------------------------------------------ */

export function oscurecer(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function aclarar(hex: string, cuanto: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(v + (255 - v) * cuanto);
  return `#${((c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, '0')}`;
}

/** Mezcla dos colores: t=0 es `a`, t=1 es `b`. */
function mezclar(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const canal = (s: number) => Math.round(((na >> s) & 255) * (1 - t) + ((nb >> s) & 255) * t);
  return `#${((canal(16) << 16) | (canal(8) << 8) | canal(0)).toString(16).padStart(6, '0')}`;
}

/** 0 negro, 1 blanco. */
function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

export function paletaPersonaje(ap: Apariencia): Palette {
  const accesorio = ap.colorAccesorio ?? '#e86a8a';
  // En piel oscura los ojos y las mejillas necesitan mas contraste para leerse.
  const oscura = luminancia(ap.piel) < 0.4;
  return {
    // Contorno calido: la piel oscurecida, nunca negro puro.
    o: oscura ? oscurecer(ap.piel, 0.55) : mezclar(oscurecer(ap.piel, 0.42), '#3a2430', 0.35),
    k: ap.piel,
    K: oscurecer(ap.piel, 0.8),
    c: mezclar(ap.piel, '#f07a7a', oscura ? 0.3 : 0.45),
    e: oscura ? '#120a0e' : '#2e2228',
    m: '#a8484e',
    h: ap.pelo,
    H: oscurecer(ap.pelo, 0.72),
    j: aclarar(ap.pelo, 0.28),
    b: accesorio,
    r: ap.ropa,
    R: oscurecer(ap.ropa, 0.76),
    p: ap.pantalon,
    P: oscurecer(ap.pantalon, 0.76),
    z: oscurecer(ap.pantalon, 0.55),
    s: ap.colorSombrero,
    S: oscurecer(ap.colorSombrero, 0.76),
    t: mezclar(ap.colorSombrero, '#b0484a', 0.6),
    f: '#f28ab0',
    a: accesorio,
    A: oscurecer(accesorio, 0.75),
    y: '#ffd34a',
  };
}

/** El vecino: siempre igual, con gorra roja. */
export const APARIENCIA_RIVAL: Apariencia = {
  piel: '#e8b48c',
  pelo: '#3a2a20',
  ropa: '#5a8ad8',
  pantalon: '#3a4a5a',
  sombrero: 'gorra',
  colorSombrero: '#d84a4a',
  peinado: 'corto',
  prenda: 'remera',
};
