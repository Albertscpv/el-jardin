import { ANIMAL_SPECIES } from '../state/content';
import { useGame } from '../state/store';
import { Drawer } from './Drawer';

export function HelpPanel() {
  const setPanel = useGame((s) => s.setPanel);
  const reiniciar = useGame((s) => s.reiniciar);
  const origen = useGame((s) => s.origenGuardado);

  const especies = Object.values(ANIMAL_SPECIES).sort(
    (a, b) => a.floresParaVisitar - b.floresParaVisitar,
  );

  return (
    <Drawer titulo="Cómo se juega" onCerrar={() => setPanel(null)}>
      <ol className="pasos">
        <li>
          <strong>Sembrá.</strong> Elegí una semilla abajo y tocá una parcela del bancal.
        </li>
        <li>
          <strong>Regá.</strong> Una planta seca deja de crecer y, si pasa mucho tiempo, se
          marchita. El color de la tierra te dice si tiene agua.
        </li>
        <li>
          <strong>Cosechá.</strong> Cuando la flor se abre, cosechala por monedas. A veces te
          devuelve una semilla.
        </li>
        <li>
          <strong>Cuidá a los animales.</strong> Llegan solos si hay flores. Dales de comer y
          acariciálos hasta ganarte su confianza; ahí podés adoptarlos y ponerles nombre.
        </li>
      </ol>

      <h3 className="seccion">Quién visita y cuándo</h3>
      <ul className="lista-simple">
        {especies.map((e) => (
          <li key={e.id}>
            <strong>{e.nombre}</strong> — desde {e.floresParaVisitar}{' '}
            {e.floresParaVisitar === 1 ? 'flor abierta' : 'flores abiertas'}. {e.descripcion}
          </li>
        ))}
      </ul>

      <h3 className="seccion">El jardín sigue sin vos</h3>
      <p className="fila-nota">
        Todo avanza con el reloj real: al volver, las plantas crecieron, la tierra se secó y tus
        animales pueden tener hambre. Se simulan hasta 8 horas de ausencia, así que irte un día
        entero no arruina el jardín. La partida se guarda en {origen === 'nube' ? 'la nube' : 'este navegador'}.
      </p>

      <h3 className="seccion">Empezar de nuevo</h3>
      <p className="fila-nota">Borra el jardín actual y arranca de cero. No se puede deshacer.</p>
      <button
        className="comprar peligro"
        onClick={() => {
          if (confirm('¿Seguro que querés borrar este jardín y empezar de nuevo?')) reiniciar();
        }}
      >
        Reiniciar jardín
      </button>
    </Drawer>
  );
}
