import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { EventBus } from '../game/EventBus';

/** Controles minimos de camara. El grueso se maneja arrastrando el jardin. */
export function CameraControls() {
  // La pista se muestra al entrar y se va sola: una vez que sabés arrastrar,
  // dejarla fija solo taparia el jardin.
  const [pista, setPista] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setPista(false), 9000);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      <div className="camara vidrio">
        <button
          onClick={() => EventBus.emit('camara:zoom', { delta: 0.18 })}
          title="Acercar"
          aria-label="Acercar"
        >
          +
        </button>
        <button
          onClick={() => EventBus.emit('camara:zoom', { delta: -0.18 })}
          title="Alejar"
          aria-label="Alejar"
        >
          −
        </button>
        <button
          onClick={() => EventBus.emit('camara:centrar', {})}
          title="Encuadrar todo el jardín"
          aria-label="Encuadrar todo el jardín"
        >
          ⌖
        </button>
      </div>

      <AnimatePresence>
        {pista && (
          <motion.p
            className="pista-camara vidrio"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
          >
            <b>Arrastrá</b> para girar · <b>Shift</b> o botón derecho para mover · <b>rueda</b> para
            acercar
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}
