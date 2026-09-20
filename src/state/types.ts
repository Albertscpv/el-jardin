import type { Palette } from '../game/art/render';

/* ------------------------------------------------------------------ */
/* Contenido (estatico, definido en content.ts)                        */
/* ------------------------------------------------------------------ */

export type FlowerSpeciesId = 'tulipan' | 'rosa' | 'girasol' | 'margarita' | 'lavanda';
export type AnimalSpeciesId = 'mariposa' | 'pajaro' | 'conejo' | 'gato' | 'zorro';
export type FoodId = 'nectar' | 'alpiste' | 'zanahoria' | 'pescado' | 'bayas';
export type Rarity = 'comun' | 'poco-comun' | 'rara';

export interface FlowerSpecies {
  id: FlowerSpeciesId;
  nombre: string;
  /** Minutos reales desde semilla hasta floracion, con riego constante. */
  minutosCrecimiento: number;
  descripcion: string;
}

export interface FlowerVariant {
  id: string;
  especie: FlowerSpeciesId;
  nombre: string;
  rareza: Rarity;
  precioSemilla: number;
  precioVenta: number;
  /** Colores de petalo (1/2/3) y centro (7/8). */
  palette: Palette;
}

export interface AnimalSpecies {
  id: AnimalSpeciesId;
  nombre: string;
  /** Flores en floracion necesarias para que empiece a visitar el jardin. */
  floresParaVisitar: number;
  comidaFavorita: FoodId;
  /** px por segundo en el mundo logico. */
  velocidad: number;
  /** Los que vuelan ignoran el suelo y flotan. */
  vuela: boolean;
  descripcion: string;
}

export interface AnimalVariant {
  id: string;
  especie: AnimalSpeciesId;
  nombre: string;
  palette: Palette;
}

export interface FoodItem {
  id: FoodId;
  nombre: string;
  precio: number;
  /** Cuanta hambre quita (0-100). */
  saciedad: number;
  palette: Palette;
}

/* ------------------------------------------------------------------ */
/* Estado guardado                                                     */
/* ------------------------------------------------------------------ */

export type GrowthStage = 'semilla' | 'brote' | 'capullo' | 'flor' | 'marchita';

export interface PlantState {
  variantId: string;
  plantedAt: number;
  /** 0..1 hacia la floracion. */
  growth: number;
  /** 0..1, se consume con el tiempo y frena el crecimiento en 0. */
  humedad: number;
  /** 0..1, sube cuando lleva mucho sin agua. En 1 la planta se marchita. */
  marchitez: number;
}

export interface PlotState {
  index: number;
  planta: PlantState | null;
}

export type AnimalStatus = 'visitante' | 'adoptado';

export interface AnimalState {
  uid: string;
  especie: AnimalSpeciesId;
  variante: string;
  /** null mientras sea visitante sin nombre. */
  nombre: string | null;
  estado: AnimalStatus;
  /** 0..100. Un visitante se puede adoptar al llegar a 100. */
  confianza: number;
  /** 0..100, donde 100 es hambre total. */
  hambre: number;
  /** 0..100. */
  felicidad: number;
  /** 0..100, sube lentamente con cuidados sostenidos. */
  vinculo: number;
  adoptadoEn: number | null;
  /** Posicion en el mundo 3D (X a la derecha, Z hacia el frente). */
  x: number;
  z: number;
  /** Momento del proximo regalo si es adoptado y feliz. */
  proximoRegalo: number;
}

export interface GameState {
  version: number;
  nombreJardin: string;
  monedas: number;
  /** variantId -> cantidad. */
  semillas: Record<string, number>;
  /** FoodId -> cantidad. */
  comida: Partial<Record<FoodId, number>>;
  parcelas: PlotState[];
  animales: AnimalState[];
  floresCosechadas: number;
  creadoEn: number;
  /** Ultimo instante simulado; permite crecer mientras el juego esta cerrado. */
  ultimoTick: number;
}

/* ------------------------------------------------------------------ */
/* Interaccion                                                         */
/* ------------------------------------------------------------------ */

export type ToolId = 'plantar' | 'regar' | 'cosechar' | 'pala' | 'mimar' | 'alimentar';

export interface Toast {
  id: number;
  texto: string;
  tono: 'exito' | 'aviso' | 'info';
}
