import { EventBus } from '../game/EventBus';
import { BALANCE, costoProximaCelda } from '../state/config';
import { IDS_JUEGOS, JUEGOS, type JuegoId } from '../state/juegos';
import { ARBOLES, IDS_ARBOLES } from '../state/arboles';
import { IDS_OBRAS, OBRAS, type ObraId } from '../state/arte';
import type { TipoArbol } from '../game/art/arboles';
import { totalCeldas } from '../state/islas';
import { useGame } from '../state/store';
import { Drawer } from './Drawer';
import { ICONO_JUEGO } from './icons';
import { PixelIcon } from './PixelIcon';
import { MiniaturaDeObra } from './VisorDeObra';

export function BuildPanel() {
  const islas = useGame((s) => s.estado.islas);
  const monedas = useGame((s) => s.estado.monedas);
  const herramienta = useGame((s) => s.herramienta);
  const setHerramienta = useGame((s) => s.setHerramienta);
  const setPanel = useGame((s) => s.setPanel);
  const fundarIsla = useGame((s) => s.fundarIsla);
  const renombrarIsla = useGame((s) => s.renombrarIsla);

  const celdas = totalCeldas(islas);
  const costoCelda = costoProximaCelda(celdas);

  return (
    <Drawer
      titulo="Construir"
      subtitulo={`${celdas} celdas en ${islas.length} ${islas.length === 1 ? 'isla' : 'islas'}`}
      onCerrar={() => setPanel(null)}
    >
      <button
        className={herramienta === 'expandir' ? 'tarjeta-accion activa' : 'tarjeta-accion'}
        onClick={() => setHerramienta('expandir')}
      >
        <span className="tarjeta-icono" aria-hidden>
          🧱
        </span>
        <span className="tarjeta-texto">
          <strong>Ganarle al vacío</strong>
          <span>Tocá el borde verde de una isla y esa tierra pasa a ser tuya.</span>
        </span>
        <span className="precio">{costoCelda} 🪙</span>
      </button>

      <button
        className={herramienta === 'arar' ? 'tarjeta-accion activa' : 'tarjeta-accion'}
        onClick={() => setHerramienta('arar')}
      >
        <span className="tarjeta-icono" aria-hidden>
          🪓
        </span>
        <span className="tarjeta-texto">
          <strong>Arar y desarar</strong>
          <span>El pasto se vuelve tierra de siembra. Tocá una parcela vacía y vuelve atrás.</span>
        </span>
        <span className="precio">{BALANCE.costoArar} 🪙</span>
      </button>

      <p className="fila-nota">
        La cerca no se compra ni se pone: crece sola alrededor de cada isla y se acomoda cada
        vez que ganás terreno.
      </p>

      <h3 className="seccion">Arte</h3>
      <p className="fila-nota">
        Réplicas en pixel art de cuadros famosos, cada una en su atril. Se ponen con la
        herramienta Arte, y tocándolas con Mirar se despliegan en grande para verlas de cerca.
      </p>
      <ul className="lista">
        {IDS_OBRAS.map((id) => (
          <FilaObra key={id} id={id} />
        ))}
      </ul>

      <h3 className="seccion">Árboles</h3>
      <p className="fila-nota">
        Se plantan sobre el pasto con la herramienta Árbol. Cambian con la época del año: en otoño
        se ponen dorados y en invierno se quedan sin hojas, salvo el pino.
      </p>
      <ul className="lista">
        {IDS_ARBOLES.map((id) => (
          <FilaArbol key={id} id={id} />
        ))}
      </ul>

      <h3 className="seccion">Cosas para los chicos</h3>
      <p className="fila-nota">
        Se ponen sobre el pasto con la herramienta Juegos. Cambiarlos de lugar no cuesta nada:
        los levantás y los volvés a poner donde quieras.
      </p>
      <ul className="lista">
        {IDS_JUEGOS.map((id) => (
          <FilaJuego key={id} id={id} />
        ))}
      </ul>

      <h3 className="seccion">Tus islas</h3>
      <ul className="lista">
        {islas.map((isla) => (
          <li key={isla.id} className="fila">
            <span className="tarjeta-icono" aria-hidden>
              🏝️
            </span>
            <div className="fila-texto">
              <input
                className="nombre-editable"
                value={isla.nombre}
                maxLength={24}
                onChange={(e) => renombrarIsla(isla.id, e.target.value)}
                aria-label="Nombre de la isla"
              />
              <p className="fila-detalle">
                {isla.suelo.length} celdas · {isla.parcelas.length} parcelas
              </p>
            </div>
            <button
              className="boton suave"
              onClick={() =>
                EventBus.emit('camara:mirar', {
                  x: isla.ox + 2.5,
                  z: isla.oz + 2.5,
                })
              }
            >
              Ir
            </button>
          </li>
        ))}
      </ul>

      <h3 className="seccion">Fundar una isla</h3>
      <p className="fila-nota">
        Aparece un islote chiquito al lado del jardín, pelado como el primer día. De ahí en más,
        es cosa tuya.
      </p>
      <button
        className="boton"
        style={{ marginTop: 10 }}
        disabled={monedas < BALANCE.costoIsla}
        onClick={fundarIsla}
      >
        Fundar isla · {BALANCE.costoIsla} 🪙
      </button>
    </Drawer>
  );
}

