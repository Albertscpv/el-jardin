import { SAVE_KEY, SAVE_VERSION } from '../config';
import type { GameState } from '../types';

export function leerLocal(): GameState | null {
  try {
    const crudo = localStorage.getItem(SAVE_KEY);
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as GameState;
    if (dato?.version !== SAVE_VERSION) return null;
    return dato;
  } catch {
    // Modo privado, cuota llena o JSON corrupto: se arranca de cero.
    return null;
  }
}

export function escribirLocal(estado: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(estado));
  } catch {
    /* sin almacenamiento disponible: el juego sigue, solo no persiste */
  }
}

export function borrarLocal(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* nada que hacer */
  }
}


/** Prefijo de los respaldos: uno por jardin, identificado por su creadoEn. */
export const PREFIJO_RESPALDO = SAVE_KEY + ':respaldo:';

/**
 * Guarda aparte un jardin que esta por ser reemplazado por otro distinto.
 *
 * Pasa cuando la cuenta trae un jardin y el navegador tenia otro: gana el
 * de la cuenta, pero el del navegador puede ser justo el que tenia todo el
 * progreso. En vez de pisarlo, queda en su propia clave para recuperarlo.
 * No se reescribe si ya existe: el primer respaldo es el que importa.
 */
export function respaldarLocal(estado: GameState): void {
  try {
    const clave = PREFIJO_RESPALDO + estado.creadoEn;
    if (localStorage.getItem(clave)) return;
    localStorage.setItem(clave, JSON.stringify(estado));
  } catch {
    /* sin almacenamiento disponible: no hay donde respaldar */
  }
}

/** Los respaldos que hay en este navegador, del mas nuevo al mas viejo. */
export function listarRespaldos(): GameState[] {
  const respaldos: GameState[] = [];
  let claves: string[] = [];
  try {
    claves = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '');
  } catch {
    return respaldos;
  }
  for (const clave of claves) {
    if (!clave.startsWith(PREFIJO_RESPALDO)) continue;
    try {
      const dato = JSON.parse(localStorage.getItem(clave) ?? 'null') as GameState | null;
      if (dato) respaldos.push(dato);
    } catch {
      /* un respaldo corrupto no impide leer los demas */
    }
  }
  return respaldos.sort((a, b) => b.ultimoTick - a.ultimoTick);
}
