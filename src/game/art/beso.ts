/**
 * "El beso" (Der Kuss), de Gustav Klimt, 1907–1908, en pixel art.
 *
 * El original es de dominio publico. Esto no es una copia de una imagen:
 * es una version propia, pintada con formas y patrones, que sigue la
 * composicion del cuadro. La pareja abrazada en un manto de oro, de pie
 * sobre el borde de un prado lleno de flores; el de el con rectangulos
 * blancos y negros, el de ella con circulos de colores.
 *
 * Es una funcion pura que devuelve colores: asi se puede probar sin un
 * canvas, y el mismo cuadro se dibuja en el atril del jardin y en el
 * visor grande.
 *
 * Coordenadas: u de izquierda a derecha y v de arriba hacia abajo, las
 * dos de 0 a 1. El cuadro es cuadrado, como el original (180 x 180 cm).
 */

/** Lado del cuadro, en pixeles. */
export const LADO_BESO = 96;

/* ------------------------------------------------------------------ */
/* Paleta                                                              */
/* ------------------------------------------------------------------ */

export const COLORES_BESO = {
  // El fondo, oro viejo con motas.
  fondo: '#9a7330',
  fondoOscuro: '#7d5a24',
  fondoMota: '#c9a24a',
  // El manto.
  oro: '#d9a93a',
  oroClaro: '#f0cc62',
  oroOscuro: '#a87a24',
  // Los rectangulos del manto de el.
  negro: '#1e1a16',
  blanco: '#ece4cc',
  plata: '#b8b4a8',
  // Los circulos del vestido de ella.
  rojo: '#c8483a',
  azul: '#4a6ab8',
  violeta: '#8a5aa8',
  verdeFlor: '#5a9a52',
  // Las personas.
  piel: '#efd5b8',
  pielSombra: '#d4b090',
  pelo: '#2a2018',
  peloElla: '#a8552a',
  labios: '#c0504a',
  hiedra: '#4f8a3a',
  // El prado.
  prado: '#4f6b3a',
  pradoClaro: '#6f8a45',
  pradoOscuro: '#3a5030',
  florAzul: '#6a8ad8',
  florAmarilla: '#f0d04a',
  florBlanca: '#f4f0e4',
  florRoja: '#d85a6a',
} as const;

const C = COLORES_BESO;

/* ------------------------------------------------------------------ */
/* Ayudas                                                              */
/* ------------------------------------------------------------------ */

