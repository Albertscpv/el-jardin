/**
 * Objetos que se compran y se colocan en el jardin.
 *
 * Por ahora solo farolas. Se compran a la tienda, quedan guardadas, y se
 * ponen y se sacan con la herramienta: sacarla la devuelve al inventario,
 * asi que moverla de lugar no cuesta nada. Se paga una sola vez.
 *
 * Todo es puro, como la economia: el store decide cuando, aca estan las
 * reglas.
 */

import { BALANCE, celdaId } from './config';
import { esAgua, esParcela, tieneSuelo } from './islas';
import type { GameState, IslaState, PropColocado, PropTipo } from './types';

export function propEn(isla: IslaState, col: number, row: number): PropColocado | undefined {
  return isla.props.find((p) => p.col === col && p.row === row);
}

export function cantidadDe(estado: GameState, tipo: PropTipo): number {
  return estado.objetos?.[tipo] ?? 0;
}

/** Compra farolas. Devuelve null si no alcanzan las monedas. */
export function comprarFarolas(estado: GameState, cantidad = 1): GameState | null {
  const costo = BALANCE.precioFarola * cantidad;
  if (estado.monedas < costo) return null;
  return {
    ...estado,
    monedas: estado.monedas - costo,
    objetos: { ...estado.objetos, farola: cantidadDe(estado, 'farola') + cantidad },
  };
}

export type ResultadoFarola =
  | 'colocada'
  | 'guardada'
  | 'sin-farolas'
  | 'ocupada'
  | 'agua'
  | 'parcela'
  | 'fuera';

/**
 * Lo que hace la herramienta Farola al tocar una celda: si hay una farola,
 * la guarda; si esta libre, pone una.
 *
 * Solo va sobre el cesped. En una parcela bloquearia la siembra, y en una
 * celda con otro objeto quedarian dos cosas en el mismo lugar. Las demas
 * herramientas no saben de objetos: por eso la regla vive aca y no en cada
 * una de ellas.
 */
export function usarFarola(
  estado: GameState,
  islaId: string,
  col: number,
  row: number,
): { estado: GameState; resultado: ResultadoFarola } {
  const isla = estado.islas.find((i) => i.id === islaId);
  if (!isla || !tieneSuelo(isla, col, row)) return { estado, resultado: 'fuera' };

  const actual = propEn(isla, col, row);

  if (actual?.tipo === 'farola') {
    return {
      estado: {
        ...conIsla(estado, islaId, (i) => ({
          ...i,
          props: i.props.filter((p) => p !== actual),
        })),
        objetos: { ...estado.objetos, farola: cantidadDe(estado, 'farola') + 1 },
      },
      resultado: 'guardada',
    };
  }

  if (actual) return { estado, resultado: 'ocupada' };
  if (esAgua(isla, col, row)) return { estado, resultado: 'agua' };
  if (esParcela(isla, col, row) || estado.cultivos[celdaId(islaId, col, row)]) {
    return { estado, resultado: 'parcela' };
  }
  if (cantidadDe(estado, 'farola') <= 0) return { estado, resultado: 'sin-farolas' };

  return {
    estado: {
      ...conIsla(estado, islaId, (i) => ({
        ...i,
        props: [...i.props, { tipo: 'farola', col, row }],
      })),
      objetos: { ...estado.objetos, farola: cantidadDe(estado, 'farola') - 1 },
    },
    resultado: 'colocada',
  };
}

/** Si una celda tiene un objeto encima, no se puede arar ni sembrar debajo. */
export function celdaLibreDeObjetos(isla: IslaState, col: number, row: number): boolean {
  return !propEn(isla, col, row);
}

function conIsla(
  estado: GameState,
  islaId: string,
  cambio: (isla: IslaState) => IslaState,
): GameState {
  return { ...estado, islas: estado.islas.map((i) => (i.id === islaId ? cambio(i) : i)) };
}
