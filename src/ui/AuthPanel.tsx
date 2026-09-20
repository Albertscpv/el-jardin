import { useState, type FormEvent } from 'react';
import { useAuth } from '../state/auth';
import { useGame } from '../state/store';
import { Drawer } from './Drawer';

type Modo = 'entrar' | 'registrarse';

export function AuthPanel() {
  const setPanel = useGame((s) => s.setPanel);
  const estado = useAuth((s) => s.estado);

  const subtitulo =
    estado === 'dentro'
      ? 'Tu jardín se guarda en la nube'
      : 'Creá una cuenta para jugar en varios dispositivos';

  return (
    <Drawer titulo="Cuenta" subtitulo={subtitulo} onCerrar={() => setPanel(null)}>
      {estado === 'sin-configurar' && <SinConfigurar />}
      {estado === 'cargando' && <p className="fila-nota">Buscando tu sesión…</p>}
      {estado === 'invitado' && <Formulario />}
      {estado === 'dentro' && <Sesion />}
    </Drawer>
  );
}

function SinConfigurar() {
  return (
    <>
      <p className="vacio-largo">
        Este jardín está funcionando sin cuentas: todo se guarda en este navegador y no sale de
        acá.
      </p>
      <p className="fila-nota">
        Para habilitar el registro hace falta conectar un proyecto de Supabase con las variables{' '}
        <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>. Está explicado en el
        README del proyecto.
      </p>
    </>
  );
}

function Sesion() {
  const email = useAuth((s) => s.email);
  const salir = useAuth((s) => s.salir);
  const ocupado = useAuth((s) => s.ocupado);
  const error = useAuth((s) => s.error);

  return (
    <>
      <div className="fila">
        <span className="tarjeta-icono" aria-hidden>
          ☁️
        </span>
        <div className="fila-texto">
          <div className="fila-titulo">
            <strong>{email ?? 'Sesión activa'}</strong>
          </div>
          <p className="fila-detalle">Cada cambio del jardín se sincroniza solo.</p>
        </div>
      </div>

      {error && <p className="mensaje error">{error}</p>}

      <h3 className="seccion">Cerrar sesión</h3>
      <p className="fila-nota">
        Volvés a la partida guardada en este navegador. Tu jardín de la nube queda intacto y lo
        recuperás al entrar de nuevo.
      </p>
      <button className="boton peligro" style={{ marginTop: 10 }} disabled={ocupado} onClick={salir}>
        {ocupado ? 'Saliendo…' : 'Cerrar sesión'}
      </button>
    </>
  );
}

function Formulario() {
  const [modo, setModo] = useState<Modo>('registrarse');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const registrarse = useAuth((s) => s.registrarse);
  const entrar = useAuth((s) => s.entrar);
  const recuperar = useAuth((s) => s.recuperarContrasena);
  const limpiar = useAuth((s) => s.limpiarMensajes);
  const ocupado = useAuth((s) => s.ocupado);
  const error = useAuth((s) => s.error);
  const aviso = useAuth((s) => s.aviso);

  const cambiarModo = (siguiente: Modo) => {
    setModo(siguiente);
    limpiar();
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (modo === 'registrarse') void registrarse(email, password);
    else void entrar(email, password);
  };

  return (
    <>
      <div className="pestanas">
        <button
          className={modo === 'registrarse' ? 'pestana activa' : 'pestana'}
          onClick={() => cambiarModo('registrarse')}
        >
          Crear cuenta
        </button>
        <button
          className={modo === 'entrar' ? 'pestana activa' : 'pestana'}
          onClick={() => cambiarModo('entrar')}
        >
          Entrar
        </button>
      </div>

      <form className="formulario" onSubmit={enviar}>
        <label className="etiqueta" htmlFor="auth-email">
          Email
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          className="campo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vos@ejemplo.com"
        />

        <label className="etiqueta" htmlFor="auth-password">
          Contraseña
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={modo === 'registrarse' ? 'new-password' : 'current-password'}
          className="campo"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Al menos 6 caracteres"
        />

        {error && <p className="mensaje error">{error}</p>}
        {aviso && <p className="mensaje aviso">{aviso}</p>}

        <button className="boton" type="submit" disabled={ocupado} style={{ marginTop: 14 }}>
          {ocupado ? 'Un momento…' : modo === 'registrarse' ? 'Crear cuenta' : 'Entrar'}
        </button>

        {modo === 'entrar' && (
          <button
            type="button"
            className="enlace"
            disabled={ocupado}
            onClick={() => void recuperar(email)}
          >
            Olvidé mi contraseña
          </button>
        )}
      </form>

      <p className="fila-nota" style={{ marginTop: 18 }}>
        {modo === 'registrarse'
          ? 'Al crear la cuenta, el jardín que tenés ahora en este navegador se sube tal como está. No perdés nada.'
          : 'Al entrar se carga el jardín de tu cuenta. El de este navegador queda donde está por si volvés a jugar sin sesión.'}
      </p>
    </>
  );
}
