/**
 * Herramientas para pintar las obras.
 *
 * Todas las replicas se pintan igual: una funcion que, para cada pixel,
 * decide el color mirando en que parte del cuadro cae. Estas son las
 * piezas que comparten: ruido estable, formas y mezcla de colores.
 */

/** Hash estable por pixel: el mismo cuadro sale igual cada vez. */
export function ruido(x: number, y: number, semilla = 0): number {
  let h = Math.imul(x * 374761393 + y * 668265263 + semilla * 1442695041, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** Si (u,v) cae dentro de una elipse, opcionalmente girada. */
export function enElipse(
  u: number,
  v: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  giro = 0,
): boolean {
  const du = u - cx;
  const dv = v - cy;
  const c = Math.cos(giro);
  const s = Math.sin(giro);
  const a = (du * c + dv * s) / rx;
  const b = (-du * s + dv * c) / ry;
  return a * a + b * b <= 1;
}

/** Distancia normalizada al centro de una elipse: 0 en el centro, 1 en el borde. */
export function enElipseCuanto(
  u: number,
  v: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): number {
  const a = (u - cx) / rx;
  const b = (v - cy) / ry;
  return Math.sqrt(a * a + b * b);
}

/** Elige uno de una lista con el ruido de ese pixel. */
export function unoDe<T>(lista: readonly T[], n: number): T {
  return lista[Math.min(lista.length - 1, Math.floor(n * lista.length))];
}

/**
 * Recorre el cuadro y arma la lista de colores, fila por fila. `pintar`
 * recibe (u, v) normalizados y (x, y) en pixeles.
 */
export function pintarCuadro(
  ancho: number,
  alto: number,
  pintar: (u: number, v: number, x: number, y: number) => string,
): string[] {
  const pixeles: string[] = new Array(ancho * alto);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      pixeles[y * ancho + x] = pintar((x + 0.5) / ancho, (y + 0.5) / alto, x, y);
    }
  }
  return pixeles;
}

/** Lo que dice la placa de cada obra. */
export interface Ficha {
  titulo: string;
  original: string;
  autor: string;
  anio: string;
  tecnica: string;
  medidas: string;
  museo: string;
  /** Un parrafo, con la voz del jardin. */
  texto: string;
}
