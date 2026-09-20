import * as THREE from 'three';

/**
 * Pixeles de pantalla por unidad de mundo con zoom 1. Los sprites estan
 * dibujados a 16 px por tile, asi que en reposo quedan 1:1 con el buffer.
 */
const PX_POR_UNIDAD = 16;

/** Cuantos pixeles de pantalla ocupa un pixel del juego. */
const ESCALA_PIXEL = 3;

/** Tope del buffer, para que un monitor muy grande no dispare la resolucion. */
const MAX_PX = 760;

const ZOOM_MIN = 0.45;
const ZOOM_MAX = 2.6;
const ELEVACION_MIN = THREE.MathUtils.degToRad(16);
const ELEVACION_MAX = THREE.MathUtils.degToRad(82);

/** Pixeles de movimiento a partir de los cuales el gesto deja de ser un toque. */
const UMBRAL_ARRASTRE = 5;

export interface LimitesMundo {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Renderer, camara libre y bucle.
 *
 * La camara orbita de verdad: arrastrar gira en los dos ejes, con boton
 * derecho (o Shift) se desplaza, y la rueda acerca. No hay angulos fijos.
 *
 * El look pixelado es real, no un filtro: la escena se dibuja en un buffer
 * de unos 400x280 px y el canvas se estira por CSS.
 */
export class Engine {
  readonly escena = new THREE.Scene();
  readonly camara: THREE.OrthographicCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly reloj = new THREE.Timer();

  /** Se dispara solo si el gesto fue un toque y no un arrastre de camara. */
  alTocar: ((evento: PointerEvent) => void) | null = null;
  alMover: ((evento: PointerEvent) => void) | null = null;

  private contenedor: HTMLElement;
  private observador: ResizeObserver;
  private frameId = 0;
  private alActualizar: Array<(dt: number) => void> = [];
  private limpiadores: Array<() => void> = [];

  /* --- Estado de camara --- */
  private objetivo = new THREE.Vector3(0, 0, 0);
  private azimut = THREE.MathUtils.degToRad(45);
  private elevacion = THREE.MathUtils.degToRad(42);
  private zoom = 1;
  private distancia = 60;

  /* --- Gesto en curso --- */
  private punteroActivo: number | null = null;
  private ultimoX = 0;
  private ultimoY = 0;
  private inicioX = 0;
  private inicioY = 0;
  private arrastrando = false;
  private paneando = false;

  private bufferW = 0;
  private bufferH = 0;

  constructor(contenedor: HTMLElement) {
    this.contenedor = contenedor;

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    // Sombras duras: el difuminado pelearia contra el pixelado.
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvas = this.renderer.domElement;
    canvas.style.imageRendering = 'pixelated';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    contenedor.appendChild(canvas);

    this.camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
    this.escena.add(this.camara);

    this.observador = new ResizeObserver(() => this.redimensionar());
    this.observador.observe(contenedor);

    this.conectarGestos(contenedor);
    this.redimensionar();
    this.colocarCamara();
  }

  /* ---------------------------------------------------------------- */
  /* Tamano y proyeccion                                               */
  /* ---------------------------------------------------------------- */

  private redimensionar(): void {
    const ancho = this.contenedor.clientWidth || 1;
    const alto = this.contenedor.clientHeight || 1;

    let w = Math.max(64, Math.round(ancho / ESCALA_PIXEL));
    let h = Math.max(64, Math.round(alto / ESCALA_PIXEL));

    const exceso = Math.max(w / MAX_PX, h / MAX_PX, 1);
    w = Math.round(w / exceso);
    h = Math.round(h / exceso);

    if (w !== this.bufferW || h !== this.bufferH) {
      this.bufferW = w;
      this.bufferH = h;
      // `false` evita que Three pise el CSS: el canvas se estira al contenedor.
      this.renderer.setSize(w, h, false);
    }
    this.actualizarProyeccion();
  }

  private actualizarProyeccion(): void {
    // El zoom cambia cuanto mundo entra; el tamano del pixel en pantalla no.
    const medioAncho = this.bufferW / (2 * PX_POR_UNIDAD * this.zoom);
    const medioAlto = this.bufferH / (2 * PX_POR_UNIDAD * this.zoom);

    this.camara.left = -medioAncho;
    this.camara.right = medioAncho;
    this.camara.top = medioAlto;
    this.camara.bottom = -medioAlto;
    this.camara.updateProjectionMatrix();
  }

  private colocarCamara(): void {
    const radio = Math.cos(this.elevacion) * this.distancia;
    this.camara.position.set(
      this.objetivo.x + Math.sin(this.azimut) * radio,
      this.objetivo.y + Math.sin(this.elevacion) * this.distancia,
      this.objetivo.z + Math.cos(this.azimut) * radio,
    );
    this.camara.lookAt(this.objetivo);
  }

  /* ---------------------------------------------------------------- */
  /* Gestos                                                            */
  /* ---------------------------------------------------------------- */

