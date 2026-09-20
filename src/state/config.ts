/** Constantes de mundo y balance. Un solo lugar para tocar el juego. */

/** Pixeles por tile en las matrices de arte. Define la escala del voxel. */
export const TILE = 16;

/** Tamano del jardin, en tiles. Un tile mide 1 unidad de mundo. */
export const WORLD_COLS = 16;
export const WORLD_ROWS = 11;

/** Bancal de siembra, en coordenadas de tile. */
export const PLOT_COLS = 8;
export const PLOT_ROWS = 4;
export const PLOT_ORIGIN_COL = 4;
export const PLOT_ORIGIN_ROW = 3;
export const PLOT_COUNT = PLOT_COLS * PLOT_ROWS;

/** Fila del sendero que cruza el jardin por delante del bancal. */
export const SENDERO_ROW = 7;

/** Estanque decorativo (los animales beben ahi). */
export const POND = { col: 1, row: 7, cols: 3, rows: 3 } as const;

export function plotToTile(index: number): { col: number; row: number } {
  return {
    col: PLOT_ORIGIN_COL + (index % PLOT_COLS),
    row: PLOT_ORIGIN_ROW + Math.floor(index / PLOT_COLS),
  };
}

/**
 * Centro de un tile en coordenadas de mundo 3D.
 * El jardin queda centrado en el origen: X crece a la derecha, Z hacia el
 * frente y Y es la altura. Un tile mide exactamente 1 unidad.
 */
export function tileToWorld(col: number, row: number): { x: number; z: number } {
  return {
    x: col - WORLD_COLS / 2 + 0.5,
    z: row - WORLD_ROWS / 2 + 0.5,
  };
}

export function tileToPlot(col: number, row: number): number | null {
  const c = col - PLOT_ORIGIN_COL;
  const r = row - PLOT_ORIGIN_ROW;
  if (c < 0 || c >= PLOT_COLS || r < 0 || r >= PLOT_ROWS) return null;
  return r * PLOT_COLS + c;
}

/* ------------------------------------------------------------------ */
/* Balance                                                             */
/* ------------------------------------------------------------------ */

export const BALANCE = {
  /** Segundos que tarda la humedad llena en agotarse. */
  segundosDeHumedad: 210,
  /** Segundos secos hasta que la planta se marchita del todo. */
  segundosHastaMarchitar: 420,
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
} as const;

export const SAVE_VERSION = 4;
export const SAVE_KEY = 'jardin-pixel:save:v4';
