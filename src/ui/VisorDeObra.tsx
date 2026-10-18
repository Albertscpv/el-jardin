import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { PINTURAS, pixelesDe } from '../game/art/obras';
import type { ObraId } from '../state/arte';
import { useGame } from '../state/store';

/** Cuánto se puede acercar, como mucho. */
const ZOOM_MAX = 5;

/**
 * El visor de una obra.
 *
 * La pintura se despliega de arriba hacia abajo, como un lienzo que se
 * desenrolla, y después aparece su ficha. Se puede acercar con la rueda o
 * los botones y recorrer arrastrando: el chiste es poder ver las
 * pinceladas de cerca.
 */
export function VisorDeObra() {
  const obra = useGame((s) => s.obraAbierta);
  const cerrar = useGame((s) => s.abrirObra);

  useEffect(() => {
    if (!obra) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar(null);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [obra, cerrar]);

  return (
    <AnimatePresence>
      {obra && (
        <motion.div
          className="velo visor-obra"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => cerrar(null)}
        >
          <div className="visor-contenido" onClick={(e) => e.stopPropagation()}>
            <motion.div
              className="visor-marco"
              // Se desenrolla desde arriba: arranca como una tira y baja.
              initial={{ scaleY: 0.02, opacity: 0.4 }}
              animate={{ scaleY: 1, opacity: 1 }}
              exit={{ scaleY: 0.02, opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: 'top center' }}
            >
              {/* La key rearma el lienzo (y su zoom) al cambiar de obra. */}
              <Lienzo key={obra} obra={obra} />
            </motion.div>

            <motion.div
              className="visor-ficha"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.75, duration: 0.4 }}
            >
              <Ficha obra={obra} />
              <p className="fila-nota">
                Réplica en pixel art, pintada a mano para el jardín. El original es de dominio público.
              </p>
              <button className="boton suave" onClick={() => cerrar(null)}>
                Volver al jardín
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Ficha({ obra }: { obra: ObraId }) {
  const ficha = PINTURAS[obra].ficha;
  return (
    <>
      <h2>{ficha.titulo}</h2>
      <p className="visor-autor">
        {ficha.autor} · {ficha.anio}
      </p>
      <p className="fila-detalle">
        {ficha.original} · {ficha.tecnica} · {ficha.medidas}
      </p>
      <p className="fila-detalle">{ficha.museo}</p>
      <p className="modal-texto">{ficha.texto}</p>
    </>
  );
}

/**
 * La pintura, con zoom y paneo. Se dibuja una sola vez en un canvas chico
 * y el navegador la agranda con píxeles nítidos: no hace falta repintarla
 * para acercarse.
 */
function Lienzo({ obra }: { obra: ObraId }) {
  const { ancho, alto, ficha } = PINTURAS[obra];
  const largo = Math.max(ancho, alto);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [desvio, setDesvio] = useState({ x: 0, y: 0 });
  const arrastre = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    pixelesDe(obra).forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(i % ancho, Math.floor(i / ancho), 1, 1);
    });
  }, [obra, ancho]);

  const acercar = (factor: number) => {
    setZoom((z) => {
      const nuevo = Math.min(ZOOM_MAX, Math.max(1, z * factor));
      // Al volver a 1 el cuadro se recentra: si no, queda corrido.
      if (nuevo === 1) setDesvio({ x: 0, y: 0 });
      return nuevo;
    });
  };

  return (
    <div className="visor-lienzo-caja">
      <div
        className="visor-ventana"
        onWheel={(e) => acercar(e.deltaY < 0 ? 1.2 : 1 / 1.2)}
        onPointerDown={(e) => {
          if (zoom === 1) return;
          arrastre.current = { x: e.clientX - desvio.x, y: e.clientY - desvio.y };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!arrastre.current) return;
          setDesvio({ x: e.clientX - arrastre.current.x, y: e.clientY - arrastre.current.y });
        }}
        onPointerUp={() => (arrastre.current = null)}
        onDoubleClick={() => (zoom > 1 ? (setZoom(1), setDesvio({ x: 0, y: 0 })) : setZoom(2.5))}
        style={
          {
            cursor: zoom > 1 ? 'grab' : 'zoom-in',
            '--ax': ancho / largo,
            '--ay': alto / largo,
          } as React.CSSProperties
        }
      >
        <canvas
          ref={canvas}
          width={ancho}
          height={alto}
          className="visor-lienzo"
          style={{ transform: `translate(${desvio.x}px, ${desvio.y}px) scale(${zoom})` }}
          aria-label={`${ficha.titulo}, de ${ficha.autor}, en pixel art`}
        />
      </div>

      <div className="visor-zoom">
        <button className="chip" onClick={() => acercar(1.4)} aria-label="Acercar">
          +
        </button>
        <button className="chip" onClick={() => acercar(1 / 1.4)} aria-label="Alejar">
          −
        </button>
        <span className="visor-zoom-valor">{Math.round(zoom * 100)}%</span>
      </div>
    </div>
  );
}

/** El cuadro en chiquito, para las listas y la barra de herramientas. */
export function MiniaturaDeObra({ obra, lado = 28 }: { obra: ObraId; lado?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { ancho, alto, ficha } = PINTURAS[obra];
  const largo = Math.max(ancho, alto);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    pixelesDe(obra).forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.fillRect(i % ancho, Math.floor(i / ancho), 1, 1);
    });
  }, [obra, ancho]);

  return (
    <canvas
      ref={canvas}
      width={ancho}
      height={alto}
      className="miniatura-obra"
      style={{ width: (lado * ancho) / largo, height: (lado * alto) / largo }}
      aria-label={ficha.titulo}
    />
  );
}
