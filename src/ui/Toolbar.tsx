import { FOODS } from '../state/content';
import { useGame } from '../state/store';
import type { FoodId, ToolId } from '../state/types';
import { iconoComida, iconoFlor } from './icons';
import { PixelIcon } from './PixelIcon';

const HERRAMIENTAS: Array<{ id: ToolId; icono: string; nombre: string; ayuda: string }> = [
  { id: 'plantar', icono: '🌱', nombre: 'Sembrar', ayuda: 'Elegí una semilla y tocá una parcela' },
  { id: 'regar', icono: '💧', nombre: 'Regar', ayuda: 'Sin agua la planta no crece y se marchita' },
  { id: 'cosechar', icono: '🧺', nombre: 'Cosechar', ayuda: 'Solo funciona con la flor abierta' },
  { id: 'pala', icono: '🧹', nombre: 'Limpiar', ayuda: 'Vacía la parcela, marchita o no' },
  { id: 'mimar', icono: '🫶', nombre: 'Mimar', ayuda: 'Tocá un animal para subirle el ánimo' },
  { id: 'alimentar', icono: '🍽️', nombre: 'Alimentar', ayuda: 'Elegí comida y tocá un animal' },
];

export function Toolbar() {
  const herramienta = useGame((s) => s.herramienta);
  const setHerramienta = useGame((s) => s.setHerramienta);
  const regarTodo = useGame((s) => s.regarTodo);

  const activa = HERRAMIENTAS.find((h) => h.id === herramienta);

  return (
    <div className="dock">
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

        <button className="chip chip-accion" onClick={regarTodo} title="Riega todas las parcelas">
          💧 Regar todo
        </button>
      </div>

      {activa && <p className="dock-ayuda">{activa.ayuda}</p>}

      {herramienta === 'plantar' && <TiraSemillas />}
      {herramienta === 'alimentar' && <TiraComida />}
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
        <button className="chip" onClick={() => setPanel('tienda')}>
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
        <button className="chip" onClick={() => setPanel('tienda')}>
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
