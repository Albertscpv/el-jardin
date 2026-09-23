/**
 * Juegos para chicos: columpio, tobogan, subibaja y arenero.
 *
 * Son objetos como la farola —se compran, se ponen y se guardan sin volver
 * a pagar—, asi que reusan el mismo mecanismo de props. Lo unico propio es
 * el catalogo: que hay, cuanto sale y como se llama.
 *
 * Van sobre el cesped: en una parcela taparian la siembra, y en el agua
 * flotarian.
 */

import { comprarObjeto, cantidadDe } from './objetos';
import type { GameState, PropTipo } from './types';

export type JuegoId = 'columpio' | 'tobogan' | 'subibaja' | 'arenero';

export interface Juego {
  id: JuegoId;
  nombre: string;
  precio: number;
  descripcion: string;
}

export const JUEGOS: Record<JuegoId, Juego> = {
  columpio: {
    id: 'columpio',
    nombre: 'Columpio',
    precio: 120,
    descripcion: 'Dos hamacas colgadas de un caballete.',
  },
  tobogan: {
    id: 'tobogan',
    nombre: 'Tobogán',
    precio: 140,
    descripcion: 'Escalera de un lado, rampa del otro.',
  },
  subibaja: {
    id: 'subibaja',
    nombre: 'Subibaja',
    precio: 90,
    descripcion: 'Una tabla y su pivote. El clásico.',
  },
  arenero: {
    id: 'arenero',
    nombre: 'Arenero',
    precio: 70,
    descripcion: 'Un cajón de arena con su palita.',
  },
};

export const IDS_JUEGOS = Object.keys(JUEGOS) as JuegoId[];

export const esJuego = (tipo: PropTipo): tipo is JuegoId =>
  (IDS_JUEGOS as PropTipo[]).includes(tipo);

/** Compra un juego; queda guardado hasta que lo pongan. Null si no alcanza. */
export function comprarJuego(estado: GameState, id: JuegoId): GameState | null {
  return comprarObjeto(estado, id, JUEGOS[id].precio);
}

/** Juegos comprados y todavia sin poner. */
export function juegosGuardados(estado: GameState): Array<{ juego: Juego; cantidad: number }> {
  return IDS_JUEGOS.map((id) => ({ juego: JUEGOS[id], cantidad: cantidadDe(estado, id) })).filter(
    (j) => j.cantidad > 0,
  );
}
