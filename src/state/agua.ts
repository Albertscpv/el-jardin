/**
 * Agua: se vierte y se derrama sola.
 *
 * No hay simulacion de fluidos. Al verter, el agua se reparte de a poco
 * hacia las celdas vecinas libres, como un charco que se abre, y ahi queda.
 * Eso da la sensacion de agua sin costar un solo calculo por frame ni un
 * campo nuevo en el guardado: las celdas mojadas son `isla.agua`, que ya
 * existia desde el principio.
 *
 * Lo que se ve caer por el borde de la isla es una cascada dibujada donde
 * el agua toca el vacio (ver world/Cascadas.ts); tampoco es estado.
 *
 * Los nenufares son props sobre el agua. Como cualquier prop, viven en la
 * isla, asi que tampoco cambian el formato de la partida.
 */

import { celdaLocal, parseCeldaLocal, VECINAS } from './config';
import { casaEnCelda } from './casas';
import { esAgua, esParcela, tieneSuelo } from './islas';
import { propEn } from './objetos';
import type { GameState, IslaState } from './types';

/** Celdas que moja un balde, contando la que se toca. */
export const CELDAS_POR_BALDE = 5;

export type ResultadoAgua =
  | 'vertida'
  | 'ya-hay-agua'
  | 'parcela'
  | 'ocupada'
  | 'fuera'
  | 'sin-lugar';

/** Cuantas celdas de agua hay en todo el jardin. */
export function celdasDeAgua(estado: GameState): number {
  return estado.islas.reduce((n, isla) => n + isla.agua.length, 0);
}

/** Si en esa celda se puede mojar: hay tierra libre de todo lo demas. */
export function mojable(estado: GameState, isla: IslaState, col: number, row: number): boolean {
  if (!tieneSuelo(isla, col, row)) return false;
  if (esAgua(isla, col, row) || esParcela(isla, col, row)) return false;
  if (propEn(isla, col, row)) return false;
  if (estado.cultivos[`${isla.id}/${celdaLocal(col, row)}`]) return false;
  return !casaEnCelda(estado, isla.id, col, row);
}

/**
 * Vierte un balde: moja la celda tocada y se derrama hacia las vecinas
 * libres, en circulos, hasta gastar el balde. Si al lado hay parcelas,
 * casas o flores, el agua las rodea en vez de taparlas.
 */
export function verterAgua(
  estado: GameState,
  islaId: string,
  col: number,
  row: number,
): { estado: GameState; resultado: ResultadoAgua; mojadas: number } {
  const isla = estado.islas.find((i) => i.id === islaId);
  if (!isla) return { estado, resultado: 'fuera', mojadas: 0 };
  if (!tieneSuelo(isla, col, row)) return { estado, resultado: 'fuera', mojadas: 0 };
  if (esAgua(isla, col, row)) return { estado, resultado: 'ya-hay-agua', mojadas: 0 };
  if (esParcela(isla, col, row)) return { estado, resultado: 'parcela', mojadas: 0 };
  if (!mojable(estado, isla, col, row)) return { estado, resultado: 'ocupada', mojadas: 0 };

  const nuevas: string[] = [];
  const vistas = new Set<string>([celdaLocal(col, row)]);
  let frente = [{ col, row }];
  nuevas.push(celdaLocal(col, row));

  // El derrame avanza por anillos: primero las vecinas, despues las de mas alla.
  while (nuevas.length < CELDAS_POR_BALDE && frente.length > 0) {
    const siguiente: Array<{ col: number; row: number }> = [];
    for (const celda of frente) {
      for (const [dc, dr] of VECINAS) {
        const c = celda.col + dc;
        const r = celda.row + dr;
        const clave = celdaLocal(c, r);
        if (vistas.has(clave)) continue;
        vistas.add(clave);
        if (!mojable(estado, isla, c, r)) continue;
        siguiente.push({ col: c, row: r });
        nuevas.push(clave);
        if (nuevas.length >= CELDAS_POR_BALDE) break;
      }
      if (nuevas.length >= CELDAS_POR_BALDE) break;
    }
    frente = siguiente;
  }

  return {
    estado: {
      ...estado,
      islas: estado.islas.map((i) => (i.id === islaId ? { ...i, agua: [...i.agua, ...nuevas] } : i)),
    },
    resultado: 'vertida',
    mojadas: nuevas.length,
  };
}

