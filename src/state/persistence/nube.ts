import { SAVE_VERSION } from '../config';
import type { GameState } from '../types';
import { obtenerCliente, supabaseConfigurado } from './cliente';

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
 * partida; quien llama distingue los casos con `usuarioActual`.
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

  const remoto = (data?.estado ?? null) as GameState | null;
  // Una partida de una version vieja se ignora en vez de romper el juego.
  if (remoto && remoto.version !== SAVE_VERSION) return null;
  return remoto;
}

export async function escribirEnNube(estado: GameState): Promise<void> {
  const uid = await usuarioActual();
  if (!uid) return;

  const { error } = await obtenerCliente()
    .from('jardines')
    .upsert(
      { usuario_id: uid, estado, actualizado_en: new Date().toISOString() },
      { onConflict: 'usuario_id' },
    );

  if (error) throw error;
}
