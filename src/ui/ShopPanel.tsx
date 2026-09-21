import { useState } from 'react';
import { FLOWER_SPECIES, FLOWER_VARIANTS, FOOD_LIST, favoritosDe } from '../state/content';
import { useGame } from '../state/store';
import { Drawer } from './Drawer';
import { iconoComida, iconoFlor } from './icons';
import { PixelIcon } from './PixelIcon';

type Pestana = 'semillas' | 'comida';

export function ShopPanel() {
  const [pestana, setPestana] = useState<Pestana>('semillas');
  const monedas = useGame((s) => s.estado.monedas);
  const setPanel = useGame((s) => s.setPanel);

  return (
    <Drawer titulo="Tienda" subtitulo={`Tenés ${monedas} monedas`} onCerrar={() => setPanel(null)}>
      <div className="pestanas">
        <button
          className={pestana === 'semillas' ? 'pestana activa' : 'pestana'}
          onClick={() => setPestana('semillas')}
        >
          Semillas
        </button>
        <button
          className={pestana === 'comida' ? 'pestana activa' : 'pestana'}
          onClick={() => setPestana('comida')}
        >
          Comida
        </button>
      </div>

      {pestana === 'semillas' ? <Semillas /> : <Comida />}
    </Drawer>
  );
}

function Semillas() {
  const monedas = useGame((s) => s.estado.monedas);
  const inventario = useGame((s) => s.estado.semillas);
  const comprar = useGame((s) => s.comprarSemilla);

  return (
    <ul className="lista">
      {FLOWER_VARIANTS.map((v) => {
        const icono = iconoFlor(v.id);
        const especie = FLOWER_SPECIES[v.especie];
        const tengo = inventario[v.id] ?? 0;

        return (
          <li key={v.id} className="fila">
            <PixelIcon matrix={icono.matrix} palette={icono.palette} size={44} />

            <div className="fila-texto">
              <div className="fila-titulo">
                <strong>{v.nombre}</strong>
                <span className={`rareza ${v.rareza}`}>{etiquetaRareza(v.rareza)}</span>
              </div>
              <p className="fila-detalle">
                {especie.minutosCrecimiento} min · se vende a {v.precioVenta} 🪙
                {tengo > 0 && ` · tenés ${tengo}`}
              </p>
              <p className="fila-nota">{especie.descripcion}</p>
            </div>

            <div className="fila-acciones">
              <button
                className="boton"
                disabled={monedas < v.precioSemilla}
                onClick={() => comprar(v.id, 1)}
              >
                {v.precioSemilla} 🪙
              </button>
              <button
                className="boton suave"
                disabled={monedas < v.precioSemilla * 5}
                onClick={() => comprar(v.id, 5)}
              >
                ×5
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Comida() {
  const monedas = useGame((s) => s.estado.monedas);
  const inventario = useGame((s) => s.estado.comida);
  const comprar = useGame((s) => s.comprarComida);

  return (
    <ul className="lista">
      {FOOD_LIST.map((c) => {
        const icono = iconoComida(c.id);
        const tengo = inventario[c.id] ?? 0;

        return (
          <li key={c.id} className="fila">
            <PixelIcon matrix={icono.matrix} palette={icono.palette} size={44} />

            <div className="fila-texto">
              <div className="fila-titulo">
                <strong>{c.nombre}</strong>
              </div>
              <p className="fila-detalle">
                Quita {c.saciedad} de hambre{tengo > 0 && ` · tenés ${tengo}`}
              </p>
              <p className="fila-nota">
                Favorita de {favoritosDe(c.id)}. A su animal favorito le da más confianza.
              </p>
            </div>

            <div className="fila-acciones">
              <button className="boton" disabled={monedas < c.precio} onClick={() => comprar(c.id, 1)}>
                {c.precio} 🪙
              </button>
              <button
                className="boton suave"
                disabled={monedas < c.precio * 5}
                onClick={() => comprar(c.id, 5)}
              >
                ×5
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function etiquetaRareza(r: string): string {
  return r === 'poco-comun' ? 'poco común' : r;
}
