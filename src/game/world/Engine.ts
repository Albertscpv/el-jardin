import * as THREE from 'three';
import { WORLD_COLS, WORLD_ROWS } from '../../state/config';

/**
 * Pixeles de pantalla por unidad de mundo. Como los sprites estan dibujados
 * a 16 px por tile, este valor los deja 1:1 con el buffer de render: sin
 * medias tintas ni bordes borrosos.
 */
const PX_POR_UNIDAD = 16;

/** Tope de resolucion del buffer, para que un monitor ultraancho no lo dispare. */
const MAX_PX = 900;
/** Aire alrededor del jardin, como fraccion del encuadre. */
const MARGEN = 1.02;

const ELEVACION = THREE.MathUtils.degToRad(45);
const AZIMUTS = [45, 135, 225, 315].map((g) => THREE.MathUtils.degToRad(g));

/**
 * Renderer, camara y bucle.
 *
 * La clave del look es que la escena se dibuja en un buffer chico (unos
 * 380x230 px) y el canvas se estira por CSS con `image-rendering: pixelated`.
 * El pixelado es real, no un filtro encima.
 */
export class Engine {
  readonly escena = new THREE.Scene();
  readonly camara: THREE.OrthographicCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly reloj = new THREE.Timer();

  private contenedor: HTMLElement;
  private observador: ResizeObserver;
  private frameId = 0;
  private alActualizar: Array<(dt: number) => void> = [];

  private bufferW = 0;
  private bufferH = 0;
  private indiceAzimut = 0;
  private azimutActual = AZIMUTS[0];
  private azimutObjetivo = AZIMUTS[0];
  private distancia = 40;

  constructor(contenedor: HTMLElement) {
    this.contenedor = contenedor;

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    // Siempre 1 pixel real por pixel del buffer: el escalado lo hace el CSS.
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    // Sombras duras: el difuminado pelearia contra el pixelado.
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const canvas = this.renderer.domElement;
    canvas.style.imageRendering = 'pixelated';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';
    contenedor.appendChild(canvas);

    this.camara = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    this.escena.add(this.camara);

    this.observador = new ResizeObserver(() => this.encuadrar());
    this.observador.observe(contenedor);
    this.colocarCamara(true);
  }

  /* ---------------------------------------------------------------- */
  /* Tamano                                                            */
  /* ---------------------------------------------------------------- */

  /**
   * Caja que el encuadre debe contener siempre. La fija el mundo, no la vista,
   * asi que el jardin entra entero en cualquier pantalla y en cualquier giro.
   */
  private limites = new THREE.Box3(
    new THREE.Vector3(-WORLD_COLS / 2 - 0.4, 0, -WORLD_ROWS / 2 - 0.4),
    new THREE.Vector3(WORLD_COLS / 2 + 0.4, 2, WORLD_ROWS / 2 + 0.4),
  );

  /**
   * Ajusta el frustum al jardin proyectado desde el angulo actual.
   *
   * Se calcula en vez de constantes a ojo: al girar la camara el rectangulo
   * del mundo cambia de forma en pantalla, y asi nunca queda recortado ni
   * flotando en medio de un mar de cielo.
   */
  private encuadrar(): void {
    const ancho = this.contenedor.clientWidth || 1;
    const alto = this.contenedor.clientHeight || 1;
    const aspecto = ancho / alto;

    this.camara.updateMatrixWorld();
    const aVista = this.camara.matrixWorldInverse;

    let necesarioX = 0;
    let necesarioY = 0;
    const esquina = new THREE.Vector3();
    for (const ex of [this.limites.min.x, this.limites.max.x]) {
      for (const ey of [this.limites.min.y, this.limites.max.y]) {
        for (const ez of [this.limites.min.z, this.limites.max.z]) {
          esquina.set(ex, ey, ez).applyMatrix4(aVista);
          necesarioX = Math.max(necesarioX, Math.abs(esquina.x));
          necesarioY = Math.max(necesarioY, Math.abs(esquina.y));
        }
      }
    }

    // Se respeta el aspecto del contenedor y se toma el lado que aprieta.
    const medioAlto = Math.max(necesarioY, necesarioX / aspecto) * MARGEN;
    const medioAncho = medioAlto * aspecto;

    let bufferW = Math.round(medioAncho * 2 * PX_POR_UNIDAD);
    let bufferH = Math.round(medioAlto * 2 * PX_POR_UNIDAD);

    const exceso = Math.max(bufferW / MAX_PX, bufferH / MAX_PX, 1);
    bufferW = Math.round(bufferW / exceso);
    bufferH = Math.round(bufferH / exceso);

    this.camara.left = -medioAncho;
    this.camara.right = medioAncho;
    this.camara.top = medioAlto;
    this.camara.bottom = -medioAlto;
    this.camara.near = 0.1;
    this.camara.far = 200;
    this.camara.updateProjectionMatrix();

    // Redimensionar el buffer es caro: solo cuando cambia de verdad.
    if (bufferW !== this.bufferW || bufferH !== this.bufferH) {
      this.bufferW = bufferW;
      this.bufferH = bufferH;
      // `false` evita que Three pise el CSS: el canvas se estira al contenedor.
      this.renderer.setSize(bufferW, bufferH, false);
      const canvas = this.renderer.domElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }
  }

  /* ---------------------------------------------------------------- */
  /* Camara                                                            */
  /* ---------------------------------------------------------------- */

  /** Gira el jardin un cuarto de vuelta. `dir` es 1 o -1. */
  rotar(dir: 1 | -1): void {
    this.indiceAzimut = (this.indiceAzimut + dir + AZIMUTS.length) % AZIMUTS.length;
    // Se sigue el camino corto aunque el indice salte de 315 a 45.
    let objetivo = AZIMUTS[this.indiceAzimut];
    while (objetivo - this.azimutActual > Math.PI) objetivo -= Math.PI * 2;
    while (objetivo - this.azimutActual < -Math.PI) objetivo += Math.PI * 2;
    this.azimutObjetivo = objetivo;
  }

  get azimut(): number {
    return this.azimutActual;
  }

  private colocarCamara(inmediato = false): void {
    if (inmediato) this.azimutActual = this.azimutObjetivo;

    const radioHorizontal = Math.cos(ELEVACION) * this.distancia;
    this.camara.position.set(
      Math.sin(this.azimutActual) * radioHorizontal,
      Math.sin(ELEVACION) * this.distancia,
      Math.cos(this.azimutActual) * radioHorizontal,
    );
    this.camara.lookAt(0, 0, 0);
    this.encuadrar();
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
      // Timer necesita el update explicito; getDelta ya viene en segundos.
      this.reloj.update();
      const dt = Math.min(this.reloj.getDelta(), 0.1);

      if (Math.abs(this.azimutObjetivo - this.azimutActual) > 0.001) {
        this.azimutActual += (this.azimutObjetivo - this.azimutActual) * Math.min(1, dt * 7);
        this.colocarCamara();
      }

      // Reencuadrar en cada frame, no solo al recibir el ResizeObserver: entre
      // un cambio de layout y su callback se colarian frames con el aspecto
      // viejo, y la escena se veria estirada por un instante. Es barato: ocho
      // transformaciones de vector, y el setSize solo corre si cambio algo.
      this.encuadrar();

      for (const fn of this.alActualizar) fn(dt);
      this.renderer.render(this.escena, this.camara);
    };
    frame();
  }

  destruir(): void {
    cancelAnimationFrame(this.frameId);
    this.observador.disconnect();
    this.alActualizar = [];
    this.renderer.domElement.remove();
    this.renderer.dispose();
  }
}
