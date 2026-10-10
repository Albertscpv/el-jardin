import { FLOWER_SPECIES } from '../state/content';
import { progresoAlbum, variedadesDe, yaVista } from '../state/album';
import { useGame } from '../state/store';
import type { FlowerSpeciesId } from '../state/types';
import { Drawer } from './Drawer';
import { iconoFlor } from './icons';
import { PixelIcon } from './PixelIcon';

/**
 * El álbum de flores.
 *
 * Las que todavía no salieron se muestran igual, en silueta: ver el hueco
 * es lo que da ganas de llenarlo. No desbloquea nada ni paga monedas.
 */
export function AlbumPanel() {
  const setPanel = useGame((s) => s.setPanel);
  const estado = useGame((s) => s.estado);
  const progreso = progresoAlbum(estado);

  return (
    <Drawer
      titulo="Álbum"
      subtitulo={
        progreso.completo
          ? 'Están todas. No queda ninguna por conocer'
          : `${progreso.vistas} de ${progreso.total} variedades`
      }
      onCerrar={() => setPanel(null)}
    >
      {progreso.vistas === 0 && (
        <p className="vacio-largo">
          Todavía está en blanco. Cada flor entra sola la primera vez que la cosechás.
        </p>
      )}

      {progreso.porEspecie.map(({ especie, nombre, vistas, total }) => (
        <section key={especie}>
          <h3 className="seccion">
            {nombre} <span className="album-cuenta">{vistas}/{total}</span>
          </h3>
          <div className="album-grilla">
            {variedadesDe(especie as FlowerSpeciesId).map((v) => {
              const conocida = yaVista(estado, v.id);
              const icono = iconoFlor(v.id);
              return (
                <div key={v.id} className={conocida ? 'album-ficha' : 'album-ficha oculta'}>
                  <PixelIcon matrix={icono.matrix} palette={icono.palette} size={44} />
                  <span className="album-nombre">{conocida ? v.nombre : '¿?'}</span>
                  {conocida && <span className="album-rareza">{v.rareza.replace('-', ' ')}</span>}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <p className="fila-nota">
        {FLOWER_SPECIES.tulipan.nombre} y las demás se compran en la Tienda. Las variedades raras
        aparecen más salteado, así que el álbum se llena de a poco.
      </p>
    </Drawer>
  );
}
