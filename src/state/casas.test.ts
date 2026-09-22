import { describe, expect, it } from 'vitest';
import { modeloCasa } from '../game/art/casas';
import {
  CASAS,
  TIPOS_CASA,
  casaDeId,
  casaEnCelda,
  celdasDeCasa,
  comprarCasa,
  guardarCasa,
  idMaceta,
  ponerCasa,
} from './casas';
import { celdaLocal } from './config';
import { advance, contarFlores, crearEstadoInicial, stageOf } from './sim';
import type { GameState, TipoCasa } from './types';

/** Un jardin con plata, una casa comprada y una isla grande y vacia. */
function conCasa(tipo: TipoCasa = 'enL'): GameState {
  const base = { ...crearEstadoInicial(), monedas: 5000 };
  // Isla de 12x12 de cesped puro: sin parcelas, agua ni objetos que molesten.
  const suelo: string[] = [];
  for (let c = 0; c < 12; c++) for (let r = 0; r < 12; r++) suelo.push(celdaLocal(c, r));
  const isla = { ...base.islas[0], suelo, parcelas: [], agua: [], props: [] };
  return comprarCasa({ ...base, islas: [isla], cultivos: {} }, tipo)!;
}

describe('comprar y poner una casa', () => {
  it('comprarla cobra y la deja guardada', () => {
    const e = conCasa('chalet');
    expect(e.monedas).toBe(5000 - CASAS.chalet.precio);
    expect(e.casasGuardadas?.chalet).toBe(1);
  });

  it('se pone con el centro en la celda tocada y ocupa su huella entera', () => {
    const e = conCasa('enL');
    const isla = e.islas[0];
    const { estado, resultado } = ponerCasa(e, 'enL', isla.id, 6, 6, 'c1');

    expect(resultado).toBe('puesta');
    expect(estado.casasGuardadas?.enL).toBe(0);
    const casa = estado.casas![0];
    expect(celdasDeCasa(casa)).toHaveLength(CASAS.enL.ancho * CASAS.enL.fondo);
    expect(casaEnCelda(estado, isla.id, 6, 6)?.id).toBe('c1');
  });

  it('no entra si se sale de la isla, y no toca nada', () => {
    const e = conCasa();
    const r = ponerCasa(e, 'enL', e.islas[0].id, 0, 0, 'c1');
    expect(r.resultado).toBe('no-entra');
    expect(r.estado).toBe(e);
  });

  it('no se pone sobre parcelas, agua u otra casa', () => {
    const e = conCasa();
    const isla = e.islas[0];
    const conParcela = { ...e, islas: [{ ...isla, parcelas: [celdaLocal(6, 6)] }] };
    expect(ponerCasa(conParcela, 'enL', isla.id, 6, 6, 'c').resultado).toBe('parcela');

    const conAgua = { ...e, islas: [{ ...isla, agua: [celdaLocal(6, 6)] }] };
    expect(ponerCasa(conAgua, 'enL', isla.id, 6, 6, 'c').resultado).toBe('agua');

    const dos = comprarCasa(ponerCasa(e, 'enL', isla.id, 6, 6, 'c1').estado, 'enL')!;
    expect(ponerCasa(dos, 'enL', isla.id, 7, 6, 'c2').resultado).toBe('ocupada');
  });

  it('sin casas guardadas no pone nada', () => {
    const e = { ...conCasa(), casasGuardadas: {} };
    expect(ponerCasa(e, 'enL', e.islas[0].id, 6, 6, 'c').resultado).toBe('sin-casas');
  });
});

describe('las macetas', () => {
  const puesta = () => {
    const e = conCasa();
    return ponerCasa(e, 'enL', e.islas[0].id, 6, 6, 'c1').estado;
  };
  const flor = { variantId: 'tulipan-rojo', plantedAt: 0, growth: 0, humedad: 1, marchitez: 0 };

  it('una flor en maceta crece con el tiempo, igual que en una parcela', () => {
    const e = puesta();
    const id = idMaceta('c1', 0);
    const sembrada = { ...e, cultivos: { [id]: { ...flor, plantedAt: e.ultimoTick } } };
    const despues = advance(sembrada, e.ultimoTick + 10 * 60_000).estado;
    expect(despues.cultivos[id].growth).toBeGreaterThan(0);
  });

  it('se seca y se marchita como cualquier planta si nadie la riega', () => {
    const e = puesta();
    const id = idMaceta('c1', 1);
    const sembrada = { ...e, cultivos: { [id]: { ...flor, plantedAt: e.ultimoTick } } };
    let t = sembrada;
    for (let i = 0; i < 3; i++) t = advance(t, t.ultimoTick + 8 * 3600_000).estado;
    expect(stageOf(t.cultivos[id])).toBe('marchita');
  });

  it('las flores de las macetas cuentan para que lleguen visitantes', () => {
    const e = puesta();
    const abierta = { ...flor, growth: 1 };
    expect(contarFlores({ ...e, cultivos: { [idMaceta('c1', 0)]: abierta } })).toBe(1);
  });

  it('el id de una maceta dice a qué casa pertenece', () => {
    expect(casaDeId(idMaceta('casa-abc', 3))).toBe('casa-abc');
  });
});

describe('mover una casa', () => {
  it('guardarla la saca del jardín y la deja lista para ponerla en otro lado', () => {
    const e = conCasa();
    const puesta = ponerCasa(e, 'enL', e.islas[0].id, 6, 6, 'c1').estado;
    const { estado, resultado } = guardarCasa(puesta, 'c1');

    expect(resultado).toBe('guardada');
    expect(estado.casas).toEqual([]);
    expect(estado.casasGuardadas?.enL).toBe(1);
    expect(ponerCasa(estado, 'enL', e.islas[0].id, 4, 8, 'c2').resultado).toBe('puesta');
  });

  it('NO se puede guardar con flores en las macetas: moverla no borra progreso', () => {
    const e = conCasa();
    const puesta = ponerCasa(e, 'enL', e.islas[0].id, 6, 6, 'c1').estado;
    const id = idMaceta('c1', 2);
    const conFlor = {
      ...puesta,
      cultivos: { [id]: { variantId: 'rosa-roja', plantedAt: 0, growth: 0.8, humedad: 1, marchitez: 0 } },
    };
    const { estado, resultado } = guardarCasa(conFlor, 'c1');

    expect(resultado).toBe('macetas-con-flores');
    expect(estado).toBe(conFlor);
    expect(estado.cultivos[id].growth).toBe(0.8);
  });
});

describe('los modelos 3D', () => {
  it.each(TIPOS_CASA)('%s tiene tantas macetas como dice el catálogo', (tipo) => {
    expect(modeloCasa(tipo).macetas).toHaveLength(CASAS[tipo].macetas);
  });
});
