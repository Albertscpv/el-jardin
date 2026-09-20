import * as THREE from 'three';
import { assertRectangular, type Matrix } from './matrices';
import type { Palette } from './render';

/**
 * Convierte una matriz de pixeles en geometria 3D.
 *
 * Cada caracter se vuelve un cubo. Solo se emiten las caras que dan al aire,
 * asi que una losa de 16x16 con profundidad 4 cuesta unas pocas centenas de
 * triangulos en vez de miles.
 */

export interface VoxelOpts {
  /** Lado del cubo en unidades de mundo. 1/16 hace que 16px = 1 tile. */
  cell?: number;
  /** Cuantas capas de profundidad tiene la losa. */
  depth?: number;
  /** Donde queda el origen del modelo. */
  anchor?: 'center-bottom' | 'center';
  /** Oscurece las caras laterales y traseras: da volumen sin depender de luces. */
  sombreado?: number;
}

/* Las seis caras de un cubo unitario: normal, vecino y los cuatro vertices. */
const CARAS = [
  {
    normal: [1, 0, 0],
    vecino: [1, 0, 0],
    esquinas: [
      [1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1],
    ],
    luz: 0.82,
  },
  {
    normal: [-1, 0, 0],
    vecino: [-1, 0, 0],
    esquinas: [
      [0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0],
    ],
    luz: 0.68,
  },
  {
    normal: [0, 1, 0],
    vecino: [0, 1, 0],
    esquinas: [
      [0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0],
    ],
    luz: 1,
  },
  {
    normal: [0, -1, 0],
    vecino: [0, -1, 0],
    esquinas: [
      [0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1],
    ],
    luz: 0.55,
  },
  {
    normal: [0, 0, 1],
    vecino: [0, 0, 1],
    esquinas: [
      [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
    ],
    luz: 0.95,
  },
  {
    normal: [0, 0, -1],
    vecino: [0, 0, -1],
    esquinas: [
      [1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0],
    ],
    luz: 0.7,
  },
] as const;

interface Celda {
  color: THREE.Color;
}

/**
 * Construye la geometria. Devuelve colores por vertice, asi que un solo
 * material (`vertexColors: true`) pinta todo el modelo.
 */
export function voxelGeometry(
  nombre: string,
  matrix: Matrix,
  palette: Palette,
  opts: VoxelOpts = {},
): THREE.BufferGeometry {
  assertRectangular(nombre, matrix);

  const cell = opts.cell ?? 1 / 16;
  const depth = Math.max(1, opts.depth ?? 4);
  const sombreado = opts.sombreado ?? 1;

  const filas = matrix.length;
  const columnas = matrix[0].length;

  // Rejilla 3D de celdas llenas. El patron se repite en todas las capas de Z.
  const celdas = new Map<string, Celda>();
  const clave = (x: number, y: number, z: number) => `${x},${y},${z}`;

  const cacheColor = new Map<string, THREE.Color>();
  const colorDe = (ch: string): THREE.Color | null => {
    const hex = palette[ch];
    if (!hex) return null;
    let c = cacheColor.get(hex);
    if (!c) {
      c = new THREE.Color().setStyle(hex);
      cacheColor.set(hex, c);
    }
    return c;
  };

  for (let fila = 0; fila < filas; fila++) {
    for (let col = 0; col < columnas; col++) {
      const color = colorDe(matrix[fila][col]);
      if (!color) continue;
      // La fila 0 de la matriz es la parte de arriba del dibujo.
      const y = filas - 1 - fila;
      for (let z = 0; z < depth; z++) celdas.set(clave(col, y, z), { color });
    }
  }

  const posiciones: number[] = [];
  const normales: number[] = [];
  const colores: number[] = [];
  const indices: number[] = [];

  const offsetX = opts.anchor === 'center' || opts.anchor === 'center-bottom' ? columnas / 2 : 0;
  const offsetY = opts.anchor === 'center' ? filas / 2 : 0;
  const offsetZ = depth / 2;

  for (const [k, celda] of celdas) {
    const [x, y, z] = k.split(',').map(Number);

    for (const cara of CARAS) {
      const vecino = clave(x + cara.vecino[0], y + cara.vecino[1], z + cara.vecino[2]);
      if (celdas.has(vecino)) continue;

      const base = posiciones.length / 3;
      // Mezcla hacia negro segun la orientacion: lee como volumen aun sin luz.
      const k2 = 1 - (1 - cara.luz) * sombreado;
      const r = celda.color.r * k2;
      const g = celda.color.g * k2;
      const b = celda.color.b * k2;

      for (const [ex, ey, ez] of cara.esquinas) {
        posiciones.push(
          (x + ex - offsetX) * cell,
          (y + ey - offsetY) * cell,
          (z + ez - offsetZ) * cell,
        );
        normales.push(cara.normal[0], cara.normal[1], cara.normal[2]);
        colores.push(r, g, b);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3));
  geometria.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  geometria.setIndex(indices);
  geometria.computeBoundingSphere();
  return geometria;
}

/** Material unico para todos los modelos voxel. */
export function materialVoxel(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ vertexColors: true });
}

/* ------------------------------------------------------------------ */
/* Constructor de cajas sueltas                                        */
/* ------------------------------------------------------------------ */

export interface Caja {
  x: number;
  y: number;
  z: number;
  ancho: number;
  alto: number;
  fondo: number;
  color: string;
}

/**
 * Une varias cajas en una sola geometria con colores por vertice.
 * Se usa para el terreno y los props que no vienen de una matriz.
 *
 * @param sombreado 1 aplica el sombreado por cara completo; valores menores lo
 *   suavizan. El terreno lo baja porque sus caras inferiores, que ya reciben
 *   poca luz directa, quedarian negras.
 */
export function cajasGeometry(cajas: Caja[], sombreado = 1): THREE.BufferGeometry {
  const posiciones: number[] = [];
  const normales: number[] = [];
  const colores: number[] = [];
  const indices: number[] = [];
  const cacheColor = new Map<string, THREE.Color>();

  for (const caja of cajas) {
    let color = cacheColor.get(caja.color);
    if (!color) {
      color = new THREE.Color().setStyle(caja.color);
      cacheColor.set(caja.color, color);
    }

    for (const cara of CARAS) {
      const base = posiciones.length / 3;
      const k = 1 - (1 - cara.luz) * sombreado;
      const r = color.r * k;
      const g = color.g * k;
      const b = color.b * k;

      for (const [ex, ey, ez] of cara.esquinas) {
        posiciones.push(
          caja.x + ex * caja.ancho,
          caja.y + ey * caja.alto,
          caja.z + ez * caja.fondo,
        );
        normales.push(cara.normal[0], cara.normal[1], cara.normal[2]);
        colores.push(r, g, b);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3));
  geometria.setAttribute('color', new THREE.Float32BufferAttribute(colores, 3));
  geometria.setIndex(indices);
  geometria.computeBoundingSphere();
  return geometria;
}
