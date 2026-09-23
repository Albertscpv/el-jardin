import { useState } from 'react';
import { FOODS } from '../state/content';
import { BALANCE, costoProximaCelda } from '../state/config';
import { CASA_ICONO, FAROLA_ICONO, PALETA_CASA_ICONO, PALETA_FAROLA_ICONO } from '../game/art/props';
import { ICONO_JUEGO } from './icons';
import { IDS_JUEGOS, JUEGOS } from '../state/juegos';
import { CASAS, TIPOS_CASA } from '../state/casas';
import { totalCeldas } from '../state/islas';
import { useGame } from '../state/store';
import type { FoodId, ToolId } from '../state/types';
import { iconoComida, iconoFlor } from './icons';
import { PixelIcon } from './PixelIcon';

interface Herramienta {
  id: ToolId;
  icono: string;
  nombre: string;
  ayuda: string;
}

const HERRAMIENTAS: Herramienta[] = [
  {
    id: 'mirar',
    icono: '👀',
    nombre: 'Mirar',
    ayuda: 'Mirá sin tocar nada: qué hay en cada lugar, cómo anda cada animal',
  },
  { id: 'plantar', icono: '🌱', nombre: 'Sembrar', ayuda: 'Elegí qué sembrar y tocá la tierra arada' },
  { id: 'regar', icono: '💧', nombre: 'Regar', ayuda: 'Sin agua no crecen, y si te olvidás se secan' },
  { id: 'cosechar', icono: '🧺', nombre: 'Cosechar', ayuda: 'Solo cuando la flor ya está abierta' },
  { id: 'pala', icono: '🧹', nombre: 'Limpiar', ayuda: 'Deja la parcela limpia, esté seca o no' },
  { id: 'mimar', icono: '🫶', nombre: 'Mimar', ayuda: 'Tocá un animal y hacele un mimo' },
  { id: 'alimentar', icono: '🍽️', nombre: 'Alimentar', ayuda: 'Elegí qué darle y tocá al que tenga hambre' },
  { id: 'arar', icono: '🪓', nombre: 'Arar', ayuda: 'Pasto a tierra de siembra, o al revés' },
  { id: 'expandir', icono: '🧱', nombre: 'Terreno', ayuda: 'Tocá el borde verde para ganarle un pedazo al vacío' },
  { id: 'farola', icono: '🏮', nombre: 'Farola', ayuda: 'Tocá el pasto para ponerla · tocala de nuevo para levantarla' },
  { id: 'agua', icono: '🌊', nombre: 'Agua', ayuda: 'Elegí qué dejar en cada lugar: agua, tierra otra vez o un nenúfar' },
  { id: 'juego', icono: '🛝', nombre: 'Juegos', ayuda: 'Poné el juego que elegiste en el pasto · tocalo de nuevo para levantarlo' },
  { id: 'casa', icono: '🏠', nombre: 'Casa', ayuda: 'Elegí en qué pedazo de pasto va · tocala de nuevo para mudarla' },
];

