/**
 * Casas: se compran, se ponen en el jardin y se pueden mover.
 *
 * Una casa ocupa varias celdas y tiene macetas en la terraza. Las flores de
 * esas macetas viven en `cultivos`, igual que las de las parcelas, con un id
 * propio (`maceta:<casa>:<n>`): asi crecen, se secan, se riegan con "Regar
 * todo", cuentan para los visitantes y se cosechan con las mismas reglas,
 * sin duplicar nada.
 *
 * Mover una casa es guardarla y volver a ponerla. Si tiene flores en las
 * macetas no se deja guardar: moverla nunca borra progreso.
 *
 * Todo es puro, como la economia: el store decide cuando, aca esta como.
 */

import { celdaId } from './config';
import { esAgua, esParcela, tieneSuelo } from './islas';
import { propEn } from './objetos';
import type { CasaColocada, GameState, TipoCasa } from './types';

export interface ModeloCasa {
  tipo: TipoCasa;
  nombre: string;
  precio: number;
  /** Celdas que ocupa: ancho en x, fondo en z. */
  ancho: number;
  fondo: number;
  macetas: number;
  descripcion: string;
}

export const CASAS: Record<TipoCasa, ModeloCasa> = {
  enL: {
    tipo: 'enL', nombre: 'Casa en L', precio: 900, ancho: 5, fondo: 3, macetas: 6,
    descripcion: 'Dos alas. El techo del ala baja es una terraza abierta al cielo.',
  },
  alFrente: {
    tipo: 'alFrente', nombre: 'Casa con terraza', precio: 700, ancho: 4, fondo: 3, macetas: 4,
    descripcion: 'El piso de arriba es más chico y el borde que sobra es terraza.',
  },
  azotea: {
    tipo: 'azotea', nombre: 'Casa con azotea', precio: 650, ancho: 4, fondo: 3, macetas: 5,
    descripcion: 'Dos pisos iguales: mitad techo marrón, mitad azotea.',
  },
  chalet: {
    tipo: 'chalet', nombre: 'Chalet', precio: 1100, ancho: 4, fondo: 4, macetas: 4,
    descripcion: 'Techo grande con aleros, balcón corrido y lámparas colgantes.',
  },
};

export const TIPOS_CASA = Object.keys(CASAS) as TipoCasa[];

/* ------------------------------------------------------------------ */
/* Ids                                                                 */
/* ------------------------------------------------------------------ */

export const idMaceta = (casaId: string, n: number) => `maceta:${casaId}:${n}`;
export const idCuerpoCasa = (casaId: string) => `casa:${casaId}`;
export const esMaceta = (id: string) => id.startsWith('maceta:');
export const esCuerpoCasa = (id: string) => id.startsWith('casa:');

