import { describe, expect, it } from 'vitest';
import { verterAgua } from './agua';
import { alternarCamino, esCamino, losasPuestas } from './caminos';
import { comprarCasa, ponerCasa } from './casas';
import { celdaLocal } from './config';
import { comprarJuego } from './juegos';
import { usarObjeto } from './objetos';
import { crearEstadoInicial } from './sim';
import type { GameState } from './types';

/** Una isla de 10x10 de césped pelado, con plata. */
function jardin(): GameState {
  const base = crearEstadoInicial();
  const suelo: string[] = [];
  for (let c = 0; c < 10; c++) for (let r = 0; r < 10; r++) suelo.push(celdaLocal(c, r));
  return {
    ...base,
    monedas: 5000,
    cultivos: {},
    islas: [{ ...base.islas[0], suelo, parcelas: [], agua: [], props: [], camino: [] }],
  };
}

const isla = (e: GameState) => e.islas[0];

describe('caminos de piedra', () => {
  it('una losa se pone y se saca tocando', () => {
    const e = jardin();
    const puesto = alternarCamino(e, isla(e).id, 3, 3);
    expect(puesto.resultado).toBe('puesto');
    expect(esCamino(isla(puesto.estado), 3, 3)).toBe(true);

    const sacado = alternarCamino(puesto.estado, isla(e).id, 3, 3);
    expect(sacado.resultado).toBe('sacado');
    expect(esCamino(isla(sacado.estado), 3, 3)).toBe(false);
    expect(losasPuestas(sacado.estado)).toBe(0);
  });

  it('se puede dibujar un camino largo, losa por losa', () => {
    let e = jardin();
    for (let c = 0; c < 6; c++) e = alternarCamino(e, isla(e).id, c, 4).estado;
    expect(losasPuestas(e)).toBe(6);
  });

  it('no va sobre parcelas, agua, objetos ni casas', () => {
    const e = jardin();

    const conParcela = { ...e, islas: [{ ...isla(e), parcelas: [celdaLocal(1, 1)] }] };
    expect(alternarCamino(conParcela, isla(e).id, 1, 1).resultado).toBe('parcela');

    const conAgua = verterAgua(e, isla(e).id, 2, 2).estado;
    expect(alternarCamino(conAgua, isla(e).id, 2, 2).resultado).toBe('agua');

    const conJuego = usarObjeto(comprarJuego(e, 'columpio')!, 'columpio', isla(e).id, 4, 4).estado;
    expect(alternarCamino(conJuego, isla(e).id, 4, 4).resultado).toBe('ocupada');

    const conCasa = ponerCasa(comprarCasa(e, 'enL')!, 'enL', isla(e).id, 7, 7, 'c1').estado;
    expect(alternarCamino(conCasa, isla(e).id, 7, 7).resultado).toBe('ocupada');

    expect(alternarCamino(e, isla(e).id, 40, 40).resultado).toBe('fuera');
  });

  it('sacar el camino deja el césped como estaba', () => {
    const e = jardin();
    const puesto = alternarCamino(e, isla(e).id, 5, 5).estado;
    const sacado = alternarCamino(puesto, isla(e).id, 5, 5).estado;

    expect(isla(sacado).suelo).toEqual(isla(e).suelo);
    expect(isla(sacado).parcelas).toEqual(isla(e).parcelas);
    expect(sacado.monedas).toBe(e.monedas);
  });

  it('una partida vieja, sin caminos, no se rompe', () => {
    const base = jardin();
    const vieja = { ...base, islas: [{ ...isla(base), camino: undefined }] };
    expect(esCamino(isla(vieja), 0, 0)).toBe(false);
    expect(losasPuestas(vieja)).toBe(0);
    expect(alternarCamino(vieja, isla(vieja).id, 0, 0).resultado).toBe('puesto');
  });
});
