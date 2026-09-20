/**
 * Clima del jardin.
 *
 * No se guarda en la partida: se deriva del reloj. Un bloque de tiempo da
 * siempre el mismo clima, asi que recargar no lo cambia, todos los jugadores
 * comparten el mismo cielo y no hay un campo mas que migrar.
 */

export type Cielo = 'despejado' | 'nublado' | 'ventoso' | 'lluvia';

export interface Clima {
  cielo: Cielo;
  /** Viento horizontal, en unidades por segundo al cuadrado. +derecha. */
  viento: number;
  /** 0 sin lluvia, 1 aguacero. */
  lluvia: number;
  nombre: string;
  icono: string;
}

/** Cuanto dura un clima antes de cambiar. */
const BLOQUE_MS = 4 * 60_000;

/** Hash estable: el mismo bloque da siempre los mismos numeros. */
function ruido(semilla: number): number {
  let h = Math.imul(semilla ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const PERFILES: Record<Cielo, { nombre: string; icono: string }> = {
  despejado: { nombre: 'Despejado', icono: '☀️' },
  nublado: { nombre: 'Nublado', icono: '☁️' },
  ventoso: { nombre: 'Ventoso', icono: '🍃' },
  lluvia: { nombre: 'Lluvia', icono: '🌧️' },
};

export function climaActual(ahora = Date.now()): Clima {
  const bloque = Math.floor(ahora / BLOQUE_MS);
  const r = ruido(bloque);
  const r2 = ruido(bloque * 7 + 13);

  // Reparto: la mitad de las veces el cielo esta tranquilo, para que el
  // viento fuerte se sienta como un evento y no como la norma.
  let cielo: Cielo;
  if (r < 0.4) cielo = 'despejado';
  else if (r < 0.65) cielo = 'nublado';
  else if (r < 0.85) cielo = 'ventoso';
  else cielo = 'lluvia';

  const fuerza: Record<Cielo, number> = {
    despejado: 0.35,
    nublado: 0.8,
    ventoso: 2.6,
    lluvia: 1.6,
  };

  // El signo tambien sale del bloque: a veces sopla de un lado, a veces del otro.
  const direccion = r2 < 0.5 ? -1 : 1;
  const viento = direccion * fuerza[cielo] * (0.55 + r2 * 0.9);

  return {
    cielo,
    viento: Number(viento.toFixed(2)),
    lluvia: cielo === 'lluvia' ? 0.6 + r2 * 0.4 : 0,
    ...PERFILES[cielo],
  };
}

/** Milisegundos hasta el proximo cambio de clima. */
export function faltaParaCambio(ahora = Date.now()): number {
  return BLOQUE_MS - (ahora % BLOQUE_MS);
}

/** Texto corto del viento, para mostrarle al jugador con que cuenta. */
export function describirViento(viento: number): string {
  const fuerza = Math.abs(viento);
  const lado = viento >= 0 ? '→' : '←';
  if (fuerza < 0.5) return 'Calmo';
  if (fuerza < 1.2) return `${lado} Brisa`;
  if (fuerza < 2.2) return `${lado} Viento`;
  return `${lado} Ventarrón`;
}
