import { describe, expect, it } from 'vitest';
import { ICONO_JUEGO } from '../ui/icons';
import { celdaLocal } from './config';
import { IDS_JUEGOS, JUEGOS, comprarJuego, esJuego, juegosGuardados } from './juegos';
import { cantidadDe, propEn, usarObjeto } from './objetos';
import { crearEstadoInicial } from './sim';
import type { GameState } from './types';

/** Una isla de césped pelado, con plata para comprar. */
function jardin(): GameState {
  const base = crearEstadoInicial();
  const suelo: string[] = [];
  for (let c = 0; c < 8; c++) for (let r = 0; r < 8; r++) suelo.push(celdaLocal(c, r));
  return {
    ...base,
    monedas: 2000,
    cultivos: {},
    islas: [{ ...base.islas[0], suelo, parcelas: [], agua: [], props: [] }],
  };
}

const isla = (e: GameState) => e.islas[0];

describe('comprar juegos', () => {
  it('cobra el precio y lo deja guardado', () => {
    const e = comprarJuego(jardin(), 'columpio')!;
    expect(e.monedas).toBe(2000 - JUEGOS.columpio.precio);
    expect(cantidadDe(e, 'columpio')).toBe(1);
    expect(juegosGuardados(e)).toEqual([{ juego: JUEGOS.columpio, cantidad: 1 }]);
  });

  it('sin monedas no se compra nada', () => {
    const pobre = { ...jardin(), monedas: 5 };
    expect(comprarJuego(pobre, 'tobogan')).toBeNull();
  });

  it('esJuego distingue los juegos de los demás objetos', () => {
    for (const id of IDS_JUEGOS) expect(esJuego(id)).toBe(true);
    expect(esJuego('farola')).toBe(false);
    expect(esJuego('nenufar')).toBe(false);
  });
});

describe('poner y sacar un juego', () => {
  it('se pone sobre el césped y se descuenta de lo guardado', () => {
    const e = comprarJuego(jardin(), 'subibaja')!;
    const { estado, resultado } = usarObjeto(e, 'subibaja', isla(e).id, 3, 3);

    expect(resultado).toBe('colocada');
    expect(propEn(isla(estado), 3, 3)?.tipo).toBe('subibaja');
    expect(cantidadDe(estado, 'subibaja')).toBe(0);
  });

  it('volver a tocarlo lo guarda, y moverlo no cuesta monedas', () => {
    const e = comprarJuego(jardin(), 'arenero')!;
    const puesto = usarObjeto(e, 'arenero', isla(e).id, 2, 2).estado;
    const { estado, resultado } = usarObjeto(puesto, 'arenero', isla(e).id, 2, 2);

    expect(resultado).toBe('guardada');
    expect(isla(estado).props).toHaveLength(0);
    expect(cantidadDe(estado, 'arenero')).toBe(1);
    expect(estado.monedas).toBe(puesto.monedas);

    const otroLado = usarObjeto(estado, 'arenero', isla(e).id, 6, 6);
    expect(otroLado.resultado).toBe('colocada');
    expect(otroLado.estado.monedas).toBe(estado.monedas);
  });

  it('no se pone sin tener ninguno, ni sobre parcelas, agua u otro objeto', () => {
    const e = jardin();
    expect(usarObjeto(e, 'columpio', isla(e).id, 3, 3).resultado).toBe('sin-farolas');

    const conJuego = comprarJuego(e, 'columpio')!;
    const conParcela = { ...conJuego, islas: [{ ...isla(conJuego), parcelas: [celdaLocal(1, 1)] }] };
    expect(usarObjeto(conParcela, 'columpio', isla(e).id, 1, 1).resultado).toBe('parcela');

    const conAgua = { ...conJuego, islas: [{ ...isla(conJuego), agua: [celdaLocal(1, 2)] }] };
    expect(usarObjeto(conAgua, 'columpio', isla(e).id, 1, 2).resultado).toBe('agua');

    const ocupada = usarObjeto(comprarJuego(conJuego, 'tobogan')!, 'tobogan', isla(e).id, 4, 4).estado;
    expect(usarObjeto(ocupada, 'columpio', isla(e).id, 4, 4).resultado).toBe('ocupada');

    expect(usarObjeto(conJuego, 'columpio', isla(e).id, 40, 40).resultado).toBe('fuera');
  });

  it('cada juego se guarda con su propio tipo, sin mezclarse', () => {
    let e = comprarJuego(comprarJuego(jardin(), 'columpio')!, 'tobogan')!;
    e = usarObjeto(e, 'columpio', isla(e).id, 1, 1).estado;
    e = usarObjeto(e, 'tobogan', isla(e).id, 5, 5).estado;

    expect(propEn(isla(e), 1, 1)?.tipo).toBe('columpio');
    expect(propEn(isla(e), 5, 5)?.tipo).toBe('tobogan');

    const tras = usarObjeto(e, 'columpio', isla(e).id, 1, 1).estado;
    expect(cantidadDe(tras, 'columpio')).toBe(1);
    expect(cantidadDe(tras, 'tobogan')).toBe(0);
    expect(propEn(isla(tras), 5, 5)?.tipo).toBe('tobogan');
  });
});

describe('los dibujos de los juegos', () => {
  it('cada uno es de 16x16 y no usa letras sin color', () => {
    for (const id of IDS_JUEGOS) {
      const { matriz, paleta } = ICONO_JUEGO[id];
      expect(matriz, id).toHaveLength(16);
      for (const fila of matriz) {
        expect(fila, id).toHaveLength(16);
        for (const ch of fila) if (ch !== '.') expect(paleta[ch], `${ch} en ${id}`).toBeTruthy();
      }
    }
  });
});
