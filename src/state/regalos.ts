/**
 * Regalos de balance.
 *
 * Son monedas que el juego entrega una sola vez a cada partida, incluidas
 * las que ya existian antes de que el regalo se inventara. No se pueden
 * repartir cambiando `monedasIniciales`, porque eso solo alcanza a las
 * partidas nuevas, ni subiendo `SAVE_VERSION`, porque `leerLocal` descarta
 * todo guardado cuya version no coincida: renumerar seria borrarle el
 * jardin a todo el mundo para regalarle monedas.
 *
 * En su lugar cada partida lleva la lista de regalos que ya cobro. El campo
 * es opcional, asi que un guardado viejo lo estrena vacio y entra al regalo
 * sin migracion de por medio.
 */

import type { GameState } from './types';

export interface Regalo {
  id: string;
  monedas: number;
  /** Lo que se le muestra al jugador cuando se acredita. */
  aviso: string;
}

export const REGALOS: readonly Regalo[] = [
  {
    id: 'beta-1500',
    monedas: 1500,
    aviso: 'Regalo de la beta: 1500 monedas para empezar en serio 🪙',
  },
];

export interface ResultadoRegalos {
  estado: GameState;
  /** Avisos de los regalos recien acreditados, en orden. */
  avisos: string[];
}

/**
 * Acredita los regalos que a esta partida le falten.
 *
 * Es idempotente: volver a llamarla con el mismo estado no suma nada. Se
 * aplica sobre la partida que ya gano la eleccion entre el navegador y la
 * nube, nunca sobre las dos, para que jugar en dos dispositivos no duplique
 * el regalo.
 */
export function aplicarRegalos(estado: GameState): ResultadoRegalos {
  const recibidos = new Set(estado.regalosRecibidos ?? []);
  const pendientes = REGALOS.filter((r) => !recibidos.has(r.id));
  if (pendientes.length === 0) return { estado, avisos: [] };

  const monedas = pendientes.reduce((total, r) => total + r.monedas, estado.monedas);

  return {
    estado: {
      ...estado,
      monedas,
      regalosRecibidos: [...recibidos, ...pendientes.map((r) => r.id)],
    },
    avisos: pendientes.map((r) => r.aviso),
  };
}