/** Saca el agua de una celda, y el nenufar que hubiera encima. */
export function secarCelda(
  estado: GameState,
  islaId: string,
  col: number,
  row: number,
): { estado: GameState; secada: boolean } {
  const isla = estado.islas.find((i) => i.id === islaId);
  if (!isla || !esAgua(isla, col, row)) return { estado, secada: false };
  const local = celdaLocal(col, row);

  return {
    estado: {
      ...estado,
      islas: estado.islas.map((i) =>
        i.id !== islaId
          ? i
          : {
              ...i,
              agua: i.agua.filter((a) => a !== local),
              props: i.props.filter((p) => !(p.tipo === 'nenufar' && p.col === col && p.row === row)),
            },
      ),
    },
    secada: true,
  };
}

/* ------------------------------------------------------------------ */
/* Nenufares                                                           */
/* ------------------------------------------------------------------ */

export type ResultadoNenufar = 'puesto' | 'quitado' | 'sin-agua';

/** Pone un nenufar sobre el agua, o lo saca si ya estaba. */
export function alternarNenufar(
  estado: GameState,
  islaId: string,
  col: number,
  row: number,
): { estado: GameState; resultado: ResultadoNenufar } {
  const isla = estado.islas.find((i) => i.id === islaId);
  if (!isla || !esAgua(isla, col, row)) return { estado, resultado: 'sin-agua' };

  const hay = propEn(isla, col, row)?.tipo === 'nenufar';
  const props = hay
    ? isla.props.filter((p) => !(p.col === col && p.row === row))
    : [...isla.props, { tipo: 'nenufar' as const, col, row }];

  return {
    estado: { ...estado, islas: estado.islas.map((i) => (i.id === islaId ? { ...i, props } : i)) },
    resultado: hay ? 'quitado' : 'puesto',
  };
}

/* ------------------------------------------------------------------ */
/* Consultas para el mundo                                             */
/* ------------------------------------------------------------------ */

/** Una celda de agua al azar, para que aparezca ahi un pez o una rana. */
export function celdaDeAguaAleatoria(
  islas: IslaState[],
  rng = Math.random,
): { x: number; z: number } | null {
  const conAgua = islas.filter((i) => i.agua.length > 0);
  if (conAgua.length === 0) return null;

  const isla = conAgua[Math.floor(rng() * conAgua.length)];
  const local = isla.agua[Math.floor(rng() * isla.agua.length)];
  const { col, row } = parseCeldaLocal(local);
  return { x: isla.ox + col + 0.5, z: isla.oz + row + 0.5 };
}

/**
 * Bordes por donde el agua se derrama al vacio: celda mojada cuyo vecino
 * no es tierra de la isla. El mundo dibuja ahi una cascada.
 */
export function bordesDeAgua(
  isla: IslaState,
): Array<{ col: number; row: number; dc: number; dr: number }> {
  const bordes: Array<{ col: number; row: number; dc: number; dr: number }> = [];
  for (const local of isla.agua) {
    const { col, row } = parseCeldaLocal(local);
    for (const [dc, dr] of VECINAS) {
      if (!tieneSuelo(isla, col + dc, row + dr)) bordes.push({ col, row, dc, dr });
    }
  }
  return bordes;
}

/**
 * Un lugar cerca de (x,z) para que nade un pez o salte una rana.
 *
 * Con `incluirOrilla` tambien valen las celdas de tierra pegadas al agua:
 * es lo que hace que la rana entre y salga del estanque en vez de quedarse
 * flotando. Si no hay agua en ningun lado, devuelve null y el animal se
 * queda donde esta.
 */
export function celdaAcuaticaCercana(
  islas: IslaState[],
  x: number,
  z: number,
  radio: number,
  rng = Math.random,
  incluirOrilla = false,
): { x: number; z: number } | null {
  const cerca: Array<{ x: number; z: number }> = [];
  let mejor: { x: number; z: number; d: number } | null = null;

  for (const isla of islas) {
    const candidatas = new Set(isla.agua);
    if (incluirOrilla) {
      for (const local of isla.agua) {
        const { col, row } = parseCeldaLocal(local);
        for (const [dc, dr] of VECINAS) {
          const vecina = celdaLocal(col + dc, row + dr);
          if (isla.suelo.includes(vecina) && !isla.agua.includes(vecina)) candidatas.add(vecina);
        }
      }
    }

    for (const local of candidatas) {
      const { col, row } = parseCeldaLocal(local);
      const cx = isla.ox + col + 0.5;
      const cz = isla.oz + row + 0.5;
      const d = Math.hypot(cx - x, cz - z);
      if (d <= radio) cerca.push({ x: cx, z: cz });
      if (!mejor || d < mejor.d) mejor = { x: cx, z: cz, d };
    }
  }

  if (cerca.length > 0) return cerca[Math.floor(rng() * cerca.length)];
  return mejor ? { x: mejor.x, z: mejor.z } : null;
}
