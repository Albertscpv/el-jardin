/**
 * "Alimentar a todos": cada animal con hambre recibe su comida favorita,
 * la que necesita, en la cantidad justa para quedar satisfecho.
 *
 * No reemplaza la favorita por otra cosa: si falta, lo dice, para que el
 * jugador sepa que comprar y para quien. Los mas hambrientos comen primero,
 * asi que si la comida no alcanza para todos, alcanza para los que mas la
 * necesitan.
 *
 * Cada porcion tiene el mismo efecto que darla a mano: el boton ahorra
 * toques, no cambia el balance.
 */

import { BALANCE } from './config';
import { ANIMAL_SPECIES, FOODS } from './content';
import type { AnimalState, FoodId, GameState } from './types';

/** Por debajo de esta hambre no hace falta darle nada. */
export const HAMBRE_MINIMA = 25;
/** Hasta donde se lo alimenta: no hace falta llenarlo al cero. */
const HAMBRE_OBJETIVO = 10;

const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

export interface Comida {
  uid: string;
  comida: FoodId;
  porciones: number;
}

export interface Faltante {
  comida: FoodId;
  /** Porciones que faltaron en total. */
  porciones: number;
  /** Animales que se quedaron con hambre (o con menos de lo que necesitaban). */
  uids: string[];
}

export interface ResultadoAlimentar {
  estado: GameState;
  comieron: Comida[];
  faltan: Faltante[];
  /** Cuantos tenian hambre; 0 si nadie necesitaba comer. */
  conHambre: number;
}

/** Porciones de su favorita que necesita un animal para quedar satisfecho. */
export function porcionesNecesarias(animal: AnimalState): number {
  if (animal.hambre < HAMBRE_MINIMA) return 0;
  const comida = FOODS[ANIMAL_SPECIES[animal.especie].comidaFavorita];
  const porPorcion = comida.saciedad * 1.3;
  return Math.max(1, Math.ceil((animal.hambre - HAMBRE_OBJETIVO) / porPorcion));
}

export function alimentarTodos(previo: GameState): ResultadoAlimentar {
  const hambrientos = previo.animales
    .filter((a) => porcionesNecesarias(a) > 0)
    .sort((a, b) => b.hambre - a.hambre);

  const despensa: Partial<Record<FoodId, number>> = { ...previo.comida };
  const comieron: Comida[] = [];
  const faltan = new Map<FoodId, Faltante>();
  const tras = new Map<string, AnimalState>();

  for (const animal of hambrientos) {
    const favorita = ANIMAL_SPECIES[animal.especie].comidaFavorita;
    const necesita = porcionesNecesarias(animal);
    const hay = despensa[favorita] ?? 0;
    const porciones = Math.min(necesita, hay);

    if (porciones < necesita) {
      const f = faltan.get(favorita) ?? { comida: favorita, porciones: 0, uids: [] };
      f.porciones += necesita - porciones;
      f.uids.push(animal.uid);
      faltan.set(favorita, f);
    }
    if (porciones === 0) continue;

    despensa[favorita] = hay - porciones;
    comieron.push({ uid: animal.uid, comida: favorita, porciones });

    let a = animal;
    for (let i = 0; i < porciones; i++) {
      a = {
        ...a,
        hambre: clamp100(a.hambre - FOODS[favorita].saciedad * 1.3),
        felicidad: clamp100(a.felicidad + 16),
        confianza: clamp100(a.confianza + BALANCE.confianzaPorFavorita),
      };
    }
    tras.set(animal.uid, a);
  }

  const estado =
    comieron.length === 0
      ? previo
      : {
          ...previo,
          comida: despensa as GameState['comida'],
          animales: previo.animales.map((a) => tras.get(a.uid) ?? a),
        };

  return { estado, comieron, faltan: [...faltan.values()], conHambre: hambrientos.length };
}
