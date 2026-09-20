import {
  COLORES_SOMBRERO,
  matrizAvatar,
  PANTALONES,
  paletaAvatar,
  PELOS,
  PIELES,
  ROPAS,
  SOMBREROS,
} from '../state/content';
import { useGame } from '../state/store';
import type { AvatarState } from '../state/types';
import { Drawer } from './Drawer';
import { PixelIcon } from './PixelIcon';

export function CharacterPanel() {
  const avatar = useGame((s) => s.estado.avatar);
  const personalizar = useGame((s) => s.personalizarAvatar);
  const setPanel = useGame((s) => s.setPanel);

  return (
    <Drawer titulo="Personaje" subtitulo="Así te ves en el jardín" onCerrar={() => setPanel(null)}>
      <div className="previsualizacion">
        <PixelIcon matrix={matrizAvatar(avatar)} palette={paletaAvatar(avatar)} size={128} />
      </div>

      <label className="etiqueta" htmlFor="nombre-avatar">
        Nombre
      </label>
      <input
        id="nombre-avatar"
        className="nombre-editable grande"
        style={{ maxWidth: '100%' }}
        value={avatar.nombre}
        maxLength={20}
        onChange={(e) => personalizar({ nombre: e.target.value })}
      />

      <Paleta
        titulo="Piel"
        colores={PIELES}
        actual={avatar.piel}
        alElegir={(piel) => personalizar({ piel })}
      />
      <Paleta
        titulo="Pelo"
        colores={PELOS}
        actual={avatar.pelo}
        alElegir={(pelo) => personalizar({ pelo })}
      />
      <Paleta
        titulo="Ropa"
        colores={ROPAS}
        actual={avatar.ropa}
        alElegir={(ropa) => personalizar({ ropa })}
      />
      <Paleta
        titulo="Pantalón"
        colores={PANTALONES}
        actual={avatar.pantalon}
        alElegir={(pantalon) => personalizar({ pantalon })}
      />

      <span className="etiqueta">Sombrero</span>
      <div className="opciones-sombrero">
        {SOMBREROS.map((s) => (
          <button
            key={s.id}
            className={avatar.sombrero === s.id ? 'activa' : undefined}
            onClick={() => personalizar({ sombrero: s.id as AvatarState['sombrero'] })}
          >
            {s.nombre}
          </button>
        ))}
      </div>

      {avatar.sombrero !== 'ninguno' && (
        <Paleta
          titulo="Color del sombrero"
          colores={COLORES_SOMBRERO}
          actual={avatar.colorSombrero}
          alElegir={(colorSombrero) => personalizar({ colorSombrero })}
        />
      )}

      <p className="fila-nota">
        El personaje camina solo hasta donde trabajás: al sembrar, regar o acariciar a un animal,
        se acerca por su cuenta.
      </p>
    </Drawer>
  );
}

function Paleta({
  titulo,
  colores,
  actual,
  alElegir,
}: {
  titulo: string;
  colores: readonly string[];
  actual: string;
  alElegir: (color: string) => void;
}) {
  return (
    <>
      <span className="etiqueta">{titulo}</span>
      <div className="muestras">
        {colores.map((color) => (
          <button
            key={color}
            className={color === actual ? 'muestra activa' : 'muestra'}
            style={{ background: color }}
            onClick={() => alElegir(color)}
            aria-label={`${titulo} ${color}`}
          />
        ))}
      </div>
    </>
  );
}
