import * as M from '../game/art/matrices';
import type { Matrix } from '../game/art/matrices';
import type { Palette } from '../game/art/render';
import type {
  AnimalSpecies,
  AnimalSpeciesId,
  AnimalVariant,
  FlowerSpecies,
  FlowerSpeciesId,
  FlowerVariant,
  FoodId,
  FoodItem,
  Accesorio,
  AvatarState,
  Peinado,
  Prenda,
  Sombrero,
} from './types';
import { paletaPersonaje, spritePersonaje, type Pose } from '../game/art/personaje';

/* ------------------------------------------------------------------ */
/* Flores                                                              */
/* ------------------------------------------------------------------ */

export const FLOWER_SPECIES: Record<FlowerSpeciesId, FlowerSpecies> = {
  tulipan: {
    id: 'tulipan',
    nombre: 'Tulipán',
    minutosCrecimiento: 4,
    descripcion: 'Rápido y agradecido. La flor con la que casi todos empiezan.',
  },
  margarita: {
    id: 'margarita',
    nombre: 'Margarita',
    minutosCrecimiento: 3,
    descripcion: 'Crece en nada y aguanta el descuido mejor que ninguna.',
  },
  lavanda: {
    id: 'lavanda',
    nombre: 'Lavanda',
    minutosCrecimiento: 6,
    descripcion: 'Su aroma atrae mariposas mucho antes de florecer.',
  },
  rosa: {
    id: 'rosa',
    nombre: 'Rosa',
    minutosCrecimiento: 9,
    descripcion: 'Lenta y exigente con el agua, pero se paga sola.',
  },
  girasol: {
    id: 'girasol',
    nombre: 'Girasol',
    minutosCrecimiento: 12,
    descripcion: 'Tarda, ocupa espacio y vale cada minuto de espera.',
  },
};

/** Plural de cada especie. No sale de agregar una "s": tulipán, girasol. */
const PLURAL_FLOR: Record<FlowerSpeciesId, string> = {
  tulipan: 'tulipanes',
  margarita: 'margaritas',
  lavanda: 'lavandas',
  rosa: 'rosas',
  girasol: 'girasoles',
};

/** "1 tulipán", "4 tulipanes": el nombre de la flor que toca a la cantidad. */
export function nombreFlor(especie: FlowerSpeciesId, cantidad: number): string {
  return cantidad === 1 ? FLOWER_SPECIES[especie].nombre.toLowerCase() : PLURAL_FLOR[especie];
}

/** Matriz de la flor abierta por especie. Las otras etapas son compartidas. */
export const BLOOM_MATRIX: Record<FlowerSpeciesId, Matrix> = {
  tulipan: M.TULIP,
  rosa: M.ROSE,
  girasol: M.SUNFLOWER,
  margarita: M.DAISY,
  lavanda: M.LAVENDER,
};

