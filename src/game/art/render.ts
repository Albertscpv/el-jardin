import { assertRectangular, type Matrix } from './matrices';

/** Mapa caracter -> color CSS. Un caracter ausente se dibuja transparente. */
export type Palette = Readonly<Record<string, string>>;

/** Colores compartidos por todas las flores (tallo, hoja, semilla). */
export const FOLIAGE: Palette = {
  s: '#62a04a',
  S: '#3f7a35',
  l: '#6fb355',
  L: '#4a8a3c',
  b: '#c9a06a',
  B: '#7a5433',
};

/**
 * Dibuja una matriz sobre un contexto 2D.
 * `scale` es el tamano en px de cada pixel logico.
 */
export function drawMatrix(
  ctx: CanvasRenderingContext2D,
  matrix: Matrix,
  palette: Palette,
  scale = 1,
  originX = 0,
  originY = 0,
): void {
  for (let y = 0; y < matrix.length; y++) {
    const row = matrix[y];
    for (let x = 0; x < row.length; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(originX + x * scale, originY + y * scale, scale, scale);
    }
  }
}

function blankCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener un contexto 2D');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Convierte una matriz en un canvas listo para usarse como textura. */
export function matrixToCanvas(
  name: string,
  matrix: Matrix,
  palette: Palette,
  scale = 1,
): HTMLCanvasElement {
  assertRectangular(name, matrix);
  const canvas = blankCanvas(matrix[0].length * scale, matrix.length * scale);
  drawMatrix(context(canvas), matrix, palette, scale);
  return canvas;
}

/**
 * Misma matriz, pero como data URL para usarla en el HUD de React.
 * Asi el arte del juego y el de la interfaz nunca se desincronizan.
 */
export function matrixToDataURL(matrix: Matrix, palette: Palette, scale = 3): string {
  const canvas = blankCanvas(matrix[0].length * scale, matrix.length * scale);
  drawMatrix(context(canvas), matrix, palette, scale);
  return canvas.toDataURL('image/png');
}

/** Crea un canvas vacio con contexto pixelado. Util para arte procedural. */
export function createTile(w: number, h: number): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = blankCanvas(w, h);
  return { canvas, ctx: context(canvas) };
}

/** PRNG determinista (mulberry32): el jardin se ve igual en cada carga. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
