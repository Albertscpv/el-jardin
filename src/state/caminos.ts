/**
 * Caminos de piedra.
 *
 * Losas planas sobre el cesped, para unir la casa con el estanque sin
 * pisar el pasto. No cuestan monedas ni hacen nada: son para que el jardin
 * se vea cuidado.
 *
 * Viven en la isla, en una lista de celdas como el agua, y el campo es
 * opcional: una partida vieja simplemente no tiene caminos.
 */

import { celdaLocal } from './config';
import { casaEnCelda } from './casas';
import { esAgua, esParcela, tieneSuelo } from './islas';
import { propEn } from './objetos';
import type { GameState, IslaState } from './types';

export const esCamino = (isla: IslaState, col: number, row: number): boolean =>
  (isla.camino ?? []).includes(celdaLocal(col, row));

export type ResultadoCamino = 'puesto' | 'sacado' | 'parcela' | 'agua' | 'ocupada' | 'fuera';

/**
 * Pone una losa donde se toca, o la saca si ya estaba.
 *
 * Solo sobre cesped libre: en una parcela taparia la siembra, y sobre el
 * agua flotaria. Lo que hay debajo sigue siendo cesped, asi que sacar el
 * camino deja todo como estaba.
 */
export function alternarCamino(
  estado: GameState,
  islaId: string,
  col: number,
  row: number,
): { estado: GameState; resultado: ResultadoCamino } {
  const isla = estado.islas.find((i) => i.id === islaId);
  if (!isla || !tieneSuelo(isla, col, row)) return { estado, resultado: 'fuera' };

  const local = celdaLocal(col, row);
  const conIsla = (camino: string[]) => ({
    ...estado,
    islas: estado.islas.map((i) => (i.id === islaId ? { ...i, camino } : i)),
  });

  if (esCamino(isla, col, row)) {
    return {
      estado: conIsla((isla.camino ?? []).filter((c) => c !== local)),
      resultado: 'sacado',
    };
  }

  if (esAgua(isla, col, row)) return { estado, resultado: 'agua' };
  if (esParcela(isla, col, row) || estado.cultivos[`${islaId}/${local}`]) {
    return { estado, resultado: 'parcela' };
  }
  if (propEn(isla, col, row) || casaEnCelda(estado, islaId, col, row)) {
    return { estado, resultado: 'ocupada' };
  }

  return { estado: conIsla([...(isla.camino ?? []), local]), resultado: 'puesto' };
}

/** Cuantas losas hay en todo el jardin. */
export function losasPuestas(estado: GameState): number {
  return estado.islas.reduce((n, isla) => n + (isla.camino?.length ?? 0), 0);
}
