import { describe, expect, it } from 'vitest';
import { BALANCE, costoProximaCelda } from './config';
import {
  anotarCosecha,
  asegurarCaballos,
  asegurarPedido,
  claveDelDia,
  faltaParaManana,
  nuevoPedido,
  pagarTiro,
  rechazarPedido,
  reclamarRegaloDiario,
  regaloDiarioDisponible,
  restanteTiroHoy,
} from './economia';
import { crearIslaNueva } from './islas';
import { crearEstadoInicial } from './sim';
import type { GameState, Pedido } from './types';

/** Mediodia local de un dia fijo: lejos de la medianoche en cualquier zona. */
const HOY = new Date(2026, 8, 21, 12, 0, 0).getTime();
const MANANA = new Date(2026, 8, 22, 12, 0, 0).getTime();

/** rng que siempre devuelve lo mismo, para pedidos predecibles. */
const fijo = (n: number) => () => n;

describe('días', () => {
  it('usa el día local, con ceros a la izquierda', () => {
    expect(claveDelDia(new Date(2026, 0, 5, 23, 59).getTime())).toBe('2026-01-05');
  });

  it('cambia justo a la medianoche local', () => {
    const antes = new Date(2026, 8, 21, 23, 59, 59).getTime();
    const despues = new Date(2026, 8, 22, 0, 0, 1).getTime();
    expect(claveDelDia(antes)).not.toBe(claveDelDia(despues));
  });

  it('calcula lo que falta hasta mañana', () => {
    expect(faltaParaManana(HOY)).toBe(12 * 3600_000);
  });
});

describe('regalo diario', () => {
  it('está disponible en una partida que nunca lo cobró', () => {
    expect(regaloDiarioDisponible(crearEstadoInicial(), HOY)).toBe(true);
  });

  it('paga una vez por día, aunque se toque dos veces', () => {
    const inicial = crearEstadoInicial();
    const una = reclamarRegaloDiario(inicial, HOY);
    const dos = reclamarRegaloDiario(una, HOY + 60_000);

    expect(una.monedas).toBe(inicial.monedas + BALANCE.regaloDiario);
    expect(dos).toBe(una);
    expect(regaloDiarioDisponible(una, HOY)).toBe(false);
  });

  it('vuelve a estar disponible al día siguiente', () => {
    const cobrado = reclamarRegaloDiario(crearEstadoInicial(), HOY);
    expect(regaloDiarioDisponible(cobrado, MANANA)).toBe(true);
    expect(reclamarRegaloDiario(cobrado, MANANA).monedas).toBe(
      cobrado.monedas + BALANCE.regaloDiario,
    );
  });
});

describe('caballo de la casa', () => {
  it('le da un caballo adoptado y con nombre a cada isla', () => {
    const { estado, nuevos } = asegurarCaballos(crearEstadoInicial(), HOY);

    expect(nuevos).toHaveLength(1);
    const [caballo] = nuevos;
    expect(caballo.especie).toBe('caballo');
    expect(caballo.estado).toBe('adoptado');
    expect(caballo.nombre).toBeTruthy();
    expect(estado.animales).toContain(caballo);
  });

  it('lo pone sobre su isla y no en el vacío', () => {
    const inicial = crearEstadoInicial();
    const isla = inicial.islas[0];
    const [caballo] = asegurarCaballos(inicial, HOY).nuevos;

    const col = Math.floor(caballo.x - isla.ox);
    const row = Math.floor(caballo.z - isla.oz);
    expect(isla.suelo).toContain(`${col},${row}`);
    expect(isla.agua).not.toContain(`${col},${row}`);
  });

  it('no repite el caballo al volver a entrar', () => {
    const una = asegurarCaballos(crearEstadoInicial(), HOY).estado;
    const dos = asegurarCaballos(una, HOY);

    expect(dos.nuevos).toEqual([]);
    expect(dos.estado).toBe(una);
    expect(una.animales.filter((a) => a.especie === 'caballo')).toHaveLength(1);
  });

  it('una isla nueva recibe el suyo, distinto del primero', () => {
    const conUno = asegurarCaballos(crearEstadoInicial(), HOY).estado;
    const conIsla: GameState = { ...conUno, islas: [...conUno.islas, crearIslaNueva(conUno.islas)] };
    const { estado, nuevos } = asegurarCaballos(conIsla, HOY);

    expect(nuevos).toHaveLength(1);
    const caballos = estado.animales.filter((a) => a.especie === 'caballo');
    expect(caballos).toHaveLength(2);
    expect(new Set(caballos.map((c) => c.uid)).size).toBe(2);
    expect(caballos[0].nombre).not.toBe(caballos[1].nombre);
  });

  it('un caballo que llegó solo de visita no cuenta como el de la casa', () => {
    const inicial = crearEstadoInicial();
    const visitante = { ...asegurarCaballos(inicial, HOY).nuevos[0], uid: 'x', estado: 'visitante' as const };
    const { nuevos } = asegurarCaballos({ ...inicial, animales: [visitante] }, HOY);
    expect(nuevos).toHaveLength(1);
  });
});

