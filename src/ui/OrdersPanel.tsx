import { BALANCE } from '../state/config';
import { FLOWER_VARIANTS, nombreFlor } from '../state/content';
import { restanteTiroHoy } from '../state/economia';
import { useGame } from '../state/store';
import { iconoFlor } from './icons';
import { PixelIcon } from './PixelIcon';
import { Drawer } from './Drawer';

/**
 * Pedidos del pueblo, y de paso el mapa de todo lo que da monedas.
 *
 * Las formas de ganar estaban repartidas (cosechar, regalos de animales) y
 * ninguna pantalla las nombraba juntas. Si el juego suma fuentes de dinero
 * y no las cuenta en un solo lugar, para el jugador es como si no
 * existieran.
 */
export function OrdersPanel() {
  const setPanel = useGame((s) => s.setPanel);
  const setModo = useGame((s) => s.setModo);
  const pedido = useGame((s) => s.estado.pedido);
  const completados = useGame((s) => s.estado.pedidosCompletados ?? 0);
  const rechazar = useGame((s) => s.rechazarPedido);
  const restanteTiro = useGame((s) => restanteTiroHoy(s.estado, Date.now()));

  // El icono es la primera variedad de la especie, que siempre es la comun.
  const muestra = pedido && FLOWER_VARIANTS.find((v) => v.especie === pedido.especie);
  const icono = muestra && iconoFlor(muestra.id);

  return (
    <Drawer
      titulo="Pedidos"
      subtitulo={
        completados === 0
          ? 'El pueblo necesita flores'
          : `${completados} ${completados === 1 ? 'entregado' : 'entregados'}`
      }
      onCerrar={() => setPanel(null)}
    >
      {pedido && (
        <div className="fila pedido">
          <span className="tarjeta-icono" aria-hidden>
            {icono ? <PixelIcon matrix={icono.matrix} palette={icono.palette} size={34} /> : '📜'}
          </span>
          <div className="fila-texto">
            <div className="fila-titulo">
              <strong>{pedido.cliente}</strong>
              <span className="insignia cobrada">+{pedido.recompensa} 🪙</span>
            </div>
            <p className="fila-detalle">
              Pide {pedido.cantidad} {nombreFlor(pedido.especie, pedido.cantidad)}. Se anotan al
              cosechar.
            </p>
            <div
              className="barra-pista"
              style={{ marginTop: 8 }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={pedido.cantidad}
              aria-valuenow={pedido.progreso}
            >
              <div
                className="barra-relleno"
                style={{
                  width: `${(pedido.progreso / pedido.cantidad) * 100}%`,
                  background: 'var(--hoja)',
                }}
              />
            </div>
            <p className="fila-nota">
              {pedido.progreso} de {pedido.cantidad}
            </p>
          </div>
        </div>
      )}

      <button className="boton suave" style={{ marginTop: 10 }} onClick={rechazar}>
        Pedir otro
      </button>
      <p className="fila-nota">
        Cambiarlo es gratis. Lo que ya cosechaste para este pedido no pasa al siguiente.
      </p>

      <h3 className="seccion">Cómo ganar monedas</h3>
      <ul className="fuentes">
        <li>
          <b>Cosechar.</b> Cada flor abierta se vende al cosecharla. Las raras valen varias
          veces lo que cuesta su semilla.
        </li>
        <li>
          <b>Pedidos.</b> Pagan encima de la venta: la misma cosecha cobra dos veces.
        </li>
        <li>
          <b>Regalo diario.</b> {BALANCE.regaloDiario} monedas por día, en Regalos.
        </li>
        <li>
          <b>Tus animales.</b> Un animal adoptado, comido y contento te deja monedas cada tanto,
          aunque el juego esté cerrado. Tu caballo ya cuenta.
        </li>
        <li>
          <b>Campo de tiro.</b> Cada flechazo en un muñeco paga según la distancia, hasta{' '}
          {BALANCE.topeTiroDiario} por día.{' '}
          {restanteTiro > 0 ? `Hoy te quedan ${restanteTiro}.` : 'Hoy ya llegaste al tope.'}{' '}
          <button className="enlace en-linea" onClick={() => setModo('practica')}>
            Ir a practicar
          </button>
        </li>
      </ul>
    </Drawer>
  );
}
