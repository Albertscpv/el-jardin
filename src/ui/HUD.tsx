import { contarFlores } from '../state/sim';
import { useGame } from '../state/store';

export function HUD() {
  const monedas = useGame((s) => s.estado.monedas);
  const cosechadas = useGame((s) => s.estado.floresCosechadas);
  const flores = useGame((s) => contarFlores(s.estado));
  const animales = useGame((s) => s.estado.animales);
  const origen = useGame((s) => s.origenGuardado);
  const panel = useGame((s) => s.panel);
  const setPanel = useGame((s) => s.setPanel);

  const adoptados = animales.filter((a) => a.estado === 'adoptado').length;
  const visitantes = animales.length - adoptados;

  return (
    <header className="hud">
      <div className="hud-marca">
        <h1>Jardín Pixel</h1>
        <span className="hud-origen" title={`Partida guardada en ${origen}`}>
          {origen === 'nube' ? '☁ nube' : '💾 local'}
        </span>
      </div>

      <div className="hud-stats">
        <Stat icono="🪙" valor={monedas} titulo="Monedas" resalta />
        <Stat icono="🌸" valor={flores} titulo="Flores abiertas" />
        <Stat icono="🧺" valor={cosechadas} titulo="Cosechadas en total" />
        <Stat icono="🐾" valor={adoptados} titulo="Animales adoptados" />
        {visitantes > 0 && <Stat icono="👀" valor={visitantes} titulo="Visitantes en el jardín" />}
      </div>

      <nav className="hud-acciones">
        <button
          className={panel === 'tienda' ? 'chip activo' : 'chip'}
          onClick={() => setPanel('tienda')}
        >
          Tienda
        </button>
        <button
          className={panel === 'animales' ? 'chip activo' : 'chip'}
          onClick={() => setPanel('animales')}
        >
          Animales
        </button>
        <button
          className={panel === 'ayuda' ? 'chip activo' : 'chip'}
          onClick={() => setPanel('ayuda')}
          aria-label="Cómo se juega"
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
