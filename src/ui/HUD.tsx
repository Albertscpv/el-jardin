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
  const origen = useGame((s) => s.origenGuardado);
  const panel = useGame((s) => s.panel);
  const setPanel = useGame((s) => s.setPanel);

  const adoptados = animales.filter((a) => a.estado === 'adoptado').length;
  const visitantes = animales.length - adoptados;

  return (
    <header className="hud">
      <div className="hud-izquierda">
        <div className="hud-marca vidrio">
          <h1>Jardín Pixel</h1>
          <span className="hud-origen" title={`Partida guardada en ${origen}`}>
            {origen === 'nube' ? '☁ nube' : '💾 local'}
          </span>
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
