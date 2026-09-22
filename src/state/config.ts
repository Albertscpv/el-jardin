import type { CeldaId, CeldaLocal, IslaState } from './types';

/**
 * El personaje que camina por el jardin. Estuvo apagado un tiempo mientras
 * se rediseñaba (ver art/personaje.ts). En false no se instancia ni la
 * malla ni el joystick; nada del guardado depende de esto.
 */
export const PERSONAJE_ACTIVO = true;

/** Pixeles por tile en las matrices de arte. Define la escala del voxel. */
export const TILE = 16;

/* ------------------------------------------------------------------ */
/* Celdas                                                              */
/* ------------------------------------------------------------------ */

export const celdaLocal = (col: number, row: number): CeldaLocal => `${col},${row}`;

export const celdaId = (islaId: string, col: number, row: number): CeldaId =>
  `${islaId}/${col},${row}`;

export function parseCeldaId(id: CeldaId): { islaId: string; col: number; row: number } {
  const barra = id.lastIndexOf('/');
  const islaId = id.slice(0, barra);
  const [col, row] = id.slice(barra + 1).split(',').map(Number);
  return { islaId, col, row };
}

export function parseCeldaLocal(local: CeldaLocal): { col: number; row: number } {
  const [col, row] = local.split(',').map(Number);
  return { col, row };
}

/** Centro de una celda en coordenadas de mundo 3D. */
export function celdaAMundo(isla: IslaState, col: number, row: number): { x: number; z: number } {
  return { x: isla.ox + col + 0.5, z: isla.oz + row + 0.5 };
}

/** Las cuatro celdas vecinas, para bordes de cerca y expansion. */
export const VECINAS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/* ------------------------------------------------------------------ */
/* Balance                                                             */
/* ------------------------------------------------------------------ */

export const BALANCE = {
  /** Segundos que tarda la humedad llena en agotarse. */
  segundosDeHumedad: 210,
  /**
   * Segundos secos hasta que la planta se marchita del todo: 10 horas.
   *
   * Tiene que ganarle a `maxSegundosOffline`. Con los 7 minutos de antes,
   * cualquier ausencia larga volvía con el jardín entero muerto, porque al
   * entrar se simulan hasta 8 horas de golpe. Así una noche sin regar se
   * perdona y dos seguidas no. Sin agua la planta igual deja de crecer: el
   * castigo por no regar pasa a ser no avanzar, no perderlo todo.
   */
  segundosHastaMarchitar: 10 * 3600,
  /** La humedad recuperada por un riego. */
  riego: 1,

  /** Umbrales de crecimiento por etapa. */
  etapaBrote: 0.12,
  etapaCapullo: 0.45,

  /** Probabilidad de recuperar una semilla al cosechar. */
  probabilidadSemilla: 0.35,

  /** Segundos para que un adoptado pase de saciado a hambriento. */
  segundosDeSaciedad: 2700,
  /** Segundos para que la felicidad caiga de 100 a 0 sin atencion. */
  segundosDeFelicidad: 3600,
  /** Minutos entre regalos de un animal feliz. */
  minutosEntreRegalos: 9,

  /** Confianza que da una caricia y una comida a un visitante. */
  confianzaPorCaricia: 6,
  confianzaPorComida: 18,
  confianzaPorFavorita: 30,
  /** Confianza que pierde un visitante ignorado, por segundo. */
  confianzaPerdidaPorSegundo: 0.35 / 60,

  /** Tope de tiempo que se simula al volver, para no castigar ausencias. */
  maxSegundosOffline: 8 * 3600,

  monedasIniciales: 60,

  /* --- Territorio --- */
  /** Costo base de ganarle una celda al vacio. */
  costoTierra: 5,
  /**
   * Cada celda encarece la siguiente: expandir sin fin deberia costar cada vez
   * mas, para que crecer sea una decision y no un tramite. El incremento baja
   * junto con el costo base, si no la curva se comia igual la rebaja despues
   * de veinte celdas.
   */
  incrementoPorCelda: 0.15,
  /** Convertir tierra en parcela de siembra, y volver atras. */
  costoArar: 6,
  /** Fundar una isla nueva. */
  costoIsla: 150,

  /* --- Objetos --- */
  /** Una farola. Se puede guardar y volver a poner gratis: se paga una vez. */
  precioFarola: 45,

  /* --- Economia --- */
  /** Lo que da el regalo diario. */
  regaloDiario: 300,
  /** Monedas por metro de distancia al acertarle a un muneco. */
  monedasPorMetro: 0.35,
  /**
   * Tope de lo que paga el campo de tiro por dia. Sin tope, tirar flechas
   * gratis a un muneco quieto le ganaria a cualquier otra forma de jugar.
   */
  topeTiroDiario: 150,
  /** Fraccion del valor de venta que el pedido paga encima, por flor. */
  bonoPedido: 0.6,

  /** Separacion entre islas, en tiles. */
  separacionIslas: 9,
} as const;

/** Lo que cuesta la proxima celda de tierra, dado el tamano actual. */
export function costoProximaCelda(celdasTotales: number): number {
  return Math.round(BALANCE.costoTierra + celdasTotales * BALANCE.incrementoPorCelda);
}

export const SAVE_VERSION = 5;
/**
 * Conserva el prefijo viejo a proposito. La clave identifica la partida en
 * el navegador: cambiarla al renombrar el juego haria desaparecer los
 * jardines ya guardados, que es justo lo que no tiene que pasar por un
 * cambio cosmetico.
 */
export const SAVE_KEY = 'jardin-pixel:save:v5';
