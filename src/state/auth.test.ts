import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Doble de Supabase: solo lo que usa el store de sesion. Permite probar el
 * flujo completo de registro y login sin un proyecto real, que es justo lo
 * que no se puede levantar en local sin Docker.
 */
const auth = {
  getSession: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  onAuthStateChange: vi.fn(),
};

vi.mock('./persistence/cliente', () => ({
  supabaseConfigurado: true,
  obtenerCliente: () => ({ auth }),
}));

// El enlace de recuperación apunta al origen de la app; en Node no hay window.
vi.stubGlobal('window', { location: { origin: 'https://el-jardin.test' } });

const { useAuth } = await import('./auth');

const inicial = useAuth.getState();

beforeEach(() => {
  vi.resetAllMocks();
  useAuth.setState({ ...inicial, estado: 'cargando', email: null, usuarioId: null, error: null, aviso: null, ocupado: false });
  auth.getSession.mockResolvedValue({ data: { session: null } });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
});

describe('inicializar', () => {
  it('sin sesion previa queda como invitado', async () => {
    await useAuth.getState().inicializar(() => {});
    expect(useAuth.getState().estado).toBe('invitado');
  });

  it('con sesion guardada entra directo', async () => {
    auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'a@b.com' } } },
    });

    await useAuth.getState().inicializar(() => {});

    expect(useAuth.getState().estado).toBe('dentro');
    expect(useAuth.getState().email).toBe('a@b.com');
  });

  it('avisa al juego solo cuando cambia el dueño de la partida', async () => {
    const alCambiar = vi.fn();
    let emitir!: (evento: string, sesion: unknown) => void;
    auth.onAuthStateChange.mockImplementation((cb: typeof emitir) => {
      emitir = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    await useAuth.getState().inicializar(alCambiar);

    emitir('SIGNED_IN', { user: { id: 'u1', email: 'a@b.com' } });
    expect(alCambiar).toHaveBeenCalledWith('entro');

    // Un refresco de token no debe recargar el jardín.
    alCambiar.mockClear();
    emitir('TOKEN_REFRESHED', { user: { id: 'u1', email: 'a@b.com' } });
    expect(alCambiar).not.toHaveBeenCalled();

    emitir('SIGNED_OUT', null);
    expect(alCambiar).toHaveBeenCalledWith('salio');
  });
});

describe('registrarse', () => {
  it('rechaza contraseñas cortas sin llamar al servidor', async () => {
    await useAuth.getState().registrarse('a@b.com', '123');

    expect(auth.signUp).not.toHaveBeenCalled();
    expect(useAuth.getState().error).toMatch(/6 caracteres/);
  });

  it('rechaza emails invalidos sin llamar al servidor', async () => {
    await useAuth.getState().registrarse('no-es-un-email', 'secreto123');

    expect(auth.signUp).not.toHaveBeenCalled();
    expect(useAuth.getState().error).toMatch(/email válido/);
  });

  it('avisa que hay que confirmar el correo cuando no viene sesion', async () => {
    auth.signUp.mockResolvedValue({ data: { session: null, user: { id: 'u1' } }, error: null });

    await useAuth.getState().registrarse('a@b.com', 'secreto123');

    expect(useAuth.getState().aviso).toMatch(/confirmar/i);
    expect(useAuth.getState().error).toBeNull();
  });

  it('traduce el error de cuenta ya existente', async () => {
    auth.signUp.mockResolvedValue({
      data: {},
      error: new Error('User already registered'),
    });

    await useAuth.getState().registrarse('a@b.com', 'secreto123');

    expect(useAuth.getState().error).toMatch(/Ya existe una cuenta/);
    expect(useAuth.getState().ocupado).toBe(false);
  });
});

describe('entrar', () => {
  it('traduce credenciales invalidas', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: new Error('Invalid login credentials'),
    });

    await useAuth.getState().entrar('a@b.com', 'secreto123');

    expect(useAuth.getState().error).toBe('Email o contraseña incorrectos.');
  });

  it('limpia el estado de ocupado aunque falle', async () => {
    auth.signInWithPassword.mockRejectedValue(new Error('Failed to fetch'));

    await useAuth.getState().entrar('a@b.com', 'secreto123');

    expect(useAuth.getState().ocupado).toBe(false);
    expect(useAuth.getState().error).toMatch(/No se pudo conectar/);
  });
});

describe('recuperarContrasena', () => {
  it('no confirma ni desmiente si la cuenta existe', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    await useAuth.getState().recuperarContrasena('a@b.com');

    // El mensaje es deliberadamente ambiguo: decir "ese email no existe"
    // dejaria enumerar qué cuentas hay.
    expect(useAuth.getState().aviso).toMatch(/Si esa cuenta existe/);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
      redirectTo: 'https://el-jardin.test',
    });
  });
});
