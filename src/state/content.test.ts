import { describe, expect, it } from 'vitest';
import {
  ANIMAL_MATRIX,
  ANIMAL_POSES,
  ANIMAL_SPECIES,
  ANIMAL_VARIANTS,
  FOODS,
  FOOD_MATRIX,
  favoritosDe,
  variantsOfSpecies,
} from './content';
import { crearEstadoInicial, crearVisitante, especiesDisponibles } from './sim';
import type { AnimalSpeciesId, FoodId } from './types';

const ESPECIES = Object.keys(ANIMAL_SPECIES) as AnimalSpeciesId[];
const COMIDAS = Object.keys(FOODS) as FoodId[];

/**
 * Estos tests no miden balance: cuidan que agregar una especie no deje
 * medio juego sin enterarse. Cada tabla paralela (matriz, variantes,
 * comida) es una oportunidad de olvidarse de una.
 */
describe('catálogo de animales', () => {
  it.each(ESPECIES)('%s tiene dibujo y al menos una variante', (especie) => {
    expect(ANIMAL_MATRIX[especie]).toBeDefined();
    expect(variantsOfSpecies(especie).length).toBeGreaterThan(0);
  });

  it.each(ESPECIES)('%s pide una comida que existe en la tienda', (especie) => {
    expect(FOODS[ANIMAL_SPECIES[especie].comidaFavorita]).toBeDefined();
  });

  it('no repite ids de variante', () => {
    const ids = ANIMAL_VARIANTS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los equinos son más grandes que el resto por su dibujo, no por estirarlos', () => {
    const alto = (id: AnimalSpeciesId) => ANIMAL_MATRIX[id].length;
    for (const id of ['poni', 'yegua', 'caballo'] as const) {
      expect(alto(id)).toBeGreaterThan(alto('gato'));
    }
    expect(alto('poni')).toBeLessThan(alto('caballo'));
  });

  it('las poses de cada especie tienen el tamaño de su dibujo quieto', () => {
    // Si un fotograma midiera distinto, el animal cambiaria de tamano al
    // caminar: el plano se arma con la medida de la pose quieta.
    for (const [id, poses] of Object.entries(ANIMAL_POSES)) {
      const quieto = ANIMAL_MATRIX[id as AnimalSpeciesId];
      for (const m of [...poses!.paso, poses!.pastar]) {
        expect(m.length).toBe(quieto.length);
        expect(new Set(m.map((f) => f.length))).toEqual(new Set([quieto[0].length]));
      }
      expect(poses!.paso).toHaveLength(4);
    }
  });

  it('el paso mueve las patas y deja el cuerpo quieto', () => {
    const { quieto, paso } = ANIMAL_POSES.caballo!;
    const cuerpo = (m: readonly string[]) => m.slice(0, 20).join('\n');
    for (const f of paso) expect(cuerpo(f)).toBe(cuerpo(quieto));
    // Y al menos dos tiempos del paso se ven distintos entre si.
    expect(new Set(paso.map((f) => f.join('\n'))).size).toBeGreaterThan(1);
  });
});

describe('catálogo de comida', () => {
  it.each(COMIDAS)('%s tiene dibujo', (comida) => {
    expect(FOOD_MATRIX[comida]).toBeDefined();
  });

  it('nombra a los animales que prefieren cada comida', () => {
    // El heno era el caso que la tabla vieja no conocía.
    expect(favoritosDe('heno')).toContain('caballos');
    expect(favoritosDe('heno')).toContain('yeguas');
    expect(favoritosDe('manzana')).toContain('ponis');
    expect(favoritosDe('nectar')).toBe('las mariposas');
  });

  it('usa el artículo que corresponde al género del nombre', () => {
    expect(favoritosDe('heno').startsWith('las yeguas')).toBe(true);
    expect(favoritosDe('pescado')).toBe('los gatos');
  });
});

describe('llegada de visitantes', () => {
  it('los equinos solo aparecen con un jardín muy florecido', () => {
    const conPocasFlores = especiesDisponibles(10);
    expect(conPocasFlores).not.toContain('caballo');
    expect(conPocasFlores).not.toContain('yegua');
    expect(conPocasFlores).not.toContain('poni');

    expect(especiesDisponibles(40)).toEqual(expect.arrayContaining(['poni', 'yegua', 'caballo']));
  });

  it('crea un equino válido y sobre tierra firme', () => {
    const estado = crearEstadoInicial();
    const isla = estado.islas[0];

    for (const especie of ['poni', 'yegua', 'caballo'] as const) {
      const animal = crearVisitante(especie, estado);
      expect(animal.especie).toBe(especie);
      expect(variantsOfSpecies(especie).map((v) => v.id)).toContain(animal.variante);
      expect(animal.estado).toBe('visitante');
      // Dentro de la caja de la isla: no aparece flotando en el vacío.
      expect(animal.x).toBeGreaterThanOrEqual(isla.ox);
      expect(animal.z).toBeGreaterThanOrEqual(isla.oz);
    }
  });
});
