import { BALANCE, celdaLocal, parseCeldaLocal, VECINAS } from './config';
import type { AvatarState, IslaState } from './types';

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export const tieneSuelo = (isla: IslaState, col: number, row: number): boolean =>
  isla.suelo.includes(celdaLocal(col, row));

export const esParcela = (isla: IslaState, col: number, row: number): boolean =>
  isla.parcelas.includes(celdaLocal(col, row));

export const esAgua = (isla: IslaState, col: number, row: number): boolean =>
  isla.agua.includes(celdaLocal(col, row));

export function totalCeldas(islas: IslaState[]): number {
  return islas.reduce((n, isla) => n + isla.suelo.length, 0);
}

/**
 * Celdas vacias pegadas a tierra existente: las unicas donde se puede
 * expandir. Devolverlas explicitamente permite dibujar fantasmas en el mundo
 * y que el jugador vea adonde puede crecer antes de gastar.
 */
export function celdasExpandibles(isla: IslaState): Array<{ col: number; row: number }> {
  const suelo = new Set(isla.suelo);
  const candidatas = new Map<string, { col: number; row: number }>();

  for (const local of isla.suelo) {
    const { col, row } = parseCeldaLocal(local);
    for (const [dc, dr] of VECINAS) {
      const c = col + dc;
      const r = row + dr;
      const clave = celdaLocal(c, r);
      if (!suelo.has(clave)) candidatas.set(clave, { col: c, row: r });
    }
  }
  return [...candidatas.values()];
}

/**
 * Lados de cada celda que quedan al aire libre. Con esto la cerca se dibuja
 * sola en el contorno: el jugador extiende tierra y la valla se reacomoda.
 */
export function bordesDeIsla(
  isla: IslaState,
): Array<{ col: number; row: number; dc: number; dr: number }> {
  const suelo = new Set(isla.suelo);
  const bordes: Array<{ col: number; row: number; dc: number; dr: number }> = [];

  for (const local of isla.suelo) {
    const { col, row } = parseCeldaLocal(local);
    for (const [dc, dr] of VECINAS) {
      if (!suelo.has(celdaLocal(col + dc, row + dr))) bordes.push({ col, row, dc, dr });
    }
  }
  return bordes;
}

/** Caja que contiene todas las islas, en unidades de mundo. */
export function limitesMundo(islas: IslaState[]): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const isla of islas) {
    for (const local of isla.suelo) {
      const { col, row } = parseCeldaLocal(local);
      minX = Math.min(minX, isla.ox + col);
      maxX = Math.max(maxX, isla.ox + col + 1);
      minZ = Math.min(minZ, isla.oz + row);
      maxZ = Math.max(maxZ, isla.oz + row + 1);
    }
  }

  if (!Number.isFinite(minX)) return { minX: -8, maxX: 8, minZ: -6, maxZ: 6 };
  return { minX, maxX, minZ, maxZ };
}

/** Una celda de tierra al azar, para soltar ahi a un animal o al avatar. */
export function celdaAleatoria(
  islas: IslaState[],
  rng = Math.random,
): { x: number; z: number } {
  const conSuelo = islas.filter((i) => i.suelo.length > 0);
  if (conSuelo.length === 0) return { x: 0, z: 0 };

  const isla = conSuelo[Math.floor(rng() * conSuelo.length)];
  const pisables = isla.suelo.filter((local) => {
    const { col, row } = parseCeldaLocal(local);
    return !esAgua(isla, col, row);
  });
  const local = pisables[Math.floor(rng() * pisables.length)] ?? isla.suelo[0];
  const { col, row } = parseCeldaLocal(local);
  return { x: isla.ox + col + 0.5, z: isla.oz + row + 0.5 };
}

/* ------------------------------------------------------------------ */
/* Generacion                                                          */
/* ------------------------------------------------------------------ */

function rectangulo(cols: number, filas: number): string[] {
  const celdas: string[] = [];
  for (let row = 0; row < filas; row++) {
    for (let col = 0; col < cols; col++) celdas.push(celdaLocal(col, row));
  }
  return celdas;
}

/** La isla con la que arranca toda partida: bancal, estanque y adornos. */
export function crearIslaInicial(): IslaState {
  const cols = 13;
  const filas = 9;

  const parcelas: string[] = [];
  for (let row = 2; row <= 4; row++) {
    for (let col = 4; col <= 9; col++) parcelas.push(celdaLocal(col, row));
  }

  const agua: string[] = [];
  for (let row = 6; row <= 7; row++) {
    for (let col = 1; col <= 3; col++) agua.push(celdaLocal(col, row));
  }

  return {
    id: 'casa',
    nombre: 'El jardín',
    ox: -6,
    oz: -4,
    suelo: rectangulo(cols, filas),
    parcelas,
    agua,
    props: [
      { tipo: 'farol', col: 10, row: 6 },
      { tipo: 'maceta', col: 11, row: 2 },
      { tipo: 'regadera', col: 2, row: 3 },
    ],
  };
}

const NOMBRES_ISLA = [
  'Isla del Sur', 'Isla del Té', 'Cabo Menta', 'Islote Canela', 'Isla Amapola',
  'Punta Romero', 'Isla Bruma', 'Cabo Girasol', 'Isla Tomillo',
];

/**
 * Funda una isla nueva en una espiral alrededor del origen, de modo que
 * nunca se superponga con las que ya existen ni quede fuera de alcance.
 */
export function crearIslaNueva(existentes: IslaState[]): IslaState {
  const n = existentes.length;
  const angulo = n * 2.3;
  const radio = 13 + n * BALANCE.separacionIslas;

  const nombre = NOMBRES_ISLA[(n - 1) % NOMBRES_ISLA.length] ?? `Isla ${n}`;

  return {
    id: `isla-${Date.now().toString(36)}`,
    nombre,
    ox: Math.round(Math.cos(angulo) * radio),
    oz: Math.round(Math.sin(angulo) * radio),
    // Arranca chica y pelada: crecerla es parte del juego.
    suelo: rectangulo(5, 5),
    parcelas: [],
    agua: [],
    props: [],
  };
}

export function crearAvatarInicial(): AvatarState {
  return {
    nombre: 'Jardinero',
    piel: '#e8b48c',
    pelo: '#5a3a26',
    ropa: '#6fae5a',
    pantalon: '#4a6a8a',
    sombrero: 'paja',
    colorSombrero: '#e0b463',
    x: 0.5,
    z: 2.5,
  };
}

/* ------------------------------------------------------------------ */
/* Busqueda espacial                                                   */
/* ------------------------------------------------------------------ */

/** Isla y celda que ocupan un punto del mundo, o null si es aire. */
export function celdaEnMundo(
  islas: IslaState[],
  x: number,
  z: number,
): { isla: IslaState; col: number; row: number } | null {
  for (const isla of islas) {
    const col = Math.floor(x - isla.ox);
    const row = Math.floor(z - isla.oz);
    if (tieneSuelo(isla, col, row)) return { isla, col, row };
  }
  return null;
}

/**
 * Hash estable de una celda, en 0..1.
 *
 * Los adornos se sortean con esto en vez de guardarse: asi sobreviven a cada
 * reconstruccion del terreno sin ocupar lugar en la partida guardada.
 */
export function ruidoCelda(semilla: string, col: number, row: number): number {
  let h = 2166136261;
  const texto = `${semilla}:${col}:${row}`;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
