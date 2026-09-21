import { SAVE_VERSION } from '../config';
import type { GameState } from '../types';
import { obtenerCliente, supabaseConfigurado } from './cliente';

/**
 * Usuario cuya partida en la nube ya se leyo bien en esta sesion.
 *
 * Mientras no se haya leido, no se escribe. Si la lectura falla (sin red,
 * token vencido, Supabase caido) el juego sigue con la copia local, que
 * puede ser vieja o directamente un jardin nuevo; subirla pisaria el jardin
 * de verdad, y por ese camino se puede perder un jardin entero.
 */
let leidaPara: string | null = null;

/** El jardin de la nube es otro: escribir encima lo borraria. */
export class JardinDistinto extends Error {
  constructor() {
    super('La cuenta tiene otro jardín en la nube; no se sobrescribe.');
    this.name = 'JardinDistinto';
  }
}

/** Usuario de la sesion activa, o null si se esta jugando sin cuenta. */
export async function usuarioActual(): Promise<string | null> {
  if (!supabaseConfigurado) return null;
  const { data } = await obtenerCliente().auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Lee el jardin de la cuenta.
 *
 * Devuelve `null` tanto si no hay cuenta como si la cuenta todavia no tiene
 * partida; quien llama distingue los casos con `usuarioActual`. Si la
 * lectura sale bien, habilita las escrituras de esta sesion.
 */
export async function leerDeNube(): Promise<GameState | null> {
  const uid = await usuarioActual();
  if (!uid) return null;

  const { data, error } = await obtenerCliente()
    .from('jardines')
    .select('estado')
    .eq('usuario_id', uid)
    .maybeSingle();

  if (error) throw error;
  leidaPara = uid;

  const remoto = (data?.estado ?? null) as GameState | null;
  // Una partida de una version vieja se ignora en vez de romper el juego.
  if (remoto && remoto.version !== SAVE_VERSION) return null;
  return remoto;
}

export interface OpcionesEscritura {
  /**
   * Reemplaza el jardin de la nube aunque sea otro. Solo para acciones
   * explicitas del jugador, como empezar un jardin nuevo.
   */
  reemplazar?: boolean;
}

/**
 * Guarda el jardin en la cuenta, sin pisar nunca un jardin distinto.
 *
 * Cada jardin se reconoce por `creadoEn`, que se fija al crearlo y no
 * cambia. Se actualiza solo la fila de ese mismo jardin; si no hay fila se
 * crea; si hay una de otro jardin, se rechaza. Antes era un upsert a ciegas:
 * cualquier partida que el navegador tuviera en memoria reemplazaba la de
 * la cuenta, incluida una recien creada porque la nube no respondio.
 */
export async function escribirEnNube(
  estado: GameState,
  { reemplazar = false }: OpcionesEscritura = {},
): Promise<void> {
  const uid = await usuarioActual();
  if (!uid) return;
  if (leidaPara !== uid) {
    console.warn('[jardin] no se sube a la nube: todavia no se pudo leer la partida de la cuenta');
    return;
  }

  const sb = obtenerCliente();
  const fila = { usuario_id: uid, estado, actualizado_en: new Date().toISOString() };

  if (reemplazar) {
    const { error } = await sb.from('jardines').upsert(fila, { onConflict: 'usuario_id' });
    if (error) throw error;
    return;
  }

  const { data, error } = await sb
    .from('jardines')
    .update(fila)
    .eq('usuario_id', uid)
    .eq('estado->>creadoEn', String(estado.creadoEn))
    .select('usuario_id');
  if (error) throw error;
  if (data && data.length > 0) return;

  // No se actualizo nada: o la cuenta no tiene jardin todavia, o tiene otro.
  const { error: alCrear } = await sb.from('jardines').insert(fila);
  if (!alCrear) return;
  // 23505: ya existe una fila para este usuario, y es de otro jardin.
  if (alCrear.code === '23505') throw new JardinDistinto();
  throw alCrear;
}

/** Al salir de la cuenta, la proxima sesion tiene que volver a leer primero. */
export function olvidarLectura(): void {
  leidaPara = null;
}
