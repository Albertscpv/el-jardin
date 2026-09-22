import { describe, expect, it } from 'vitest';
import { alimentarTodos, porcionesNecesarias } from './alimentar';
import { crearEstadoInicial } from './sim';
import type { AnimalState, GameState } from './types';

const animal = (uid: string, especie: AnimalState['especie'], hambre: number): AnimalState => ({
  uid, especie, variante: '', nombre: uid, estado: 'adoptado',
  confianza: 100, hambre, felicidad: 50, vinculo: 0, adoptadoEn: 0, x: 0, z: 0, proximoRegalo: 0,
});

function jardin(animales: AnimalState[], comida: GameState['comida']): GameState {
  return { ...crearEstadoInicial(), animales, comida };
}

describe('alimentar a todos', () => {
  it('le da a cada uno su favorita, lo justo para quedar satisfecho', () => {
    const e = jardin([animal('Luna', 'caballo', 90), animal('Copo', 'conejo', 60)], { heno: 10, zanahoria: 10 });
    const r = alimentarTodos(e);

    expect(r.faltan).toEqual([]);
    expect(r.comieron.map((c) => c.comida).sort()).toEqual(['heno', 'zanahoria']);
    for (const a of r.estado.animales) expect(a.hambre).toBeLessThanOrEqual(10);
    // Se gasto exactamente lo que comieron.
    const gastado = r.comieron.reduce((n, c) => n + c.porciones, 0);
    expect((r.estado.comida.heno ?? 0) + (r.estado.comida.zanahoria ?? 0)).toBe(20 - gastado);
  });

  it('no toca a los que no tienen hambre', () => {
    const e = jardin([animal('Luna', 'caballo', 10)], { heno: 5 });
    const r = alimentarTodos(e);
    expect(r.conHambre).toBe(0);
    expect(r.estado).toBe(e);
  });

  it('si falta comida avisa cuánta y para quién, y no la cambia por otra', () => {
    const e = jardin(
      [animal('Luna', 'caballo', 90), animal('Sol', 'yegua', 80), animal('Copo', 'conejo', 60)],
      { heno: 1, zanahoria: 5, nectar: 20 },
    );
    const r = alimentarTodos(e);

    const heno = r.faltan.find((f) => f.comida === 'heno')!;
    expect(heno.uids).toContain('Sol');
    expect(heno.porciones).toBe(
      porcionesNecesarias(e.animales[0]) + porcionesNecesarias(e.animales[1]) - 1,
    );
    // El nectar no se toco: no es lo que necesitan.
    expect(r.estado.comida.nectar).toBe(20);
    // El mas hambriento se llevo la unica porcion.
    expect(r.comieron.find((c) => c.comida === 'heno')?.uid).toBe('Luna');
  });

  it('sin nada de comida, nadie come y se listan todos los faltantes', () => {
    const e = jardin([animal('Luna', 'caballo', 90), animal('Copo', 'conejo', 60)], {});
    const r = alimentarTodos(e);
    expect(r.comieron).toEqual([]);
    expect(r.estado).toBe(e);
    expect(r.faltan.map((f) => f.comida).sort()).toEqual(['heno', 'zanahoria']);
  });
});
