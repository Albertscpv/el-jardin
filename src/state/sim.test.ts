import { describe, expect, it } from 'vitest';
import { BALANCE } from './config';
import { ENTORNO_NEUTRO, advance, crearEstadoInicial, stageOf } from './sim';
import type { GameState, PlantState } from './types';

const HORA = 3600_000;

/** Un jardín con una sola planta recién regada, a medio crecer. */
function conUnaPlanta(growth = 0.5): { estado: GameState; id: string } {
  const base = crearEstadoInicial();
  const id = 'casa/5,4';
  const planta: PlantState = {
    variantId: 'tulipan-rojo',
    plantedAt: base.ultimoTick,
    growth,
    humedad: 1,
    marchitez: 0,
  };
  return { estado: { ...base, cultivos: { [id]: planta } }, id };
}

describe('marchitez', () => {
  it('aguanta la ausencia más larga que se simula de una vez', () => {
    // Al volver se simulan hasta 8 horas: sobrevivirlas es la regla que
    // importa, porque una ausencia larga no puede matar el jardín entero.
    const { estado, id } = conUnaPlanta();
    const tras = advance(estado, estado.ultimoTick + 8 * HORA).estado;

    expect(stageOf(tras.cultivos[id])).not.toBe('marchita');
    expect(BALANCE.segundosHastaMarchitar).toBeGreaterThan(BALANCE.maxSegundosOffline);
  });

  it('dos ausencias seguidas sin regar sí la marchitan', () => {
    const { estado, id } = conUnaPlanta();
    const primera = advance(estado, estado.ultimoTick + 8 * HORA).estado;
    const segunda = advance(primera, primera.ultimoTick + 8 * HORA).estado;

    expect(stageOf(segunda.cultivos[id])).toBe('marchita');
  });

  it('sin agua deja de crecer mucho antes de marchitarse', () => {
    // Arranca bajo para que el crecimiento no llegue al tope y se pueda medir.
    const { estado, id } = conUnaPlanta(0.1);
    // Sin estación ni lluvia: acá se mide el riego, no el calendario.
    const tras = advance(estado, estado.ultimoTick + 2 * HORA, Math.random, ENTORNO_NEUTRO).estado;
    const planta = tras.cultivos[id];

    expect(planta.humedad).toBe(0);
    expect(stageOf(planta)).not.toBe('marchita');
    // Creció solo lo que duró el agua, no las dos horas.
    const segundosTotales = 4 * 60; // tulipán
    expect(planta.growth).toBeCloseTo(0.1 + BALANCE.segundosDeHumedad / segundosTotales, 5);
  });
});