export const FLOWER_VARIANTS: FlowerVariant[] = [
  // --- Tulipanes -------------------------------------------------------
  {
    id: 'tulipan-rojo',
    especie: 'tulipan',
    nombre: 'Tulipán rojo',
    rareza: 'comun',
    precioSemilla: 4,
    precioVenta: 14,
    palette: { '1': '#ff8a7a', '2': '#e8433f', '3': '#a71f2b' },
  },
  {
    id: 'tulipan-amarillo',
    especie: 'tulipan',
    nombre: 'Tulipán amarillo',
    rareza: 'comun',
    precioSemilla: 4,
    precioVenta: 15,
    palette: { '1': '#ffe07a', '2': '#f7c035', '3': '#c98a12' },
  },
  {
    id: 'tulipan-rosa',
    especie: 'tulipan',
    nombre: 'Tulipán rosa',
    rareza: 'poco-comun',
    precioSemilla: 5,
    precioVenta: 22,
    palette: { '1': '#ffb3d1', '2': '#f06fa6', '3': '#b83d75' },
  },
  {
    id: 'tulipan-morado',
    especie: 'tulipan',
    nombre: 'Tulipán morado',
    rareza: 'rara',
    precioSemilla: 10,
    precioVenta: 42,
    palette: { '1': '#c9a6f0', '2': '#9b5de5', '3': '#6a2fa0' },
  },

  // --- Rosas -----------------------------------------------------------
  {
    id: 'rosa-roja',
    especie: 'rosa',
    nombre: 'Rosa roja',
    rareza: 'comun',
    precioSemilla: 8,
    precioVenta: 38,
    palette: { '1': '#f4746e', '2': '#d8323c', '3': '#8f1a2c' },
  },
  {
    id: 'rosa-rosada',
    especie: 'rosa',
    nombre: 'Rosa rosada',
    rareza: 'poco-comun',
    precioSemilla: 11,
    precioVenta: 48,
    palette: { '1': '#ffc2da', '2': '#f27bb0', '3': '#b84a80' },
  },
  {
    id: 'rosa-blanca',
    especie: 'rosa',
    nombre: 'Rosa blanca',
    rareza: 'poco-comun',
    precioSemilla: 11,
    precioVenta: 50,
    palette: { '1': '#fffdf7', '2': '#e2ddcd', '3': '#a9a392' },
  },
  {
    id: 'rosa-durazno',
    especie: 'rosa',
    nombre: 'Rosa durazno',
    rareza: 'rara',
    precioSemilla: 18,
    precioVenta: 82,
    palette: { '1': '#ffd2a8', '2': '#f79f5c', '3': '#c26a2e' },
  },

  // --- Girasoles -------------------------------------------------------
  {
    id: 'girasol-clasico',
    especie: 'girasol',
    nombre: 'Girasol',
    rareza: 'comun',
    precioSemilla: 12,
    precioVenta: 58,
    palette: {
      '1': '#ffd447',
      '2': '#e8a319',
      '3': '#c98a12',
      '7': '#7a4a22',
      '8': '#4a2a12',
    },
  },
  {
    id: 'girasol-rojizo',
    especie: 'girasol',
    nombre: 'Girasol rojizo',
    rareza: 'rara',
    precioSemilla: 23,
    precioVenta: 110,
    palette: {
      '1': '#f2a05a',
      '2': '#c95f2a',
      '3': '#9c451c',
      '7': '#6b3a1c',
      '8': '#3d1f0e',
    },
  },

  // --- Margaritas ------------------------------------------------------
  {
    id: 'margarita-blanca',
    especie: 'margarita',
    nombre: 'Margarita',
    rareza: 'comun',
    precioSemilla: 3,
    precioVenta: 9,
    palette: {
      '1': '#fffef8',
      '2': '#dcd8c8',
      '3': '#b8b4a4',
      '7': '#ffd447',
      '8': '#e8a319',
    },
  },
  {
    id: 'margarita-rosada',
    especie: 'margarita',
    nombre: 'Margarita rosada',
    rareza: 'poco-comun',
    precioSemilla: 5,
    precioVenta: 20,
    palette: {
      '1': '#ffd6e6',
      '2': '#f0a8c8',
      '3': '#cc7fa4',
      '7': '#ffd447',
      '8': '#e8a319',
    },
  },

  // --- Lavandas --------------------------------------------------------
  {
    id: 'lavanda-clasica',
    especie: 'lavanda',
    nombre: 'Lavanda',
    rareza: 'comun',
    precioSemilla: 6,
    precioVenta: 26,
    palette: { '1': '#cbb3f0', '2': '#9b7fd4', '3': '#6a4fa0' },
  },
  {
    id: 'lavanda-azul',
    especie: 'lavanda',
    nombre: 'Lavanda azul',
    rareza: 'poco-comun',
    precioSemilla: 9,
    precioVenta: 38,
    palette: { '1': '#a8c8f0', '2': '#6f96d8', '3': '#3f5fa0' },
  },
];

export const FLOWER_VARIANT_BY_ID = new Map(FLOWER_VARIANTS.map((v) => [v.id, v]));

