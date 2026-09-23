import { useEffect, useState } from 'react';
import { BALANCE } from '../state/config';
import { faltaParaManana, regaloDiarioDisponible } from '../state/economia';
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
  const estado = useGame((s) => s.estado);
  const reclamar = useGame((s) => s.reclamarRegaloDiario);

  // El reloj avanza aunque nadie toque nada: la cuenta regresiva y el paso
  // de medianoche tienen que verse sin cerrar el panel.
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const diarioListo = regaloDiarioDisponible(estado, ahora);
  const personales = [...(estado.regalosPersonales ?? [])].reverse();

  const cobrados = REGALOS.filter((r) => recibidos.includes(r.id));
  const total = cobrados.reduce((n, r) => n + r.monedas, 0);

  return (
    <Drawer
      titulo="Regalos"
      subtitulo={
        total > 0 ? `${total} monedas te regalamos hasta ahora` : 'Por ahora no hay nada para vos'
      }
      onCerrar={() => setPanel(null)}
    >
      <div className={diarioListo ? 'fila diario listo' : 'fila diario'}>
        <span className="tarjeta-icono" aria-hidden>
          {diarioListo ? '🎁' : '⏳'}
        </span>
        <div className="fila-texto">
          <div className="fila-titulo">
            <strong>Regalo diario</strong>
            <span className="insignia">{BALANCE.regaloDiario} monedas</span>
          </div>
          <p className="fila-detalle">
            {diarioListo
              ? 'Uno por día, todos los días. Se renueva a la medianoche.'
              : `Ya lo cobraste hoy. El próximo, en ${formatearEspera(faltaParaManana(ahora))}.`}
          </p>
        </div>
        <button className="boton" disabled={!diarioListo} onClick={reclamar}>
          {diarioListo ? 'Reclamar' : 'Mañana'}
        </button>
      </div>

      {personales.length > 0 && (
        <>
          <h3 className="seccion">Para vos</h3>
          {personales.map((r) => (
            <div className="fila" key={r.id}>
              <span className="tarjeta-icono" aria-hidden>
                💌
              </span>
              <div className="fila-texto">
                <div className="fila-titulo">
                  <strong>{r.mensaje || 'Un regalo'}</strong>
                  <span className="insignia cobrada">
                    {new Date(r.recibidoEn).toLocaleDateString()}
                  </span>
                </div>
                {r.resumen.length > 0 && <p className="fila-detalle">{r.resumen.join(' · ')}</p>}
              </div>
            </div>
          ))}
        </>
      )}

      <h3 className="seccion">Regalos únicos</h3>

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

      <h3 className="seccion">La letra chica</h3>
      <p className="fila-nota">
        Cada regalo se cobra una sola vez por jardín, incluso si tu jardín es más viejo que el
        regalo. Si jugás con cuenta, viaja con él: no se vuelve a pagar al entrar desde otro
        teléfono.
      </p>

      <h3 className="seccion">Lo que dejan tus animales</h3>
      <p className="fila-nota">
        Un animal adoptado y contento te deja monedas cada tanto, sin que le pidas nada. Esos
        no se anotan acá: aparecen solos mientras jugás, y también mientras no estás.
      </p>
    </Drawer>
  );
}

function formatearEspera(ms: number): string {
  const minutos = Math.max(1, Math.round(ms / 60_000));
  const horas = Math.floor(minutos / 60);
  if (horas === 0) return `${minutos} min`;
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
