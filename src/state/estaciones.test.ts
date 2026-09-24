import { describe, expect, it } from 'vitest';
import { BALANCE } from './config';
import { DIAS_POR_ESTACION, ESTACIONES, estacionDe, faltaParaLaProxima } from './estaciones';
import { ENTORNO_NEUTRO, advance, crearEstadoInicial } from './sim';
import type { GameState } from './types';

const DIA = 24 * 60 * 60 * 1000;
const HORA = 3600_000;

/** Un jardín con una planta a medio crecer y la tierra mojada. */
function conUnaPlanta(): { estado: GameState; id: string } {
  const base = crearEstadoInicial();
  const id = 'casa/5,4';
  return {
    id,
    estado: {
      ...base,
      cultivos: {
        [id]: { variantId: 'tulipan-rojo', plantedAt: base.ultimoTick, growth: 0.1, humedad: 1, marchitez: 0 },
      },
    },
  };
}

describe('las estaciones', () => {
  it('cada una dura una semana y van en orden', () => {
    const arranque = 0;
    const vistas = [0, 1, 2, 3, 4].map((i) => estacionDe(arranque + i * DIAS_POR_ESTACION * DIA));
    expect(vistas.slice(0, 4)).toEqual(['primavera', 'verano', 'otono', 'invierno']);
    // Y vuelve a empezar.
    expect(vistas[4]).toBe(vistas[0]);
  });

  it('no cambia dentro de la misma semana', () => {
    const lunes = 10 * DIAS_POR_ESTACION * DIA;
    expect(estacionDe(lunes)).toBe(estacionDe(lunes + 6 * DIA));
    expect(estacionDe(lunes)).not.toBe(estacionDe(lunes + 7 * DIA));
  });

  it('dice cuánto falta para la próxima', () => {
    const lunes = 3 * DIAS_POR_ESTACION * DIA;
    expect(faltaParaLaProxima(lunes)).toBe(DIAS_POR_ESTACION * DIA);
    expect(faltaParaLaProxima(lunes + DIA)).toBe((DIAS_POR_ESTACION - 1) * DIA);
  });

  it('todas tienen sus colores y su nombre', () => {
    for (const perfil of Object.values(ESTACIONES)) {
      expect(perfil.verdes.length).toBeGreaterThanOrEqual(3);
      expect(perfil.hojas).toHaveLength(3);
      expect(perfil.nombre.length).toBeGreaterThan(3);
      expect(perfil.crecimiento).toBeGreaterThan(0);
      expect(perfil.sequia).toBeGreaterThan(0);
    }
  });

  it('en invierno crece menos que en primavera', () => {
    expect(ESTACIONES.invierno.crecimiento).toBeLessThan(ESTACIONES.primavera.crecimiento);
    // Y el verano seca más rápido que el invierno.
    expect(ESTACIONES.verano.sequia).toBeGreaterThan(ESTACIONES.invierno.sequia);
  });
});

describe('la estación y el clima en la simulación', () => {
  it('la misma hora rinde distinto según la estación', () => {
    const { estado, id } = conUnaPlanta();
    const crecer = (crecimiento: number) =>
      advance(estado, estado.ultimoTick + HORA, Math.random, { ...ENTORNO_NEUTRO, crecimiento }).estado
        .cultivos[id].growth;

    expect(crecer(ESTACIONES.primavera.crecimiento)).toBeGreaterThan(
      crecer(ESTACIONES.invierno.crecimiento),
    );
  });

  it('con más sequía la tierra queda más seca', () => {
    const { estado, id } = conUnaPlanta();
    const secar = (sequia: number) =>
      advance(estado, estado.ultimoTick + 60_000, Math.random, { ...ENTORNO_NEUTRO, sequia }).estado
        .cultivos[id].humedad;

    expect(secar(ESTACIONES.verano.sequia)).toBeLessThan(secar(ESTACIONES.invierno.sequia));
  });

  it('la lluvia riega sola: con aguacero la tierra queda más mojada', () => {
    const { estado, id } = conUnaPlanta();
    const seca = { ...estado, cultivos: { [id]: { ...estado.cultivos[id], humedad: 0.2 } } };

    const conSol = advance(seca, seca.ultimoTick + 60_000, Math.random, ENTORNO_NEUTRO).estado;
    const conLluvia = advance(seca, seca.ultimoTick + 60_000, Math.random, {
      ...ENTORNO_NEUTRO,
      lluvia: 1,
    }).estado;

    expect(conLluvia.cultivos[id].humedad).toBeGreaterThan(conSol.cultivos[id].humedad);
  });

  it('el entorno no cambia nada más de la partida', () => {
    const { estado } = conUnaPlanta();
    const tras = advance(estado, estado.ultimoTick + HORA, Math.random, {
      crecimiento: 2,
      sequia: 0.1,
      lluvia: 1,
    }).estado;

    expect(tras.monedas).toBe(estado.monedas);
    expect(tras.islas).toEqual(estado.islas);
    expect(BALANCE.maxSegundosOffline).toBeGreaterThan(0);
  });
});
