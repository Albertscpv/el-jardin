import { describe, expect, it } from 'vitest';
import {
  CELDAS_POR_BALDE,
  alternarNenufar,
  bordesDeAgua,
  celdaAcuaticaCercana,
  celdasDeAgua,
  secarCelda,
  verterAgua,
} from './agua';
import { comprarCasa, ponerCasa } from './casas';
import { celdaLocal } from './config';
import { esAgua } from './islas';
import { crearEstadoInicial } from './sim';
import type { GameState } from './types';

/** Una isla de 10x10 de césped pelado: sin parcelas, agua ni objetos. */
function jardinLlano(): GameState {
  const base = crearEstadoInicial();
  const suelo: string[] = [];
  for (let c = 0; c < 10; c++) for (let r = 0; r < 10; r++) suelo.push(celdaLocal(c, r));
  return {
    ...base,
    monedas: 5000,
    cultivos: {},
    islas: [{ ...base.islas[0], suelo, parcelas: [], agua: [], props: [] }],
  };
}

const isla = (e: GameState) => e.islas[0];

describe('verter agua', () => {
  it('moja la celda tocada y se derrama hasta gastar el balde', () => {
    const e = jardinLlano();
    const { estado, resultado, mojadas } = verterAgua(e, isla(e).id, 5, 5);

    expect(resultado).toBe('vertida');
    expect(mojadas).toBe(CELDAS_POR_BALDE);
    expect(celdasDeAgua(estado)).toBe(CELDAS_POR_BALDE);
    expect(esAgua(isla(estado), 5, 5)).toBe(true);
    // Lo mojado es un charco pegado, no celdas sueltas.
    for (const local of isla(estado).agua) {
      const [c, r] = local.split(',').map(Number);
      expect(Math.abs(c - 5) + Math.abs(r - 5)).toBeLessThanOrEqual(2);
    }
  });

  it('el derrame rodea las parcelas, las flores y las casas en vez de taparlas', () => {
    const e = jardinLlano();
    const conParcelas = {
      ...e,
      islas: [{ ...isla(e), parcelas: [celdaLocal(5, 4), celdaLocal(4, 5), celdaLocal(6, 5)] }],
    };
    const { estado } = verterAgua(conParcelas, isla(e).id, 5, 5);

    expect(esAgua(isla(estado), 5, 4)).toBe(false);
    expect(esAgua(isla(estado), 4, 5)).toBe(false);
    expect(esAgua(isla(estado), 6, 5)).toBe(false);
    expect(isla(estado).parcelas).toHaveLength(3);
  });

  it('no se puede volcar sobre una parcela, sobre agua ni fuera de la isla', () => {
    const e = jardinLlano();
    const conParcela = { ...e, islas: [{ ...isla(e), parcelas: [celdaLocal(2, 2)] }] };
    expect(verterAgua(conParcela, isla(e).id, 2, 2).resultado).toBe('parcela');

    const mojado = verterAgua(e, isla(e).id, 5, 5).estado;
    expect(verterAgua(mojado, isla(e).id, 5, 5).resultado).toBe('ya-hay-agua');

    const fuera = verterAgua(e, isla(e).id, 40, 40);
    expect(fuera.resultado).toBe('fuera');
    expect(fuera.estado).toBe(e);
  });

  it('no moja el suelo que ocupa una casa', () => {
    const e = jardinLlano();
    const conCasa = ponerCasa(comprarCasa(e, 'enL')!, 'enL', isla(e).id, 5, 5, 'c1').estado;
    const { estado, resultado } = verterAgua(conCasa, isla(e).id, 2, 5);

    expect(resultado).toBe('vertida');
    for (const local of isla(estado).agua) {
      const [c, r] = local.split(',').map(Number);
      // La casa en L ocupa 5x3 centrada en (5,5): columnas 3..7, filas 4..6.
      expect(c >= 3 && c <= 7 && r >= 4 && r <= 6).toBe(false);
    }
  });

  it('el charco se dibuja a mano: cada balde moja solo donde tocás', () => {
    const e = jardinLlano();
    const uno = verterAgua(e, isla(e).id, 5, 5).estado;
    // Al lado no se mojó nada.
    for (const [c, r] of [[4, 5], [6, 5], [5, 4], [5, 6]]) {
      expect(esAgua(isla(uno), c, r)).toBe(false);
    }

    const dos = verterAgua(uno, isla(e).id, 5, 6).estado;
    expect(celdasDeAgua(dos)).toBe(2);
    expect(esAgua(isla(dos), 5, 6)).toBe(true);
  });
});