export function Toolbar() {
  const herramienta = useGame((s) => s.herramienta);
  const setHerramienta = useGame((s) => s.setHerramienta);
  const regarTodo = useGame((s) => s.regarTodo);
  const alimentarTodos = useGame((s) => s.alimentarTodos);
  const islas = useGame((s) => s.estado.islas);

  /**
   * La barra apoyada abajo se come casi un tercio de la pantalla en un
   * telefono. Plegarla devuelve esa franja al jardin sin perder de vista
   * con que herramienta se esta jugando: el tirador la sigue mostrando.
   */
  const [abierto, setAbierto] = useState(true);

  const activa = HERRAMIENTAS.find((h) => h.id === herramienta);
  const costoCelda = costoProximaCelda(totalCeldas(islas));

  return (
    <div className={abierto ? 'dock vidrio' : 'dock vidrio plegado'}>
      <button
        className="dock-tirador"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        title={abierto ? 'Plegar la barra' : 'Desplegar la barra'}
      >
        <span className="dock-tirador-activa">
          <span aria-hidden>{activa?.icono}</span>
          <strong>{activa?.nombre ?? 'Herramientas'}</strong>
        </span>
        <span className="dock-flecha" aria-hidden>
          {abierto ? '▾' : '▴'}
        </span>
      </button>

      {abierto && (
        <>
          <div className="dock-fila">
            <div className="herramientas">
              {HERRAMIENTAS.map((h) => (
                <button
                  key={h.id}
                  className={herramienta === h.id ? 'herramienta activa' : 'herramienta'}
                  onClick={() => setHerramienta(h.id)}
                  title={h.ayuda}
                >
                  <span className="herramienta-icono" aria-hidden>
                    {h.icono}
                  </span>
                  <span className="herramienta-nombre">{h.nombre}</span>
                </button>
              ))}
            </div>

            <div className="dock-atajos">
              <button className="boton suave" onClick={regarTodo} title="Riega todas las parcelas">
                💧 Regar todo
              </button>
              <button
                className="boton suave"
                onClick={alimentarTodos}
                title="Le da a cada animal con hambre su comida favorita"
              >
                🥕 Alimentar a todos
              </button>
            </div>
          </div>

          {activa && (
            <p className="dock-ayuda">
              {activa.ayuda}
              {herramienta === 'expandir' && (
                <>
                  {' · '}
                  <b>{costoCelda} 🪙</b> cada celda
                </>
              )}
            </p>
          )}

          {herramienta === 'plantar' && <TiraSemillas />}
          {herramienta === 'alimentar' && <TiraComida />}
          {herramienta === 'farola' && <TiraFarolas />}
          {herramienta === 'casa' && <TiraCasas />}
          {herramienta === 'juego' && <TiraJuegos />}
          {herramienta === 'agua' && <TiraAgua />}
        </>
      )}
    </div>
  );
}

function TiraSemillas() {
  const semillas = useGame((s) => s.estado.semillas);
  const seleccionada = useGame((s) => s.semillaSeleccionada);
  const setSemilla = useGame((s) => s.setSemilla);
  const setPanel = useGame((s) => s.setPanel);

  const disponibles = Object.entries(semillas).filter(([, n]) => n > 0);

  if (disponibles.length === 0) {
    return (
      <div className="tira vacia">
        <span>No te quedan semillas.</span>
        <button className="boton suave" onClick={() => setPanel('tienda')}>
          Ir a la tienda
        </button>
      </div>
    );
  }

  return (
    <div className="tira">
      {disponibles.map(([id, cantidad]) => {
        const icono = iconoFlor(id);
        return (
          <button
            key={id}
            className={seleccionada === id ? 'item activo' : 'item'}
            onClick={() => setSemilla(id)}
          >
            <PixelIcon matrix={icono.matrix} palette={icono.palette} size={30} />
            <span className="item-cantidad">{cantidad}</span>
          </button>
        );
      })}
    </div>
  );
}

function TiraComida() {
  const comida = useGame((s) => s.estado.comida);
  const seleccionada = useGame((s) => s.comidaSeleccionada);
  const setComida = useGame((s) => s.setComida);
  const setPanel = useGame((s) => s.setPanel);

  const disponibles = (Object.entries(comida) as Array<[FoodId, number]>).filter(([, n]) => n > 0);

  if (disponibles.length === 0) {
    return (
      <div className="tira vacia">
        <span>Se te acabó la comida.</span>
        <button className="boton suave" onClick={() => setPanel('tienda')}>
          Ir a la tienda
        </button>
      </div>
    );
  }

  return (
    <div className="tira">
      {disponibles.map(([id, cantidad]) => {
        const icono = iconoComida(id);
        return (
          <button
            key={id}
            className={seleccionada === id ? 'item activo' : 'item'}
            onClick={() => setComida(id)}
            title={FOODS[id].nombre}
          >
            <PixelIcon matrix={icono.matrix} palette={icono.palette} size={30} />
            <span className="item-cantidad">{cantidad}</span>
          </button>
        );
      })}
    </div>
  );
}

const OPCIONES_AGUA = [
  { id: 'agua' as const, icono: '💧', nombre: 'Agua', nota: 'Un balde por lugar' },
  { id: 'tierra' as const, icono: '🟩', nombre: 'Tierra', nota: 'Tapa el agua y vuelve el pasto' },
  { id: 'nenufar' as const, icono: '🪷', nombre: 'Nenúfar', nota: 'Flota sobre el agua' },
];

