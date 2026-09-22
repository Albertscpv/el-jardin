import { CASA_ICONO, FAROLA_ICONO, PALETA_CASA_ICONO, PALETA_FAROLA_ICONO } from '../game/art/props';
import { CASAS, TIPOS_CASA } from '../state/casas';
import { BALANCE } from '../state/config';
import { FLOWER_SPECIES, FLOWER_VARIANTS, FOOD_LIST, favoritosDe } from '../state/content';
import { useGame } from '../state/store';
import { Drawer } from './Drawer';
import { iconoComida, iconoFlor } from './icons';
import { PixelIcon } from './PixelIcon';

export function ShopPanel() {
  // La pestaña vive en el store: un aviso de "falta comida" abre directo en Comida.
  const pestana = useGame((s) => s.pestanaTienda);
  const setPestana = useGame((s) => s.setPestanaTienda);
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
        <button
          className={pestana === 'objetos' ? 'pestana activa' : 'pestana'}
          onClick={() => setPestana('objetos')}
        >
          Objetos
        </button>
      </div>

      {pestana === 'semillas' && <Semillas />}
      {pestana === 'comida' && <Comida />}
      {pestana === 'objetos' && <Objetos />}
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

function Objetos() {
  const monedas = useGame((s) => s.estado.monedas);
  const tengo = useGame((s) => s.estado.objetos?.farola ?? 0);
  const comprar = useGame((s) => s.comprarFarolas);
  const setHerramienta = useGame((s) => s.setHerramienta);
  const setPanel = useGame((s) => s.setPanel);
  const precio = BALANCE.precioFarola;

  return (
    <ul className="lista">
      <li className="fila">
        <PixelIcon matrix={FAROLA_ICONO} palette={PALETA_FAROLA_ICONO} size={44} />

        <div className="fila-texto">
          <div className="fila-titulo">
            <strong>Farola</strong>
          </div>
          <p className="fila-detalle">
            De noche alumbra el pasto alrededor{tengo > 0 && ` · tenés ${tengo} para poner`}
          </p>
          <p className="fila-nota">
            Se paga una vez: guardarla y ponerla en otro lado no cuesta nada.{' '}
            {tengo > 0 && (
              <button
                className="enlace en-linea"
                onClick={() => {
                  setHerramienta('farola');
                  setPanel(null);
                }}
              >
                Ponerla ahora
              </button>
            )}
          </p>
        </div>

        <div className="fila-acciones">
          <button className="boton" disabled={monedas < precio} onClick={() => comprar(1)}>
            {precio} 🪙
          </button>
          <button className="boton suave" disabled={monedas < precio * 5} onClick={() => comprar(5)}>
            ×5
          </button>
        </div>
      </li>

      {TIPOS_CASA.map((tipo) => (
        <FilaCasa key={tipo} tipo={tipo} />
      ))}
    </ul>
  );
}

function FilaCasa({ tipo }: { tipo: (typeof TIPOS_CASA)[number] }) {
  const monedas = useGame((s) => s.estado.monedas);
  const tengo = useGame((s) => s.estado.casasGuardadas?.[tipo] ?? 0);
  const comprar = useGame((s) => s.comprarCasa);
  const setCasa = useGame((s) => s.setCasa);
  const setPanel = useGame((s) => s.setPanel);
  const casa = CASAS[tipo];

  return (
    <li className="fila">
      <PixelIcon matrix={CASA_ICONO} palette={PALETA_CASA_ICONO} size={44} />

      <div className="fila-texto">
        <div className="fila-titulo">
          <strong>{casa.nombre}</strong>
        </div>
        <p className="fila-detalle">
          {casa.macetas} macetas · ocupa {casa.ancho} × {casa.fondo} celdas
          {tengo > 0 && ` · tenés ${tengo} para poner`}
        </p>
        <p className="fila-nota">
          {casa.descripcion}{' '}
          {tengo > 0 && (
            <button
              className="enlace en-linea"
              onClick={() => {
                setCasa(tipo);
                setPanel(null);
              }}
            >
              Ponerla ahora
            </button>
          )}
        </p>
      </div>

      <div className="fila-acciones">
        <button className="boton" disabled={monedas < casa.precio} onClick={() => comprar(tipo)}>
          {casa.precio} 🪙
        </button>
      </div>
    </li>
  );
}

function etiquetaRareza(r: string): string {
  return r === 'poco-comun' ? 'poco común' : r;
}