/** Hash estable por pixel: el mismo cuadro sale igual cada vez. */
function ruido(x: number, y: number, semilla = 0): number {
  let h = Math.imul(x * 374761393 + y * 668265263 + semilla * 1442695041, 0x27d4eb2d);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

/** Si (u,v) cae dentro de una elipse, opcionalmente girada. */
function enElipse(
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

/* ------------------------------------------------------------------ */
/* Las partes del cuadro                                               */
/* ------------------------------------------------------------------ */

/**
 * La silueta de la pareja: una campana de oro, angosta arriba, que se
 * apoya en el prado. Es la forma que se reconoce de lejos.
 */
function enLaPareja(u: number, v: number): boolean {
  if (v < 0.1 || v > 0.93) return false;
  // Se ensancha hacia abajo, y se inclina apenas hacia la derecha.
  const centro = 0.5 + (v - 0.5) * 0.06;
  const media = 0.07 + (v - 0.1) * 0.26;
  return Math.abs(u - centro) <= media;
}

/** El vestido de ella: abajo a la derecha de la silueta. */
function enElVestido(u: number, v: number): boolean {
  return enElipse(u, v, 0.6, 0.72, 0.15, 0.2, -0.25) && v > 0.48;
}

/** El prado: abajo, cortado por un borde que cae a la derecha. */
function enElPrado(u: number, v: number): boolean {
  const borde = 0.8 + Math.sin(u * 9) * 0.015 + Math.max(0, u - 0.7) * 0.6;
  return v >= borde && u < 0.9;
}

/**
 * El manto de el: rectangulos verticales negros y blancos, sueltos sobre
 * el oro. En el original no son una grilla: estan desparramados, y entre
 * ellos se ve el dorado.
 */
function manto(x: number, y: number): string {
  // Celdas de 4x7 corridas en cada fila; solo algunas llevan rectangulo.
  const fila = Math.floor(y / 7);
  const corrida = (fila % 2) * 2;
  const col = Math.floor((x + corrida) / 4);
  const n = ruido(col, fila, 11);
  const dentroX = (x + corrida) % 4;
  const dentroY = y % 7;
  // El rectangulo ocupa el centro de la celda, con un margen de oro.
  const enRectangulo = dentroX >= 1 && dentroX <= 2 && dentroY >= 1 && dentroY <= 5;

  if (enRectangulo && n < 0.32) return C.negro;
  if (enRectangulo && n < 0.52) return C.blanco;
  if (enRectangulo && n < 0.58) return C.plata;
  const m = ruido(x, y, 13);
  return m < 0.12 ? C.oroClaro : m > 0.92 ? C.oroOscuro : C.oro;
}

/** El vestido de ella: circulos de colores con anillos, sobre oro. */
function vestido(x: number, y: number): string {
  // Una grilla de circulos, corrida en cada fila para que no se alineen.
  const tam = 6;
  const fila = Math.floor(y / tam);
  const col = Math.floor((x + (fila % 2) * 3) / tam);
  const cx = col * tam - (fila % 2) * 3 + tam / 2;
  const cy = fila * tam + tam / 2;
  const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);

  const colores = [C.rojo, C.azul, C.violeta, C.verdeFlor, C.rojo, C.azul];
  const color = colores[Math.floor(ruido(col, fila, 23) * colores.length)];

  if (d < 1.3) return C.oroClaro; // el centro de cada circulo
  if (d < 2.4) return color;
  if (d < 2.9) return C.oroOscuro; // el anillo
  return ruido(x, y, 5) < 0.12 ? C.oroClaro : C.oro;
}

/** Las espirales del oro: anillos oscuros sueltos sobre el manto. */
function espiral(x: number, y: number): boolean {
  const tam = 11;
  const fila = Math.floor(y / tam);
  const col = Math.floor(x / tam);
  if (ruido(col, fila, 31) > 0.35) return false;
  const cx = col * tam + tam / 2;
  const cy = fila * tam + tam / 2;
  const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
  const angulo = Math.atan2(y - cy, x - cx);
  // Un espiral, no un circulo: el radio crece con el angulo.
  const r = 1.2 + ((angulo + Math.PI) / (Math.PI * 2)) * 3.2;
  return Math.abs(d - r) < 0.55;
}

/* ------------------------------------------------------------------ */
/* Las caras, el pelo y las manos                                       */
/* ------------------------------------------------------------------ */

/**
 * Lo que va arriba de todo: la cabeza de el (de espaldas, inclinada) y la
 * cara de ella (de frente, con los ojos cerrados), con sus manos.
 * Devuelve null si el pixel no es de ninguna.
 */
function caras(u: number, v: number, x: number, y: number): string | null {
  // La cara de ella, recostada hacia la derecha, con los ojos cerrados.
  if (enElipse(u, v, 0.585, 0.33, 0.048, 0.062, 0.5)) {
    // Ojos cerrados: dos rayitas finas, un poco curvas hacia abajo.
    if (enElipse(u, v, 0.565, 0.322, 0.013, 0.0035, 0.5)) return C.pielSombra;
    if (enElipse(u, v, 0.603, 0.342, 0.013, 0.0035, 0.5)) return C.pielSombra;
    if (enElipse(u, v, 0.575, 0.37, 0.011, 0.006, 0.5)) return C.labios;
    return u > 0.6 ? C.pielSombra : C.piel;
  }

  // La mano de el que le sostiene la cara.
  if (enElipse(u, v, 0.64, 0.33, 0.022, 0.05, 0.2)) return C.piel;

  // La cabeza de el: pelo oscuro con la corona de hiedra, inclinada sobre ella.
  if (enElipse(u, v, 0.51, 0.2, 0.075, 0.07, -0.5)) {
    if (enElipse(u, v, 0.545, 0.245, 0.04, 0.035, -0.5)) return C.pielSombra; // el cachete
    return ruido(x, y, 41) < 0.3 ? C.hiedra : C.pelo;
  }

  // El pelo de ella, rojizo y con flores, que cae hacia la izquierda.
  if (enElipse(u, v, 0.55, 0.37, 0.065, 0.065, 0.4) && !enElipse(u, v, 0.585, 0.33, 0.048, 0.062, 0.5)) {
    const n = ruido(x, y, 43);
    if (n < 0.08) return C.florAmarilla;
    if (n < 0.14) return C.florAzul;
    return C.peloElla;
  }

  // La mano de ella, sobre el cuello de el.
  if (enElipse(u, v, 0.47, 0.28, 0.022, 0.035, -0.3)) return C.piel;

  return null;
}

/** Los pies de ella, que asoman sobre el borde del prado. */
function pies(u: number, v: number): boolean {
  return (
    enElipse(u, v, 0.7, 0.9, 0.04, 0.012, -0.4) ||
    enElipse(u, v, 0.74, 0.92, 0.035, 0.011, -0.4)
  );
}

/* ------------------------------------------------------------------ */
/* El cuadro entero                                                     */
/* ------------------------------------------------------------------ */

/**
 * Los colores del cuadro, fila por fila, de arriba hacia abajo. `lado`
 * cambia la resolucion: el dibujo es el mismo, con mas o menos pixeles.
 */
export function pixelesDelBeso(lado = LADO_BESO): string[] {
  const pixeles: string[] = new Array(lado * lado);
  // Los patrones se piensan en la resolucion de base y se escalan.
  const escala = LADO_BESO / lado;

  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const u = (x + 0.5) / lado;
      const v = (y + 0.5) / lado;
      const px = Math.floor(x * escala);
      const py = Math.floor(y * escala);

      pixeles[y * lado + x] = color(u, v, px, py);
    }
  }
  return pixeles;
}

