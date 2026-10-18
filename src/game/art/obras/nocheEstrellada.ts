/**
 * "La noche estrellada", de Vincent van Gogh, 1889. Dominio publico.
 *
 * Version propia en pixel art: el cielo en remolinos, once estrellas con
 * su halo, la luna, el cipres como una llama oscura a la izquierda y el
 * pueblo dormido abajo, con su campanario.
 */

import { enElipseCuanto, pintarCuadro, ruido, unoDe, type Ficha } from './pincel';

export const ANCHO_NOCHE = 96;
export const ALTO_NOCHE = 77;

const C = {
  cielo: '#1c2c6e',
  cieloMedio: '#2c4a9a',
  cieloClaro: '#4a72c0',
  remolino: '#7aa2d8',
  remolinoClaro: '#b8d0e4',
  estrella: '#f4e04a',
  halo: '#e8dc8a',
  haloFrio: '#c4d4b0',
  luna: '#f0b83a',
  colina: '#2a3a68',
  colinaOscura: '#1c2648',
  casa: '#3a4a7a',
  ventana: '#f0d050',
  techo: '#24305a',
  cipres: '#1a2418',
  cipresClaro: '#34482a',
  cipresMarron: '#4a3a24',
} as const;

export const PALETA_NOCHE = Object.values(C);

/** Las estrellas: posicion y tamaño del halo. */
const ESTRELLAS: Array<[number, number, number]> = [
  [0.12, 0.12, 0.04],
  [0.3, 0.08, 0.035],
  [0.47, 0.17, 0.03],
  [0.58, 0.07, 0.035],
  [0.7, 0.2, 0.04],
  [0.8, 0.36, 0.035],
  [0.35, 0.3, 0.03],
  [0.62, 0.4, 0.03],
  [0.22, 0.42, 0.035],
  [0.92, 0.5, 0.03],
  [0.5, 0.55, 0.025],
];

/**
 * El gran remolino del centro: dos brazos de espiral que se enroscan. Con
 * anillos concentricos parecia una trama; lo que lo hace remolino es que
 * el anillo avance con el angulo.
 */
function remolino(u: number, v: number): number {
  const remolinos: Array<[number, number, number, number]> = [
    [0.47, 0.33, 0.2, 0.12],
    [0.68, 0.3, 0.09, 0.07],
  ];
  for (const [cx, cy, rx, ry] of remolinos) {
    const d = enElipseCuanto(u, v, cx, cy, rx, ry);
    if (d > 1) continue;
    const angulo = Math.atan2((v - cy) / ry, (u - cx) / rx) / (Math.PI * 2);
    const brazo = (((d * 2.2 - angulo * 2) % 1) + 1) % 1;
    if (brazo < 0.3) return 2;
    if (brazo < 0.55) return 1;
    return 0;
  }
  return 0;
}

function pintar(u: number, v: number, x: number, y: number): string {
  /* --- El cipres, adelante de todo, como una llama oscura --- */
  const anchoCipres = Math.max(0, (v - 0.08) * 0.16) * (1 + Math.sin(v * 30) * 0.15);
  if (v > 0.08 && Math.abs(u - 0.16 - Math.sin(v * 9) * 0.02) < anchoCipres) {
    const n = ruido(x, y, 3);
    return n < 0.2 ? C.cipresClaro : n < 0.3 ? C.cipresMarron : C.cipres;
  }

  /* --- La luna, arriba a la derecha --- */
  const dLuna = enElipseCuanto(u, v, 0.87, 0.13, 0.055, 0.07);
  if (dLuna < 0.75) return C.luna;
  if (dLuna < 1.3) return ruido(x, y, 9) < 0.5 ? C.halo : C.luna;

  /* --- Las estrellas, con su halo de anillos --- */
  for (const [cx, cy, r] of ESTRELLAS) {
    const d = enElipseCuanto(u, v, cx, cy, r, r * 1.25);
    if (d < 0.35) return C.estrella;
    if (d < 0.75) return C.halo;
    if (d < 1) return C.haloFrio;
  }

  /* --- Las montañas del fondo, mas claras, antes del pueblo --- */
  const horizonte = 0.66 + Math.sin(u * 5 + 1) * 0.04;
  const montanas = horizonte - 0.07 + Math.sin(u * 3.2) * 0.035;
  if (v > montanas && v <= horizonte) {
    return ruido(Math.floor(x / 3), y, 27) < 0.7 ? C.cieloClaro : C.cieloMedio;
  }

  /* --- El pueblo y las colinas, abajo --- */
  if (v > horizonte) {
    // El campanario, finito y alto, en el centro.
    if (Math.abs(u - 0.55) < 0.008 && v > horizonte - 0.12) return C.techo;
    // Las casas: rectangulitos con ventanas encendidas.
    const filaCasa = Math.floor((v - horizonte) * 40);
    const colCasa = Math.floor(u * 22);
    const hayCasa = v > 0.76 && u > 0.3 && ruido(colCasa, filaCasa, 21) < 0.5;
    if (hayCasa) {
      if (ruido(x, y, 23) < 0.05) return C.ventana;
      return (y % 3 === 0) ? C.techo : C.casa;
    }
    return ruido(x, y, 25) < 0.6 ? C.colina : C.colinaOscura;
  }

  /* --- El cielo en remolinos --- */
  const fuerza = remolino(u, v);
  if (fuerza === 2) return C.remolinoClaro;
  if (fuerza === 1) return C.remolino;

  // Pinceladas: trazos cortos y horizontales que siguen la corriente del
  // cielo. El ruido va por bloques de tres pixeles, no pixel a pixel: eso
  // es lo que los hace leer como pinceladas y no como estatica.
  const ola = Math.sin(u * 10 + Math.sin(v * 7) * 1.6 + v * 5);
  const n = ruido(Math.floor(x / 3), y, 7);
  if (ola > 0.62 && n < 0.75) return C.cieloClaro;
  if (ola > 0) return n < 0.65 ? C.cieloMedio : C.cielo;
  return n < 0.12 ? C.cieloMedio : unoDe([C.cielo, C.cielo, C.cielo, C.colinaOscura], n);
}

export function pixelesNocheEstrellada(): string[] {
  return pintarCuadro(ANCHO_NOCHE, ALTO_NOCHE, pintar);
}

export const FICHA_NOCHE: Ficha = {
  titulo: 'La noche estrellada',
  original: 'De sterrennacht',
  autor: 'Vincent van Gogh',
  anio: '1889',
  tecnica: 'Óleo sobre lienzo',
  medidas: '73,7 × 92,1 cm',
  museo: 'Museo de Arte Moderno (MoMA), Nueva York',
  texto:
    'Van Gogh la pintó desde la ventana del hospital de Saint-Rémy, de memoria, antes del amanecer. El cielo se mueve como un río; abajo, el pueblo duerme sin enterarse.',
};
