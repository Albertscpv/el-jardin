import * as THREE from 'three';
import { cajasGeometry, type Caja } from '../art/voxel';
import { seededRandom } from '../art/render';

const NUBES = 14;
const ESTRELLAS = 90;

/**
 * Cielo y fondo.
 *
 * Todo cuelga de un grupo que copia la orientacion de la camara en cada
 * frame. Con camara ortografica y giros de 90 grados esa es la unica forma
 * de garantizar que el fondo siga estando detras y arriba del jardin sin
 * importar desde donde se mire.
 */
export class Sky {
  readonly grupo = new THREE.Group();

  private degradado: THREE.Mesh;
  private materialDegradado: THREE.ShaderMaterial;

  private nubes: THREE.Mesh[] = [];
  private derivaNube: number[] = [];
  private alturaNube: number[] = [];
  private materialNube: THREE.MeshBasicMaterial;

  private estrellas: THREE.InstancedMesh;
  private materialEstrella: THREE.MeshBasicMaterial;
  private posEstrella: Array<[number, number]> = [];

  private astro: THREE.Mesh;
  private materialAstro: THREE.MeshBasicMaterial;
  private halo: THREE.Mesh;
  private materialHalo: THREE.MeshBasicMaterial;

  private blanco = new THREE.Color('#ffffff');
  private tiempo = 0;
  private dummy = new THREE.Object3D();

