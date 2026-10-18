/**
 * "El grito", de Edvard Munch, 1893. Dominio publico.
 *
 * Version propia en pixel art: el cielo en llamas en bandas onduladas, el
 * fiordo azul, la baranda del puente que cruza en diagonal, las dos
 * figuras que se alejan y, adelante, la figura con las manos en la cara.
 */

import { enElipse, enElipseCuanto, pintarCuadro, ruido, type Ficha } from './pincel';

export const ANCHO_GRITO = 74;
export const ALTO_GRITO = 92;

const C = {
  cieloNaranja: '#e8783a',
  cieloRojo: '#c8403a',
  cieloAmarillo: '#e8b85a',
  fiordo: '#2a4a7a',
  fiordoClaro: '#4a6a9a',
  colina: '#3a5a4a',
  colinaOscura: '#24382e',
  puente: '#9a6a3a',
  puenteOscuro: '#6a4426',
  baranda: '#3a2a20',
  figura: '#20243a',
  figuraClara: '#3a3a5a',
  cara: '#d8c8a0',
  caraSombra: '#a89870',
  hueco: '#2a2420',
  lejanas: '#1a1a22',
} as const;

export const PALETA_GRITO = Object.values(C);

/** La baranda: cruza de arriba a la izquierda hacia abajo a la derecha. */
function baranda(u: number): number {
  return 0.42 + u * 0.62;
}

function pintar(u: number, v: number, x: number, y: number): string {
  /* --- La figura de adelante: la cabeza pelada y las manos en la cara --- */
  const dCabeza = enElipseCuanto(u, v, 0.42, 0.6, 0.095, 0.1);
  if (dCabeza < 1) {
    // Los ojos y la boca: huecos oscuros, la boca abierta en una O.
    if (enElipse(u, v, 0.385, 0.575, 0.02, 0.016)) return C.hueco;
    if (enElipse(u, v, 0.455, 0.575, 0.02, 0.016)) return C.hueco;
    if (enElipse(u, v, 0.42, 0.64, 0.017, 0.028)) return C.hueco;
    return dCabeza > 0.75 || u > 0.47 ? C.caraSombra : C.cara;
  }
  // Las manos, a los costados de la cabeza.
  if (enElipse(u, v, 0.315, 0.62, 0.028, 0.055) || enElipse(u, v, 0.525, 0.62, 0.028, 0.055)) {
    return C.caraSombra;
  }
  // El cuerpo, oscuro y ondulante, que baja hasta el borde.
  const ondulaCuerpo = 0.42 + Math.sin(v * 18) * 0.025;
  if (v > 0.68 && Math.abs(u - ondulaCuerpo) < 0.08 + (v - 0.68) * 0.3) {
    return ruido(x, y, 3) < 0.25 ? C.figuraClara : C.figura;
  }

  /* --- El puente: la baranda y, abajo a la izquierda, las tablas --- */
  const b = baranda(u);
  if (Math.abs(v - b) < 0.012 || Math.abs(v - (b + 0.05)) < 0.008) return C.baranda;
  // Los barrotes cortos entre las dos lineas.
  if (v > b && v < b + 0.05 && x % 6 === 0) return C.baranda;
  if (v > b) {
    // Las dos figuras que se alejan, chiquitas, al fondo del puente.
    if (enElipse(u, v, 0.07, 0.5, 0.018, 0.05) || enElipse(u, v, 0.12, 0.52, 0.018, 0.05)) {
      return C.lejanas;
    }
    // Las tablas, en lineas que siguen la diagonal.
    return Math.sin((v - u * 0.62) * 70) > 0.3 || ruido(x, y, 5) < 0.15 ? C.puenteOscuro : C.puente;
  }

  /* --- El cielo en llamas: bandas onduladas --- */
  const horizonte = 0.36 + Math.sin(u * 6) * 0.03;
  if (v < horizonte) {
    const banda = Math.sin(v * 38 + Math.sin(u * 8) * 1.4);
    if (banda > 0.45) return C.cieloAmarillo;
    if (banda > -0.3) return C.cieloNaranja;
    return C.cieloRojo;
  }

  /* --- Las colinas a la izquierda y el fiordo a la derecha, tras la baranda --- */
  const colina = horizonte + 0.04 + (0.6 - u) * 0.35 + Math.sin(u * 9) * 0.02;
  if (u < 0.6 && v < Math.max(colina, horizonte + 0.02) + 0.12) {
    return ruido(x, y, 7) < 0.4 ? C.colinaOscura : C.colina;
  }
  // El agua, con remolinos azules.
  const remolino = Math.sin(u * 20 + Math.sin(v * 14) * 2);
  return remolino > 0.3 ? C.fiordoClaro : C.fiordo;
}

export function pixelesGrito(): string[] {
  return pintarCuadro(ANCHO_GRITO, ALTO_GRITO, pintar);
}

export const FICHA_GRITO: Ficha = {
  titulo: 'El grito',
  original: 'Skrik',
  autor: 'Edvard Munch',
  anio: '1893',
  tecnica: 'Óleo, temple y pastel sobre cartón',
  medidas: '91 × 73,5 cm',
  museo: 'Museo Nacional de Noruega, Oslo',
  texto:
    'Munch contó que caminaba al atardecer y sintió "un grito infinito que atravesaba la naturaleza". La figura no grita: se tapa los oídos para no escucharlo.',
};
