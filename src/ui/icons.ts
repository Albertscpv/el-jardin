import type { Matrix } from '../game/art/matrices';
import { FOLIAGE, type Palette } from '../game/art/render';
import {
  ANIMAL_MATRIX,
  BLOOM_MATRIX,
  FOODS,
  FOOD_MATRIX,
  getAnimalVariant,
  getFlowerVariant,
} from '../state/content';
import type { FoodId } from '../state/types';

export interface Icono {
  matrix: Matrix;
  palette: Palette;
}

export function iconoFlor(variantId: string): Icono {
  const variante = getFlowerVariant(variantId);
  return {
    matrix: BLOOM_MATRIX[variante.especie],
    palette: { ...FOLIAGE, ...variante.palette },
  };
}

export function iconoAnimal(variantId: string): Icono {
  const variante = getAnimalVariant(variantId);
  return { matrix: ANIMAL_MATRIX[variante.especie], palette: variante.palette };
}

export function iconoComida(foodId: FoodId): Icono {
  return { matrix: FOOD_MATRIX[foodId], palette: FOODS[foodId].palette };
}