function FilaJuego({ id }: { id: JuegoId }) {
  const monedas = useGame((s) => s.estado.monedas);
  const tengo = useGame((s) => s.estado.objetos?.[id] ?? 0);
  const comprar = useGame((s) => s.comprarJuego);
  const setJuego = useGame((s) => s.setJuego);
  const setPanel = useGame((s) => s.setPanel);
  const juego = JUEGOS[id];

  return (
    <li className="fila">
      <PixelIcon matrix={ICONO_JUEGO[id].matriz} palette={ICONO_JUEGO[id].paleta} size={44} />

      <div className="fila-texto">
        <div className="fila-titulo">
          <strong>{juego.nombre}</strong>
        </div>
        <p className="fila-detalle">
          {juego.descripcion}
          {tengo > 0 && ` · tenés ${tengo} para poner`}
        </p>
        {tengo > 0 && (
          <p className="fila-nota">
            <button
              className="enlace en-linea"
              onClick={() => {
                setJuego(id);
                setPanel(null);
              }}
            >
              Ponerlo ahora
            </button>
          </p>
        )}
      </div>

      <div className="fila-acciones">
        <button className="boton" disabled={monedas < juego.precio} onClick={() => comprar(id)}>
          {juego.precio} 🪙
        </button>
      </div>
    </li>
  );
}

function FilaArbol({ id }: { id: TipoArbol }) {
  const monedas = useGame((s) => s.estado.monedas);
  const tengo = useGame((s) => s.estado.objetos?.[id] ?? 0);
  const comprar = useGame((s) => s.comprarArbol);
  const setArbol = useGame((s) => s.setArbol);
  const setPanel = useGame((s) => s.setPanel);
  const arbol = ARBOLES[id];

  return (
    <li className="fila">
      <span className="tarjeta-icono" aria-hidden>
        {id === 'pino' ? '🌲' : id === 'cerezo' ? '🌸' : id === 'sauce' ? '🌿' : '🌳'}
      </span>

      <div className="fila-texto">
        <div className="fila-titulo">
          <strong>{arbol.nombre}</strong>
        </div>
        <p className="fila-detalle">
          {arbol.descripcion}
          {tengo > 0 && ` · tenés ${tengo} para plantar`}
        </p>
        {tengo > 0 && (
          <p className="fila-nota">
            <button
              className="enlace en-linea"
              onClick={() => {
                setArbol(id);
                setPanel(null);
              }}
            >
              Plantarlo ahora
            </button>
          </p>
        )}
      </div>

      <div className="fila-acciones">
        <button className="boton" disabled={monedas < arbol.precio} onClick={() => comprar(id)}>
          {arbol.precio} 🪙
        </button>
      </div>
    </li>
  );
}

function FilaObra({ id }: { id: ObraId }) {
  const monedas = useGame((s) => s.estado.monedas);
  const obra = OBRAS[id];
  const tengo = useGame((s) => s.estado.objetos?.[obra.prop] ?? 0);
  const comprar = useGame((s) => s.comprarObra);
  const abrir = useGame((s) => s.abrirObra);

  return (
    <li className="fila">
      <span className="tarjeta-icono" aria-hidden>
        <MiniaturaDeObra obra={id} lado={34} />
      </span>

      <div className="fila-texto">
        <div className="fila-titulo">
          <strong>{obra.nombre}</strong>
        </div>
        <p className="fila-detalle">
          {obra.descripcion}
          {tengo > 0 && ` · tenés ${tengo} para poner`}
        </p>
        <p className="fila-nota">
          <button className="enlace en-linea" onClick={() => abrir(id)}>
            Mirarlo antes de comprar
          </button>
        </p>
      </div>

      <div className="fila-acciones">
        <button className="boton" disabled={monedas < obra.precio} onClick={() => comprar(id)}>
          {obra.precio} 🪙
        </button>
      </div>
    </li>
  );
}
