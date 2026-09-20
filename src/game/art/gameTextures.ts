import * as THREE from 'three';
import {
  ANIMAL_MATRIX,
  BLOOM_MATRIX,
  FOODS,
  FOOD_MATRIX,
  getAnimalVariant,
  getFlowerVariant,
} from '../../state/content';
import type { FoodId, GrowthStage } from '../../state/types';
import * as M from './matrices';
import { FOLIAGE } from './render';
import { texturaDeMatriz } from './spriteTexture';
import { createTile } from './render';

/** Matriz de cada etapa. Solo la floracion cambia segun la especie. */
function matrizDeEtapa(especie: keyof typeof BLOOM_MATRIX, etapa: GrowthStage) {
  switch (etapa) {
    case 'semilla':
      return M.SEED;
    case 'brote':
      return M.SPROUT;
    case 'capullo':
      return M.BUD;
    case 'marchita':
      return M.WILTED;
    case 'flor':
      return BLOOM_MATRIX[especie];
  }
}

export function texturaFlor(variantId: string, etapa: GrowthStage): THREE.Texture {
  const variante = getFlowerVariant(variantId);
  return texturaDeMatriz(
    `flor:${variantId}:${etapa}`,
    matrizDeEtapa(variante.especie, etapa),
    { ...FOLIAGE, ...variante.palette },
  );
}

export function texturaAnimal(variantId: string): THREE.Texture {
  const variante = getAnimalVariant(variantId);
  return texturaDeMatriz(
    `animal:${variantId}`,
    ANIMAL_MATRIX[variante.especie],
    variante.palette,
  );
}

export function texturaComida(foodId: FoodId): THREE.Texture {
  return texturaDeMatriz(`comida:${foodId}`, FOOD_MATRIX[foodId], FOODS[foodId].palette);
}

/** Marco de esquinas para señalar la parcela bajo el cursor. */
export function texturaSeleccion(): THREE.Texture {
  const { canvas, ctx } = createTile(16, 16);
  ctx.fillStyle = '#fffbe0';
  for (const [x, y, w, h] of [
    [0, 0, 5, 1], [0, 0, 1, 5],
    [11, 0, 5, 1], [15, 0, 1, 5],
    [0, 15, 5, 1], [0, 11, 1, 5],
    [11, 15, 5, 1], [15, 11, 1, 5],
  ]) {
    ctx.fillRect(x, y, w, h);
  }

  const textura = new THREE.CanvasTexture(canvas);
  textura.magFilter = THREE.NearestFilter;
  textura.minFilter = THREE.NearestFilter;
  textura.generateMipmaps = false;
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}
