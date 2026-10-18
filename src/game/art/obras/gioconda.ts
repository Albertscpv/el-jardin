/**
 * "La Gioconda" (Mona Lisa), de Leonardo da Vinci, c. 1503–1519. Dominio
 * publico.
 *
 * Version propia en pixel art: la dama de tres cuartos, con el pelo oscuro
 * cayendo a los lados, el vestido oscuro, las manos cruzadas abajo y el
 * paisaje brumoso detras, con sus caminos que serpentean.
 */

import { enElipse, enElipseCuanto, pintarCuadro, ruido, type Ficha } from './pincel';

export const ANCHO_GIOCONDA = 64;
export const ALTO_GIOCONDA = 93;

const C = {
  cielo: '#a8b490',
  bruma: '#8a9a78',
  montana: '#6a7a5a',
  montanaOscura: '#4e5a40',
  camino: '#a88a5a',
  tierra: '#7a5a34',
  piel: '#d8ac72',
  pielLuz: '#e8c48a',
  pielSombra: '#a87e4a',
  pelo: '#2e2214',
  peloLuz: '#4a3620',
  vestido: '#2a2418',
  vestidoLuz: '#4a3a20',
  manga: '#6a5028',
  velo: '#3a3020',
  ojo: '#2a1c10',
  boca: '#9a6a44',
} as const;

export const PALETA_GIOCONDA = Object.values(C);

function pintar(u: number, v: number, x: number, y: number): string {
  /* --- La cara --- */
  const dCara = enElipseCuanto(u, v, 0.5, 0.27, 0.13, 0.12);
  if (dCara < 1) {
    // Los ojos, mirando de costado: la famosa mirada que sigue a todos.
    if (enElipse(u, v, 0.44, 0.255, 0.026, 0.009)) return C.ojo;
    if (enElipse(u, v, 0.56, 0.255, 0.026, 0.009)) return C.ojo;
    // La sonrisa: apenas una linea que sube en las puntas.
    const sonrisa = 0.335 - Math.abs(u - 0.5) * 0.12;
    if (Math.abs(v - sonrisa) < 0.005 && Math.abs(u - 0.5) < 0.05) return C.boca;
    // La nariz: una sombra finita.
    if (Math.abs(u - 0.51) < 0.012 && v > 0.26 && v < 0.31) return C.pielSombra;
    // La luz viene de la izquierda: el lado derecho de la cara, en sombra.
    if (u > 0.57 || dCara > 0.85) return C.pielSombra;
    return u < 0.46 ? C.pielLuz : C.piel;
  }

  /* --- El pelo, que cae a los lados de la cara hasta los hombros --- */
  if (enElipse(u, v, 0.5, 0.29, 0.19, 0.2) && v > 0.12 && v < 0.5) {
    return ruido(x, y, 3) < 0.25 ? C.peloLuz : C.pelo;
  }

  /* --- El cuello y el escote --- */
  if (v > 0.37 && v < 0.52 && Math.abs(u - 0.5) < 0.12 - (v - 0.37) * 0.2) {
    return v > 0.46 ? C.piel : C.pielSombra;
  }

  /* --- Las manos, cruzadas abajo --- */
  if (enElipse(u, v, 0.55, 0.86, 0.13, 0.045, -0.15) || enElipse(u, v, 0.46, 0.89, 0.11, 0.04, 0.1)) {
    return ruido(x, y, 5) < 0.3 ? C.pielSombra : C.piel;
  }

  /* --- El cuerpo: hombros anchos, vestido oscuro y mangas --- */
  const anchoCuerpo = 0.18 + Math.max(0, v - 0.45) * 0.9;
  if (v > 0.42 && Math.abs(u - 0.5) < anchoCuerpo) {
    // Las mangas, de un ocre gastado, a los costados.
    if (Math.abs(u - 0.5) > anchoCuerpo - 0.12 && v > 0.6) {
      return ruido(x, y, 7) < 0.4 ? C.vestidoLuz : C.manga;
    }
    // El escote bordado, una linea mas clara.
    if (Math.abs(v - (0.52 + Math.abs(u - 0.5) * 0.3)) < 0.008) return C.manga;
    return ruido(x, y, 9) < 0.15 ? C.vestidoLuz : C.vestido;
  }

  /* --- El paisaje del fondo: brumoso, con caminos y un rio --- */
  // Arriba, cielo y montañas lejanas que se pierden en la bruma.
  if (v < 0.2) return ruido(x, y, 11) < 0.2 ? C.bruma : C.cielo;
  const crestas = 0.22 + Math.sin(u * 11) * 0.03;
  if (v < crestas) return C.bruma;
  if (v < 0.42) {
    // El camino que serpentea a la izquierda, y el puente a la derecha.
    if (Math.abs(u - (0.12 + Math.sin(v * 22) * 0.05)) < 0.025) return C.camino;
    if (u > 0.8 && Math.abs(v - 0.36) < 0.01) return C.camino;
    return ruido(x, y, 13) < 0.35 ? C.montanaOscura : C.montana;
  }
  return ruido(x, y, 15) < 0.5 ? C.tierra : C.montanaOscura;
}

export function pixelesGioconda(): string[] {
  return pintarCuadro(ANCHO_GIOCONDA, ALTO_GIOCONDA, pintar);
}

export const FICHA_GIOCONDA: Ficha = {
  titulo: 'La Gioconda',
  original: 'Monna Lisa',
  autor: 'Leonardo da Vinci',
  anio: 'c. 1503–1519',
  tecnica: 'Óleo sobre tabla de álamo',
  medidas: '77 × 53 cm',
  museo: 'Museo del Louvre, París',
  texto:
    'Leonardo la tuvo con él durante años y la siguió retocando hasta el final. La sonrisa cambia según dónde la mires: de frente casi no está, de reojo aparece.',
};
