import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '../types';

/**
 * Se prueba la orquestacion (que partida gana y cuando se sube la local),
 * no el cliente de Supabase. Por eso local y nube se reemplazan por dobles:
 * lo que puede fallar aqui es la decision, no la red.
 */
vi.mock('./local', () => ({
  leerLocal: vi.fn(),
  escribirLocal: vi.fn(),
  borrarLocal: vi.fn(),
}));

vi.mock('./nube', () => ({
  usuarioActual: vi.fn(),
  leerDeNube: vi.fn(),
  escribirEnNube: vi.fn(),
}));

const { leerLocal, escribirLocal } = await import('./local');
const { usuarioActual, leerDeNube, escribirEnNube } = await import('./nube');
const { cargarPartida, guardarPartida, partidaAlEntrar } = await import('./index');

/** Partida minima: solo importa `ultimoTick`, que es lo que desempata. */
function partida(ultimoTick: number, marca: string): GameState {
  return { ultimoTick, nombreJardin: marca } as unknown as GameState;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('cargarPartida', () => {
  it('sin cuenta devuelve la partida del navegador y no toca la nube', async () => {
    vi.mocked(usuarioActual).mockResolvedValue(null);
    vi.mocked(leerLocal).mockReturnValue(partida(100, 'local'));

    const resultado = await cargarPartida();

    expect(resultado?.nombreJardin).toBe('local');
    expect(leerDeNube).not.toHaveBeenCalled();
  });

  it('con cuenta gana la partida simulada mas recientemente', async () => {
    vi.mocked(usuarioActual).mockResolvedValue('u1');
    vi.mocked(leerLocal).mockReturnValue(partida(200, 'local'));
    vi.mocked(leerDeNube).mockResolvedValue(partida(100, 'nube'));

    expect((await cargarPartida())?.nombreJardin).toBe('local');

    vi.mocked(leerDeNube).mockResolvedValue(partida(300, 'nube'));
    expect((await cargarPartida())?.nombreJardin).toBe('nube');
  });

  it('si la nube falla no rompe: sigue con la copia local', async () => {
    vi.mocked(usuarioActual).mockResolvedValue('u1');
    vi.mocked(leerLocal).mockReturnValue(partida(100, 'local'));
    vi.mocked(leerDeNube).mockRejectedValue(new Error('sin red'));

    expect((await cargarPartida())?.nombreJardin).toBe('local');
  });
});

describe('guardarPartida', () => {
  it('guarda local aunque la nube falle', async () => {
    vi.mocked(escribirEnNube).mockRejectedValue(new Error('sin red'));

    await expect(guardarPartida(partida(1, 'x'))).resolves.toBeUndefined();
    expect(escribirLocal).toHaveBeenCalledOnce();
  });
});

describe('partidaAlEntrar', () => {
  it('manda la partida de la cuenta, aunque la local sea mas nueva', async () => {
    vi.mocked(leerDeNube).mockResolvedValue(partida(100, 'nube'));
    vi.mocked(leerLocal).mockReturnValue(partida(999, 'local'));

    // Iniciar sesion significa "traeme mi jardin": la cuenta no se pisa.
    expect((await partidaAlEntrar())?.nombreJardin).toBe('nube');
    expect(escribirEnNube).not.toHaveBeenCalled();
  });

  it('si la cuenta esta vacia adopta lo jugado sin sesion y lo sube', async () => {
    vi.mocked(leerDeNube).mockResolvedValue(null);
    vi.mocked(leerLocal).mockReturnValue(partida(50, 'local'));

    expect((await partidaAlEntrar())?.nombreJardin).toBe('local');
    expect(escribirEnNube).toHaveBeenCalledOnce();
  });

  it('cuenta vacia y navegador vacio arranca de cero sin subir nada', async () => {
    vi.mocked(leerDeNube).mockResolvedValue(null);
    vi.mocked(leerLocal).mockReturnValue(null);

    expect(await partidaAlEntrar()).toBeNull();
    expect(escribirEnNube).not.toHaveBeenCalled();
  });
});
