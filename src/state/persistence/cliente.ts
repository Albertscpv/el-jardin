import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Sin credenciales el juego funciona igual, guardando en localStorage. Todo
 * lo que toca la nube consulta esto antes de intentar nada.
 */
export const supabaseConfigurado = Boolean(URL && ANON);

let instancia: SupabaseClient | null = null;

/**
 * Cliente unico de Supabase.
 *
 * Es perezoso a proposito: crearlo arranca el refresco de sesion y escribe en
 * localStorage, y no tiene sentido pagar eso en una partida sin cuenta.
 */
export function obtenerCliente(): SupabaseClient {
  if (!instancia) {
    if (!URL || !ANON) throw new Error('Supabase no está configurado');
    instancia = createClient(URL, ANON, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return instancia;
}
