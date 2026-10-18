/**
 * Arte en el jardin: atriles con cuadros famosos, que se pueden mirar de
 * cerca.
 *
 * Cada obra es su propio objeto: se compra, se pone y se saca como
 * cualquier otro, con el mismo mecanismo que las farolas y los juegos.
 * Todas son de dominio publico.
 */

import { cantidadDe, comprarObjeto } from './objetos';
import type { GameState, PropAtril, PropTipo } from './types';

export const IDS_OBRAS = ['beso', 'noche', 'gioconda', 'ola', 'perla', 'grito', 'nenufares'] as const;
export type ObraId = (typeof IDS_OBRAS)[number];

export interface Obra {
  id: ObraId;
  nombre: string;
  precio: number;
  descripcion: string;
  /** El objeto del jardin que sostiene este cuadro. */
  prop: PropAtril;
}

export const OBRAS: Record<ObraId, Obra> = {
  beso: {
    id: 'beso',
    nombre: 'El beso, de Klimt',
    precio: 250,
    descripcion: 'Una pareja envuelta en un manto de oro.',
    prop: 'atril',
  },
  noche: {
    id: 'noche',
    nombre: 'La noche estrellada, de Van Gogh',
    precio: 280,
    descripcion: 'El cielo que gira sobre un pueblo dormido.',
    prop: 'atril-noche',
  },
  gioconda: {
    id: 'gioconda',
    nombre: 'La Gioconda, de Leonardo',
    precio: 300,
    descripcion: 'La sonrisa más famosa del mundo.',
    prop: 'atril-gioconda',
  },
  ola: {
    id: 'ola',
    nombre: 'La gran ola, de Hokusai',
    precio: 220,
    descripcion: 'Una ola enorme, y el Fuji chiquito al fondo.',
    prop: 'atril-ola',
  },
  perla: {
    id: 'perla',
    nombre: 'La joven de la perla, de Vermeer',
    precio: 240,
    descripcion: 'Una mirada por encima del hombro.',
    prop: 'atril-perla',
  },
  grito: {
    id: 'grito',
    nombre: 'El grito, de Munch',
    precio: 200,
    descripcion: 'Un cielo en llamas sobre el fiordo.',
    prop: 'atril-grito',
  },
  nenufares: {
    id: 'nenufares',
    nombre: 'El puente japonés, de Monet',
    precio: 180,
    descripcion: 'El estanque del jardín de Monet, con sus nenúfares.',
    prop: 'atril-nenufares',
  },
};

/** El atril de "El beso", el primero que hubo. */
export const PROP_ATRIL = 'atril' as const;

export const esAtril = (tipo: PropTipo): tipo is PropAtril =>
  IDS_OBRAS.some((id) => OBRAS[id].prop === tipo);

/** Que obra sostiene un atril. */
export function obraDeAtril(tipo: PropAtril): ObraId {
  return IDS_OBRAS.find((id) => OBRAS[id].prop === tipo)!;
}

export function comprarObra(estado: GameState, id: ObraId): GameState | null {
  return comprarObjeto(estado, OBRAS[id].prop, OBRAS[id].precio);
}

/** Cuadros de esta obra comprados y todavía sin poner. */
export function obrasGuardadas(estado: GameState, id: ObraId): number {
  return cantidadDe(estado, OBRAS[id].prop);
}