describe('secar y nenúfares', () => {
  it('la pala saca el agua de una celda y el nenúfar que tenga encima', () => {
    const e = jardinLlano();
    const mojado = verterAgua(e, isla(e).id, 5, 5).estado;
    const conNenufar = alternarNenufar(mojado, isla(e).id, 5, 5).estado;
    expect(conNenufar.islas[0].props).toHaveLength(1);

    const { estado, secada } = secarCelda(conNenufar, isla(e).id, 5, 5);
    expect(secada).toBe(true);
    expect(esAgua(isla(estado), 5, 5)).toBe(false);
    expect(isla(estado).props).toHaveLength(0);
    // Las otras celdas del charco siguen ahí.
    expect(celdasDeAgua(estado)).toBe(CELDAS_POR_BALDE - 1);
  });

  it('el nenúfar se pone y se saca tocando, y solo sobre el agua', () => {
    const e = jardinLlano();
    const mojado = verterAgua(e, isla(e).id, 5, 5).estado;

    const puesto = alternarNenufar(mojado, isla(e).id, 5, 5);
    expect(puesto.resultado).toBe('puesto');
    const sacado = alternarNenufar(puesto.estado, isla(e).id, 5, 5);
    expect(sacado.resultado).toBe('quitado');
    expect(sacado.estado.islas[0].props).toHaveLength(0);

    expect(alternarNenufar(mojado, isla(e).id, 9, 9).resultado).toBe('sin-agua');
  });
});

describe('agua y animales', () => {
  it('un pez solo va a celdas con agua', () => {
    const e = jardinLlano();
    const mojado = verterAgua(e, isla(e).id, 5, 5).estado;
    const mojadas = isla(mojado).agua.map((l) => l.split(',').map(Number));

    for (let i = 0; i < 20; i++) {
      const p = celdaAcuaticaCercana(mojado.islas, isla(mojado).ox + 5.5, isla(mojado).oz + 5.5, 4)!;
      const col = Math.floor(p.x - isla(mojado).ox);
      const row = Math.floor(p.z - isla(mojado).oz);
      expect(mojadas.some(([c, r]) => c === col && r === row)).toBe(true);
    }
  });

  it('sin agua en ningún lado, no hay adónde nadar', () => {
    const e = jardinLlano();
    expect(celdaAcuaticaCercana(e.islas, 5, 5, 4)).toBeNull();
  });

  it('la rana también puede salir a la orilla', () => {
    const e = jardinLlano();
    const mojado = verterAgua(e, isla(e).id, 5, 5).estado;
    const centroX = isla(mojado).ox + 5.5;
    const centroZ = isla(mojado).oz + 5.5;
    const destinos = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const p = celdaAcuaticaCercana(mojado.islas, centroX, centroZ, 3, Math.random, true)!;
      destinos.add(`${p.x},${p.z}`);
    }
    expect(destinos.size).toBeGreaterThan(isla(mojado).agua.length);
  });
});

describe('bordes por donde cae el agua', () => {
  it('el agua contra el borde de la isla cuenta como caída', () => {
    const base = crearEstadoInicial();
    const e = {
      ...base,
      cultivos: {},
      islas: [{ ...base.islas[0], suelo: [celdaLocal(0, 0)], parcelas: [], agua: [celdaLocal(0, 0)], props: [] }],
    };
    // Una celda sola: cae por sus cuatro lados.
    expect(bordesDeAgua(isla(e))).toHaveLength(4);
  });

  it('el agua rodeada de tierra no cae por ningún lado', () => {
    const e = jardinLlano();
    const mojado = { ...e, islas: [{ ...isla(e), agua: [celdaLocal(5, 5)] }] };
    expect(bordesDeAgua(isla(mojado))).toHaveLength(0);
  });
});
