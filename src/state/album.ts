/**
 * El album de flores.
 *
 * Una variedad entra al album la primera vez que se cosecha, y no se sale
 * nunca mas. No da monedas ni desbloquea nada: es para mirar lo que pasó
 * por el jardin, que es su propio premio.
 *
 * Las partidas viejas arrancan con el album vacio aunque hayan cosechado
 * mil flores: no hay forma de saber cuales fueron, y inventarlo seria
 * peor que empezar de cero.
 */

import { FLOWER_SPECIES, FLOWER_VARIANTS, getFlowerVariant } from './content';
import type { FlowerSpeciesId, GameState } from './types';

/** Anota una variedad recien cosechada. Si ya estaba, no cambia nada. */
export function anotarVariedad(estado: GameState, variantId: string): GameState {
  const vistas = estado.variedadesVistas ?? [];
  if (vistas.includes(variantId)) return estado;
  return { ...estado, variedadesVistas: [...vistas, variantId] };
}

export function yaVista(estado: GameState, variantId: string): boolean {
  return (estado.variedadesVistas ?? []).includes(variantId);
}

export interface ProgresoAlbum {
  vistas: number;
  total: number;
  /** Cuantas lleva de cada especie, para la cabecera de cada seccion. */
  porEspecie: Array<{ especie: FlowerSpeciesId; nombre: string; vistas: number; total: number }>;
  /** Si estan todas: el album completo merece decirse. */
  completo: boolean;
}

export function progresoAlbum(estado: GameState): ProgresoAlbum {
  const vistas = new Set(estado.variedadesVistas ?? []);

  const especies = (Object.keys(FLOWER_SPECIES) as FlowerSpeciesId[]).map((especie) => {
    const deLaEspecie = FLOWER_VARIANTS.filter((v) => v.especie === especie);
    return {
      especie,
      nombre: FLOWER_SPECIES[especie].nombre,
      vistas: deLaEspecie.filter((v) => vistas.has(v.id)).length,
      total: deLaEspecie.length,
    };
  });

  const cuantas = FLOWER_VARIANTS.filter((v) => vistas.has(v.id)).length;
  return {
    vistas: cuantas,
    total: FLOWER_VARIANTS.length,
    porEspecie: especies,
    completo: cuantas === FLOWER_VARIANTS.length,
  };
}

/** Las variedades de una especie, en el orden en que estan en el catalogo. */
export function variedadesDe(especie: FlowerSpeciesId) {
  return FLOWER_VARIANTS.filter((v) => v.especie === especie);
}

/** El nombre que se muestra: el de la flor, o un enigma si todavia no salio. */
export function nombreEnAlbum(estado: GameState, variantId: string): string {
  return yaVista(estado, variantId) ? getFlowerVariant(variantId).nombre : '¿?';
}
