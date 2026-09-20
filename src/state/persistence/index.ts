import type { GameState } from '../types';
import { escribirLocal, leerLocal } from './local';
import { escribirEnNube, leerDeNube, usuarioActual } from './nube';

export { borrarLocal, escribirLocal, leerLocal } from './local';
export { supabaseConfigurado } from './cliente';

export type OrigenGuardado = 'nube' | 'local';

/**
 * Carga la partida al arrancar.
 *
 * Con sesion activa hay dos copias del mismo jugador (la del navegador y la
 * de la nube) y gana la simulada mas recientemente: eso cubre jugar en dos
 * dispositivos o en dos pestanas sin perder trabajo.
 */
export async function cargarPartida(): Promise<GameState | null> {
  const local = leerLocal();

  try {
    if (!(await usuarioActual())) return local;

    const remoto = await leerDeNube();
    if (!remoto) return local;
    if (!local) return remoto;
    return remoto.ultimoTick >= local.ultimoTick ? remoto : local;
  } catch (e) {
    console.warn('[jardin] no se pudo leer la nube, sigo con la copia local', e);
    return local;
  }
}

/**
 * Guarda siempre en el navegador, y ademas en la nube si hay cuenta.
 *
 * El guardado local va primero y es sincrono: si la red falla, la partida ya
 * quedo a salvo y el proximo guardado reintenta la nube.
 */
export async function guardarPartida(estado: GameState): Promise<void> {
  escribirLocal(estado);
  try {
    await escribirEnNube(estado);
  } catch (e) {
    console.warn('[jardin] no se pudo guardar en la nube, queda el guardado local', e);
  }
}

/**
 * Se llama justo despues de iniciar sesion.
 *
 * Iniciar sesion significa "traeme mi jardin", asi que la partida de la cuenta
 * manda. Solo si la cuenta esta vacia se adopta lo jugado sin cuenta, para que
 * registrarse no tire a la basura lo que ya habias plantado.
 */
export async function partidaAlEntrar(): Promise<GameState | null> {
  const remoto = await leerDeNube();
  if (remoto) return remoto;

  const local = leerLocal();
  if (local) await escribirEnNube(local);
  return local;
}
