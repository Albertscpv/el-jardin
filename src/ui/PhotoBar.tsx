import { EventBus } from '../game/EventBus';
import { useGame } from '../state/store';

/**
 * La barra del modo foto: lo único que queda en pantalla.
 *
 * Se mantiene chica y abajo, lejos del jardín, porque lo que importa es lo
 * que hay detrás. La foto sale sin esta barra: se dibuja el mundo aparte,
 * no se captura la pantalla.
 */
export function PhotoBar() {
  const salir = useGame((s) => s.setModoFoto);

  return (
    <div className="barra-foto vidrio">
      <span className="barra-foto-pista">
        Encuadrá como quieras: arrastrá para girar, la rueda acerca
      </span>
      <div className="barra-foto-botones">
        <button className="boton" onClick={() => EventBus.emit('foto:sacar', {})}>
          📷 Sacar la foto
        </button>
        <button className="boton suave" onClick={() => salir(false)}>
          Salir
        </button>
      </div>
    </div>
  );
}
