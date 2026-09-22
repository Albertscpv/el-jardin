import { useEffect, useState } from 'react';
import type { Pose } from '../game/art/personaje';
import {
  ACCESORIOS,
  COLORES_ACCESORIO,
  COLORES_SOMBRERO,
  matrizAvatar,
  PANTALONES,
  paletaAvatar,
  PEINADOS,
  PELOS,
  PIELES,
  PRENDAS,
  ROPAS,
  SOMBREROS,
} from '../state/content';
import { useGame } from '../state/store';
import { Drawer } from './Drawer';
import { PixelIcon } from './PixelIcon';

export function CharacterPanel() {
  const avatar = useGame((s) => s.estado.avatar);
  const personalizar = useGame((s) => s.personalizarAvatar);
  const setPanel = useGame((s) => s.setPanel);

  return (
    <Drawer titulo="Personaje" subtitulo="Así te ves en el jardín" onCerrar={() => setPanel(null)}>
      <div className="previsualizacion">
        <PixelIcon matrix={matrizAvatar(avatar, usePoseDeMuestra())} palette={paletaAvatar(avatar)} size={128} />
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
      <Opciones
        titulo="Peinado"
        opciones={PEINADOS}
        actual={avatar.peinado ?? 'corto'}
        alElegir={(peinado) => personalizar({ peinado })}
      />
      <Paleta
        titulo="Color de pelo"
        colores={PELOS}
        actual={avatar.pelo}
        alElegir={(pelo) => personalizar({ pelo })}
      />
      <Opciones
        titulo="Ropa"
        opciones={PRENDAS}
        actual={avatar.prenda ?? 'remera'}
        alElegir={(prenda) => personalizar({ prenda })}
      />
      <Paleta
        titulo="Color de ropa"
        colores={ROPAS}
        actual={avatar.ropa}
        alElegir={(ropa) => personalizar({ ropa })}
      />
      <Paleta
        titulo={avatar.prenda === 'jardinero' ? 'Color del jardinero' : 'Pantalón y zapatos'}
        colores={PANTALONES}
        actual={avatar.pantalon}
        alElegir={(pantalon) => personalizar({ pantalon })}
      />

      <Opciones
        titulo="Sombrero"
        opciones={SOMBREROS}
        actual={avatar.sombrero}
        alElegir={(sombrero) => personalizar({ sombrero })}
      />

      {avatar.sombrero !== 'ninguno' && (
        <Paleta
          titulo="Color del sombrero"
          colores={COLORES_SOMBRERO}
          actual={avatar.colorSombrero}
          alElegir={(colorSombrero) => personalizar({ colorSombrero })}
        />
      )}

      <Opciones
        titulo="Accesorio"
        opciones={ACCESORIOS}
        actual={avatar.accesorio ?? 'ninguno'}
        alElegir={(accesorio) => personalizar({ accesorio })}
      />
      {(avatar.accesorio ?? 'ninguno') !== 'ninguno' || avatar.peinado === 'coletas' || avatar.peinado === 'rodete' ? (
        <Paleta
          titulo={avatar.accesorio && avatar.accesorio !== 'ninguno' ? 'Color del accesorio' : 'Color de las cintas'}
          colores={COLORES_ACCESORIO}
          actual={avatar.colorAccesorio ?? COLORES_ACCESORIO[0]}
          alElegir={(colorAccesorio) => personalizar({ colorAccesorio })}
        />
      ) : null}

      <p className="fila-nota">
        El personaje camina solo hasta donde trabajás: al sembrar, regar o acariciar a un animal,
        se acerca por su cuenta.
      </p>
    </Drawer>
  );
}

/** La vista previa parpadea, camina y festeja de a ratos, como en el jardín. */
function usePoseDeMuestra(): Pose {
  const [cuadro, setCuadro] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setCuadro((c) => (c + 1) % 40), 150);
    return () => window.clearInterval(id);
  }, []);
  if (cuadro === 6) return 'parpadeo';
  if (cuadro >= 14 && cuadro < 26) return (['quieto', 'pasoA', 'quieto', 'pasoB'] as const)[cuadro % 4];
  if (cuadro >= 30 && cuadro < 35) return 'festejo';
  return 'quieto';
}

function Opciones<T extends string>({
  titulo,
  opciones,
  actual,
  alElegir,
}: {
  titulo: string;
  opciones: Array<{ id: T; nombre: string }>;
  actual: T;
  alElegir: (id: T) => void;
}) {
  return (
    <>
      <span className="etiqueta">{titulo}</span>
      <div className="opciones-sombrero">
        {opciones.map((o) => (
          <button key={o.id} className={actual === o.id ? 'activa' : undefined} onClick={() => alElegir(o.id)}>
            {o.nombre}
          </button>
        ))}
      </div>
    </>
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
