import { describe, expect, it } from 'vitest';
import { crearEstadoInicial, stageOf } from './sim';
import {
  TULIPANES_PARA_EL_SECRETO,
  abrirJardinRosa,
  contarTulipan,
  jardinRosaListo,
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
