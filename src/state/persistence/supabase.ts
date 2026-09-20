import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SAVE_VERSION } from '../config';
import type { GameState } from '../types';
import { escribirLocal, leerLocal } from './local';
import type { SaveAdapter } from './types';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigurado = Boolean(URL && ANON);

let cliente: SupabaseClient | null = null;

function obtenerCliente(): SupabaseClient {
  if (!cliente) {
    if (!URL || !ANON) throw new Error('Supabase no está configurado');
    cliente = createClient(URL, ANON, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return cliente;
}

/**
 * Sesion anonima: cada navegador obtiene un usuario real de Supabase, asi las
 * politicas RLS de `schema.sql` pueden aislar cada jardin sin pedir registro.
 */
async function idDeUsuario(): Promise<string> {
  const sb = obtenerCliente();
  const { data } = await sb.auth.getSession();
  if (data.session?.user) return data.session.user.id;

  const { data: anon, error } = await sb.auth.signInAnonymously();
  if (error || !anon.user) {
    throw new Error(`No se pudo iniciar sesión anónima: ${error?.message ?? 'sin usuario'}`);
  }
  return anon.user.id;
}

/**
 * Guarda en la nube y deja siempre una copia local. Si la red falla, el juego
 * sigue con la copia local y el siguiente guardado reintenta.
 */
export const adaptadorNube: SaveAdapter = {
  nombre: 'nube',

  async cargar() {
    const sb = obtenerCliente();
    const uid = await idDeUsuario();

    const { data, error } = await sb
      .from('jardines')
      .select('estado, actualizado_en')
      .eq('usuario_id', uid)
      .maybeSingle();

    if (error) throw error;

    const remoto = (data?.estado ?? null) as GameState | null;
    const local = leerLocal();

    if (remoto && remoto.version !== SAVE_VERSION) return local;
    if (!remoto) return local;
    if (!local) return remoto;

    // Ante dos partidas, gana la simulada más recientemente.
    return remoto.ultimoTick >= local.ultimoTick ? remoto : local;
  },

  async guardar(estado) {
    escribirLocal(estado);
    const sb = obtenerCliente();
    const uid = await idDeUsuario();

    const { error } = await sb
      .from('jardines')
      .upsert(
        { usuario_id: uid, estado, actualizado_en: new Date().toISOString() },
        { onConflict: 'usuario_id' },
      );

    if (error) throw error;
  },
};