  constructor() {
    const rnd = seededRandom(7788);

    /* --- Degradado de fondo --- */
    this.materialDegradado = new THREE.ShaderMaterial({
      uniforms: {
        arriba: { value: new THREE.Color('#3f86c4') },
        abajo: { value: new THREE.Color('#a8d8ea') },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 arriba;
        uniform vec3 abajo;
        varying vec2 vUv;
        void main() {
          // Banda dura y suave a la vez: el escalon se nota poco al pixelarse.
          float t = smoothstep(0.05, 0.95, vUv.y);
          gl_FragColor = vec4(mix(abajo, arriba, t), 1.0);
          #include <colorspace_fragment>
        }
      `,
      depthWrite: false,
      depthTest: false,
      fog: false,
    });
    this.degradado = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.materialDegradado);
    this.degradado.position.z = -160;
    this.degradado.renderOrder = -1000;
    this.degradado.frustumCulled = false;
    this.grupo.add(this.degradado);

    /* --- Estrellas --- */
    this.materialEstrella = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    this.estrellas = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.08),
      this.materialEstrella,
      ESTRELLAS,
    );
    this.estrellas.frustumCulled = false;
    this.estrellas.renderOrder = -900;
    for (let i = 0; i < ESTRELLAS; i++) {
      // Guardadas en fraccion del encuadre: se recolocan si cambia el tamano.
      this.posEstrella.push([rnd() * 2 - 1, 0.25 + rnd() * 0.75]);
    }
    this.grupo.add(this.estrellas);

    /* --- Sol y luna (el mismo disco, cambia de color) --- */
    this.materialAstro = new THREE.MeshBasicMaterial({
      color: '#fff3c4',
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    // Un poligono de 10 lados: a baja resolucion lee como un disco pixelado.
    this.astro = new THREE.Mesh(new THREE.CircleGeometry(0.5, 10), this.materialAstro);
    this.astro.position.z = -150;
    this.astro.renderOrder = -889;
    this.astro.frustumCulled = false;
    this.grupo.add(this.astro);

    // Halo tenue: separa el disco del cielo sin recurrir a un blur.
    this.materialHalo = new THREE.MeshBasicMaterial({
      color: '#fff3c4',
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      fog: false,
    });
    this.halo = new THREE.Mesh(new THREE.CircleGeometry(0.5, 12), this.materialHalo);
    this.halo.position.z = -151;
    this.halo.renderOrder = -890;
    this.halo.frustumCulled = false;
    this.grupo.add(this.halo);

    /* --- Nubes voxel --- */
    // Sin iluminar: las nubes viven en espacio de camara, asi que el sol las
    // tomaria siempre de canto. El volumen ya viene del sombreado por cara,
    // y el color del momento del dia se aplica como multiplicador.
    this.materialNube = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    for (let i = 0; i < NUBES; i++) {
      this.nubes.push(this.construirNube(rnd));
      this.derivaNube.push(rnd());
      this.alturaNube.push(0.5 + rnd() * 0.45);
    }
    for (const nube of this.nubes) this.grupo.add(nube);
  }

  /**
   * Una nube es un racimo de cajas blancas.
   *
   * Con camara ortografica el tamano en pantalla no depende de la distancia,
   * asi que una nube "lejana" tiene que construirse chica a proposito: de lo
   * contrario tapa medio jardin.
   */
  private construirNube(rnd: () => number): THREE.Mesh {
    const cajas: Caja[] = [];
    const bloques = 3 + Math.floor(rnd() * 3);
    const escala = 0.7 + rnd() * 0.8;
    let x = 0;
    const anchos: number[] = [];
    const bases: number[] = [];

    for (let i = 0; i < bloques; i++) {
      const ancho = (0.62 + rnd() * 0.55) * escala;
      const alto = (0.46 + rnd() * 0.4) * escala;
      const y = (rnd() - 0.5) * 0.18 * escala;
      cajas.push({
        x,
        y,
        z: (rnd() - 0.5) * 0.5,
        ancho,
        alto,
        fondo: (0.5 + rnd() * 0.45) * escala,
        color: rnd() > 0.3 ? '#ffffff' : '#eaf0f8',
      });
      anchos.push(ancho);
      bases.push(y + alto);
      x += ancho * (0.52 + rnd() * 0.26);
    }

    // Segunda hilera encima: es lo que separa una nube de una barra.
    for (let i = 1; i < bloques - 1; i++) {
      if (rnd() > 0.72) continue;
      const ancho = anchos[i] * (0.55 + rnd() * 0.3);
      cajas.push({
        x: cajas[i].x + (anchos[i] - ancho) / 2,
        y: bases[i] - 0.04,
        z: cajas[i].z + 0.06,
        ancho,
        alto: (0.3 + rnd() * 0.28) * escala,
        fondo: cajas[i].fondo * 0.78,
        color: '#ffffff',
      });
    }

    const malla = new THREE.Mesh(cajasGeometry(cajas), this.materialNube);
    malla.frustumCulled = false;
    // Detras de todo lo del jardin, pero delante del degradado.
    malla.position.z = -120;
    malla.renderOrder = -800;
    return malla;
  }

  /**
   * @param camara      para copiarle posicion y orientacion
   * @param medioAncho  mitad del frustum, en unidades
   * @param medioAlto   idem
   * @param noche       0 de dia, 1 de noche
   * @param faseDia     0..1 a lo largo del ciclo, mueve el sol por el cielo
   */
  actualizar(
    dt: number,
    camara: THREE.Camera,
    medioAncho: number,
    medioAlto: number,
    noche: number,
    faseDia: number,
    cieloArriba: THREE.Color,
    cieloAbajo: THREE.Color,
  ): void {
    this.tiempo += dt;

    this.grupo.position.copy(camara.position);
    this.grupo.quaternion.copy(camara.quaternion);

    this.degradado.scale.set(medioAncho * 2.2, medioAlto * 2.2, 1);
    (this.materialDegradado.uniforms.arriba.value as THREE.Color).copy(cieloArriba);
    (this.materialDegradado.uniforms.abajo.value as THREE.Color).copy(cieloAbajo);

    /* --- Nubes: deriva continua con reaparicion por el otro lado --- */
    const ancho = medioAncho * 2;
    for (let i = 0; i < this.nubes.length; i++) {
      // Cada nube va a su propia velocidad: el cielo nunca se ve en bloque.
      const velocidad = 0.009 + (i % 4) * 0.004;
      this.derivaNube[i] = (this.derivaNube[i] + dt * velocidad) % 1;

      const nube = this.nubes[i];
      nube.position.x = -medioAncho - 6 + this.derivaNube[i] * (ancho + 12);
      nube.position.y = medioAlto * this.alturaNube[i];
      // Cabeceo apenas perceptible, para que no parezcan calcomanias.
      nube.position.y += Math.sin(this.tiempo * 0.3 + i) * 0.12;
      nube.visible = true;
    }

    // Blancas de dia, anaranjadas al atardecer, casi negras de noche.
    this.materialNube.color
      .copy(this.blanco)
      .lerp(cieloAbajo, 0.22)
      .multiplyScalar(1 - noche * 0.76);

    /* --- Estrellas --- */
    this.materialEstrella.opacity = noche;
    if (noche > 0.02) {
      this.estrellas.visible = true;
      for (let i = 0; i < ESTRELLAS; i++) {
        const [fx, fy] = this.posEstrella[i];
        this.dummy.position.set(fx * medioAncho, fy * medioAlto, -140);
        // Titileo: cada estrella con su propio ritmo.
        const t = 0.6 + 0.4 * Math.sin(this.tiempo * 1.4 + i * 2.7);
        this.dummy.scale.setScalar(t * (medioAlto / 8));
        this.dummy.updateMatrix();
        this.estrellas.setMatrixAt(i, this.dummy.matrix);
      }
      this.estrellas.instanceMatrix.needsUpdate = true;
    } else {
      this.estrellas.visible = false;
    }

    /* --- Sol o luna, en arco sobre el jardin --- */
    const arco = faseDia * Math.PI * 2 - Math.PI / 2;
    this.astro.position.x = Math.cos(arco) * medioAncho * 0.78;
    this.astro.position.y = Math.sin(arco) * medioAlto * 0.72 + medioAlto * 0.12;
    const tamano = medioAlto * 0.13;
    this.astro.scale.set(tamano, tamano, 1);
    this.halo.position.copy(this.astro.position);
    this.halo.scale.set(tamano * 2.1, tamano * 2.1, 1);
    const color = noche > 0.5 ? '#e8eeff' : '#fff3c4';
    this.materialAstro.color.setStyle(color);
    this.materialHalo.color.setStyle(color);
    const visible = this.astro.position.y > -medioAlto * 0.2;
    this.materialAstro.opacity = visible ? 0.95 : 0;
    this.materialHalo.opacity = visible ? 0.16 : 0;
  }
}