export function getFlowerVariant(id: string): FlowerVariant {
  const v = FLOWER_VARIANT_BY_ID.get(id);
  if (!v) throw new Error(`Variedad de flor desconocida: ${id}`);
  return v;
}

/* ------------------------------------------------------------------ */
/* Animales                                                            */
/* ------------------------------------------------------------------ */

export const ANIMAL_SPECIES: Record<AnimalSpeciesId, AnimalSpecies> = {
  mariposa: {
    id: 'mariposa',
    nombre: 'Mariposa',
    floresParaVisitar: 1,
    comidaFavorita: 'nectar',
    velocidad: 26,
    vuela: true,
    descripcion: 'La primera en llegar. Se posa donde haya color.',
  },
  pajaro: {
    id: 'pajaro',
    nombre: 'Pájaro',
    floresParaVisitar: 3,
    comidaFavorita: 'alpiste',
    velocidad: 34,
    vuela: true,
    descripcion: 'Curioso y nervioso. Confía despacio.',
  },
  conejo: {
    id: 'conejo',
    nombre: 'Conejo',
    floresParaVisitar: 6,
    comidaFavorita: 'zanahoria',
    velocidad: 22,
    vuela: false,
    descripcion: 'Se queda si el jardín está bien regado.',
  },
  gato: {
    id: 'gato',
    nombre: 'Gato',
    floresParaVisitar: 10,
    comidaFavorita: 'pescado',
    velocidad: 18,
    vuela: false,
    descripcion: 'Viene cuando quiere. Se queda cuando le conviene.',
  },
  zorro: {
    id: 'zorro',
    nombre: 'Zorro',
    floresParaVisitar: 16,
    comidaFavorita: 'bayas',
    velocidad: 28,
    vuela: false,
    descripcion: 'Raro y desconfiado. Adoptarlo toma paciencia.',
  },

  // Los equinos llegan tarde: necesitan un jardin grande para pastar, y
  // comen heno, que no le interesa a ningun otro animal.
  poni: {
    id: 'poni',
    nombre: 'Poni',
    floresParaVisitar: 22,
    comidaFavorita: 'manzana',
    velocidad: 20,
    vuela: false,
    radioPaseo: 7,
    descripcion: 'Chico, terco y muy sociable. El primero de los equinos en acercarse.',
  },
  yegua: {
    id: 'yegua',
    nombre: 'Yegua',
    floresParaVisitar: 30,
    comidaFavorita: 'heno',
    velocidad: 24,
    vuela: false,
    radioPaseo: 9,
    descripcion: 'Tranquila y observadora. Si confia en vos, no se va mas.',
  },
  rana: {
    id: 'rana',
    nombre: 'Rana',
    floresParaVisitar: 2,
    aguaParaVisitar: 4,
    habitat: 'orilla',
    comidaFavorita: 'grillos',
    velocidad: 16,
    vuela: false,
    radioPaseo: 4,
    descripcion: 'Vive entre los nenúfares. De noche se la escucha desde lejos.',
  },
  pez: {
    id: 'pez',
    nombre: 'Pez',
    floresParaVisitar: 1,
    aguaParaVisitar: 6,
    habitat: 'agua',
    comidaFavorita: 'migas',
    velocidad: 20,
    vuela: false,
    radioPaseo: 5,
    descripcion: 'No sale del agua. Cuanto más grande el estanque, más se pasea.',
  },
  caballo: {
    id: 'caballo',
    nombre: 'Caballo',
    floresParaVisitar: 38,
    comidaFavorita: 'heno',
    velocidad: 30,
    vuela: false,
    radioPaseo: 9,
    descripcion: 'El animal mas grande del jardin. Cuesta ganarselo y se nota cuando pasa.',
  },
};

export const ANIMAL_MATRIX: Record<AnimalSpeciesId, Matrix> = {
  mariposa: M.BUTTERFLY,
  pajaro: M.BIRD,
  conejo: M.RABBIT,
  gato: M.CAT,
  zorro: M.FOX,
  poni: M.PONY,
  yegua: M.HORSE,
  caballo: M.HORSE,
  rana: M.FROG,
  pez: M.PEZ,
};

