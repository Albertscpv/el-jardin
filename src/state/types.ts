import type { Palette } from '../game/art/render';

/* ------------------------------------------------------------------ */
/* Contenido (estatico, definido en content.ts)                        */
/* ------------------------------------------------------------------ */

export type FlowerSpeciesId = 'tulipan' | 'rosa' | 'girasol' | 'margarita' | 'lavanda';
export type AnimalSpeciesId =
  | 'mariposa'
  | 'pajaro'
  | 'conejo'
  | 'gato'
  | 'zorro'
  | 'poni'
  | 'yegua'
  | 'caballo'
  | 'rana'
  | 'pez';
export type FoodId =
  | 'nectar'
  | 'alpiste'
  | 'zanahoria'
  | 'pescado'
  | 'bayas'
  | 'heno'
  | 'manzana'
  | 'grillos'
  | 'migas';
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
  /** Celdas de agua que necesita el jardin para que aparezca. Por omision, ninguna. */
  aguaParaVisitar?: number;
  /**
   * Donde vive. 'agua' no sale nunca del estanque y se dibuja hundido;
   * 'orilla' pasea por el agua y por la tierra de al lado. Por omision, tierra.
   */
  habitat?: 'agua' | 'orilla';
  comidaFavorita: FoodId;
  /** px por segundo en el mundo logico. */
  velocidad: number;
  /** Los que vuelan ignoran el suelo y flotan. */
  vuela: boolean;
  /**
   * Hasta donde se aleja de su querencia al pasear, en tiles. Un caballo
   * necesita la isla entera; un conejo, un rincon. Por omision, 4,5.
   */
  radioPaseo?: number;
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
/* Territorio                                                          */
/* ------------------------------------------------------------------ */

/** Clave de una celda dentro de su isla: "col,row". */
export type CeldaLocal = string;

/** Clave global de una celda: "islaId/col,row". */
export type CeldaId = string;

export type PropTipo =
  | 'farol'
  | 'farola'
  | 'maceta'
  | 'regadera'
  | 'nenufar'
  | 'columpio'
  | 'tobogan'
  | 'subibaja'
  | 'arenero';

export interface PropColocado {
  tipo: PropTipo;
  col: number;
  row: number;
}

/**
 * Una isla es un trozo de tierra flotante con su propio sistema de
 * coordenadas. El jardin entero es un conjunto de islas: por eso el jugador
 * puede expandir, arar y fundar islas nuevas sin que nada este cableado.
 */
export interface IslaState {
  id: string;
  nombre: string;
  /** Origen de la isla en tiles, respecto del mundo. */
  ox: number;
  oz: number;
  /** Celdas de tierra que existen, como "col,row". */
  suelo: CeldaLocal[];
  /** Subconjunto de `suelo` que esta arado y admite siembra. */
  parcelas: CeldaLocal[];
  /** Celdas de agua. Decorativas: no se pueden arar ni pisar. */
  agua: CeldaLocal[];
  props: PropColocado[];
}

/* ------------------------------------------------------------------ */
/* Personaje                                                           */
/* ------------------------------------------------------------------ */

export type Sombrero = 'ninguno' | 'paja' | 'gorro' | 'capelina' | 'gorra';
export type Peinado = 'corto' | 'largo' | 'coletas' | 'rodete' | 'rulos';
export type Prenda = 'remera' | 'jardinero' | 'vestido';
export type Accesorio = 'ninguno' | 'flor' | 'lentes' | 'panuelo';

export interface AvatarState {
  nombre: string;
  piel: string;
  pelo: string;
  ropa: string;
  pantalon: string;
  sombrero: Sombrero;
  colorSombrero: string;
  /*
   * Agregados despues: opcionales para que los personajes ya guardados
   * carguen igual. Sin valor, se ven como antes (pelo corto y remera).
   */
  peinado?: Peinado;
  prenda?: Prenda;
  accesorio?: Accesorio;
  colorAccesorio?: string;
  /** Posicion en el mundo 3D. */
  x: number;
  z: number;
}

/* ------------------------------------------------------------------ */
/* Cultivos y animales                                                 */
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

/** Marcador de la practica de tiro. */
export interface Records {
  disparos: number;
  impactos: number;
  /** Distancia del mejor flechazo, en unidades de mundo. */
  mejorDistancia: number;
  /** Bombazos acertados al vecino. */
  mojadas: number;
}

/**
 * Un pedido del pueblo: cosechar cierta cantidad de una especie. Cada flor
 * se sigue vendiendo como siempre; la recompensa del pedido es aparte.
 */
