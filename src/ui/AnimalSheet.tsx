import { AnimatePresence, motion } from 'framer-motion';
import { ANIMAL_SPECIES, FOODS, getAnimalVariant } from '../state/content';
import { nombreDe, useGame } from '../state/store';
import { Barra } from './Bars';
import { iconoAnimal } from './icons';
import { PixelIcon } from './PixelIcon';

/** Ficha emergente de un animal, al tocarlo con una herramienta de jardín. */
export function AnimalSheet() {
  const uid = useGame((s) => s.animalAbierto);
  const animal = useGame((s) => s.estado.animales.find((a) => a.uid === s.animalAbierto) ?? null);
  const cerrar = useGame((s) => s.abrirAnimal);
  const setHerramienta = useGame((s) => s.setHerramienta);
  const setComida = useGame((s) => s.setComida);
  const renombrar = useGame((s) => s.renombrar);

  return (
    <AnimatePresence>
      {uid && animal && (
        <motion.div
          className="ficha"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        >
          <button className="cerrar ficha-cerrar" onClick={() => cerrar(null)} aria-label="Cerrar">
            ✕
          </button>

          <div className="ficha-cabecera">
            <PixelIcon {...iconoAnimal(animal.variante)} size={56} />
            <div>
              {animal.estado === 'adoptado' ? (
                <input
                  className="nombre-editable grande"
                  value={animal.nombre ?? ''}
                  maxLength={18}
                  onChange={(e) => renombrar(animal.uid, e.target.value)}
                  aria-label="Nombre"
                />
              ) : (
                <strong className="ficha-nombre">{nombreDe(animal)}</strong>
              )}
              <p className="fila-detalle">
                {ANIMAL_SPECIES[animal.especie].nombre} ·{' '}
                {getAnimalVariant(animal.variante).nombre}
              </p>
            </div>
          </div>

          <div className="barras">
            {animal.estado === 'adoptado' ? (
              <>
                <Barra etiqueta="Saciedad" valor={animal.hambre} color="#f0a848" invertida />
                <Barra etiqueta="Ánimo" valor={animal.felicidad} color="#7fd18a" />
                <Barra etiqueta="Vínculo" valor={animal.vinculo} color="#e88ab0" />
              </>
            ) : (
              <Barra etiqueta="Confianza" valor={animal.confianza} color="#8ec5ff" />
            )}
          </div>

          <div className="ficha-acciones">
            <button className="boton suave" onClick={() => setHerramienta('mimar')}>
              🫶 Mimar
            </button>
            <button
              className="boton"
              onClick={() => {
                setComida(ANIMAL_SPECIES[animal.especie].comidaFavorita);
                setHerramienta('alimentar');
              }}
            >
              🍽️ {FOODS[ANIMAL_SPECIES[animal.especie].comidaFavorita].nombre}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