/**
 * Especies con mas de una pose. Las que no estan aca se dibujan siempre con
 * su matriz de ANIMAL_MATRIX; las que si, caminan moviendo las patas y
 * pastan cuando se detienen.
 */
export const ANIMAL_POSES: Partial<Record<AnimalSpeciesId, M.Poses>> = {
  poni: M.PONI,
  yegua: M.CABALLO,
  caballo: M.CABALLO,
};

const OJO = { e: '#2a2320', f: '#ffffff' };

export const ANIMAL_VARIANTS: AnimalVariant[] = [
  // --- Mariposas -------------------------------------------------------
  {
    id: 'mariposa-monarca',
    especie: 'mariposa',
    nombre: 'Monarca',
    palette: { a: '#e88a2a', c: '#ffd9a0', d: '#3a3038', e: '#3a3038' },
  },
  {
    id: 'mariposa-azul',
    especie: 'mariposa',
    nombre: 'Morfo azul',
    palette: { a: '#5b8ff0', c: '#cfe0ff', d: '#2a2f45', e: '#2a2f45' },
  },
  {
    id: 'mariposa-blanca',
    especie: 'mariposa',
    nombre: 'Blanca',
    palette: { a: '#f8f6ef', c: '#ded9c6', d: '#4a463c', e: '#4a463c' },
  },

  // --- Pájaros ---------------------------------------------------------
  {
    id: 'pajaro-azul',
    especie: 'pajaro',
    nombre: 'Azulejo',
    palette: { a: '#5b8ff0', b: '#3a63b8', c: '#e8f0ff', g: '#f7b32b', ...OJO },
  },
  {
    id: 'pajaro-rojo',
    especie: 'pajaro',
    nombre: 'Cardenal',
    palette: { a: '#e0453f', b: '#a8262a', c: '#ffd9cf', g: '#f7b32b', ...OJO },
  },
  {
    id: 'pajaro-amarillo',
    especie: 'pajaro',
    nombre: 'Canario',
    palette: { a: '#f7cf3a', b: '#c99c14', c: '#fff6cf', g: '#e88a2a', ...OJO },
  },

  // --- Conejos ---------------------------------------------------------
  {
    id: 'conejo-blanco',
    especie: 'conejo',
    nombre: 'Blanco',
    palette: { a: '#f6f2ea', b: '#cdc6b8', c: '#ffffff', d: '#f2a0a8', ...OJO },
  },
  {
    id: 'conejo-cafe',
    especie: 'conejo',
    nombre: 'Café',
    palette: { a: '#a8764a', b: '#7a5433', c: '#e0c4a0', d: '#f2a0a8', ...OJO },
  },
  {
    id: 'conejo-gris',
    especie: 'conejo',
    nombre: 'Gris',
    palette: { a: '#9aa0ad', b: '#6e7481', c: '#e2e6ee', d: '#f2a0a8', ...OJO },
  },

  // --- Ranas -----------------------------------------------------------
  {
    id: 'rana-verde',
    especie: 'rana',
    nombre: 'Verde',
    palette: { a: '#6aa83a', b: '#477a26', c: '#cfe08a', f: '#2f5a1e', d: '#ffffff', e: '#2a2320' },
  },
  {
    id: 'rana-dorada',
    especie: 'rana',
    nombre: 'Dorada',
    palette: { a: '#d8b03a', b: '#a8801e', c: '#f4e2a0', f: '#6a5216', d: '#ffffff', e: '#2a2320' },
  },
  {
    id: 'rana-turquesa',
    especie: 'rana',
    nombre: 'Turquesa',
    palette: { a: '#3aa8a0', b: '#227a74', c: '#a8e0dc', f: '#155a56', d: '#ffffff', e: '#2a2320' },
  },

  // --- Peces -----------------------------------------------------------
  {
    id: 'pez-naranja',
    especie: 'pez',
    nombre: 'Naranja',
    palette: { a: '#f08a3a', b: '#f7b86a', ...OJO },
  },
  {
    id: 'pez-blanco',
    especie: 'pez',
    nombre: 'Blanco y rojo',
    palette: { a: '#f6f2ea', b: '#e0584a', ...OJO },
  },
  {
    id: 'pez-azul',
    especie: 'pez',
    nombre: 'Azul',
    palette: { a: '#4a8ad8', b: '#8ac0f0', ...OJO },
  },

  // --- Gatos -----------------------------------------------------------
  {
    id: 'gato-naranja',
    especie: 'gato',
    nombre: 'Naranja',
    palette: { a: '#f0954a', b: '#c56a2a', c: '#ffd9b0', d: '#f2a0a8', ...OJO },
  },
  {
    id: 'gato-gris',
    especie: 'gato',
    nombre: 'Gris',
    palette: { a: '#9aa0ad', b: '#6e7481', c: '#e2e6ee', d: '#f2a0a8', ...OJO },
  },
  {
    id: 'gato-negro',
    especie: 'gato',
    nombre: 'Negro',
    palette: { a: '#4a4552', b: '#2e2b36', c: '#7a7488', d: '#d88a94', ...OJO },
  },
  {
    id: 'gato-blanco',
    especie: 'gato',
    nombre: 'Blanco',
    palette: { a: '#f6f2ea', b: '#cdc6b8', c: '#ffffff', d: '#f2a0a8', ...OJO },
  },

  // --- Zorros ----------------------------------------------------------
  {
    id: 'zorro-rojo',
    especie: 'zorro',
    nombre: 'Rojo',
    palette: { a: '#e0722a', b: '#a84a18', c: '#fff0e0', d: '#3a3038', ...OJO },
  },
  {
    id: 'zorro-artico',
    especie: 'zorro',
    nombre: 'Ártico',
    palette: { a: '#e8eef6', b: '#b8c2d0', c: '#ffffff', d: '#3a3038', ...OJO },
  },

  // --- Ponis -----------------------------------------------------------
  {
    id: 'poni-canela',
    especie: 'poni',
    nombre: 'Canela',
    palette: { a: '#c98a52', b: '#96602f', c: '#f0d6b0', d: '#5a3a22', g: '#3f2c1c', ...OJO },
  },
  {
    id: 'poni-pinto',
    especie: 'poni',
    nombre: 'Pinto',
    palette: { a: '#f0e6d8', b: '#b8a894', c: '#ffffff', d: '#4a3a30', g: '#3a2e26', ...OJO },
  },
  {
    id: 'poni-gris',
    especie: 'poni',
    nombre: 'Tordillo',
    palette: { a: '#a8aab4', b: '#7a7c88', c: '#e4e6ee', d: '#4a4a56', g: '#33333d', ...OJO },
  },

  // --- Yeguas ----------------------------------------------------------
  {
    id: 'yegua-alazana',
    especie: 'yegua',
    nombre: 'Alazana',
    palette: { a: '#c26a38', b: '#94441f', c: '#f0c496', d: '#e8d8b8', g: '#4a3020', ...OJO },
  },
  {
    id: 'yegua-baya',
    especie: 'yegua',
    nombre: 'Baya',
    palette: { a: '#d8a860', b: '#a87c3c', c: '#f6e2bc', d: '#2e2620', g: '#3a2e22', ...OJO },
  },
  {
    id: 'yegua-blanca',
    especie: 'yegua',
    nombre: 'Blanca',
    palette: { a: '#f4f0e8', b: '#cdc6b8', c: '#ffffff', d: '#e0d8c4', g: '#4a443a', ...OJO },
  },

  // --- Caballos --------------------------------------------------------
  {
    id: 'caballo-negro',
    especie: 'caballo',
    nombre: 'Azabache',
    palette: { a: '#4a4048', b: '#2c262f', c: '#6e6474', d: '#1e1a22', g: '#171319', ...OJO },
  },
  {
    id: 'caballo-zaino',
    especie: 'caballo',
    nombre: 'Zaino',
    palette: { a: '#7a4a2e', b: '#512e1a', c: '#b0764a', d: '#2a1c12', g: '#241810', ...OJO },
  },
  {
    id: 'caballo-tordillo',
    especie: 'caballo',
    nombre: 'Tordillo',
    palette: { a: '#9aa0ad', b: '#6e7481', c: '#dde2ea', d: '#3a3e48', g: '#2a2e36', ...OJO },
  },
];

