import { ANIMAL_SPECIES, FOODS, getAnimalVariant } from '../state/content';
import { nombreDe, useGame } from '../state/store';
import type { AnimalState } from '../state/types';
import { Barra } from './Bars';
import { Drawer } from './Drawer';
import { iconoAnimal } from './icons';
import { PixelIcon } from './PixelIcon';

export function AnimalsPanel() {
  const animales = useGame((s) => s.estado.animales);
  const setPanel = useGame((s) => s.setPanel);
  const alimentarTodos = useGame((s) => s.alimentarTodos);

  const adoptados = animales.filter((a) => a.estado === 'adoptado');
  const visitantes = animales.filter((a) => a.estado === 'visitante');

  return (
    <Drawer
      titulo="Animales"
      subtitulo={`${adoptados.length} en casa · ${visitantes.length} de visita`}
      onCerrar={() => setPanel(null)}
    >
      {animales.length > 0 && (
        <button className="boton ancho" onClick={alimentarTodos}>
          🥕 Alimentar a todos con su comida favorita
        </button>
      )}

      {animales.length === 0 && (
        <p className="vacio-largo">
          Todavía no vino nadie. Los animales aparecen solos cuando hay flores abiertas: una
          mariposa con la primera, y el resto a medida que el jardín crece.
        </p>
      )}

      {adoptados.length > 0 && (
        <>
          <h3 className="seccion">En casa</h3>
          <ul className="lista">
            {adoptados.map((a) => (
              <FichaAnimal key={a.uid} animal={a} />
            ))}
          </ul>
        </>
      )}

      {visitantes.length > 0 && (
        <>
          <h3 className="seccion">De visita</h3>
          <ul className="lista">
            {visitantes.map((a) => (
              <FichaAnimal key={a.uid} animal={a} />
            ))}
          </ul>
        </>
      )}
    </Drawer>
  );
}

function FichaAnimal({ animal }: { animal: AnimalState }) {
  const icono = iconoAnimal(animal.variante);
  const especie = ANIMAL_SPECIES[animal.especie];
  const variante = getAnimalVariant(animal.variante);
  const renombrar = useGame((s) => s.renombrar);
  const liberar = useGame((s) => s.liberar);
  const setHerramienta = useGame((s) => s.setHerramienta);
  const setComida = useGame((s) => s.setComida);
  const adoptado = animal.estado === 'adoptado';

  return (
    <li className="fila fila-animal">
      <PixelIcon matrix={icono.matrix} palette={icono.palette} size={48} />

      <div className="fila-texto">
        <div className="fila-titulo">
          {adoptado ? (
            <input
              className="nombre-editable"
              value={animal.nombre ?? ''}
              maxLength={18}
              onChange={(e) => renombrar(animal.uid, e.target.value)}
              aria-label="Nombre del animal"
            />
          ) : (
            <strong>{nombreDe(animal)}</strong>
          )}
        </div>
        <p className="fila-detalle">
          {especie.nombre} · {variante.nombre} · le gusta {FOODS[especie.comidaFavorita].nombre.toLowerCase()}
        </p>

        {adoptado ? (
          <div className="barras">
            <Barra etiqueta="Saciedad" valor={animal.hambre} color="#f0a848" invertida />
            <Barra etiqueta="Ánimo" valor={animal.felicidad} color="#7fd18a" />
            <Barra etiqueta="Vínculo" valor={animal.vinculo} color="#e88ab0" />
          </div>
        ) : (
          <div className="barras">
            <Barra etiqueta="Confianza" valor={animal.confianza} color="#8ec5ff" />
            <p className="fila-nota">
              Dale de comer y acaricialo. Al llegar a 100 te deja adoptarlo.
            </p>
          </div>
        )}
      </div>

      <div className="fila-acciones">
        <button
          className="boton suave"
          onClick={() => {
            setComida(especie.comidaFavorita);
            setHerramienta('alimentar');
          }}
          title="Selecciona su comida favorita"
        >
          Alimentar
        </button>
        {adoptado && (
          <button
            className="boton peligro"
            onClick={() => liberar(animal.uid)}
            title="Lo devolvés a la naturaleza"
          >
            Liberar
          </button>
        )}
      </div>
    </li>
  );
}
