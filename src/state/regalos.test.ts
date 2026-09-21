import { describe, expect, it } from 'vitest';
import { REGALOS, aplicarRegalos } from './regalos';
import { crearEstadoInicial } from './sim';
import type { GameState } from './types';

/** Partida como la que dejaria una version anterior: sin el campo nuevo. */
function partidaVieja(monedas: number): GameState {
  const base = crearEstadoInicial();
  const { regalosRecibidos: _, ...sinCampo } = base;
  return { ...sinCampo, monedas };
}

const TOTAL = REGALOS.reduce((n, r) => n + r.monedas, 0);

describe('aplicarRegalos', () => {
  it('acredita el regalo a una partida vieja que no lo tenía', () => {
    const { estado, avisos } = aplicarRegalos(partidaVieja(40));

    expect(estado.monedas).toBe(40 + TOTAL);
    expect(estado.regalosRecibidos).toEqual(REGALOS.map((r) => r.id));
    expect(avisos).toHaveLength(REGALOS.length);
  });

  it('no lo vuelve a acreditar: aplicarlo dos veces da lo mismo que una', () => {
    const una = aplicarRegalos(partidaVieja(40));
    const dos = aplicarRegalos(una.estado);

    expect(dos.estado.monedas).toBe(una.estado.monedas);
    expect(dos.avisos).toEqual([]);
    // Sin cambios devuelve el mismo objeto: no fuerza un guardado inútil.
    expect(dos.estado).toBe(una.estado);
  });

  it('respeta los regalos ya cobrados y solo suma los que faltan', () => {
    const previo: GameState = { ...partidaVieja(100), regalosRecibidos: [REGALOS[0].id] };
    const { estado, avisos } = aplicarRegalos(previo);

    expect(estado.monedas).toBe(100 + (TOTAL - REGALOS[0].monedas));
    expect(avisos).toHaveLength(REGALOS.length - 1);
  });

  it('no toca el resto de la partida', () => {
    const previo = partidaVieja(40);
    const { estado } = aplicarRegalos(previo);

    expect(estado.islas).toBe(previo.islas);
    expect(estado.cultivos).toBe(previo.cultivos);
    expect(estado.semillas).toBe(previo.semillas);
    expect(estado.ultimoTick).toBe(previo.ultimoTick);
  });
});
