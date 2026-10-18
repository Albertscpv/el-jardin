/**
 * "El puente japonés y el estanque de nenúfares", de Claude Monet, 1899.
 * Dominio publico.
 *
 * Version propia en pixel art: el puente verde que cruza en arco sobre el
 * estanque, el follaje espeso detras y los nenúfares flotando en bandas,
 * mas grandes cuanto mas cerca. En un jardin con estanque, es el cuadro
 * que mejor le queda.
 */

import { pintarCuadro, ruido, unoDe, type Ficha } from './pincel';

export const ANCHO_NENUFARES = 96;
export const ALTO_NENUFARES = 76;

const C = {
  hoja: '#3a6a3a',
  hojaClara: '#5a8a4a',
  hojaLuz: '#8ab060',
  sauce: '#7aa058',
  amarillo: '#c8c060',
  puente: '#6a9a7a',
  puenteClaro: '#8ab89a',
  puenteSombra: '#3a6a5a',
  agua: '#4a7a8a',
  aguaClara: '#6a9aa0',
  reflejo: '#8ab0a8',
  nenufar: '#5a8a3a',
  nenufarClaro: '#7aa848',
  florRosa: '#e8a0b0',
  florBlanca: '#f2ece0',
} as const;

export const PALETA_NENUFARES = Object.values(C);

/** El arco del puente: altura de su borde de arriba para cada u. */
function arco(u: number): number {
  return 0.32 + Math.pow((u - 0.5) * 2, 2) * 0.14;
}

/*
 * Los nenúfares van en filas horizontales, como se ven en perspectiva:
 * arriba chiquitos y apretados, abajo grandes y separados. Se piensan en
 * pixeles para que las hojas salgan bien redondas.
 */
const FILAS_NENUFARES = [
  { y: 40, rx: 3, ry: 1 },
  { y: 45, rx: 4, ry: 1.4 },
  { y: 51, rx: 5, ry: 1.8 },
  { y: 58, rx: 6.5, ry: 2.3 },
  { y: 66, rx: 8, ry: 2.8 },
  { y: 74, rx: 9.5, ry: 3.2 },
];

type Hoja = 'hoja' | 'borde' | 'flor' | null;

function enNenufar(x: number, y: number): Hoja {
  for (let f = 0; f < FILAS_NENUFARES.length; f++) {
    const fila = FILAS_NENUFARES[f];
    if (Math.abs(y - fila.y) > fila.ry + 0.5) continue;
    const paso = fila.rx * 2.6;
    const corrimiento = ruido(f, 0, 21) * paso;
    const k = Math.round((x - corrimiento) / paso);
    for (const n of [k - 1, k, k + 1]) {
      if (ruido(n, f, 3) > 0.7) continue; // algunos huecos de agua
      const cx = n * paso + corrimiento + (ruido(n, f, 23) - 0.5) * fila.rx;
      const dx = (x - cx) / fila.rx;
      const dy = (y - fila.y) / fila.ry;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      // La muesca: una cuña de agua que le falta a cada hoja.
      if (dx > 0.2 && Math.abs(dy) < dx * 0.35) return null;
      if (ruido(n, f, 5) < 0.25 && d < 0.18) return 'flor';
      return dy < -0.3 ? 'borde' : 'hoja';
    }
  }
  return null;
}

function pintar(u: number, v: number, x: number, y: number): string {
  /* --- El puente japonés --- */
  const tope = arco(u);
  if (v > tope && v < tope + 0.08) {
    // La baranda: dos tablas con postes, y el tablero grueso abajo.
    if (x % 6 === 0 && v < tope + 0.05) return C.puenteSombra;
    if (v < tope + 0.015) return C.puenteClaro;
    if (Math.abs(v - (tope + 0.03)) < 0.008) return C.puente;
    if (v > tope + 0.05) return v > tope + 0.07 ? C.puenteSombra : C.puente;
  }
  // Los postes que bajan al agua.
  for (const pu of [0.07, 0.3, 0.7, 0.93]) {
    if (Math.abs(u - pu) < 0.012 && v > tope && v < 0.52) return C.puenteSombra;
  }

  /* --- El agua con los nenúfares, abajo --- */
  if (v > 0.48) {
    const hoja = enNenufar(x, y);
    if (hoja === 'flor') return ruido(x >> 2, y >> 2, 7) < 0.5 ? C.florRosa : C.florBlanca;
    if (hoja === 'borde') return C.nenufarClaro;
    if (hoja === 'hoja') return ruido(x, y, 9) < 0.2 ? C.nenufarClaro : C.nenufar;
    // El agua refleja el follaje: trazos verticales.
    const n = ruido(x, Math.floor(y / 3), 11);
    if (n < 0.1) return C.reflejo;
    return n < 0.7 ? C.agua : C.aguaClara;
  }

  /* --- El follaje espeso de atras, con el sauce que cae --- */
  // El sauce: trazos verticales largos a los costados.
  if ((u < 0.2 || u > 0.8) && ruido(x, Math.floor(y / 5), 13) < 0.45) return C.sauce;
  // Manchones de hojas, en pinceladas cortas horizontales.
  const n = ruido(Math.floor(x / 3), Math.floor(y / 2), 15);
  if (n < 0.06) return C.amarillo;
  const luz = 1 - v * 1.6; // mas luz arriba
  return unoDe([C.hoja, C.hoja, C.hojaClara, C.hojaClara, C.hojaLuz], Math.min(0.99, n * 0.7 + luz * 0.3));
}

export function pixelesNenufares(): string[] {
  return pintarCuadro(ANCHO_NENUFARES, ALTO_NENUFARES, pintar);
}

export const FICHA_NENUFARES: Ficha = {
  titulo: 'El puente japonés',
  original: 'Le Bassin aux nymphéas',
  autor: 'Claude Monet',
  anio: '1899',
  tecnica: 'Óleo sobre lienzo',
  medidas: '92,7 × 73,7 cm',
  museo: 'Museo Metropolitano de Arte, Nueva York',
  texto:
    'Monet construyó este estanque en su jardín de Giverny y lo pintó más de doscientas veces. Decía que su jardín era su obra más hermosa: este cuadro tenía que estar acá.',
};
