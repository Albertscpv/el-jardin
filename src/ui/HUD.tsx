import { useEffect, useRef, useState } from 'react';
import { audio } from '../game/audio/sonidos';
import { climaActual } from '../state/clima';
import { perfilDe } from '../state/estaciones';
import { useAuth } from '../state/auth';
import { regaloDiarioDisponible } from '../state/economia';
import { totalCeldas } from '../state/islas';
import { contarFlores } from '../state/sim';
import { useGame, type PanelId } from '../state/store';

const NAV: Array<{ id: Exclude<PanelId, null>; etiqueta: string }> = [
  { id: 'tienda', etiqueta: 'Tienda' },
  { id: 'construir', etiqueta: 'Construir' },
  { id: 'animales', etiqueta: 'Animales' },
  { id: 'personaje', etiqueta: 'Personaje' },
  { id: 'pedidos', etiqueta: 'Pedidos' },
  { id: 'regalos', etiqueta: 'Regalos' },
];

export function HUD() {
  const monedas = useGame((s) => s.estado.monedas);
  const cosechadas = useGame((s) => s.estado.floresCosechadas);
  const flores = useGame((s) => contarFlores(s.estado));
  const animales = useGame((s) => s.estado.animales);
  const islas = useGame((s) => s.estado.islas);
  const sesion = useAuth((s) => s.estado);
  const email = useAuth((s) => s.email);
  const panel = useGame((s) => s.panel);
  const setPanel = useGame((s) => s.setPanel);
  const setModo = useGame((s) => s.setModo);
  const despertarRival = useGame((s) => s.despertarRival);
  // Se recalcula en cada tick del juego, asi el punto aparece solo al pasar
  // la medianoche sin tener que recargar.
  const diarioListo = useGame((s) => regaloDiarioDisponible(s.estado, Date.now()));
  const pedido = useGame((s) => s.estado.pedido);

  // Easter egg: cinco toques al titulo despiertan al vecino de al lado.
  const toques = useRef(0);
  const ultimoToque = useRef(0);
  const tocarTitulo = () => {
    const ahora = Date.now();
    // La racha se corta si pasa demasiado entre toques: evita despertarlo
    // sin querer a lo largo de una partida entera.
    toques.current = ahora - ultimoToque.current < 1200 ? toques.current + 1 : 1;
    ultimoToque.current = ahora;
    if (toques.current >= 5) {
      toques.current = 0;
      despertarRival();
    }
  };

  const cuenta = etiquetaDeCuenta(sesion, email);
  const adoptados = animales.filter((a) => a.estado === 'adoptado').length;
  const visitantes = animales.length - adoptados;

  return (
    <header className="hud">
      <div className="hud-izquierda">
        <div className="hud-marca vidrio">
          <h1 onClick={tocarTitulo}>El Jardín de Pan</h1>
          <button
            className={[
              'hud-origen',
              cuenta.invita ? 'invita' : '',
              panel === 'cuenta' ? 'activo' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setPanel('cuenta')}
            title={cuenta.ayuda}
          >
            {cuenta.etiqueta}
          </button>
        </div>

        <div className="hud-stats vidrio">
          <Stat icono="🪙" valor={monedas} titulo="Monedas" resalta />
          <Stat icono="🌸" valor={flores} titulo="Flores abiertas" />
          <Stat icono="🧺" valor={cosechadas} titulo="Cosechadas en total" />
          <Stat icono="🐾" valor={adoptados} titulo="Animales adoptados" />
          {visitantes > 0 && <Stat icono="👀" valor={visitantes} titulo="Visitantes" />}
          <Stat icono="🏝️" valor={totalCeldas(islas)} titulo="Celdas de terreno" />
        </div>
      </div>

      <nav className="hud-acciones vidrio">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={panel === item.id ? 'chip activo' : 'chip'}
            onClick={() => setPanel(item.id)}
          >
            {item.etiqueta}
            {item.id === 'pedidos' && pedido && (
              <span className="chip-cuenta">
                {pedido.progreso}/{pedido.cantidad}
              </span>
            )}
            {item.id === 'regalos' && diarioListo && (
              <span className="chip-punto" aria-label="Regalo diario disponible" />
            )}
          </button>
        ))}
        <button className="chip" onClick={() => setModo('practica')} title="Un rato de tiro al arco">
          Práctica
        </button>
        <ChipTiempo />
        <BotonSonido />
        <button
          className={panel === 'ayuda' ? 'chip activo' : 'chip'}
          onClick={() => setPanel('ayuda')}
          aria-label="Cómo se juega"
          title="Cómo se juega"
        >
          ?
        </button>
      </nav>
    </header>
  );
}

function Stat({
  icono,
  valor,
  titulo,
  resalta = false,
}: {
  icono: string;
  valor: number;
  titulo: string;
  resalta?: boolean;
}) {
  return (
    <div className={resalta ? 'stat oro' : 'stat'} title={titulo}>
      <span aria-hidden>{icono}</span>
      <strong>{valor}</strong>
    </div>
  );
}

/**
 * Texto del boton de cuenta.
 *
 * Antes decia siempre "local" o "sincronizado": describia el estado, pero no
 * invitaba a nada, y como es la unica puerta al registro nadie la encontraba.
 * Cuando se puede crear una cuenta, el boton lo pide; cuando no, vuelve a ser
 * un cartel de estado.
 */
function etiquetaDeCuenta(
  sesion: ReturnType<typeof useAuth.getState>['estado'],
  email: string | null,
): { etiqueta: string; ayuda: string; invita: boolean } {
  if (sesion === 'dentro') {
    return {
      etiqueta: '☁ sincronizado',
      ayuda: `Sesión iniciada como ${email ?? 'tu cuenta'}`,
      invita: false,
    };
  }
  if (sesion === 'invitado') {
    return {
      etiqueta: '👤 Crear cuenta',
      ayuda: 'Tu jardín se guarda solo en este navegador. Creá una cuenta para jugar en varios dispositivos.',
      invita: true,
    };
  }
  // 'cargando' y 'sin-configurar': no hay registro que ofrecer todavia.
  return {
    etiqueta: '💾 local',
    ayuda: 'Tu jardín se guarda solo en este navegador',
    invita: false,
  };
}

/** Silenciar y volver a encender. La preferencia vive en este navegador. */
function BotonSonido() {
  const [silencio, setSilencio] = useState(audio.silencio);

  return (
    <button
      className="chip"
      aria-pressed={silencio}
      title={silencio ? 'Volver a escuchar el jardín' : 'Silenciar el jardín'}
      onClick={() => {
        audio.despertar();
        const nuevo = !silencio;
        audio.setSilencio(nuevo);
        setSilencio(nuevo);
        if (!nuevo) audio.sonar('cosechar');
      }}
    >
      {silencio ? '🔇' : '🔊'}
    </button>
  );
}

/**
 * Qué época es y qué cielo hay. Los dos salen del reloj, así que se
 * refrescan solos cada tanto sin tocar la partida.
 */
function ChipTiempo() {
  const avisar = useGame((s) => s.avisar);
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const estacion = perfilDe(ahora);
  const clima = climaActual(ahora);

  return (
    <button
      className="chip"
      title={`${estacion.nombre} · ${clima.nombre}`}
      onClick={() => avisar(`${estacion.nombre}: ${estacion.frase}`, 'info')}
    >
      {estacion.icono}
      {clima.cielo !== 'despejado' && <span className="chip-clima">{clima.icono}</span>}
    </button>
  );
}
