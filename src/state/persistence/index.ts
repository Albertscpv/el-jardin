import { adaptadorLocal } from './local';
import { adaptadorNube, supabaseConfigurado } from './supabase';
import type { SaveAdapter } from './types';

export { borrarLocal } from './local';
export type { SaveAdapter, AdapterName } from './types';

/**
 * Elige el adaptador de guardado. Con credenciales de Supabase usa la nube
 * (con espejo local); sin ellas, el juego funciona igual contra localStorage.
 */
export function crearAdaptador(): SaveAdapter {
  return supabaseConfigurado ? adaptadorNube : adaptadorLocal;
}

/** Adaptador que degrada a local si la nube falla en tiempo de ejecucion. */
export function conRespaldoLocal(adaptador: SaveAdapter): SaveAdapter {
  if (adaptador.nombre === 'local') return adaptador;

  return {
    nombre: adaptador.nombre,
    async cargar() {
      try {
        return await adaptador.cargar();
      } catch (e) {
        console.warn('[jardin] fallo al cargar de la nube, uso la copia local', e);
        return adaptadorLocal.cargar();
      }
    },
    async guardar(estado) {
      try {
        await adaptador.guardar(estado);
      } catch (e) {
        console.warn('[jardin] fallo al guardar en la nube, queda guardado local', e);
        await adaptadorLocal.guardar(estado);
      }
    },
  };
}
