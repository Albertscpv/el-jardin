import * as THREE from 'three';
import { ANIMAL_MATRIX, ANIMAL_SPECIES } from '../../state/content';
import type { AnimalState } from '../../state/types';
import type { TexturasPoses } from '../art/gameTextures';
import { NIVEL_AGUA } from './Terrain';

/** Radio de paseo alrededor del punto donde aparecio, si la especie no dice otro. */
const RADIO_PASEO = 4.5;
const VUELO_MIN = 0.9;
const VUELO_MAX = 2.1;

/** Distancia de un fotograma del paso al siguiente, en unidades de mundo. */
const ZANCADA = 0.22;
/** A partir de esta distancia al destino, los que tienen patas trotan. */
const DISTANCIA_TROTE = 2.6;
const FACTOR_TROTE = 1.9;

/**
 * Un plano por tamano de sprite, apoyado en el piso. Se mide en tiles: 16
 * pixeles por unidad, asi todos los animales comparten densidad de pixel y
 * un caballo es grande porque su dibujo es grande, no porque se lo estire.
 */
const geometrias = new Map<string, THREE.PlaneGeometry>();
function geometriaPara(ancho: number, alto: number): THREE.PlaneGeometry {
  const clave = ancho + 'x' + alto;
  let g = geometrias.get(clave);
  if (!g) {
    g = new THREE.PlaneGeometry(ancho / 16, alto / 16);
    g.translate(0, alto / 32, 0);
    geometrias.set(clave, g);
  }
  return g;
}

const geometriaIndicador = new THREE.PlaneGeometry(0.45, 0.45);

/**
 * Un animal como billboard encarado a la camara.
 *
 * Solo gira en el eje Y, asi que siempre se lo ve de frente sin dejar de
 * estar apoyado en el piso. Es el truco de Octopath Traveler: conserva el
 * dibujo hecho a mano dentro de una escena 3D con luz y sombras reales.
 */
export class AnimalMesh {
  readonly uid: string;
  readonly grupo = new THREE.Group();
  /** Malla que recibe los clics del raycaster. */
  readonly cuerpo: THREE.Mesh;

  private material: THREE.MeshLambertMaterial;
  private indicador: THREE.Mesh;
  private materialIndicador: THREE.MeshBasicMaterial;

  private estado: AnimalState;
  private vuela: boolean;
  /** 'agua' nada hundido; 'orilla' anda por el borde del estanque. */
  private habitat: 'agua' | 'orilla' | undefined;
  private velocidad: number;
  private radioPaseo: number;

  /** La pose quieta; el resto de las poses, si la especie las tiene. */
  private texturaQuieto: THREE.Texture;
  private poses: TexturasPoses | null;
  /** Distancia caminada: decide que fotograma del paso toca. */
  private recorrido = 0;
  private pastando = false;
  private trotando = false;

  private destino = new THREE.Vector3();
  /** Punto alrededor del cual deambula. */
  private querencia = new THREE.Vector3();
  private esperaHasta = 0;
  private tiempo = 0;
  private fase = Math.random() * Math.PI * 2;
  private ocupadoHasta = 0;
  private mirandoIzquierda = false;

  /** Animacion puntual: salto o giro de alegria. */
  private gesto: 'ninguno' | 'salto' | 'giro' | 'comer' = 'ninguno';
  private gestoRestante = 0;

  /**
   * Devuelve un destino pisable cerca de un punto. Lo provee el mundo, que
   * es quien conoce la forma de las islas; sin esto los animales se iban
   * caminando al vacio.
   */
  private buscarDestino: (x: number, z: number, radio: number) => { x: number; z: number };

