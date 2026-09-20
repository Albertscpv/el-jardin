/**
 * Entrada del jugador, unificada.
 *
 * Teclado y joystick escriben en el mismo vector, asi que el personaje no
 * sabe ni le importa con que se lo esta moviendo. Es un singleton mutable a
 * proposito: se lee una vez por frame y no debe disparar renders de React.
 */

export interface VectorEntrada {
  /** -1 izquierda, 1 derecha. */
  x: number;
  /** -1 atras, 1 adelante (relativo a la camara). */
  y: number;
}

class Controles {
  /** Direccion deseada, ya normalizada a magnitud <= 1. */
  readonly mover: VectorEntrada = { x: 0, y: 0 };

  /** Gatillo sostenido: carga el arco o la bomba. */
  cargando = false;

  /** Se pone en true el frame en que se suelta el gatillo. */
  disparoPedido = false;

  /**
   * Carga acumulada, 0..1. La escribe el mundo cada frame y la lee la barra
   * de potencia. Vive aca para que dibujarla no cueste un render de React.
   */
  carga = 0;

  private teclas = new Set<string>();
  private joystick: VectorEntrada = { x: 0, y: 0 };

  /* ---------------------------------------------------------------- */
  /* Teclado                                                           */
  /* ---------------------------------------------------------------- */

  conectarTeclado(): () => void {
    const escribiendo = () => {
      const foco = document.activeElement;
      return (
        foco instanceof HTMLInputElement ||
        foco instanceof HTMLTextAreaElement ||
        (foco instanceof HTMLElement && foco.isContentEditable)
      );
    };

    const abajo = (e: KeyboardEvent) => {
      // Nunca robarle las teclas a un campo de texto.
      if (escribiendo()) return;
      if (!MAPA[e.code] && e.code !== 'Space') return;

      // El espacio hace scroll si no se lo frena.
      if (e.code === 'Space') {
        e.preventDefault();
        this.cargando = true;
        return;
      }
      this.teclas.add(e.code);
      this.recalcular();
    };

    const arriba = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (this.cargando) this.disparoPedido = true;
        this.cargando = false;
        return;
      }
      this.teclas.delete(e.code);
      this.recalcular();
    };

    // Si la pestaña pierde el foco con una tecla apretada, quedaria trabada.
    const soltarTodo = () => {
      this.teclas.clear();
      this.cargando = false;
      this.recalcular();
    };

    window.addEventListener('keydown', abajo);
    window.addEventListener('keyup', arriba);
    window.addEventListener('blur', soltarTodo);

    return () => {
      window.removeEventListener('keydown', abajo);
      window.removeEventListener('keyup', arriba);
      window.removeEventListener('blur', soltarTodo);
      soltarTodo();
    };
  }

  /* ---------------------------------------------------------------- */
  /* Joystick                                                          */
  /* ---------------------------------------------------------------- */

  setJoystick(x: number, y: number): void {
    this.joystick.x = x;
    this.joystick.y = y;
    this.recalcular();
  }

  /* ---------------------------------------------------------------- */
  /* Acciones                                                          */
  /* ---------------------------------------------------------------- */

  empezarCarga(): void {
    this.cargando = true;
  }

  soltarCarga(): void {
    if (this.cargando) this.disparoPedido = true;
    this.cargando = false;
  }

  /** Consume el pedido de disparo: devuelve true una sola vez. */
  tomarDisparo(): boolean {
    if (!this.disparoPedido) return false;
    this.disparoPedido = false;
    return true;
  }

  /* ---------------------------------------------------------------- */

  private recalcular(): void {
    let x = this.joystick.x;
    let y = this.joystick.y;

    for (const code of this.teclas) {
      const dir = MAPA[code];
      if (!dir) continue;
      x += dir[0];
      y += dir[1];
    }

    // Diagonal no debe ser mas rapida que recto.
    const largo = Math.hypot(x, y);
    if (largo > 1) {
      x /= largo;
      y /= largo;
    }

    this.mover.x = x;
    this.mover.y = y;
  }
}

/** WASD y flechas. `y` positivo es alejarse de la camara. */
const MAPA: Record<string, [number, number] | undefined> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export const controles = new Controles();

/**
 * Si el dispositivo es tactil.
 *
 * Se mira el tipo de puntero, no el ancho de pantalla ni el user agent: una
 * notebook con pantalla tactil y un monitor chico son casos distintos, y lo
 * que decide si hace falta un joystick es si hay teclado, no cuantos pixeles
 * hay.
 */
export function esTactil(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches;
}