describe('pedidos', () => {
  const pedido = (p: Partial<Pedido> = {}): Pedido => ({
    id: 'p1',
    cliente: 'La panadería',
    especie: 'tulipan',
    cantidad: 3,
    progreso: 0,
    recompensa: 80,
    ...p,
  });

  it('siempre deja un pedido activo', () => {
    expect(asegurarPedido(crearEstadoInicial()).pedido).toBeDefined();
  });

  it('solo avanza con la especie que pide', () => {
    const estado = { ...crearEstadoInicial(), pedido: pedido() };
    expect(anotarCosecha(estado, 'rosa').avanzo).toBe(false);
    expect(anotarCosecha(estado, 'tulipan').estado.pedido?.progreso).toBe(1);
  });

  it('al completarse paga la recompensa y trae otro pedido distinto', () => {
    const estado = { ...crearEstadoInicial(), pedido: pedido({ progreso: 2 }) };
    const r = anotarCosecha(estado, 'tulipan', fijo(0));

    expect(r.entregado?.cliente).toBe('La panadería');
    expect(r.estado.monedas).toBe(estado.monedas + 80);
    expect(r.estado.pedidosCompletados).toBe(1);
    expect(r.estado.pedido?.especie).not.toBe('tulipan');
    expect(r.estado.pedido?.progreso).toBe(0);
  });

  it('paga encima de la venta: la recompensa siempre es positiva', () => {
    for (const n of [0, 0.3, 0.6, 0.99]) {
      expect(nuevoPedido(undefined, fijo(n)).recompensa).toBeGreaterThan(0);
    }
  });

  it('rechazar trae otro pedido sin cobrar nada', () => {
    const estado = { ...crearEstadoInicial(), pedido: pedido() };
    const otro = rechazarPedido(estado, fijo(0));
    expect(otro.monedas).toBe(estado.monedas);
    expect(otro.pedido?.especie).not.toBe('tulipan');
  });
});

describe('campo de tiro', () => {
  it('paga más cuanto más lejos está el muñeco', () => {
    const e = crearEstadoInicial();
    expect(pagarTiro(e, 26, HOY).pago).toBeGreaterThan(pagarTiro(e, 10, HOY).pago);
  });

  it('no pasa del tope diario', () => {
    let e = crearEstadoInicial();
    const inicial = e.monedas;
    for (let i = 0; i < 200; i++) e = pagarTiro(e, 26, HOY).estado;

    expect(e.monedas - inicial).toBe(BALANCE.topeTiroDiario);
    expect(restanteTiroHoy(e, HOY)).toBe(0);
    expect(pagarTiro(e, 26, HOY).pago).toBe(0);
  });

  it('el tope se renueva al otro día', () => {
    let e = crearEstadoInicial();
    for (let i = 0; i < 200; i++) e = pagarTiro(e, 26, HOY).estado;
    expect(restanteTiroHoy(e, MANANA)).toBe(BALANCE.topeTiroDiario);
    expect(pagarTiro(e, 26, MANANA).pago).toBeGreaterThan(0);
  });
});

describe('terreno', () => {
  it('ampliar el jardín cuesta menos que antes', () => {
    // Antes: 10 + 0,3 por celda. Con las 117 celdas de un jardín mediano,
    // 45 monedas por celda.
    expect(costoProximaCelda(117)).toBeLessThan(45);
    expect(BALANCE.costoIsla).toBeLessThan(260);
  });
});