  private conectarGestos(el: HTMLElement): void {
    const abajo = (e: PointerEvent) => {
      if (this.punteroActivo !== null) return;
      this.punteroActivo = e.pointerId;
      this.inicioX = this.ultimoX = e.clientX;
      this.inicioY = this.ultimoY = e.clientY;
      this.arrastrando = false;
      // Boton derecho, medio o Shift desplazan en vez de girar.
      this.paneando = e.button === 2 || e.button === 1 || e.shiftKey;
      el.setPointerCapture(e.pointerId);
    };

    const mover = (e: PointerEvent) => {
      this.alMover?.(e);
      if (e.pointerId !== this.punteroActivo) return;

      const dx = e.clientX - this.ultimoX;
      const dy = e.clientY - this.ultimoY;
      this.ultimoX = e.clientX;
      this.ultimoY = e.clientY;

      if (!this.arrastrando) {
        const recorrido = Math.hypot(e.clientX - this.inicioX, e.clientY - this.inicioY);
        if (recorrido < UMBRAL_ARRASTRE) return;
        this.arrastrando = true;
      }

      if (this.paneando) {
        this.desplazar(dx, dy);
      } else {
        this.azimut -= dx * 0.008;
        this.elevacion = THREE.MathUtils.clamp(
          this.elevacion + dy * 0.006,
          ELEVACION_MIN,
          ELEVACION_MAX,
        );
      }
      this.colocarCamara();
    };

    const arriba = (e: PointerEvent) => {
      if (e.pointerId !== this.punteroActivo) return;
      this.punteroActivo = null;
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      // Un toque limpio es una interacción con el jardín; un arrastre, cámara.
      if (!this.arrastrando) this.alTocar?.(e);
      this.arrastrando = false;
      this.paneando = false;
    };

    const rueda = (e: WheelEvent) => {
      e.preventDefault();
      this.aplicarZoom(e.deltaY > 0 ? -0.12 : 0.12);
    };

    const menu = (e: Event) => e.preventDefault();

    el.addEventListener('pointerdown', abajo);
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', arriba);
    el.addEventListener('pointercancel', arriba);
    el.addEventListener('wheel', rueda, { passive: false });
    el.addEventListener('contextmenu', menu);

    this.limpiadores.push(() => {
      el.removeEventListener('pointerdown', abajo);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', arriba);
      el.removeEventListener('pointercancel', arriba);
      el.removeEventListener('wheel', rueda);
      el.removeEventListener('contextmenu', menu);
    });
  }

  /** Desplaza el punto de mira en el plano del suelo, siguiendo la vista. */
  private desplazar(dx: number, dy: number): void {
    const unidadesPorPx = 1 / (PX_POR_UNIDAD * this.zoom * ESCALA_PIXEL);
    const derecha = new THREE.Vector3(Math.cos(this.azimut), 0, -Math.sin(this.azimut));
    const adelante = new THREE.Vector3(-Math.sin(this.azimut), 0, -Math.cos(this.azimut));

    this.objetivo.addScaledVector(derecha, -dx * unidadesPorPx);
    // Al inclinar la cámara, un mismo gesto avanza menos sobre el suelo.
    this.objetivo.addScaledVector(adelante, (-dy * unidadesPorPx) / Math.sin(this.elevacion));
  }

  /* ---------------------------------------------------------------- */
  /* API publica de camara                                             */
  /* ---------------------------------------------------------------- */

  aplicarZoom(delta: number): void {
    this.zoom = THREE.MathUtils.clamp(this.zoom * (1 + delta), ZOOM_MIN, ZOOM_MAX);
    this.actualizarProyeccion();
  }

  get zoomActual(): number {
    return this.zoom;
  }

  mirar(x: number, z: number): void {
    this.objetivo.set(x, 0, z);
    this.colocarCamara();
  }

  /** Encuadra todo el territorio: el botón de centrar y la carga inicial. */
  centrar(limites: LimitesMundo): void {
    const cx = (limites.minX + limites.maxX) / 2;
    const cz = (limites.minZ + limites.maxZ) / 2;
    this.objetivo.set(cx, 0, cz);

    const ancho = limites.maxX - limites.minX + 4;
    const fondo = limites.maxZ - limites.minZ + 4;
    // Proyección isométrica: el ancho en pantalla mezcla las dos dimensiones.
    const anchoPantalla = (ancho + fondo) * 0.71;
    const altoPantalla = anchoPantalla * Math.sin(this.elevacion) + 3;

    const zoomAncho = this.bufferW / (PX_POR_UNIDAD * anchoPantalla);
    const zoomAlto = this.bufferH / (PX_POR_UNIDAD * altoPantalla);

    this.zoom = THREE.MathUtils.clamp(Math.min(zoomAncho, zoomAlto), ZOOM_MIN, ZOOM_MAX);
    this.actualizarProyeccion();
    this.colocarCamara();
  }

  /* ---------------------------------------------------------------- */
  /* Bucle                                                             */
  /* ---------------------------------------------------------------- */

  enCadaFrame(fn: (dt: number) => void): () => void {
    this.alActualizar.push(fn);
    return () => {
      this.alActualizar = this.alActualizar.filter((f) => f !== fn);
    };
  }

  arrancar(): void {
    const frame = () => {
      this.frameId = requestAnimationFrame(frame);
      this.reloj.update();
      const dt = Math.min(this.reloj.getDelta(), 0.1);

      for (const fn of this.alActualizar) fn(dt);
      this.renderer.render(this.escena, this.camara);
    };
    frame();
  }

  destruir(): void {
    cancelAnimationFrame(this.frameId);
    this.observador.disconnect();
    for (const limpiar of this.limpiadores) limpiar();
    this.limpiadores = [];
    this.alActualizar = [];
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
}
