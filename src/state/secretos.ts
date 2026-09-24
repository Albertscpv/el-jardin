/**
 * Secretos del jardin.
 *
 * Cosas que no se anuncian en ningun lado: no hay lista de logros ni barra
 * de progreso. La gracia es que pasen cuando nadie las esta buscando.
 *
 * El primero: cien tulipanes cosechados, del color que sean, y una manana
 * aparece una isla entera de tulipanes rosas ya florecidos. Se abre una
 * sola vez por jardin.
 */

import { celdaLocal } from './config';
import { crearIslaNueva } from './islas';
import type { FlowerSpeciesId, GameState, IslaState, PlantState } from './types';

/** Cuantos tulipanes hay que cosechar para que aparezca el jardin rosa. */
export const TULIPANES_PARA_EL_SECRETO = 100;

/** Lado de la isla secreta, en celdas. */
const LADO = 9;

/** Anota la cosecha si fue un tulipan. Cualquier color cuenta. */
export function contarTulipan(estado: GameState, especie: FlowerSpeciesId): GameState {
  if (especie !== 'tulipan') return estado;
  return { ...estado, tulipanesCosechados: (estado.tulipanesCosechados ?? 0) + 1 };
}

/** Si ya se ganó el secreto y todavia no se abrio. */
export function jardinRosaListo(estado: GameState): boolean {
  return !estado.jardinRosa && (estado.tulipanesCosechados ?? 0) >= TULIPANES_PARA_EL_SECRETO;
}

/**
 * Abre el jardin rosa: una isla mas grande que las otras, arada entera y
 * con un tulipan rosa abierto en cada parcela. Null si no corresponde, asi
 * que llamarlo de mas no hace nada.
 */
export function abrirJardinRosa(
  estado: GameState,
  ahora: number,
): { estado: GameState; isla: IslaState } | null {
  if (!jardinRosaListo(estado)) return null;

  const suelo: string[] = [];
  for (let row = 0; row < LADO; row++) {
    for (let col = 0; col < LADO; col++) suelo.push(celdaLocal(col, row));
  }

  const isla: IslaState = {
    ...crearIslaNueva(estado.islas),
    nombre: 'Jardín de los Cien Tulipanes',
    suelo,
    parcelas: [...suelo],
    agua: [],
    props: [],
  };

  // Ya florecidos: el regalo es verlos abiertos, no esperarlos.
  const flor: PlantState = {
    variantId: 'tulipan-rosa',
    plantedAt: ahora,
    growth: 1,
    humedad: 1,
    marchitez: 0,
  };
  const cultivos = { ...estado.cultivos };
  for (const local of suelo) cultivos[`${isla.id}/${local}`] = { ...flor };

  return {
    estado: { ...estado, islas: [...estado.islas, isla], cultivos, jardinRosa: true },
    isla,
  };
}
