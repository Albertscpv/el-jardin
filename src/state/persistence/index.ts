import type { GameState } from '../types';
import { escribirLocal, leerLocal, respaldarLocal } from './local';
import { escribirEnNube, leerDeNube, usuarioActual, type OpcionesEscritura } from './nube';

export { borrarLocal, escribirLocal, leerLocal, listarRespaldos } from './local';
export { olvidarLectura } from './nube';
export { supabaseConfigurado } from './cliente';

export type OrigenGuardado = 'nube' | 'local';

/** Dos partidas son el mismo jardin si nacieron en el mismo momento. */
function mismoJardin(a: GameState, b: GameState): boolean {
  return a.creadoEn === b.creadoEn;
}

/**
 * Carga la partida al arrancar.
 *
 * Con sesion activa puede haber dos copias: la del navegador y la de la
 * nube. Si son del mismo jardin, gana la simulada mas recientemente: eso
 * cubre jugar en dos dispositivos sin perder trabajo.
 *
 * Si son jardines distintos, gana el de la cuenta y el del navegador se
 * respalda. Desempatar por reloj ahi era el agujero: un jardin recien
 * creado siempre es "mas reciente" que el de verdad, y le ganaba.
 */
export async function cargarPartida(): Promise<GameState | null> {
  const local = leerLocal();

  try {
    if (!(await usuarioActual())) return local;

    const remoto = await leerDeNube();
    if (!remoto) return local;
    if (!local) return remoto;
    if (!mismoJardin(local, remoto)) {
      respaldarLocal(local);
      return remoto;
    }
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
 * quedo a salvo y el proximo guardado reintenta la nube. La nube, por su
 * parte, se niega a pisar un jardin distinto (ver `escribirEnNube`).
 */
export async function guardarPartida(
  estado: GameState,
  opciones: OpcionesEscritura = {},
): Promise<void> {
  escribirLocal(estado);
  try {
    await escribirEnNube(estado, opciones);
  } catch (e) {
    console.warn('[jardin] no se pudo guardar en la nube, queda el guardado local', e);
  }
}

/**
 * Se llama justo despues de iniciar sesion.
 *
 * Iniciar sesion significa "traeme mi jardin", asi que la partida de la cuenta
 * manda. Solo si la cuenta esta vacia se adopta lo jugado sin cuenta, para que
 * registrarse no tire a la basura lo que ya habias plantado. Si el navegador
 * tenia otro jardin, queda respaldado en vez de pisarse.
 */
export async function partidaAlEntrar(): Promise<GameState | null> {
  const remoto = await leerDeNube();
  const local = leerLocal();

  if (remoto) {
    if (local && !mismoJardin(local, remoto)) respaldarLocal(local);
    return remoto;
  }

  if (local) await escribirEnNube(local);
  return local;
}
