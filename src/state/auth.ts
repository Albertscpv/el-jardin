import { create } from 'zustand';
import { obtenerCliente, supabaseConfigurado } from './persistence/cliente';

/**
 * - `sin-configurar`: no hay credenciales de Supabase; el juego es solo local.
 * - `cargando`: se está recuperando la sesión guardada.
 * - `invitado`: hay backend, pero nadie inició sesión. Se juega en local.
 * - `dentro`: sesión activa; la partida vive en la nube.
 */
export type EstadoSesion = 'sin-configurar' | 'cargando' | 'invitado' | 'dentro';

/** Qué hacer después de un cambio de sesión. Lo consume el store del juego. */
export type CambioSesion = 'entro' | 'salio';

interface AuthStore {
  estado: EstadoSesion;
  email: string | null;
  usuarioId: string | null;
  /** Mensaje de error ya traducido, listo para mostrar. */
  error: string | null;
  /** Aviso no-fatal, como "revisá tu correo". */
  aviso: string | null;
  ocupado: boolean;

  inicializar: (alCambiar: (cambio: CambioSesion) => void | Promise<void>) => Promise<void>;
  registrarse: (email: string, password: string) => Promise<void>;
  entrar: (email: string, password: string) => Promise<void>;
  salir: () => Promise<void>;
  recuperarContrasena: (email: string) => Promise<void>;
  limpiarMensajes: () => void;
}

/**
 * Supabase responde en inglés y con frases pensadas para desarrolladores.
 * Esto las convierte en algo que un jugador pueda entender y accionar.
 */
function traducirError(mensaje: string): string {
  const m = mensaje.toLowerCase();

  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (m.includes('email not confirmed')) {
    return 'Todavía no confirmaste tu email. Revisá tu correo y hacé clic en el enlace.';
  }
  if (m.includes('user already registered') || m.includes('already been registered')) {
    return 'Ya existe una cuenta con ese email. Probá iniciar sesión.';
  }
  if (m.includes('password should be at least')) {
    return 'La contraseña necesita al menos 6 caracteres.';
  }
  if (m.includes('unable to validate email') || m.includes('invalid email')) {
    return 'Ese email no parece válido.';
  }
  if (m.includes('for security purposes') || m.includes('rate limit') || m.includes('too many')) {
    return 'Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.';
  }
  if (m.includes('signups not allowed') || m.includes('signup is disabled')) {
    return 'El registro está deshabilitado en este momento.';
  }
  if (m.includes('failed to fetch') || m.includes('networkerror')) {
    return 'No se pudo conectar. Revisá tu conexión.';
  }
  return mensaje;
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validación local: evita un viaje al servidor para errores obvios. */
function validar(email: string, password?: string): string | null {
  if (!EMAIL_VALIDO.test(email.trim())) return 'Escribí un email válido.';
  if (password !== undefined && password.length < 6) {
    return 'La contraseña necesita al menos 6 caracteres.';
  }
  return null;
}

export const useAuth = create<AuthStore>()((set, get) => ({
  estado: supabaseConfigurado ? 'cargando' : 'sin-configurar',
  email: null,
  usuarioId: null,
  error: null,
  aviso: null,
  ocupado: false,

  async inicializar(alCambiar) {
    if (!supabaseConfigurado) return;

    const sb = obtenerCliente();
    const { data } = await sb.auth.getSession();
    const usuario = data.session?.user ?? null;

    set({
      estado: usuario ? 'dentro' : 'invitado',
      email: usuario?.email ?? null,
      usuarioId: usuario?.id ?? null,
    });

    // Una sola suscripción para todo: login, logout, refresco de token y
    // vuelta desde el enlace de confirmación por correo.
    sb.auth.onAuthStateChange((evento, sesion) => {
      const antes = get().usuarioId;
      const ahora = sesion?.user?.id ?? null;

      set({
        estado: ahora ? 'dentro' : 'invitado',
        email: sesion?.user?.email ?? null,
        usuarioId: ahora,
      });

      // Solo interesa cuando cambia de verdad el dueño de la partida; un
      // refresco de token no tiene que recargar el jardín.
      if (antes === ahora) return;
      if (ahora) void alCambiar('entro');
      else if (evento === 'SIGNED_OUT') void alCambiar('salio');
    });
  },

  async registrarse(email, password) {
    const problema = validar(email, password);
    if (problema) return set({ error: problema, aviso: null });

    set({ ocupado: true, error: null, aviso: null });
    try {
      const { data, error } = await obtenerCliente().auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      // Con la confirmación por correo activada, signUp no devuelve sesión:
      // la cuenta existe pero no se entra hasta hacer clic en el enlace.
      if (!data.session) {
        set({ aviso: 'Te mandamos un correo para confirmar la cuenta. Revisá tu bandeja.' });
      }
    } catch (e) {
      set({ error: traducirError(mensajeDe(e)) });
    } finally {
      set({ ocupado: false });
    }
  },

  async entrar(email, password) {
    const problema = validar(email, password);
    if (problema) return set({ error: problema, aviso: null });

    set({ ocupado: true, error: null, aviso: null });
    try {
      const { error } = await obtenerCliente().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (e) {
      set({ error: traducirError(mensajeDe(e)) });
    } finally {
      set({ ocupado: false });
    }
  },

  async salir() {
    set({ ocupado: true, error: null, aviso: null });
    try {
      const { error } = await obtenerCliente().auth.signOut();
      if (error) throw error;
    } catch (e) {
      set({ error: traducirError(mensajeDe(e)) });
    } finally {
      set({ ocupado: false });
    }
  },

  async recuperarContrasena(email) {
    const problema = validar(email);
    if (problema) return set({ error: problema, aviso: null });

    set({ ocupado: true, error: null, aviso: null });
    try {
      const { error } = await obtenerCliente().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      set({ aviso: 'Si esa cuenta existe, te llega un correo para cambiar la contraseña.' });
    } catch (e) {
      set({ error: traducirError(mensajeDe(e)) });
    } finally {
      set({ ocupado: false });
    }
  },

  limpiarMensajes: () => set({ error: null, aviso: null }),
}));

function mensajeDe(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
