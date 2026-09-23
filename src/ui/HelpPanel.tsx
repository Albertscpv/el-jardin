import { ANIMAL_SPECIES } from '../state/content';
import { useAuth } from '../state/auth';
import { useGame } from '../state/store';
import { Drawer } from './Drawer';

export function HelpPanel() {
  const setPanel = useGame((s) => s.setPanel);
  const reiniciar = useGame((s) => s.reiniciar);
  const sesion = useAuth((s) => s.estado);

  const especies = Object.values(ANIMAL_SPECIES).sort(
    (a, b) => a.floresParaVisitar - b.floresParaVisitar,
  );

  return (
    <Drawer titulo="Cómo se juega" subtitulo="Lo básico, en cuatro pasos" onCerrar={() => setPanel(null)}>
      <ol className="pasos">
        <li>
          <strong>Sembrá.</strong> Elegí una semilla ahí abajo y tocá un pedazo de tierra arada.
        </li>
        <li>
          <strong>Regá.</strong> Sin agua la planta se queda quieta, y si te olvidás mucho se
          seca. La tierra oscura tiene agua; la clara, sed.
        </li>
        <li>
          <strong>Cosechá.</strong> Cuando la flor abre, es tuya: se paga en monedas y cada
          tanto te deja una semilla de yapa.
        </li>
        <li>
          <strong>Hacete amigo de los animales.</strong> Vienen solos si hay flores. Dales de
          comer y hacéles mimos hasta que te agarren confianza: ahí se quedan y les ponés nombre.
        </li>
      </ol>

      <h3 className="seccion">Mirar el jardín desde donde quieras</h3>
      <p className="fila-nota">
        Arrastrá para dar vueltas alrededor. Con Shift o el botón derecho te corrés de lugar, y la
        rueda acerca. Si te perdiste, el botón ⌖ vuelve a mostrar todo.
      </p>
      <p className="fila-nota">
        Al personaje lo movés con W A S D o las flechas; en el teléfono, con el joystick de abajo.
      </p>

      <h3 className="seccion">Agrandar el jardín</h3>
      <p className="fila-nota">
        En <strong>Construir</strong> le vas ganando terreno al vacío de a pedacitos, arás pasto
        para sembrar y fundás islas nuevas. Cada pedazo encarece el siguiente, así que crecer se
        piensa. La cerca corre por nuestra cuenta: se acomoda sola cada vez que ampliás.
      </p>

      <h3 className="seccion">Quién se acerca, y cuándo</h3>
      <ul className="lista-simple">
        {especies.map((e) => (
          <li key={e.id}>
            <strong>{e.nombre}</strong> — desde {e.floresParaVisitar}{' '}
            {e.floresParaVisitar === 1 ? 'flor abierta' : 'flores abiertas'}
            {e.aguaParaVisitar ? ` y un charco de ${e.aguaParaVisitar} pedazos de agua` : ''}.{' '}
            {e.descripcion}
          </li>
        ))}
      </ul>

      <h3 className="seccion">El jardín sigue aunque no estés</h3>
      <p className="fila-nota">
        Todo pasa con el reloj de verdad: cuando volvés, las plantas crecieron, la tierra se secó
        y puede que alguno tenga hambre. Contamos hasta 8 horas de ausencia, así que irte un día
        entero no te arruina nada. Tu jardín se guarda en{' '}
        {sesion === 'dentro' ? 'tu cuenta' : 'este navegador'}.
      </p>

      <h3 className="seccion">Empezar de nuevo</h3>
      <p className="fila-nota">
        Borra este jardín y te deja la tierra pelada. No hay vuelta atrás, así que pensalo.
      </p>
      <button
        className="boton peligro"
        style={{ marginTop: 10 }}
        onClick={() => {
          if (confirm('¿Seguro? Se borra todo este jardín y no se puede recuperar.')) reiniciar();
        }}
      >
        Reiniciar jardín
      </button>
    </Drawer>
  );
}
