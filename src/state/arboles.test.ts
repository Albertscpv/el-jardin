import { describe, expect, it } from 'vitest';
import { ARBOLES, IDS_ARBOLES, arbolesGuardados, comprarArbol, esArbol } from './arboles';
import { ALTURA_ARBOL, cajasArbol } from '../game/art/arboles';
import { celdaLocal } from './config';
import { cantidadDe, propEn, usarObjeto } from './objetos';
import { crearEstadoInicial } from './sim';
import type { Estacion } from './estaciones';
import type { GameState } from './types';

const ESTACIONES: Estacion[] = ['primavera', 'verano', 'otono', 'invierno'];

/** Una isla de césped pelado, con plata. */
function jardin(): GameState {
  const base = crearEstadoInicial();
  const suelo: string[] = [];
  for (let c = 0; c < 8; c++) for (let r = 0; r < 8; r++) suelo.push(celdaLocal(c, r));
  return {
    ...base,
    monedas: 3000,
    cultivos: {},
    islas: [{ ...base.islas[0], suelo, parcelas: [], agua: [], props: [] }],
  };
}

const isla = (e: GameState) => e.islas[0];

describe('comprar y plantar árboles', () => {
  it('comprarlo cobra y lo deja guardado', () => {
    const e = comprarArbol(jardin(), 'cerezo')!;
    expect(e.monedas).toBe(3000 - ARBOLES.cerezo.precio);
    expect(cantidadDe(e, 'cerezo')).toBe(1);
    expect(arbolesGuardados(e)).toEqual([{ arbol: ARBOLES.cerezo, cantidad: 1 }]);
  });

  it('se planta en el césped y se puede sacar sin volver a pagar', () => {
    const e = comprarArbol(jardin(), 'roble')!;
    const plantado = usarObjeto(e, 'roble', isla(e).id, 3, 3);
    expect(plantado.resultado).toBe('colocada');
    expect(propEn(isla(plantado.estado), 3, 3)?.tipo).toBe('roble');

    const sacado = usarObjeto(plantado.estado, 'roble', isla(e).id, 3, 3);
    expect(sacado.resultado).toBe('guardada');
    expect(cantidadDe(sacado.estado, 'roble')).toBe(1);
    expect(sacado.estado.monedas).toBe(plantado.estado.monedas);
  });

  it('esArbol distingue los árboles de los demás objetos', () => {
    for (const id of IDS_ARBOLES) expect(esArbol(id)).toBe(true);
    expect(esArbol('farola')).toBe(false);
    expect(esArbol('columpio')).toBe(false);
  });

  it('sin monedas no se compra', () => {
    expect(comprarArbol({ ...jardin(), monedas: 10 }, 'sauce')).toBeNull();
  });
});

describe('el dibujo de cada árbol', () => {
  it('todos tienen tronco y copa en cualquier estación', () => {
    for (const tipo of IDS_ARBOLES) {
      for (const estacion of ESTACIONES) {
        const cajas = cajasArbol(tipo, estacion);
        expect(cajas.length, `${tipo} en ${estacion}`).toBeGreaterThan(8);
        // Nada por debajo del suelo, y nada más alto de lo que dice el catálogo.
        for (const caja of cajas) {
          expect(caja.y, `${tipo} en ${estacion}`).toBeGreaterThanOrEqual(-0.01);
          expect(caja.y + caja.alto).toBeLessThanOrEqual(ALTURA_ARBOL[tipo] + 0.6);
        }
      }
    }
  });

  it('en invierno los de hoja caduca se quedan pelados, y el pino no', () => {
    const copaEn = (tipo: Parameters<typeof cajasArbol>[0], estacion: Estacion) =>
      new Set(cajasArbol(tipo, estacion).map((c) => c.color)).size;

    // Pelado: quedan tronco y ramas, muchos menos colores que con hojas.
    expect(copaEn('roble', 'invierno')).toBeLessThan(copaEn('roble', 'verano'));
    expect(copaEn('cerezo', 'invierno')).toBeLessThan(copaEn('cerezo', 'primavera'));
    // El pino sigue verde: misma cantidad de colores que en verano.
    expect(copaEn('pino', 'invierno')).toBe(copaEn('pino', 'verano'));
  });

  it('el mismo árbol se dibuja igual siempre, y dos vecinos salen distintos', () => {
    const uno = cajasArbol('roble', 'verano', 7);
    const otraVez = cajasArbol('roble', 'verano', 7);
    const vecino = cajasArbol('roble', 'verano', 8);

    expect(otraVez).toEqual(uno);
    expect(vecino).not.toEqual(uno);
  });

  it('cada estación tiñe la copa distinto', () => {
    const colores = (estacion: Estacion) =>
      [...new Set(cajasArbol('cerezo', estacion, 3).map((c) => c.color))].sort().join();

    const vistos = new Set(ESTACIONES.map(colores));
    expect(vistos.size).toBe(ESTACIONES.length);
  });
});
