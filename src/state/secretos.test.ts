import { describe, expect, it } from 'vitest';
import { crearEstadoInicial, stageOf } from './sim';
import {
  AGUA_PARA_EL_PEZ,
  BONO_FLOR_DORADA,
  TULIPANES_PARA_EL_SECRETO,
  abrirJardinRosa,
  anotarFlorDorada,
  contarTulipan,
  esHoraDelGatoNegro,
  hayLugarParaElPezEnorme,
  jardinRosaListo,
  salioDorada,
} from './secretos';
import type { GameState } from './types';

const cosecharTulipanes = (base: GameState, cuantos: number): GameState => {
  let e = base;
  for (let i = 0; i < cuantos; i++) e = contarTulipan(e, 'tulipan');
  return e;
};

describe('contar tulipanes', () => {
  it('solo cuentan los tulipanes, de cualquier color', () => {
    let e = crearEstadoInicial();
    e = contarTulipan(e, 'tulipan');
    e = contarTulipan(e, 'tulipan');
    e = contarTulipan(e, 'rosa');
    e = contarTulipan(e, 'girasol');
    expect(e.tulipanesCosechados).toBe(2);
  });

  it('una partida vieja, sin el contador, arranca de cero sin romperse', () => {
    const vieja = { ...crearEstadoInicial(), tulipanesCosechados: undefined };
    expect(contarTulipan(vieja, 'tulipan').tulipanesCosechados).toBe(1);
  });
});

describe('el jardín de los cien tulipanes', () => {
  it('no aparece antes de los cien', () => {
    const e = cosecharTulipanes(crearEstadoInicial(), TULIPANES_PARA_EL_SECRETO - 1);
    expect(jardinRosaListo(e)).toBe(false);
    expect(abrirJardinRosa(e, 0)).toBeNull();
  });

  it('a los cien aparece una isla entera de tulipanes rosas ya abiertos', () => {
    const base = cosecharTulipanes(crearEstadoInicial(), TULIPANES_PARA_EL_SECRETO);
    const islasAntes = base.islas.length;
    const secreto = abrirJardinRosa(base, 1_000)!;

    expect(secreto).not.toBeNull();
    expect(secreto.estado.islas).toHaveLength(islasAntes + 1);

    const { isla, estado } = secreto;
    // Arada entera, sin un hueco.
    expect(isla.parcelas).toHaveLength(isla.suelo.length);
    expect(isla.suelo.length).toBeGreaterThan(64);

    const plantas = Object.entries(estado.cultivos).filter(([id]) => id.startsWith(`${isla.id}/`));
    expect(plantas).toHaveLength(isla.suelo.length);
    for (const [, planta] of plantas) {
      expect(planta.variantId).toBe('tulipan-rosa');
      expect(stageOf(planta)).toBe('flor');
    }
  });

  it('se abre una sola vez, aunque sigas cosechando tulipanes', () => {
    const base = cosecharTulipanes(crearEstadoInicial(), TULIPANES_PARA_EL_SECRETO);
    const abierto = abrirJardinRosa(base, 0)!.estado;

    expect(abierto.jardinRosa).toBe(true);
    expect(jardinRosaListo(abierto)).toBe(false);
    expect(abrirJardinRosa(cosecharTulipanes(abierto, 50), 0)).toBeNull();
  });

  it('no toca lo que ya había: islas, flores ni monedas', () => {
    const base = cosecharTulipanes({ ...crearEstadoInicial(), monedas: 300 }, TULIPANES_PARA_EL_SECRETO);
    const { estado } = abrirJardinRosa(base, 0)!;

    expect(estado.monedas).toBe(300);
    for (const isla of base.islas) {
      expect(estado.islas.find((i) => i.id === isla.id)).toEqual(isla);
    }
    for (const [id, planta] of Object.entries(base.cultivos)) {
      expect(estado.cultivos[id]).toEqual(planta);
    }
  });
});

describe('los otros secretos', () => {
  it('la flor dorada es rara, y paga de más', () => {
    expect(salioDorada(() => 0.0001)).toBe(true);
    expect(salioDorada(() => 0.5)).toBe(false);

    const e = { ...crearEstadoInicial(), monedas: 100 };
    const tras = anotarFlorDorada(e);
    expect(tras.monedas).toBe(100 + BONO_FLOR_DORADA);
    expect(tras.floresDoradas).toBe(1);
  });

  it('el gato negro solo cruza a medianoche, con flores, y una sola vez', () => {
    const e = crearEstadoInicial();
    const medianoche = new Date(2026, 0, 2, 0, 20).getTime();
    const mediodia = new Date(2026, 0, 2, 12, 20).getTime();

    expect(esHoraDelGatoNegro(e, medianoche, 3)).toBe(true);
    expect(esHoraDelGatoNegro(e, mediodia, 3)).toBe(false);
    // Sin flores no viene, y si ya vino tampoco.
    expect(esHoraDelGatoNegro(e, medianoche, 0)).toBe(false);
    expect(esHoraDelGatoNegro({ ...e, gatoDeMedianoche: true }, medianoche, 3)).toBe(false);
  });

  it('el pez grande necesita un estanque grande, y aparece una sola vez', () => {
    const e = crearEstadoInicial();
    expect(hayLugarParaElPezEnorme(e, AGUA_PARA_EL_PEZ - 1)).toBe(false);
    expect(hayLugarParaElPezEnorme(e, AGUA_PARA_EL_PEZ)).toBe(true);
    expect(hayLugarParaElPezEnorme({ ...e, pezEnorme: true }, 999)).toBe(false);
  });
});