/** La casa a la que pertenece una maceta o el cuerpo de una casa. */
export function casaDeId(id: string): string | null {
  if (esCuerpoCasa(id)) return id.slice('casa:'.length);
  if (esMaceta(id)) return id.slice('maceta:'.length, id.lastIndexOf(':'));
  return null;
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function celdasDeCasa(casa: CasaColocada): Array<{ col: number; row: number }> {
  const { ancho, fondo } = CASAS[casa.tipo];
  const celdas = [];
  for (let c = 0; c < ancho; c++) for (let r = 0; r < fondo; r++) celdas.push({ col: casa.col + c, row: casa.row + r });
  return celdas;
}

/** Ids globales de todas las celdas que tapan casas. */
export function celdasOcupadasPorCasas(estado: GameState): Set<string> {
  const ocupadas = new Set<string>();
  for (const casa of estado.casas ?? []) {
    for (const { col, row } of celdasDeCasa(casa)) ocupadas.add(celdaId(casa.islaId, col, row));
  }
  return ocupadas;
}

export function casaEnCelda(estado: GameState, islaId: string, col: number, row: number): CasaColocada | undefined {
  return (estado.casas ?? []).find(
    (casa) => casa.islaId === islaId && celdasDeCasa(casa).some((c) => c.col === col && c.row === row),
  );
}

/** Macetas de una casa que tienen algo sembrado. */
export function macetasOcupadas(estado: GameState, casa: CasaColocada): number {
  let n = 0;
  for (let i = 0; i < CASAS[casa.tipo].macetas; i++) if (estado.cultivos[idMaceta(casa.id, i)]) n++;
  return n;
}

export function guardadas(estado: GameState, tipo: TipoCasa): number {
  return estado.casasGuardadas?.[tipo] ?? 0;
}

/* ------------------------------------------------------------------ */
/* Acciones                                                            */
/* ------------------------------------------------------------------ */

/** Compra una casa: queda guardada para ponerla. Null si no alcanza. */
export function comprarCasa(estado: GameState, tipo: TipoCasa): GameState | null {
  const { precio } = CASAS[tipo];
  if (estado.monedas < precio) return null;
  return {
    ...estado,
    monedas: estado.monedas - precio,
    casasGuardadas: { ...estado.casasGuardadas, [tipo]: guardadas(estado, tipo) + 1 },
  };
}

export type ResultadoCasa =
  | 'puesta'
  | 'sin-casas'
  | 'no-entra'
  | 'agua'
  | 'parcela'
  | 'ocupada'
  | 'fuera';

/**
 * Pone una casa guardada con su centro en la celda tocada. Tiene que caber
 * entera sobre cesped libre: sin agua, sin parcelas, sin objetos y sin otra
 * casa. Si no cabe, no se mueve nada.
 */
export function ponerCasa(
  estado: GameState,
  tipo: TipoCasa,
  islaId: string,
  col: number,
  row: number,
  id: string,
): { estado: GameState; resultado: ResultadoCasa } {
  const isla = estado.islas.find((i) => i.id === islaId);
  if (!isla) return { estado, resultado: 'fuera' };
  if (guardadas(estado, tipo) <= 0) return { estado, resultado: 'sin-casas' };

  const { ancho, fondo } = CASAS[tipo];
  const casa: CasaColocada = {
    id, tipo, islaId,
    col: col - Math.floor(ancho / 2),
    row: row - Math.floor(fondo / 2),
  };

  for (const c of celdasDeCasa(casa)) {
    if (!tieneSuelo(isla, c.col, c.row)) return { estado, resultado: 'no-entra' };
    if (esAgua(isla, c.col, c.row)) return { estado, resultado: 'agua' };
    if (esParcela(isla, c.col, c.row) || estado.cultivos[celdaId(islaId, c.col, c.row)]) {
      return { estado, resultado: 'parcela' };
    }
    if (propEn(isla, c.col, c.row) || casaEnCelda(estado, islaId, c.col, c.row)) {
      return { estado, resultado: 'ocupada' };
    }
  }

  return {
    estado: {
      ...estado,
      casas: [...(estado.casas ?? []), casa],
      casasGuardadas: { ...estado.casasGuardadas, [tipo]: guardadas(estado, tipo) - 1 },
    },
    resultado: 'puesta',
  };
}

export type ResultadoGuardar = 'guardada' | 'macetas-con-flores' | 'no-existe';

/**
 * Guarda una casa puesta, para moverla. Si tiene flores en las macetas no
 * se deja: guardarla las borraria, y eso seria perder progreso.
 */
export function guardarCasa(
  estado: GameState,
  casaId: string,
): { estado: GameState; resultado: ResultadoGuardar } {
  const casa = (estado.casas ?? []).find((c) => c.id === casaId);
  if (!casa) return { estado, resultado: 'no-existe' };
  if (macetasOcupadas(estado, casa) > 0) return { estado, resultado: 'macetas-con-flores' };

  return {
    estado: {
      ...estado,
      casas: (estado.casas ?? []).filter((c) => c.id !== casaId),
      casasGuardadas: { ...estado.casasGuardadas, [casa.tipo]: guardadas(estado, casa.tipo) + 1 },
    },
    resultado: 'guardada',
  };
}