  constructor(
    estado: AnimalState,
    textura: THREE.Texture,
    texturaComida: THREE.Texture,
    buscarDestino: (x: number, z: number, radio: number) => { x: number; z: number },
    poses: TexturasPoses | null = null,
  ) {
    this.buscarDestino = buscarDestino;
    this.texturaQuieto = textura;
    this.poses = poses;
    this.uid = estado.uid;
    this.estado = estado;

    const especie = ANIMAL_SPECIES[estado.especie];
    this.vuela = especie.vuela;
    this.habitat = especie.habitat;
    this.velocidad = especie.velocidad / 16; // el balance esta en px/s a 16 px por unidad
    this.radioPaseo = especie.radioPaseo ?? RADIO_PASEO;
    const dibujo = ANIMAL_MATRIX[estado.especie];
    const ancho = dibujo[0].length;
    const alto = dibujo.length;

    this.material = new THREE.MeshLambertMaterial({
      map: textura,
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
    });

    this.cuerpo = new THREE.Mesh(geometriaPara(ancho, alto), this.material);
    // Un pez bajo el agua no proyecta sombra sobre el cesped.
    this.cuerpo.castShadow = this.habitat !== 'agua';
    this.cuerpo.userData.animal = estado.uid;
    this.grupo.add(this.cuerpo);

    this.materialIndicador = new THREE.MeshBasicMaterial({
      map: texturaComida,
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
      // Se ve por encima de todo: es informacion, no parte de la escena.
      depthTest: false,
    });
    this.indicador = new THREE.Mesh(geometriaIndicador, this.materialIndicador);
    // Sobre la cabeza, sea del tamano que sea el animal.
    this.indicador.position.y = alto / 16 + 0.35;
    this.indicador.visible = false;
    this.indicador.renderOrder = 10;
    this.grupo.add(this.indicador);

    this.grupo.position.set(estado.x, this.alturaBase(), estado.z);
    this.querencia.set(estado.x, 0, estado.z);
    // Los animales son los protagonistas: se los agranda respecto del tile.
    // El mismo factor para todos; el tamano relativo lo pone el dibujo.
    // El pez es la excepcion: nada en una celda y grande parece una ballena.
    this.grupo.scale.setScalar(this.habitat === 'agua' ? 0.6 : 1.2);
    this.elegirDestino(true);
    this.actualizar(estado);
  }

  get x(): number {
    return this.grupo.position.x;
  }

  get z(): number {
    return this.grupo.position.z;
  }

  private alturaBase(): number {
    if (this.vuela) return VUELO_MIN;
    // El estanque es poco hondo: el pez va justo bajo la superficie, apoyado
    // en el fondo de barro, y se lo ve a traves del agua.
    return this.habitat === 'agua' ? NIVEL_AGUA - 0.22 : 0;
  }

  /* ---------------------------------------------------------------- */
  /* Estado                                                            */
  /* ---------------------------------------------------------------- */

  actualizar(estado: AnimalState): void {
    this.estado = estado;

    // Un visitante desconfiado se ve mas tenue que uno ya adoptado.
    const opacidad = estado.estado === 'adoptado' ? 1 : 0.55 + estado.confianza / 250;
    const k = Math.min(1, opacidad);
    if (k < 1) {
      this.material.transparent = true;
      this.material.opacity = k;
    } else if (this.material.transparent) {
      this.material.transparent = false;
      this.material.opacity = 1;
    }

    this.indicador.visible = estado.estado === 'adoptado' && estado.hambre > 68;
  }

  /** Cambia la pose quieta. El fotograma que se ve lo elige `update`. */
  cambiarTextura(textura: THREE.Texture): void {
    this.texturaQuieto = textura;
  }

