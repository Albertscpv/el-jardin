import * as THREE from 'three';
import type { Matrix } from './matrices';
import { matrixToCanvas, type Palette } from './render';

const cache = new Map<string, THREE.Texture>();

/**
 * Textura de una matriz, lista para un billboard.
 *
 * `NearestFilter` y `colorSpace` sRGB son lo que hace que el sprite se vea
 * nitido dentro de la escena 3D en vez de convertirse en una mancha borrosa.
 */
export function texturaDeMatriz(clave: string, matrix: Matrix, palette: Palette): THREE.Texture {
  const existente = cache.get(clave);
  if (existente) return existente;

  const textura = new THREE.CanvasTexture(matrixToCanvas(clave, matrix, palette, 1));
  textura.magFilter = THREE.NearestFilter;
  textura.minFilter = THREE.NearestFilter;
  textura.generateMipmaps = false;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.needsUpdate = true;

  cache.set(clave, textura);
  return textura;
}
