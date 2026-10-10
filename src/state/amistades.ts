/**
 * Amistades entre animales.
 *
 * Dos adoptados que pasan mucho tiempo cerca terminan andando juntos. No
 * hay nada que hacer para forzarlo: pasa solo, mientras el jardin corre.
 *
 * La amistad se guarda como una clave con los dos uid ordenados, para que
 * "Canela y Michi" y "Michi y Canela" sean la misma, y una sola vez.
 */

import type { AnimalState, GameState } from './types';

/** Que tan cerca tienen que estar para que cuente, en tiles. */
const CERCA = 2.5;

/** Cuanto tarda en nacer una amistad, en segundos de estar cerca. */
const SEGUNDOS_PARA_SER_AMIGOS = 240;

export const claveAmistad = (a: string, b: string): string => [a, b].sort().join('|');

export function sonAmigos(estado: GameState, a: string, b: string): boolean {
  return (estado.amistades ?? []).includes(claveAmistad(a, b));
}

/** Los uid de los amigos de un animal. */
export function amigosDe(estado: GameState, uid: string): string[] {
  return (estado.amistades ?? [])
    .map((clave) => clave.split('|'))
    .filter((par) => par.includes(uid))
    .map((par) => (par[0] === uid ? par[1] : par[0]));
}

const cerca = (a: AnimalState, b: AnimalState): boolean =>
  Math.hypot(a.x - b.x, a.z - b.z) <= CERCA;

export interface NuevasAmistades {
  estado: GameState;
  /** Pares que se hicieron amigos recien, para contarlo. */
  nuevas: Array<[AnimalState, AnimalState]>;
}

/**
 * Mira quien estuvo cerca de quien durante `dt` segundos y, cada tanto,
 * cierra una amistad. No lleva un cronometro por pareja: con que la
 * probabilidad sea proporcional al tiempo alcanza, y asi no hay un campo
 * nuevo por cada par de animales del jardin.
 */
export function cultivarAmistades(
  estado: GameState,
  dt: number,
  rng = Math.random,
): NuevasAmistades {
  const adoptados = estado.animales.filter((a) => a.estado === 'adoptado');
  if (adoptados.length < 2) return { estado, nuevas: [] };

  const amistades = [...(estado.amistades ?? [])];
  const nuevas: Array<[AnimalState, AnimalState]> = [];
  const probabilidad = Math.min(1, dt / SEGUNDOS_PARA_SER_AMIGOS);

  for (let i = 0; i < adoptados.length; i++) {
    for (let j = i + 1; j < adoptados.length; j++) {
      const a = adoptados[i];
      const b = adoptados[j];
      const clave = claveAmistad(a.uid, b.uid);
      if (amistades.includes(clave)) continue;
      if (!cerca(a, b)) continue;
      if (rng() > probabilidad) continue;

      amistades.push(clave);
      nuevas.push([a, b]);
    }
  }

  if (nuevas.length === 0) return { estado, nuevas: [] };
  return { estado: { ...estado, amistades }, nuevas };
}

/** Saca de la lista las amistades de un animal que ya no esta. */
export function olvidarAmistades(estado: GameState, uid: string): GameState {
  const amistades = (estado.amistades ?? []).filter((c) => !c.split('|').includes(uid));
  if (amistades.length === (estado.amistades ?? []).length) return estado;
  return { ...estado, amistades };
}
