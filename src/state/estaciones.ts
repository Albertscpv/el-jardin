/**
 * Las estaciones del jardin.
 *
 * Como el clima, no se guardan: se sacan del reloj. Cada estacion dura una
 * semana real y todos los jardines estan en la misma, asi que dos personas
 * que juegan el mismo dia ven el mismo verde.
 *
 * Cada una cambia dos cosas ademas del color: lo rapido que crecen las
 * plantas y lo rapido que se seca la tierra. En invierno casi no crece
 * nada, pero tampoco hay que correr a regar; en verano es al reves.
 */

export type Estacion = 'primavera' | 'verano' | 'otono' | 'invierno';

/** Lo que dura cada estacion, en dias reales. */
export const DIAS_POR_ESTACION = 7;

const DIA_MS = 24 * 60 * 60 * 1000;

export interface PerfilEstacion {
  id: Estacion;
  nombre: string;
  icono: string;
  /** Verdes del cesped, del mas comun al menos. */
  verdes: string[];
  /** Hojas de arbustos y matas. */
  hojas: string[];
  /** Cuanto crecen las plantas respecto de lo normal. */
  crecimiento: number;
  /** Cuanto mas rapido se seca la tierra que lo normal. */
  sequia: number;
  /** Una linea para el jugador, cuando toca el clima. */
  frase: string;
}

export const ESTACIONES: Record<Estacion, PerfilEstacion> = {
  primavera: {
    id: 'primavera',
    nombre: 'Primavera',
    icono: '🌸',
    verdes: ['#5fa14a', '#69ae53', '#74b95a', '#588f42', '#7cc063'],
    hojas: ['#5aa04a', '#6cb85c', '#4e8f40'],
    crecimiento: 1.15,
    sequia: 1,
    frase: 'Todo crece rápido y el aire huele a flor nueva',
  },
  verano: {
    id: 'verano',
    nombre: 'Verano',
    icono: '☀️',
    verdes: ['#6aa83a', '#77b445', '#82bd50', '#5f9a34', '#8cc45c'],
    hojas: ['#61a83a', '#74bb4c', '#4f8f2e'],
    crecimiento: 1,
    // El sol seca la tierra al doble: en verano hay que regar más seguido.
    sequia: 1.7,
    frase: 'El sol pega fuerte: la tierra se seca en un rato',
  },
  otono: {
    id: 'otono',
    nombre: 'Otoño',
    icono: '🍂',
    verdes: ['#8a8f3a', '#9a8a3c', '#7d8438', '#a3913f', '#6f7a34'],
    hojas: ['#b8823a', '#a86f2e', '#c99a4a'],
    crecimiento: 0.8,
    sequia: 0.9,
    frase: 'Las hojas se van poniendo doradas y todo va más lento',
  },
  invierno: {
    id: 'invierno',
    nombre: 'Invierno',
    icono: '❄️',
    verdes: ['#5d7a54', '#688460', '#546e4c', '#728d68', '#4c6647'],
    hojas: ['#5f7a58', '#6d8765', '#51684b'],
    // Casi no crece nada, pero tampoco hay apuro por regar.
    crecimiento: 0.45,
    sequia: 0.55,
    frase: 'El jardín duerme: crece poco, y la tierra aguanta el agua',
  },
};

const ORDEN: Estacion[] = ['primavera', 'verano', 'otono', 'invierno'];

/** En que estacion cae un instante. */
export function estacionDe(ahora = Date.now()): Estacion {
  const bloques = Math.floor(ahora / (DIA_MS * DIAS_POR_ESTACION));
  return ORDEN[((bloques % ORDEN.length) + ORDEN.length) % ORDEN.length];
}

export function perfilDe(ahora = Date.now()): PerfilEstacion {
  return ESTACIONES[estacionDe(ahora)];
}

/** Cuanto falta para que cambie, en milisegundos. */
export function faltaParaLaProxima(ahora = Date.now()): number {
  const largo = DIA_MS * DIAS_POR_ESTACION;
  return largo - (ahora % largo);
}
