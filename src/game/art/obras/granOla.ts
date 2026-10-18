/**
 * "La gran ola de Kanagawa", de Katsushika Hokusai, c. 1831. Dominio
 * publico.
 *
 * Version propia en pixel art: la ola enorme que se curva desde la
 * izquierda con su cresta de espuma en garras, las barcas abajo, y el
 * monte Fuji chiquito al fondo, entre las olas.
 */

import { enElipse, pintarCuadro, ruido, type Ficha } from './pincel';

export const ANCHO_OLA = 96;
export const ALTO_OLA = 65;

const C = {
  cielo: '#e8dcbc',
  cieloOscuro: '#b8ac94',
  nube: '#8a8478',
  agua: '#1f3a6a',
  aguaMedia: '#2f5a8e',
  aguaClara: '#6a96c0',
  espuma: '#f2ecdc',
  espumaSombra: '#c8c4b4',
  fuji: '#3a5a8a',
  fujiNieve: '#f2ecdc',
  barca: '#d8c49a',
  barcaOscura: '#8a6a44',
  remero: '#2a2a32',
  cartela: '#d8c8a0',
  letra: '#3a3028',
} as const;

export const PALETA_OLA = Object.values(C);

/*
 * La ola se piensa en pixeles, no en (u,v): el cuadro es apaisado y un
 * circulo en (u,v) saldria ovalado.
 *
 * Es un anillo grueso: el borde de afuera es el lomo de la ola, el hueco
 * de adentro es el tubo. Solo existe en la mitad de arriba y a la
 * izquierda, y se apoya en una pared de agua que sube desde abajo.
 */
const CENTRO_OLA = { x: 40, y: 30 };
const RADIO_AFUERA = 25;
const RADIO_ADENTRO = 14;

type ParteOla = 'cuerpo' | 'espuma' | 'gota' | null;

function enLaOla(x: number, y: number): ParteOla {
  const dx = x - CENTRO_OLA.x;
  const dy = y - CENTRO_OLA.y;
  const d = Math.hypot(dx, dy);
  // Angulo en grados: 0 a la derecha, 90 abajo, 180 a la izquierda, 270 arriba.
  const angulo = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;

  // El rulo: el arco que va desde la izquierda (180) por arriba (270) hasta
  // la derecha (casi 360), donde rompe hacia adelante.
  const enArco = angulo >= 150 && angulo <= 352;
  if (enArco && d >= RADIO_ADENTRO && d <= RADIO_AFUERA) {
    // La cresta: el borde de afuera, con garras de espuma.
    const garra = Math.sin((angulo * Math.PI) / 9) > 0.1;
    if (d > RADIO_AFUERA - 4) return garra ? 'espuma' : 'cuerpo';
    // El borde del tubo, tambien con espuma: el agua que se da vuelta.
    if (d < RADIO_ADENTRO + 2 && angulo > 230) return 'espuma';
    return 'cuerpo';
  }

  // Las gotas que caen de la punta del rulo, adelante y abajo.
  if (angulo > 352 || angulo < 40) {
    if (d > RADIO_ADENTRO && d < RADIO_AFUERA + 6 && ruido(x, y, 17) < 0.18) return 'gota';
  }

  // La pared de agua: sube desde abajo a la izquierda hasta el rulo.
  if (x < CENTRO_OLA.x - 2 && y > CENTRO_OLA.y) {
    const borde = CENTRO_OLA.x - RADIO_AFUERA + (y - CENTRO_OLA.y) * 0.15;
    if (x > borde - 4) return x < borde ? 'espuma' : 'cuerpo';
  }
  if (x <= CENTRO_OLA.x - 2 && y > CENTRO_OLA.y + RADIO_ADENTRO - 4) return 'cuerpo';
  return null;
}

function pintar(u: number, v: number, x: number, y: number): string {
  /* --- La cartela con el titulo, arriba a la izquierda --- */
  if (u > 0.03 && u < 0.11 && v > 0.05 && v < 0.28) {
    return (x + y) % 3 === 0 && ruido(x, y, 3) < 0.6 ? C.letra : C.cartela;
  }

  /* --- Las barcas, largas y finas, metidas entre las olas --- */
  if (enElipse(u, v, 0.56, 0.76, 0.12, 0.025, 0.3) || enElipse(u, v, 0.32, 0.88, 0.2, 0.03, -0.12)) {
    // Los remeros: una fila de cabecitas oscuras.
    if (x % 3 === 0 && ruido(x, y, 5) < 0.6) return C.remero;
    return ruido(x, y, 7) < 0.25 ? C.barcaOscura : C.barca;
  }

  /* --- La ola grande --- */
  const ola = enLaOla(x, y);
  if (ola === 'espuma' || ola === 'gota') return ruido(x, y, 9) < 0.15 ? C.espumaSombra : C.espuma;
  if (ola === 'cuerpo') {
    // Las lineas del agua: bandas que siguen la curva del rulo.
    const d = Math.hypot(x - CENTRO_OLA.x, y - CENTRO_OLA.y);
    const banda = Math.sin(d * 1.3);
    if (banda > 0.7) return C.aguaClara;
    return banda > -0.1 ? C.aguaMedia : C.agua;
  }

  /* --- El Fuji, chiquito, entre las olas del fondo --- */
  const alturaFuji = 0.8 - (0.1 - Math.abs(u - 0.84)) * 1.5;
  if (Math.abs(u - 0.84) < 0.1 && v > alturaFuji && v < 0.82) {
    return v < alturaFuji + 0.045 ? C.fujiNieve : C.fuji;
  }

  /* --- El mar de abajo, con olas mas chicas que rompen --- */
  const mar = 0.8 + Math.sin(u * 26) * 0.035;
  if (v > mar) {
    if (Math.sin(u * 26) > 0.55 && v < mar + 0.035) return C.espuma;
    return Math.sin((u + v) * 40) > 0.5 ? C.aguaMedia : C.agua;
  }

  /* --- El cielo: claro, con una banda oscura arriba --- */
  if (v < 0.09) return ruido(x, y, 11) < 0.3 ? C.cieloOscuro : C.nube;
  return ruido(x, y, 13) < 0.06 ? C.cieloOscuro : C.cielo;
}

export function pixelesGranOla(): string[] {
  return pintarCuadro(ANCHO_OLA, ALTO_OLA, pintar);
}

export const FICHA_OLA: Ficha = {
  titulo: 'La gran ola de Kanagawa',
  original: '神奈川沖浪裏',
  autor: 'Katsushika Hokusai',
  anio: 'c. 1831',
  tecnica: 'Xilografía en color (ukiyo-e)',
  medidas: '25,7 × 37,9 cm',
  museo: 'Hay copias en el Met, el Museo Británico y otros',
  texto:
    'No es un cuadro único: es un grabado en madera, y se imprimieron miles. Detrás de la ola, chiquito, está el monte Fuji, que es el verdadero protagonista de la serie.',
};
