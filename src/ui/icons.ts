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
import type { JuegoId } from '../state/juegos';
import * as P from '../game/art/props';

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

/** Los juegos usan su propio dibujo como icono, en la barra y en Construir. */
export const ICONO_JUEGO: Record<JuegoId, { matriz: Matrix; paleta: Palette }> = {
  columpio: { matriz: P.COLUMPIO, paleta: P.PALETA_COLUMPIO },
  tobogan: { matriz: P.TOBOGAN, paleta: P.PALETA_TOBOGAN },
  subibaja: { matriz: P.SUBIBAJA, paleta: P.PALETA_SUBIBAJA },
  arenero: { matriz: P.ARENERO, paleta: P.PALETA_ARENERO },
};
