import { describe, expect, it } from 'vitest';
import { COLORES_BESO, LADO_BESO, pixelesDelBeso } from '../game/art/beso';
import { IDS_OBRAS, OBRAS, PROP_ATRIL, comprarObra, esAtril, obraDeAtril, obrasGuardadas } from './arte';
import { celdaLocal } from './config';
import { propEn, usarObjeto } from './objetos';
import { crearEstadoInicial } from './sim';
import type { GameState } from './types';

const C = COLORES_BESO;

/** Cuántos píxeles de una zona tienen alguno de estos colores. */
function proporcion(
  pixeles: string[],
  colores: string[],
  zona: { x0: number; x1: number; y0: number; y1: number },
): number {
  let dentro = 0;
  let total = 0;
  for (let y = Math.floor(zona.y0 * LADO_BESO); y < zona.y1 * LADO_BESO; y++) {
    for (let x = Math.floor(zona.x0 * LADO_BESO); x < zona.x1 * LADO_BESO; x++) {
      total++;
      if (colores.includes(pixeles[y * LADO_BESO + x])) dentro++;
    }
  }
  return dentro / total;
}

describe('la pintura de El beso', () => {
  const pixeles = pixelesDelBeso();

  it('es cuadrada, como el original, y sale igual cada vez', () => {
    expect(pixeles).toHaveLength(LADO_BESO * LADO_BESO);
    expect(pixelesDelBeso()).toEqual(pixeles);
  });

  it('solo usa colores de su paleta', () => {
    const paleta = new Set<string>(Object.values(C));
    for (const color of pixeles) expect(paleta.has(color), color).toBe(true);
  });

  it('el centro es el manto de oro, y no el fondo', () => {
    const oros = [C.oro, C.oroClaro, C.oroOscuro, C.negro, C.blanco, C.plata];
    expect(proporcion(pixeles, oros, { x0: 0.42, x1: 0.58, y0: 0.45, y1: 0.7 })).toBeGreaterThan(0.6);
  });

  it('el manto de él tiene rectángulos blancos y negros', () => {
    const zona = { x0: 0.35, x1: 0.5, y0: 0.35, y1: 0.75 };
    expect(proporcion(pixeles, [C.negro], zona)).toBeGreaterThan(0.04);
    expect(proporcion(pixeles, [C.blanco], zona)).toBeGreaterThan(0.03);
  });

  it('el vestido de ella tiene círculos de colores', () => {
    const zona = { x0: 0.5, x1: 0.72, y0: 0.58, y1: 0.85 };
    const colores = [C.rojo, C.azul, C.violeta, C.verdeFlor];
    expect(proporcion(pixeles, colores, zona)).toBeGreaterThan(0.12);
  });

  it('las caras van arriba, y el prado con flores abajo', () => {
    expect(proporcion(pixeles, [C.piel, C.pielSombra], { x0: 0.5, x1: 0.68, y0: 0.25, y1: 0.42 })).toBeGreaterThan(0.15);
    const prado = [C.prado, C.pradoClaro, C.pradoOscuro, C.florAzul, C.florAmarilla, C.florBlanca, C.florRoja];
    expect(proporcion(pixeles, prado, { x0: 0, x1: 0.25, y0: 0.88, y1: 1 })).toBeGreaterThan(0.7);
  });

  it('se puede pintar más chica sin romperse', () => {
    expect(pixelesDelBeso(32)).toHaveLength(32 * 32);
  });
});

describe('el atril en el jardín', () => {
  function jardin(): GameState {
    const base = crearEstadoInicial();
    const suelo: string[] = [];
    for (let c = 0; c < 6; c++) for (let r = 0; r < 6; r++) suelo.push(celdaLocal(c, r));
    return { ...base, monedas: 1000, cultivos: {}, islas: [{ ...base.islas[0], suelo, parcelas: [], agua: [], props: [] }] };
  }

  it('se compra, se pone y se guarda sin volver a pagar', () => {
    const e = comprarObra(jardin(), 'beso')!;
    expect(e.monedas).toBe(1000 - OBRAS.beso.precio);
    expect(obrasGuardadas(e, 'beso')).toBe(1);

    const puesto = usarObjeto(e, PROP_ATRIL, e.islas[0].id, 2, 2);
    expect(puesto.resultado).toBe('colocada');
    expect(propEn(puesto.estado.islas[0], 2, 2)?.tipo).toBe('atril');

    const guardado = usarObjeto(puesto.estado, PROP_ATRIL, e.islas[0].id, 2, 2);
    expect(guardado.resultado).toBe('guardada');
    expect(obrasGuardadas(guardado.estado, 'beso')).toBe(1);
    expect(guardado.estado.monedas).toBe(puesto.estado.monedas);
  });

  it('cada obra tiene su propio atril, y del atril se sabe la obra', () => {
    const props = IDS_OBRAS.map((id) => OBRAS[id].prop);
    expect(new Set(props).size).toBe(IDS_OBRAS.length);
    for (const id of IDS_OBRAS) {
      expect(esAtril(OBRAS[id].prop)).toBe(true);
      expect(obraDeAtril(OBRAS[id].prop)).toBe(id);
    }
    expect(esAtril('farola')).toBe(false);
  });

  it('comprar una obra no regala otra', () => {
    const e = comprarObra(jardin(), 'grito')!;
    expect(obrasGuardadas(e, 'grito')).toBe(1);
    expect(obrasGuardadas(e, 'beso')).toBe(0);
  });

  it('sin monedas no se compra', () => {
    expect(comprarObra({ ...jardin(), monedas: 10 }, 'beso')).toBeNull();
  });
});
