import { useRef } from 'react';
import { useAuth } from '../state/auth';
import { totalCeldas } from '../state/islas';
import { contarFlores } from '../state/sim';
import { useGame, type PanelId } from '../state/store';

const NAV: Array<{ id: Exclude<PanelId, null>; etiqueta: string }> = [
  { id: 'tienda', etiqueta: 'Tienda' },
  { id: 'construir', etiqueta: 'Construir' },
  { id: 'animales', etiqueta: 'Animales' },
  { id: 'personaje', etiqueta: 'Personaje' },
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

  const adoptados = animales.filter((a) => a.estado === 'adoptado').length;
  const visitantes = animales.length - adoptados;

  return (
    <header className="hud">
      <div className="hud-izquierda">
        <div className="hud-marca vidrio">
          <h1 onClick={tocarTitulo}>El Jardín</h1>
          <button
            className={panel === 'cuenta' ? 'hud-origen activo' : 'hud-origen'}
            onClick={() => setPanel('cuenta')}
            title={
              sesion === 'dentro'
                ? `Sesión iniciada como ${email ?? 'tu cuenta'}`
                : 'Tu jardín se guarda solo en este navegador'
            }
          >
            {sesion === 'dentro' ? '☁ sincronizado' : '💾 local'}
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
          </button>
        ))}
        <button className="chip" onClick={() => setModo('practica')} title="Practicá tiro al arco">
          Práctica
        </button>
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