function TiraAgua() {
  const modo = useGame((s) => s.modoAgua);
  const setModoAgua = useGame((s) => s.setModoAgua);
  const actual = OPCIONES_AGUA.find((o) => o.id === modo) ?? OPCIONES_AGUA[0];

  return (
    <div className="tira">
      {OPCIONES_AGUA.map((o) => (
        <button
          key={o.id}
          className={modo === o.id ? 'item activo' : 'item'}
          onClick={() => setModoAgua(o.id)}
          title={o.nota}
        >
          <span className="item-emoji" aria-hidden>
            {o.icono}
          </span>
          <span className="item-nombre">{o.nombre}</span>
        </button>
      ))}
      <span className="tira-nota">{actual.nota}</span>
    </div>
  );
}

function TiraJuegos() {
  const objetos = useGame((s) => s.estado.objetos);
  const elegido = useGame((s) => s.juegoSeleccionado);
  const setJuego = useGame((s) => s.setJuego);
  const setPanel = useGame((s) => s.setPanel);

  const disponibles = IDS_JUEGOS.filter((id) => (objetos?.[id] ?? 0) > 0);
  if (disponibles.length === 0) {
    return (
      <div className="tira vacia">
        <span>Todavía no tenés juegos. Se compran en Construir.</span>
        <button className="boton suave" onClick={() => setPanel('construir')}>
          Ir a Construir
        </button>
      </div>
    );
  }

  const activo = disponibles.includes(elegido) ? elegido : disponibles[0];
  return (
    <div className="tira">
      {disponibles.map((id) => (
        <button
          key={id}
          className={activo === id ? 'item activo' : 'item'}
          onClick={() => setJuego(id)}
          title={JUEGOS[id].nombre}
        >
          <PixelIcon matrix={ICONO_JUEGO[id].matriz} palette={ICONO_JUEGO[id].paleta} size={30} />
          <span className="item-cantidad">{objetos?.[id] ?? 0}</span>
        </button>
      ))}
      <span className="tira-nota">{JUEGOS[activo].nombre}</span>
    </div>
  );
}

function TiraFarolas() {
  const cantidad = useGame((s) => s.estado.objetos?.farola ?? 0);
  const monedas = useGame((s) => s.estado.monedas);
  const comprar = useGame((s) => s.comprarFarolas);

  return (
    <div className="tira vacia">
      <span className="item" aria-hidden>
        <PixelIcon matrix={FAROLA_ICONO} palette={PALETA_FAROLA_ICONO} size={30} />
        <span className="item-cantidad">{cantidad}</span>
      </span>
      <span>
        {cantidad === 0
          ? 'No te queda ninguna farola.'
          : cantidad === 1
            ? 'Tenés una esperando.'
            : `Tenés ${cantidad} esperando.`}
      </span>
      <button
        className="boton suave"
        disabled={monedas < BALANCE.precioFarola}
        onClick={() => comprar(1)}
      >
        Comprar · {BALANCE.precioFarola} 🪙
      </button>
    </div>
  );
}

function TiraCasas() {
  const guardadas = useGame((s) => s.estado.casasGuardadas);
  const seleccionada = useGame((s) => s.casaSeleccionada);
  const setCasa = useGame((s) => s.setCasa);
  const setPanel = useGame((s) => s.setPanel);

  const disponibles = TIPOS_CASA.filter((t) => (guardadas?.[t] ?? 0) > 0);
  if (disponibles.length === 0) {
    return (
      <div className="tira vacia">
        <span>Todavía no tenés ninguna casa. Hay en la Tienda, en Objetos.</span>
        <button className="boton suave" onClick={() => setPanel('tienda')}>
          Ir a la tienda
        </button>
      </div>
    );
  }

  // Si la elegida ya no esta guardada, la que se pone es la primera que haya.
  const activa = seleccionada && disponibles.includes(seleccionada) ? seleccionada : disponibles[0];
  return (
    <div className="tira">
      {disponibles.map((t) => (
        <button
          key={t}
          className={activa === t ? 'item activo' : 'item'}
          onClick={() => setCasa(t)}
          title={CASAS[t].nombre}
        >
          <PixelIcon matrix={CASA_ICONO} palette={PALETA_CASA_ICONO} size={30} />
          <span className="item-cantidad">{guardadas?.[t] ?? 0}</span>
        </button>
      ))}
      <span className="tira-nota">{CASAS[activa].nombre}</span>
    </div>
  );
}
