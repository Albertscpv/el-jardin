import { useEffect, useRef, useState } from 'react';
import { controles } from '../game/input/Controls';
import { useGame } from '../state/store';

/** Radio util del joystick, en px. */
const RADIO = 52;

/**
 * Controles tactiles.
 *
 * Solo aparecen si el puntero es grueso (dedo). En escritorio el personaje
 * se mueve con WASD y se dispara con la barra espaciadora, asi que dibujar
 * un joystick ahi seria estorbo.
 */
export function TouchControls() {
  const modo = useGame((s) => s.modo);

  return (
    <>
      <Joystick />
      {modo === 'practica' && <BotonDisparo />}
    </>
  );
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [pulgar, setPulgar] = useState({ x: 0, y: 0 });
  const puntero = useRef<number | null>(null);

  useEffect(() => {
    // Si el componente se va con el dedo apoyado, el personaje seguiria
    // caminando para siempre.
    return () => controles.setJoystick(0, 0);
  }, []);

  const mover = (clientX: number, clientY: number) => {
    const caja = base.current?.getBoundingClientRect();
    if (!caja) return;

    const cx = caja.left + caja.width / 2;
    const cy = caja.top + caja.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;

    const largo = Math.hypot(dx, dy);
    if (largo > RADIO) {
      dx = (dx / largo) * RADIO;
      dy = (dy / largo) * RADIO;
    }

    setPulgar({ x: dx, y: dy });
    // En pantalla, y crece hacia abajo; en el mundo, hacia adelante.
    controles.setJoystick(dx / RADIO, -dy / RADIO);
  };

  const soltar = () => {
    puntero.current = null;
    setPulgar({ x: 0, y: 0 });
    controles.setJoystick(0, 0);
  };

  return (
    <div
      ref={base}
      className="joystick"
      onPointerDown={(e) => {
        puntero.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        mover(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== puntero.current) return;
        mover(e.clientX, e.clientY);
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      role="application"
      aria-label="Joystick de movimiento"
    >
      <div className="joystick-pulgar" style={{ transform: `translate(${pulgar.x}px, ${pulgar.y}px)` }} />
    </div>
  );
}

function BotonDisparo() {
  const municion = useGame((s) => s.municion);

  return (
    <button
      className="boton-disparo"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        controles.empezarCarga();
      }}
      onPointerUp={() => controles.soltarCarga()}
      onPointerCancel={() => controles.soltarCarga()}
      aria-label={municion === 'flecha' ? 'Mantené para tensar el arco' : 'Mantené para cargar la bomba'}
    >
      {municion === 'flecha' ? '🏹' : '🎈'}
    </button>
  );
}
