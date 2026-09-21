import { useEffect, useRef, useState } from 'react';
import { FirstPersonRange, type ResultadoTiro } from '../game/range/FirstPersonRange';
import { climaActual, describirViento, type Clima } from '../state/clima';
import { RECORDS_VACIOS, useGame } from '../state/store';

/**
 * Pantalla del campo de tiro.
 *
 * Ocupa todo y tapa el jardin: es otro escenario, no un panel encima del
 * mismo mundo. El canvas 2D vive fuera de React; lo unico que cruza la
 * frontera son los resultados de cada tiro.
 */
export function RangeScreen() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pie = useRef<HTMLElement>(null);
  const escena = useRef<FirstPersonRange | null>(null);

  const rivalDespierto = Boolean(useGame((s) => s.estado.rivalDespierto));
  const municion = useGame((s) => s.municion);
  const setMunicion = useGame((s) => s.setMunicion);
  const setModo = useGame((s) => s.setModo);
  const records = useGame((s) => s.estado.records ?? RECORDS_VACIOS);

  const [clima, setClima] = useState<Clima>(() => climaActual());

  useEffect(() => {
    if (!canvas.current) return;

    const r = new FirstPersonRange(canvas.current, rivalDespierto);
    escena.current = r;

    r.alResolver = (res: ResultadoTiro) => {
      const juego = useGame.getState();
      // La punteria es del arco: las bombas de agua tienen su propia cuenta.
      if (res.tipo === 'flecha') {
        juego.registrarDisparo();
        if (res.acierto === 'muneco') juego.registrarImpacto(res.metros);
      }
      if (res.acierto === 'rival') juego.registrarMojada();
    };

    // El arco se apoya encima del panel: hay que medirlo y avisarle.
    const medirPie = () => r.setMargenInferior(pie.current?.offsetHeight ?? 0);
    medirPie();
    const observador = new ResizeObserver(medirPie);
    if (pie.current) observador.observe(pie.current);

    r.arrancar();

    if (import.meta.env.DEV) {
      // Handle de desarrollo: permite avanzar la escena a mano desde consola.
      (window as unknown as Record<string, unknown>).__campo = r;
    }

    return () => {
      observador.disconnect();
      r.destruir();
      escena.current = null;
    };
  }, [rivalDespierto]);

  useEffect(() => {
    escena.current?.setMunicion(municion);
  }, [municion]);

  // El clima cambia por bloques de tiempo; alcanza con mirarlo de a ratos.
  useEffect(() => {
    const id = setInterval(() => setClima(climaActual()), 4000);
    return () => clearInterval(id);
  }, []);

  // Nunca puede haber mas impactos que disparos. Si una partida vieja trae
  // los numeros desparejos, se muestra el maximo en vez de un 0% imposible.
  const disparos = Math.max(records.disparos, records.impactos);
  const punteria = disparos > 0 ? Math.round((records.impactos / disparos) * 100) : 0;

  return (
    <div className="campo-tiro">
      <canvas ref={canvas} className="campo-lienzo" />

      <header className="campo-barra vidrio">
        <div className="campo-titulo">
          <strong>Campo de tiro</strong>
          <span className="campo-clima" title={`Viento ${clima.viento.toFixed(2)}`}>
            {clima.icono} {clima.nombre} · {describirViento(clima.viento)}
          </span>
        </div>
        <button className="boton suave" onClick={() => setModo('jardin')}>
          Volver al jardín
        </button>
      </header>

      <footer className="campo-pie vidrio" ref={pie}>
        <div className="campo-marcador">
          <span>🎯 {records.impactos}/{disparos}</span>
          <span>{punteria}% de puntería</span>
          {records.mejorDistancia > 0 && <span>Mejor: {records.mejorDistancia.toFixed(1)} m</span>}
          {rivalDespierto && records.mojadas > 0 && <span>💦 {records.mojadas}</span>}
        </div>

        {rivalDespierto && (
          <div className="municiones">
            <button
              className={municion === 'flecha' ? 'municion activa' : 'municion'}
              onClick={() => setMunicion('flecha')}
            >
              🏹 Arco
            </button>
            <button
              className={municion === 'bomba' ? 'municion activa' : 'municion'}
              onClick={() => setMunicion('bomba')}
            >
              🎈 Bombas de agua
            </button>
          </div>
        )}

        <p className="campo-ayuda">
          Mantené apretado para tensar y soltá para disparar. Apuntá <b>por encima</b> del blanco:
          a esa distancia la flecha cae, y el viento la corre de costado.
        </p>
      </footer>
    </div>
  );
}