function color(u: number, v: number, x: number, y: number): string {
  const cara = caras(u, v, x, y);
  if (cara) return cara;

  if (pies(u, v)) return C.piel;

  if (enLaPareja(u, v)) {
    if (enElVestido(u, v)) return vestido(x, y);
    // El manto de el ocupa el lado izquierdo y de arriba de la silueta.
    if (u < 0.56 + (v - 0.5) * 0.25 && v < 0.82) return manto(x, y);
    if (espiral(x, y)) return C.oroOscuro;
    return ruido(x, y, 7) < 0.1 ? C.oroClaro : C.oro;
  }

  if (enElPrado(u, v)) {
    const n = ruido(x, y, 51);
    if (n < 0.05) return C.florAzul;
    if (n < 0.09) return C.florAmarilla;
    if (n < 0.12) return C.florBlanca;
    if (n < 0.14) return C.florRoja;
    return n < 0.6 ? C.prado : n < 0.85 ? C.pradoClaro : C.pradoOscuro;
  }

  // El fondo: oro viejo con motas, mas oscuro en las esquinas.
  const viñeta = Math.hypot(u - 0.5, v - 0.5);
  const n = ruido(x, y, 3);
  if (n < 0.035) return C.fondoMota;
  return viñeta > 0.6 || n > 0.94 ? C.fondoOscuro : C.fondo;
}

/** La ficha del cuadro, para el visor. */
export const FICHA_BESO = {
  titulo: 'El beso',
  original: 'Der Kuss',
  autor: 'Gustav Klimt',
  anio: '1907–1908',
  tecnica: 'Óleo y pan de oro sobre lienzo',
  medidas: '180 × 180 cm',
  museo: 'Galería Belvedere, Viena',
} as const;