  private mostrar(textura: THREE.Texture): void {
    if (this.material.map === textura) return;
    this.material.map = textura;
    this.material.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- */
  /* Movimiento                                                        */
  /* ---------------------------------------------------------------- */

  private elegirDestino(inmediato = false): void {
    // Siempre sobre tierra firme, y cerca de su querencia.
    const punto = this.buscarDestino(this.querencia.x, this.querencia.z, this.radioPaseo);
    this.destino.set(
      punto.x,
      this.vuela ? VUELO_MIN + Math.random() * (VUELO_MAX - VUELO_MIN) : this.alturaBase(),
      punto.z,
    );
    this.pastando = false;

    // Los viajes largos se hacen al trote. Solo quien tiene patas para
    // mostrarlo: un gato que de golpe va al doble sin cambiar el dibujo
    // parece un error, no un trote.
    const lejos =
      Math.hypot(punto.x - this.grupo.position.x, punto.z - this.grupo.position.z) >
      DISTANCIA_TROTE;
    this.trotando = Boolean(this.poses) && lejos && Math.random() < 0.7;

    if (inmediato) {
      this.esperaHasta = 0;
    } else if (this.poses && Math.random() < 0.55) {
      // Antes de salir, la mitad de las veces se queda pastando un rato.
      this.pastando = true;
      this.esperaHasta = this.tiempo + 3 + Math.random() * 5;
    } else {
      this.esperaHasta = this.tiempo + 0.4 + Math.random() * 2.4;
    }
  }

  update(dt: number, camara: THREE.Camera): void {
    this.tiempo += dt;

    // Encarar la camara, pero solo en Y: el sprite no se inclina con la vista.
    this.grupo.rotation.y = Math.atan2(
      camara.position.x - this.grupo.position.x,
      camara.position.z - this.grupo.position.z,
    );

    this.animarGesto(dt);

    if (this.tiempo < this.ocupadoHasta) return;

    const dx = this.destino.x - this.grupo.position.x;
    const dz = this.destino.z - this.grupo.position.z;
    const distancia = Math.hypot(dx, dz);

    // El destino ya esta elegido, pero todavia esta pastando o descansando.
    const esperando = this.tiempo < this.esperaHasta;
    const caminando = distancia >= 0.05 && !esperando;

    if (distancia < 0.05) {
      if (!esperando) this.elegirDestino();
    } else if (caminando) {
      this.pastando = false;
      // Con hambre se mueve mas lento: se nota sin necesidad de texto.
      const factor = (this.estado.hambre > 75 ? 0.6 : 1) * (this.trotando ? FACTOR_TROTE : 1);
      const paso = Math.min(distancia, this.velocidad * factor * dt);
      this.grupo.position.x += (dx / distancia) * paso;
      this.grupo.position.z += (dz / distancia) * paso;
      this.recorrido += paso;

      // El volteo se decide contra el eje horizontal de la camara, no del mundo.
      const derechaCamara = new THREE.Vector3();
      camara.getWorldDirection(derechaCamara);
      derechaCamara.cross(new THREE.Vector3(0, 1, 0)).normalize();
      const haciaDerecha = dx * derechaCamara.x + dz * derechaCamara.z;
      if (Math.abs(haciaDerecha) > 0.01) this.mirandoIzquierda = haciaDerecha > 0;
    }

    this.cuerpo.scale.x = this.mirandoIzquierda ? -1 : 1;
    this.elegirPose(caminando);

    if (this.vuela) {
      // Aleteo: oscilacion continua alrededor de la altura de destino.
      const objetivoY = this.destino.y;
      this.grupo.position.y += (objetivoY - this.grupo.position.y) * Math.min(1, dt * 2);
      this.cuerpo.position.y = Math.sin(this.tiempo * 9 + this.fase) * 0.07;
    } else if (caminando && this.poses) {
      // Con patas de verdad el vaiven va con el paso: el lomo sube cuando
      // las patas se cruzan, en los tiempos 2 y 4.
      this.cuerpo.position.y = this.fotograma() % 2 === 1 ? 0.035 : 0;
      this.cuerpo.scale.y = 1;
    } else if (caminando) {
      // Saltito de caminata, ligado al avance y no al reloj.
      this.cuerpo.position.y =
        Math.abs(Math.sin((this.grupo.position.x + this.grupo.position.z) * 4)) * 0.07;
    } else {
      this.cuerpo.position.y = 0;
      // Respiracion en reposo.
      this.cuerpo.scale.y = 1 + Math.sin(this.tiempo * 2 + this.fase) * 0.03;
    }
  }

  /** Tiempo del paso que corresponde a lo caminado hasta ahora. */
  private fotograma(): number {
    const cantidad = this.poses?.paso.length ?? 1;
    return Math.floor(this.recorrido / ZANCADA) % cantidad;
  }

  private elegirPose(caminando: boolean): void {
    if (!this.poses) return this.mostrar(this.texturaQuieto);
    if (caminando) return this.mostrar(this.poses.paso[this.fotograma()]);
    if (this.pastando) return this.mostrar(this.poses.pastar);
    this.mostrar(this.texturaQuieto);
  }

  /* ---------------------------------------------------------------- */
  /* Reacciones                                                        */
  /* ---------------------------------------------------------------- */

  private animarGesto(dt: number): void {
    if (this.gesto === 'ninguno') return;
    this.gestoRestante -= dt;

    if (this.gestoRestante <= 0) {
      this.gesto = 'ninguno';
      this.cuerpo.position.y = 0;
      this.cuerpo.scale.set(this.mirandoIzquierda ? -1 : 1, 1, 1);
      this.elegirDestino();
      return;
    }

    switch (this.gesto) {
      case 'salto': {
        const k = 1 - this.gestoRestante / 0.7;
        this.cuerpo.position.y = Math.sin(k * Math.PI * 2) * 0.28;
        break;
      }
      case 'giro': {
        const k = 1 - this.gestoRestante / 1.1;
        this.cuerpo.rotation.y = k * Math.PI * 2;
        this.cuerpo.position.y = Math.sin(k * Math.PI) * 0.3;
        break;
      }
      case 'comer': {
        const pulso = Math.sin(this.gestoRestante * 22);
        this.cuerpo.scale.set(
          (this.mirandoIzquierda ? -1 : 1) * (1 + pulso * 0.1),
          1 - pulso * 0.09,
          1,
        );
        break;
      }
    }
  }

  private iniciarGesto(gesto: 'salto' | 'giro' | 'comer', duracion: number): void {
    this.gesto = gesto;
    this.gestoRestante = duracion;
    this.ocupadoHasta = this.tiempo + duracion;
  }

  celebrar(): void {
    this.iniciarGesto('salto', 0.7);
  }

  comer(): void {
    this.iniciarGesto('comer', 0.9);
  }

  girarDeAlegria(): void {
    this.iniciarGesto('giro', 1.1);
  }

  dispose(): void {
    this.material.dispose();
    this.materialIndicador.dispose();
    this.grupo.removeFromParent();
  }
}
