/**
 * Arboles del jardin.
 *
 * Como los juegos y la farola: se compran, quedan guardados, se plantan y
 * se pueden sacar sin volver a pagar. Lo unico propio es el catalogo.
 *
 * Van sobre el cesped. Lo que cambia con la estacion es como se ven (eso
 * lo resuelve el arte), no lo que valen ni donde entran.
 */

import type { TipoArbol } from '../game/art/arboles';
import { TIPOS_ARBOL } from '../game/art/arboles';
import { cantidadDe, comprarObjeto } from './objetos';
import type { GameState, PropTipo } from './types';

export interface Arbol {
  id: TipoArbol;
  nombre: string;
  precio: number;
  descripcion: string;
}

export const ARBOLES: Record<TipoArbol, Arbol> = {
  roble: {
    id: 'roble',
    nombre: 'Roble',
    precio: 110,
    descripcion: 'Tronco grueso y copa ancha. En otoño se pone dorado.',
  },
  pino: {
    id: 'pino',
    nombre: 'Pino',
    precio: 90,
    descripcion: 'El único que no pierde la hoja: verde todo el año.',
  },
  sauce: {
    id: 'sauce',
    nombre: 'Sauce',
    precio: 130,
    descripcion: 'Ramas que caen hasta casi tocar el pasto.',
  },
  cerezo: {
    id: 'cerezo',
    nombre: 'Cerezo',
    precio: 160,
    descripcion: 'En primavera se llena de flores rosadas.',
  },
};

export const IDS_ARBOLES = TIPOS_ARBOL;

export const esArbol = (tipo: PropTipo): tipo is TipoArbol =>
  (IDS_ARBOLES as PropTipo[]).includes(tipo);

/** Compra un árbol; queda guardado hasta que lo planten. Null si no alcanza. */
export function comprarArbol(estado: GameState, id: TipoArbol): GameState | null {
  return comprarObjeto(estado, id, ARBOLES[id].precio);
}

/** Árboles comprados y todavía sin plantar. */
export function arbolesGuardados(estado: GameState): Array<{ arbol: Arbol; cantidad: number }> {
  return IDS_ARBOLES.map((id) => ({ arbol: ARBOLES[id], cantidad: cantidadDe(estado, id) })).filter(
    (a) => a.cantidad > 0,
  );
}
