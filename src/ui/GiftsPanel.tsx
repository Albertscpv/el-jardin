import { REGALOS } from '../state/regalos';
import { useGame } from '../state/store';
import { Drawer } from './Drawer';

/**
 * Apartado de regalos.
 *
 * El aviso que salta al acreditarlos dura cuatro segundos y aparece una
 * sola vez, en la carga en que se cobran: quien no estaba mirando la
 * pantalla en ese momento nunca se entera de donde salieron las monedas.
 * Acá quedan listados para siempre.
 */
export function GiftsPanel() {
  const setPanel = useGame((s) => s.setPanel);
  const recibidos = useGame((s) => s.estado.regalosRecibidos ?? []);

  const cobrados = REGALOS.filter((r) => recibidos.includes(r.id));
  const total = cobrados.reduce((n, r) => n + r.monedas, 0);

  return (
    <Drawer
      titulo="Regalos"
      subtitulo={
        total > 0 ? `${total} monedas regaladas hasta ahora` : 'Todavía no recibiste ninguno'
      }
      onCerrar={() => setPanel(null)}
    >
      {REGALOS.map((regalo) => {
        const cobrado = recibidos.includes(regalo.id);
        return (
          <div className="fila" key={regalo.id}>
            <span className="tarjeta-icono" aria-hidden>
              {cobrado ? '🎁' : '🔒'}
            </span>
            <div className="fila-texto">
              <div className="fila-titulo">
                <strong>{regalo.monedas} monedas</strong>
                <span className={cobrado ? 'insignia cobrada' : 'insignia'}>
                  {cobrado ? 'Acreditado' : 'En camino'}
                </span>
              </div>
              <p className="fila-detalle">{regalo.aviso}</p>
            </div>
          </div>
        );
      })}

      <h3 className="seccion">Cómo funcionan</h3>
      <p className="fila-nota">
        Cada regalo se cobra una sola vez por jardín, y alcanza también a las partidas que ya
        existían antes de que el regalo se inventara. Si jugás con cuenta, viaja con tu jardín:
        no se vuelve a acreditar al entrar desde otro dispositivo.
      </p>

      <h3 className="seccion">Regalos de tus animales</h3>
      <p className="fila-nota">
        Aparte de estos, un animal adoptado y contento te deja monedas cada tanto por su cuenta.
        Esos no se listan acá: caen solos mientras jugás, y también mientras el juego está
        cerrado.
      </p>
    </Drawer>
  );
}
