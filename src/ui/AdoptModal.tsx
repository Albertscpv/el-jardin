import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ANIMAL_SPECIES, getAnimalVariant } from '../state/content';
import { useGame } from '../state/store';
import { iconoAnimal } from './icons';
import { PixelIcon } from './PixelIcon';

/** Nombres sugeridos: bajar la fricción de "ahora inventá un nombre". */
const SUGERENCIAS = [
  'Lulo', 'Canela', 'Pelusa', 'Nube', 'Tuna', 'Mora', 'Chispa', 'Copo',
  'Trébol', 'Ramona', 'Pipo', 'Malva', 'Duna', 'Chai', 'Tomate', 'Luna',
];

export function AdoptModal() {
  const uid = useGame((s) => s.adoptando);
  const animal = useGame((s) => s.estado.animales.find((a) => a.uid === s.adoptando) ?? null);
  const adoptar = useGame((s) => s.adoptar);
  const cerrar = useGame((s) => s.cerrarAdopcion);

  const [nombre, setNombre] = useState('');

  useEffect(() => {
    if (uid) setNombre(SUGERENCIAS[Math.floor(Math.random() * SUGERENCIAS.length)]);
  }, [uid]);

  return (
    <AnimatePresence>
      {uid && animal && (
        <motion.div
          className="velo"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={cerrar}
        >
          <motion.div
            className="modal"
            initial={{ scale: 0.86, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            >
              <PixelIcon
                {...iconoAnimal(animal.variante)}
                size={96}
              />
            </motion.div>

            <h2>¡Confía en vos!</h2>
            <p className="modal-texto">
              Este {ANIMAL_SPECIES[animal.especie].nombre.toLowerCase()}{' '}
              {getAnimalVariant(animal.variante).nombre.toLowerCase()} quiere quedarse en tu jardín.
              ¿Cómo lo vas a llamar?
            </p>

            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                adoptar(uid, nombre);
              }}
            >
              <input
                autoFocus
                value={nombre}
                maxLength={18}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Su nombre"
                aria-label="Nombre del animal"
              />
              <div className="modal-acciones">
                <button type="button" className="comprar secundario" onClick={cerrar}>
                  Todavía no
                </button>
                <button type="submit" className="comprar" disabled={!nombre.trim()}>
                  Adoptar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
