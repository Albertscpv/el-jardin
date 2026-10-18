/**
 * "La joven de la perla", de Johannes Vermeer, c. 1665. Dominio publico.
 *
 * Version propia en pixel art: la muchacha que se da vuelta sobre el
 * hombro, con el turbante azul y el paño amarillo que le cae por detras,
 * los labios entreabiertos, la perla que brilla y el fondo casi negro.
 */

import { enElipse, enElipseCuanto, pintarCuadro, ruido, type Ficha } from './pincel';

export const ANCHO_PERLA = 80;
export const ALTO_PERLA = 91;

const C = {
  fondo: '#14160f',
  fondoMatiz: '#1e2218',
  piel: '#e6c49a',
  pielLuz: '#f2d8b2',
  pielSombra: '#a87e56',
  turbante: '#3a5aa8',
  turbanteLuz: '#6a8ad0',
  turbanteSombra: '#24387a',
  pano: '#d8b04a',
  panoSombra: '#a07a2a',
  ojo: '#2a1e14',
  brilloOjo: '#f4ecdc',
  labios: '#c0584a',
  perla: '#eef0ee',
  perlaSombra: '#8a9494',
  chaqueta: '#b08a44',
  chaquetaSombra: '#7a5a2a',
  cuello: '#ece6d6',
} as const;

export const PALETA_PERLA = Object.values(C);

function pintar(u: number, v: number, x: number, y: number): string {
  /* --- La perla: lo mas claro del cuadro, abajo de la oreja --- */
  const dPerla = enElipseCuanto(u, v, 0.53, 0.56, 0.03, 0.033);
  if (dPerla < 1) return u < 0.525 && v < 0.555 ? C.perla : C.perlaSombra;

  /* --- El paño amarillo que cae del turbante, por detras --- */
  // Sale ancho de atras del turbante y se angosta al caer.
  const anchoPano = 0.17 - (v - 0.1) * 0.12;
  if (u > 0.55 && u < 0.55 + anchoPano && v > 0.1 && v < 0.62) {
    const pliegue = Math.sin((u * 60) + v * 8);
    if (pliegue > 0.6) return C.panoSombra;
    return u > 0.5 + anchoPano ? C.panoSombra : C.pano;
  }

  /* --- El turbante azul, arriba de la cabeza --- */
  if (enElipse(u, v, 0.45, 0.26, 0.22, 0.15, -0.15)) {
    // Los pliegues: bandas diagonales.
    const pliegue = Math.sin((u - v) * 40);
    if (pliegue > 0.5) return C.turbanteLuz;
    return pliegue < -0.4 ? C.turbanteSombra : C.turbante;
  }

  /* --- La cara, de tres cuartos, mirando por encima del hombro --- */
  const dCara = enElipseCuanto(u, v, 0.4, 0.45, 0.17, 0.2);
  if (dCara < 1) {
    // Los ojos grandes, con su brillo.
    for (const ox of [0.32, 0.47]) {
      if (enElipse(u, v, ox, 0.42, 0.035, 0.022)) {
        return enElipse(u, v, ox - 0.008, 0.415, 0.009, 0.007) ? C.brilloOjo : C.ojo;
      }
    }
    // Los labios entreabiertos.
    if (enElipse(u, v, 0.4, 0.56, 0.045, 0.016)) {
      return Math.abs(v - 0.56) < 0.004 ? C.pielSombra : C.labios;
    }
    // La luz entra por la izquierda: el lado derecho de la cara queda en sombra.
    if (u > 0.5 || dCara > 0.88) return C.pielSombra;
    return u < 0.32 ? C.pielLuz : C.piel;
  }

  /* --- El cuello y el hombro, con el cuello blanco de la camisa --- */
  if (v > 0.6 && Math.abs(u - 0.42) < 0.1 && v < 0.72) return C.pielSombra;
  if (v > 0.7 && v < 0.75 && Math.abs(u - 0.42) < 0.2) return C.cuello;

  /* --- La chaqueta amarilla, de espaldas --- */
  if (v > 0.72 && u > 0.08) {
    // Pliegues anchos y suaves, con la espalda en sombra.
    const pliegue = Math.sin(u * 22 + v * 6);
    return pliegue > 0.55 || u > 0.68 ? C.chaquetaSombra : C.chaqueta;
  }

  /* --- El fondo, casi negro, con un matiz verdoso --- */
  return ruido(x, y, 5) < 0.15 ? C.fondoMatiz : C.fondo;
}

export function pixelesJovenPerla(): string[] {
  return pintarCuadro(ANCHO_PERLA, ALTO_PERLA, pintar);
}

export const FICHA_PERLA: Ficha = {
  titulo: 'La joven de la perla',
  original: 'Meisje met de parel',
  autor: 'Johannes Vermeer',
  anio: 'c. 1665',
  tecnica: 'Óleo sobre lienzo',
  medidas: '44,5 × 39 cm',
  museo: 'Mauritshuis, La Haya',
  texto:
    'No es un retrato de alguien en particular: es un "tronie", el estudio de una cara y un gesto. Nadie sabe quién fue la muchacha. La perla son apenas dos pinceladas de luz.',
};
