import { SAVE_KEY, SAVE_VERSION } from '../config';
import type { GameState } from '../types';
import type { SaveAdapter } from './types';

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

export const adaptadorLocal: SaveAdapter = {
  nombre: 'local',
  async cargar() {
    return leerLocal();
  },
  async guardar(estado) {
    escribirLocal(estado);
  },
};
