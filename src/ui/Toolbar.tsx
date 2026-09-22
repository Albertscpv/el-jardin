import { useState } from 'react';
import { FOODS } from '../state/content';
import { BALANCE, costoProximaCelda } from '../state/config';
import { CASA_ICONO, FAROLA_ICONO, PALETA_CASA_ICONO, PALETA_FAROLA_ICONO } from '../game/art/props';
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
    ayuda: 'Tocá sin que pase nada: mirá una planta o abrí la ficha de un animal',
  },
  { id: 'plantar', icono: '🌱', nombre: 'Sembrar', ayuda: 'Elegí una semilla y tocá una parcela arada' },
  { id: 'regar', icono: '💧', nombre: 'Regar', ayuda: 'Sin agua la planta no crece y se marchita' },
  { id: 'cosechar', icono: '🧺', nombre: 'Cosechar', ayuda: 'Solo funciona con la flor abierta' },
  { id: 'pala', icono: '🧹', nombre: 'Limpiar', ayuda: 'Vacía la parcela, marchita o no' },
  { id: 'mimar', icono: '🫶', nombre: 'Mimar', ayuda: 'Tocá un animal para subirle el ánimo' },
  { id: 'alimentar', icono: '🍽️', nombre: 'Alimentar', ayuda: 'Elegí comida y tocá un animal' },
  { id: 'arar', icono: '🪓', nombre: 'Arar', ayuda: 'Convierte césped en parcela, y al revés' },
  { id: 'expandir', icono: '🧱', nombre: 'Terreno', ayuda: 'Tocá una celda verde del borde para ganarla' },
  { id: 'farola', icono: '🏮', nombre: 'Farola', ayuda: 'Tocá el césped para poner una · tocá una farola para guardarla' },
  { id: 'casa', icono: '🏠', nombre: 'Casa', ayuda: 'Tocá el césped para poner la casa · tocá una casa para guardarla y moverla' },
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
        <span>No te queda comida.</span>
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
          ? 'No te quedan farolas.'
          : cantidad === 1
            ? 'Tenés 1 para poner.'
            : `Tenés ${cantidad} para poner.`}
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
        <span>No tenés casas guardadas. Hay en la Tienda, en Objetos.</span>
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
