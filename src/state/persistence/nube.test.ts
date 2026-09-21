import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '../types';

/**
 * Supabase de mentira: guarda una sola fila, como la tabla real para un
 * usuario, y anota cada escritura. Lo que se prueba es que ninguna
 * escritura pise un jardin distinto, que es como se puede perder uno.
 */
interface Fila {
  usuario_id: string;
  estado: GameState;
}

const db: { fila: Fila | null; lecturaFalla: boolean; escrituras: string[] } = {
  fila: null,
  lecturaFalla: false,
  escrituras: [],
};

function cliente() {
  return {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () =>
            db.lecturaFalla
              ? { data: null, error: new Error('sin red') }
              : { data: db.fila ? { estado: db.fila.estado } : null, error: null },
        }),
      }),
      update: (nueva: Fila) => {
        const filtros: Record<string, string> = {};
        const cadena = {
          eq(columna: string, valor: string) {
            filtros[columna] = valor;
            return cadena;
          },
          async select() {
            db.escrituras.push('update');
            const coincide =
              db.fila &&
              db.fila.usuario_id === filtros.usuario_id &&
              String(db.fila.estado.creadoEn) === filtros['estado->>creadoEn'];
            if (!coincide) return { data: [], error: null };
            db.fila = { usuario_id: nueva.usuario_id, estado: nueva.estado };
            return { data: [{ usuario_id: nueva.usuario_id }], error: null };
          },
        };
        return cadena;
      },
      insert: async (nueva: Fila) => {
        db.escrituras.push('insert');
        if (db.fila) return { error: { code: '23505', message: 'duplicate key' } };
        db.fila = { usuario_id: nueva.usuario_id, estado: nueva.estado };
        return { error: null };
      },
      upsert: async (nueva: Fila) => {
        db.escrituras.push('upsert');
        db.fila = { usuario_id: nueva.usuario_id, estado: nueva.estado };
        return { error: null };
      },
    }),
  };
}

vi.mock('./cliente', () => ({
  supabaseConfigurado: true,
  obtenerCliente: () => cliente(),
}));

const { escribirEnNube, leerDeNube, olvidarLectura, JardinDistinto } = await import('./nube');

/** Un jardin identificado por su creadoEn, con algo de progreso. */
function jardin(creadoEn: number, monedas: number): GameState {
  return { version: 5, creadoEn, monedas, ultimoTick: creadoEn } as unknown as GameState;
}

beforeEach(() => {
  db.fila = null;
  db.lecturaFalla = false;
  db.escrituras = [];
  olvidarLectura();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('escribirEnNube', () => {
  it('actualiza el mismo jardín', async () => {
    db.fila = { usuario_id: 'u1', estado: jardin(1, 100) };
    await leerDeNube();

    await escribirEnNube(jardin(1, 250));
    expect(db.fila?.estado.monedas).toBe(250);
  });

  it('en una cuenta vacía crea el jardín', async () => {
    await leerDeNube();
    await escribirEnNube(jardin(7, 60));
    expect(db.fila?.estado.creadoEn).toBe(7);
  });

  it('NO pisa un jardín distinto: lo rechaza y la nube queda intacta', async () => {
    db.fila = { usuario_id: 'u1', estado: jardin(1, 5000) };
    await leerDeNube();

    // Un jardin recien creado, con otro creadoEn: el caso que borraba progreso.
    await expect(escribirEnNube(jardin(2, 60))).rejects.toBeInstanceOf(JardinDistinto);
    expect(db.fila?.estado.monedas).toBe(5000);
    expect(db.escrituras).not.toContain('upsert');
  });

  it('si la lectura de la nube falló, no escribe nada en toda la sesión', async () => {
    db.fila = { usuario_id: 'u1', estado: jardin(1, 5000) };
    db.lecturaFalla = true;
    await expect(leerDeNube()).rejects.toThrow();

    // Ni siquiera con el mismo jardin: la copia local puede ser vieja.
    await escribirEnNube(jardin(1, 10));
    await escribirEnNube(jardin(2, 60));

    expect(db.escrituras).toEqual([]);
    expect(db.fila?.estado.monedas).toBe(5000);
  });

  it('reemplazar, que solo usa "Reiniciar jardín", sí pisa', async () => {
    db.fila = { usuario_id: 'u1', estado: jardin(1, 5000) };
    await leerDeNube();

    await escribirEnNube(jardin(9, 60), { reemplazar: true });
    expect(db.fila?.estado.creadoEn).toBe(9);
  });

  it('después de cerrar sesión hay que volver a leer antes de escribir', async () => {
    db.fila = { usuario_id: 'u1', estado: jardin(1, 100) };
    await leerDeNube();
    olvidarLectura();

    await escribirEnNube(jardin(1, 999));
    expect(db.escrituras).toEqual([]);
  });
});
