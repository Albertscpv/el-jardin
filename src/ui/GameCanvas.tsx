import { useEffect, useRef } from 'react';
import { EventBus } from '../game/EventBus';
import { GardenWorld } from '../game/world/GardenWorld';
import { useGame } from '../state/store';

/**
 * Monta el mundo 3D dentro de un div y traduce sus eventos a acciones del
 * store. React no vuelve a renderizar por nada de lo que pase en la escena.
 */
export function GameCanvas() {
  const contenedor = useRef<HTMLDivElement>(null);
  const mundo = useRef<GardenWorld | null>(null);

  useEffect(() => {
    if (!contenedor.current || mundo.current) return;
    mundo.current = new GardenWorld(contenedor.current);

    return () => {
      mundo.current?.destruir();
      mundo.current = null;
    };
  }, []);

  useEffect(() => {
    const offs = [
      EventBus.on('parcela:click', ({ index }) => useGame.getState().usarEnParcela(index)),
      EventBus.on('animal:click', ({ uid }) => useGame.getState().interactuarAnimal(uid)),
    ];
    return () => offs.forEach((off) => off());
  }, []);

  return (
    <div className="escenario" ref={contenedor}>
      <div className="camara-controles">
        <button
          onClick={() => EventBus.emit('camara:rotar', { dir: -1 })}
          title="Girar la vista a la izquierda (tecla Q)"
          aria-label="Girar la vista a la izquierda"
        >
          ⟲
        </button>
        <button
          onClick={() => EventBus.emit('camara:rotar', { dir: 1 })}
          title="Girar la vista a la derecha (tecla E)"
          aria-label="Girar la vista a la derecha"
        >
          ⟳
        </button>
      </div>
    </div>
  );
}
