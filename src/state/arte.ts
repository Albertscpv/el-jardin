/**
 * Arte en el jardin: un atril con un cuadro, que se puede mirar de cerca.
 *
 * Por ahora hay uno solo, "El beso" de Klimt, pero el catalogo esta armado
 * para que entren mas sin tocar nada del resto. Se compra, se pone y se
 * saca como cualquier objeto: el mecanismo es el mismo que el de las
 * farolas y los juegos.
 */

import { cantidadDe, comprarObjeto } from './objetos';
import type { GameState } from './types';

export type ObraId = 'beso';

export interface Obra {
  id: ObraId;
  nombre: string;
  precio: number;
  descripcion: string;
}

export const OBRAS: Record<ObraId, Obra> = {
  beso: {
    id: 'beso',
    nombre: 'El beso, de Klimt',
    precio: 250,
    descripcion: 'Un atril con la pintura. Tocalo para verla de cerca.',
  },
};

/** El objeto del jardin que sostiene el cuadro. */
export const PROP_ATRIL = 'atril' as const;

export function comprarObra(estado: GameState, id: ObraId): GameState | null {
  return comprarObjeto(estado, PROP_ATRIL, OBRAS[id].precio);
}

export function atrilesGuardados(estado: GameState): number {
  return cantidadDe(estado, PROP_ATRIL);
}