export const ANIMAL_VARIANT_BY_ID = new Map(ANIMAL_VARIANTS.map((v) => [v.id, v]));

export function getAnimalVariant(id: string): AnimalVariant {
  const v = ANIMAL_VARIANT_BY_ID.get(id);
  if (!v) throw new Error(`Variedad de animal desconocida: ${id}`);
  return v;
}

/** Especies de nombre femenino. Sin esto el juego dice "un yegua". */
const FEMENINAS = new Set<AnimalSpeciesId>(['mariposa', 'yegua']);

/** "una mariposa", "un caballo": el articulo que le toca a cada especie. */
export function unArticulo(especie: AnimalSpeciesId): string {
  const nombre = ANIMAL_SPECIES[especie].nombre.toLowerCase();
  return `${FEMENINAS.has(especie) ? 'una' : 'un'} ${nombre}`;
}

/**
 * Quienes prefieren esta comida, en plural y con su articulo.
 *
 * Se deriva de ANIMAL_SPECIES en vez de repetirse en una tabla aparte: esa
 * tabla ya se habia quedado vieja una vez, y la tienda anunciaba que el heno
 * no era favorito de nadie mientras los caballos lo pedian.
 */
export function favoritosDe(comida: FoodId): string {
  const especies = (Object.keys(ANIMAL_SPECIES) as AnimalSpeciesId[]).filter(
    (id) => ANIMAL_SPECIES[id].comidaFavorita === comida,
  );
  if (especies.length === 0) return 'nadie en particular';

  const nombres = especies.map(
    (id) => `${FEMENINAS.has(id) ? 'las' : 'los'} ${ANIMAL_SPECIES[id].nombre.toLowerCase()}s`,
  );
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

export function variantsOfSpecies(especie: AnimalSpeciesId): AnimalVariant[] {
  return ANIMAL_VARIANTS.filter((v) => v.especie === especie);
}

/* ------------------------------------------------------------------ */
/* Comida                                                              */
/* ------------------------------------------------------------------ */

export const FOOD_MATRIX: Record<FoodId, Matrix> = {
  nectar: M.NECTAR,
  alpiste: M.BIRDSEED,
  zanahoria: M.CARROT,
  pescado: M.FISH,
  bayas: M.BERRIES,
  heno: M.HAY,
  manzana: M.APPLE,
  grillos: M.GRILLOS,
  migas: M.MIGAS,
};

export const FOODS: Record<FoodId, FoodItem> = {
  nectar: {
    id: 'nectar',
    nombre: 'Néctar',
    precio: 3,
    saciedad: 30,
    palette: { a: '#f2b33a', c: '#ffe08a', d: '#b0b6c4' },
  },
  alpiste: {
    id: 'alpiste',
    nombre: 'Alpiste',
    precio: 3,
    saciedad: 30,
    palette: { a: '#e8c87a', c: '#fff0c0', d: '#8a6238' },
  },
  zanahoria: {
    id: 'zanahoria',
    nombre: 'Zanahoria',
    precio: 5,
    saciedad: 38,
    palette: { a: '#f0873a', b: '#c25f1e', d: '#5aa03c' },
  },
  bayas: {
    id: 'bayas',
    nombre: 'Bayas',
    precio: 6,
    saciedad: 42,
    palette: { a: '#c0396a', c: '#e87fa0', d: '#4a8a3c' },
  },
  pescado: {
    id: 'pescado',
    nombre: 'Pescado',
    precio: 8,
    saciedad: 50,
    palette: { a: '#7fa8c8', c: '#dbe8f2', e: '#2a2320' },
  },
  heno: {
    id: 'heno',
    nombre: 'Heno',
    // Un caballo come mucho: el fardo llena mas que nada y cuesta acorde.
    precio: 14,
    saciedad: 70,
    palette: { a: '#e0c274', b: '#b8954a', d: '#8a6a3a' },
  },
  grillos: {
    id: 'grillos',
    nombre: 'Grillos',
    precio: 4,
    saciedad: 34,
    palette: { a: '#8a6a3a', b: '#5a4426', d: '#2f2a20' },
  },
  migas: {
    id: 'migas',
    nombre: 'Migas',
    precio: 3,
    saciedad: 30,
    palette: { a: '#e8c87a', b: '#c99c4a', d: '#8a6a3a' },
  },
  manzana: {
    id: 'manzana',
    nombre: 'Manzana',
    precio: 6,
    saciedad: 34,
    palette: { a: '#d8434a', c: '#f0959a', d: '#6a4a2a', e: '#5aa03c' },
  },
};

export const FOOD_LIST = Object.values(FOODS);

/* ------------------------------------------------------------------ */
/* Personaje                                                           */
/* ------------------------------------------------------------------ */

export const PIELES = ['#f7dcc0', '#e8b48c', '#c88d62', '#96603c', '#5e3a26'];

export const PELOS = [
  '#2a2320', '#5a3a26', '#8a5a33', '#c98a3a',
  '#e8d8b0', '#b0504a', '#6a5a9a', '#4a7a6a',
];

export const ROPAS = [
  '#6fae5a', '#e0785a', '#6f96d8', '#d8a13a',
  '#b06fb0', '#e8e4d8', '#4a6a8a', '#d85a7a',
];

export const PANTALONES = ['#4a6a8a', '#5a4a3a', '#3a4a5a', '#6a5a4a', '#2e3b32'];

export const COLORES_SOMBRERO = ['#e0b463', '#c85a4a', '#5a8ad8', '#e8e4d8', '#3a3038'];

export const SOMBREROS: Array<{ id: Sombrero; nombre: string }> = [
  { id: 'ninguno', nombre: 'Sin sombrero' },
  { id: 'paja', nombre: 'De paja' },
  { id: 'capelina', nombre: 'Capelina' },
  { id: 'gorra', nombre: 'Gorra' },
  { id: 'gorro', nombre: 'Gorro de lana' },
];

export const PEINADOS: Array<{ id: Peinado; nombre: string }> = [
  { id: 'corto', nombre: 'Corto' },
  { id: 'largo', nombre: 'Largo' },
  { id: 'coletas', nombre: 'Coletas' },
  { id: 'rodete', nombre: 'Rodete' },
  { id: 'rulos', nombre: 'Rulos' },
];

export const PRENDAS: Array<{ id: Prenda; nombre: string }> = [
  { id: 'remera', nombre: 'Remera' },
  { id: 'jardinero', nombre: 'Jardinero' },
  { id: 'vestido', nombre: 'Vestido' },
];

export const ACCESORIOS: Array<{ id: Accesorio; nombre: string }> = [
  { id: 'ninguno', nombre: 'Nada' },
  { id: 'flor', nombre: 'Flor en el pelo' },
  { id: 'lentes', nombre: 'Lentes' },
  { id: 'panuelo', nombre: 'Pañuelo' },
];

export const COLORES_ACCESORIO = ['#e86a8a', '#f2b33a', '#6f96d8', '#8ac86a', '#b06fb0', '#e8e4d8'];

/**
 * Paleta del avatar a partir de las elecciones del jugador. Las sombras,
 * el contorno y las mejillas se derivan solos: elegir veinte colores seria
 * un trabajo, no una personalizacion.
 */
export function paletaAvatar(avatar: AvatarState): Palette {
  return paletaPersonaje(avatar);
}

/** Sprite del avatar en una pose, con pelo, accesorio y sombrero puestos. */
export function matrizAvatar(avatar: AvatarState, pose: Pose = 'quieto'): Matrix {
  return spritePersonaje(avatar, pose);
}
