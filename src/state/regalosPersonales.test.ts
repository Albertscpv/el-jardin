import { describe, expect, it } from 'vitest';
import { ANIMAL_SPECIES, ANIMAL_VARIANTS, FLOWER_VARIANTS, FOODS } from './content';
import { aplicarRegaloPersonal } from './regalosPersonales';
import { crearEstadoInicial } from './sim';
import { celdaEnMundo, totalCeldas } from './islas';
import type { ContenidoRegalo, RegaloPersonal } from './types';
// ?raw: el archivo como texto, sin depender de los tipos de Node.
import regalosSql from '../../supabase/regalos.sql?raw';

const AHORA = 1_800_000_000_000;
/** Azar fijo: el mismo regalo da siempre el mismo resultado. */
const fijo = () => 0.3;

const regalo = (contenido: ContenidoRegalo, id = 1, mensaje = 'Te devolvemos tu jardín'): RegaloPersonal => ({
  id,
  mensaje,
  contenido,
});

describe('regalo personal', () => {
  it('entrega monedas, semillas, comida y farolas', () => {
    const inicial = crearEstadoInicial();
    const { estado, resumen } = aplicarRegaloPersonal(
      inicial,
      regalo({ monedas: 3000, semillas: { 'rosa-roja': 5 }, comida: { heno: 4 }, farolas: 2 }),
      AHORA,
      fijo,
    );

    expect(estado.monedas).toBe(inicial.monedas + 3000);
    expect(estado.semillas['rosa-roja']).toBe(5);
    expect(estado.comida.heno).toBe(4);
    expect(estado.objetos?.farola).toBe(2);
    expect(resumen).toEqual(['3000 monedas', '5 semillas', '4 comidas', '2 farolas']);
  });

  it('entrega animales ya adoptados, con nombre y parados sobre tierra', () => {
    const { estado } = aplicarRegaloPersonal(
      crearEstadoInicial(),
      regalo({
        animales: [
          { especie: 'caballo', nombre: 'Canela', variante: 'caballo-zaino' },
          { especie: 'gato' },
        ],
      }),
      AHORA,
      fijo,
    );

    const [canela, gato] = estado.animales;
    expect(canela).toMatchObject({ especie: 'caballo', nombre: 'Canela', variante: 'caballo-zaino', estado: 'adoptado' });
    // Sin nombre, se llama como su especie; sin variante, una valida.
    expect(gato).toMatchObject({ especie: 'gato', nombre: 'Gato', estado: 'adoptado' });
    expect(gato.variante.startsWith('gato-')).toBe(true);
    for (const a of estado.animales) expect(celdaEnMundo(estado.islas, a.x, a.z)).not.toBeNull();
  });

  it('entrega islas nuevas, cada una con su caballo, y tierra en la isla principal', () => {
    const inicial = crearEstadoInicial();
    const { estado, resumen } = aplicarRegaloPersonal(inicial, regalo({ islas: 2, tierra: 15 }), AHORA, fijo);

    expect(estado.islas).toHaveLength(3);
    expect(estado.islas[0].suelo.length).toBe(inicial.islas[0].suelo.length + 15);
    expect(estado.animales.filter((a) => a.especie === 'caballo')).toHaveLength(3);
    expect(totalCeldas(estado.islas)).toBeGreaterThan(totalCeldas(inicial.islas));
    expect(resumen).toEqual(['15 celdas de tierra', '2 islas nuevas']);
  });

  it('no se entrega dos veces', () => {
    const una = aplicarRegaloPersonal(crearEstadoInicial(), regalo({ monedas: 3000 }), AHORA, fijo);
    const dos = aplicarRegaloPersonal(una.estado, regalo({ monedas: 3000 }), AHORA, fijo);

    expect(dos.aplicado).toBe(false);
    expect(dos.estado).toBe(una.estado);
  });

  it('queda anotado con su mensaje y lo que se entregó, para el apartado Regalos', () => {
    const { estado } = aplicarRegaloPersonal(crearEstadoInicial(), regalo({ monedas: 50 }, 7, 'Perdón 💛'), AHORA, fijo);
    expect(estado.regalosPersonales).toEqual([
      { id: 7, mensaje: 'Perdón 💛', recibidoEn: AHORA, resumen: ['50 monedas'] },
    ]);
  });

  it('descarta lo que está mal escrito en vez de romper la partida', () => {
    const inicial = crearEstadoInicial();
    const escrito = {
      monedas: -500,
      semillas: { 'rosa-inexistente': 3, 'tulipan-rojo': 'dos' },
      comida: { toString: 5, pizza: 2 },
      animales: [{ especie: 'dragon' }, { especie: 'constructor' }, { especie: 'toString' }, null],
      islas: 'muchas',
      tierra: Number.NaN,
    } as unknown as ContenidoRegalo;

    const { estado, aplicado, resumen } = aplicarRegaloPersonal(inicial, regalo(escrito), AHORA, fijo);
    expect(aplicado).toBe(true);
    expect(resumen).toEqual([]);
    expect(estado.monedas).toBe(inicial.monedas);
    expect(estado.semillas).toEqual(inicial.semillas);
    expect(estado.animales).toEqual(inicial.animales);
    expect(estado.islas).toEqual(inicial.islas);
  });

  it('acota los números absurdos: un cero de más no rompe nada', () => {
    const { estado } = aplicarRegaloPersonal(
      crearEstadoInicial(),
      regalo({ monedas: 1e12, islas: 500, tierra: 1e6 }),
      AHORA,
      fijo,
    );
    expect(estado.monedas).toBeLessThanOrEqual(1_000_000 + 60);
    expect(estado.islas.length).toBeLessThanOrEqual(11);
  });
});

describe('el ejemplo y la lista de supabase/regalos.sql', () => {
  const comentarios = regalosSql
    .split('\n')
    .filter((l) => l.startsWith('--'))
    .map((l) => l.replace(/^--\s?/, ''))
    .join('\n');

  it('el regalo de ejemplo se entrega entero: nada está mal escrito', () => {
    const json = comentarios.slice(comentarios.indexOf("'{") + 1, comentarios.indexOf("}'::jsonb") + 1);
    const contenido = JSON.parse(json) as ContenidoRegalo;
    const { estado, resumen } = aplicarRegaloPersonal(crearEstadoInicial(), regalo(contenido), AHORA, fijo);

    expect(resumen).toHaveLength(8);
    expect(estado.animales.map((a) => a.nombre)).toEqual(expect.arrayContaining(['Canela', 'Michi']));
  });

  it('la lista de nombres válidos coincide con el juego', () => {
    const lista = (etiqueta: string) =>
      comentarios
        .slice(comentarios.indexOf(etiqueta) + etiqueta.length)
        .split(/\n\S/)[0]
        .split(/[,\s]+/)
        .filter(Boolean);

    expect(new Set(lista('Semillas:'))).toEqual(new Set(FLOWER_VARIANTS.map((v) => v.id)));
    expect(new Set(lista('Comida:'))).toEqual(new Set(Object.keys(FOODS)));
    for (const especie of Object.keys(ANIMAL_SPECIES)) {
      const fila = comentarios.match(new RegExp(`${especie}\\s+-> (.+)`))?.[1] ?? '';
      expect(new Set(fila.split(/,\s*/)), especie).toEqual(
        new Set(ANIMAL_VARIANTS.filter((v) => v.especie === especie).map((v) => v.id)),
      );
    }
  });
});
