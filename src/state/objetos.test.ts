import { describe, expect, it } from 'vitest';
import { BALANCE } from './config';
import { cantidadDe, comprarFarolas, propEn, usarFarola } from './objetos';
import { crearEstadoInicial } from './sim';
import type { GameState } from './types';

/** Un jardin nuevo con farolas ya compradas. */
function conFarolas(n: number): GameState {
  return { ...crearEstadoInicial(), monedas: 1000, objetos: { farola: n } };
}

/** Una celda de cesped libre: con suelo, sin agua, sin parcela y sin objetos. */
function cesped(estado: GameState) {
  const isla = estado.islas[0];
  const libre = isla.suelo
    .map((c) => c.split(',').map(Number) as [number, number])
    .find(
      ([col, row]) =>
        !isla.agua.includes(`${col},${row}`) &&
        !isla.parcelas.includes(`${col},${row}`) &&
        !propEn(isla, col, row),
    )!;
  return { isla, col: libre[0], row: libre[1] };
}

describe('comprar farolas', () => {
  it('cobra el precio y las suma al inventario', () => {
    const tras = comprarFarolas(conFarolas(0), 3)!;
    expect(tras.monedas).toBe(1000 - BALANCE.precioFarola * 3);
    expect(cantidadDe(tras, 'farola')).toBe(3);
  });

  it('no compra si no alcanzan las monedas', () => {
    const pobre = { ...crearEstadoInicial(), monedas: BALANCE.precioFarola - 1 };
    expect(comprarFarolas(pobre)).toBeNull();
  });
});

describe('poner y guardar', () => {
  it('pone una farola en el césped y la descuenta', () => {
    const inicial = conFarolas(2);
    const { isla, col, row } = cesped(inicial);
    const { estado, resultado } = usarFarola(inicial, isla.id, col, row);

    expect(resultado).toBe('colocada');
    expect(propEn(estado.islas[0], col, row)?.tipo).toBe('farola');
    expect(cantidadDe(estado, 'farola')).toBe(1);
    // Poner no cobra: ya se pago al comprarla.
    expect(estado.monedas).toBe(inicial.monedas);
  });

  it('tocar una farola la guarda, y moverla no cuesta nada', () => {
    const inicial = conFarolas(1);
    const { isla, col, row } = cesped(inicial);
    const puesta = usarFarola(inicial, isla.id, col, row).estado;
    const { estado, resultado } = usarFarola(puesta, isla.id, col, row);

    expect(resultado).toBe('guardada');
    expect(propEn(estado.islas[0], col, row)).toBeUndefined();
    expect(cantidadDe(estado, 'farola')).toBe(1);
    expect(estado.monedas).toBe(inicial.monedas);
  });

  it('sin farolas en el inventario no pone nada', () => {
    const inicial = conFarolas(0);
    const { isla, col, row } = cesped(inicial);
    const r = usarFarola(inicial, isla.id, col, row);
    expect(r.resultado).toBe('sin-farolas');
    expect(r.estado).toBe(inicial);
  });

  it('no va en una parcela: taparía la siembra', () => {
    const inicial = conFarolas(1);
    const isla = inicial.islas[0];
    const [col, row] = isla.parcelas[0].split(',').map(Number);
    expect(usarFarola(inicial, isla.id, col, row).resultado).toBe('parcela');
  });

  it('no va en el agua', () => {
    const inicial = conFarolas(1);
    const isla = inicial.islas[0];
    const [col, row] = isla.agua[0].split(',').map(Number);
    expect(usarFarola(inicial, isla.id, col, row).resultado).toBe('agua');
  });

  it('no pisa otro objeto ni se lleva el farol de la isla', () => {
    const inicial = conFarolas(1);
    const isla = inicial.islas[0];
    const farol = isla.props.find((p) => p.tipo === 'farol')!;
    const r = usarFarola(inicial, isla.id, farol.col, farol.row);

    expect(r.resultado).toBe('ocupada');
    expect(r.estado).toBe(inicial);
  });

  it('fuera de la isla no hace nada', () => {
    const inicial = conFarolas(1);
    expect(usarFarola(inicial, inicial.islas[0].id, 99, 99).resultado).toBe('fuera');
  });
});