export interface Pedido {
  id: string;
  cliente: string;
  especie: FlowerSpeciesId;
  cantidad: number;
  progreso: number;
  recompensa: number;
}

/** Lo ganado hoy en el campo de tiro, para aplicar el tope diario. */
export interface TiroDiario {
  /** Dia local, como "2026-09-21". */
  dia: string;
  ganado: number;
}

/**
 * Lo que un regalo personal le da a un jugador. Lo escribe a mano un
 * administrador en Supabase, asi que todo es opcional y el juego descarta
 * lo que no reconoce en vez de romperse.
 */
export interface ContenidoRegalo {
  monedas?: number;
  /** variantId -> cantidad, como "tulipan-rojo": 5. */
  semillas?: Record<string, number>;
  comida?: Partial<Record<FoodId, number>>;
  farolas?: number;
  /** Animales ya adoptados. Sin variante, se elige una de la especie. */
  animales?: Array<{ especie: AnimalSpeciesId; nombre?: string; variante?: string }>;
  /** Islas nuevas, cada una con su caballo de la casa. */
  islas?: number;
  /** Celdas de tierra extra en la isla principal. */
  tierra?: number;
}

/** Un regalo personal tal como viene de la base, pendiente de entregar. */
export interface RegaloPersonal {
  id: number;
  mensaje: string;
  contenido: ContenidoRegalo;
}

/** Un regalo personal ya entregado, para mostrarlo en el apartado Regalos. */
export interface RegaloPersonalRecibido {
  id: number;
  mensaje: string;
  recibidoEn: number;
  /** Lo que se entrego de verdad, en frases cortas. */
  resumen: string[];
}

export type TipoCasa = 'enL' | 'alFrente' | 'azotea' | 'chalet';

/** Una casa puesta en el jardin. col/row es la esquina de su huella. */
export interface CasaColocada {
  id: string;
  tipo: TipoCasa;
  islaId: string;
  col: number;
  row: number;
}

export interface GameState {
  version: number;
  nombreJardin: string;
  monedas: number;
  /** variantId -> cantidad. */
  semillas: Record<string, number>;
  /** FoodId -> cantidad. */
  comida: Partial<Record<FoodId, number>>;
  islas: IslaState[];
  /** Solo las celdas que tienen algo plantado, por clave global. */
  cultivos: Record<CeldaId, PlantState>;
  animales: AnimalState[];
  avatar: AvatarState;
  floresCosechadas: number;
  /**
   * Campos agregados despues de la version 5. Son opcionales para que las
   * partidas ya guardadas sigan cargando sin migracion ni perdida.
   */
  records?: Records;
  /** Easter egg descubierto: habilita al vecino y las bombas de agua. */
  rivalDespierto?: boolean;
  /**
   * Ids de los regalos de balance ya entregados a esta partida. Es lo que
   * hace que un regalo se cobre una sola vez sin tocar la version del
   * guardado, que borraria todas las partidas existentes.
   */
  regalosRecibidos?: string[];
  /** Regalos personales ya entregados: evita entregar uno dos veces. */
  regalosPersonales?: RegaloPersonalRecibido[];
  /** Dia local en que se cobro el ultimo regalo diario. */
  regaloDiario?: string;
  /** Islas que ya recibieron su caballo de la casa. */
  islasConCaballo?: string[];
  pedido?: Pedido;
  pedidosCompletados?: number;
  tiroDiario?: TiroDiario;
  /** Objetos comprados y todavia sin colocar, por tipo. */
  objetos?: Partial<Record<PropTipo, number>>;
  /** Casas puestas. Opcional: una partida anterior a las casas no lo tiene. */
  casas?: CasaColocada[];
  /** Casas compradas y todavia sin poner, por tipo. */
  casasGuardadas?: Partial<Record<TipoCasa, number>>;
  creadoEn: number;
  /** Ultimo instante simulado; permite crecer mientras el juego esta cerrado. */
  ultimoTick: number;
}

/* ------------------------------------------------------------------ */
/* Interaccion                                                         */
/* ------------------------------------------------------------------ */

export type ToolId =
  | 'mirar'
  | 'plantar'
  | 'regar'
  | 'cosechar'
  | 'pala'
  | 'mimar'
  | 'alimentar'
  | 'expandir'
  | 'arar'
  | 'farola'
  | 'casa'
  | 'agua'
  | 'juego';

export interface Toast {
  id: number;
  texto: string;
  tono: 'exito' | 'aviso' | 'info';
  /** Si al tocarlo abre la tienda en esa pestaña (por ejemplo, cuando falta comida). */
  abrirTienda?: PestanaTienda;
}

export type PestanaTienda = 'semillas' | 'comida' | 'objetos';
