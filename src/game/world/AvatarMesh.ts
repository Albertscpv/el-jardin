import * as THREE from 'three';
import { matrizAvatar, paletaAvatar } from '../../state/content';
import type { AvatarState } from '../../state/types';
import { texturaDeMatriz } from '../art/spriteTexture';
import { ALTO_PERSONAJE, ANCHO_PERSONAJE, type Pose } from '../art/personaje';
import type { Matrix } from '../art/matrices';
import { controles } from '../input/Controls';

const geometriaPlano = new THREE.PlaneGeometry(1, 1);
geometriaPlano.translate(0, 0.5, 0);

/** Altura del personaje en unidades de mundo. */
const ALTO = 1.6;
/** El sprite es mas alto que ancho: el plano tiene que respetarlo. */
const PROPORCION = ANCHO_PERSONAJE / ALTO_PERSONAJE;
/** Segundos por paso al caminar. */
const PASO = 0.13;
/** Cuanto dura cada gesto. */
const DURACION: Record<Reaccion, number> = { festejo: 0.9, trabajo: 0.45 };

/** Gestos que se disparan desde afuera: al cosechar, al sembrar... */
export type Reaccion = 'festejo' | 'trabajo';
/** Unidades por segundo caminando. */
const VELOCIDAD = 3.4;
/** Magnitud minima del joystick para que cuente como intencion de moverse. */
const ZONA_MUERTA = 0.12;

/** Cuanto dura la flecha que lo señala. */
const SENAL = 4;

/** Flechita que apunta al personaje cuando lo buscas. */
const FLECHA: Matrix = [
  'bbbbbbbbbb',
  'baaaaaaaab',
  'baaaaaaaab',
  '.baaaaaab.',
  '..baaaab..',
  '...baab...',
  '....bb....',
  '..........',
  '..........',
  '..........',
];

const PALETA_FLECHA = { a: '#f2b33a', b: '#8a5a12' };

/** Puede pisarse esta posicion del mundo. */
export type PruebaDeSuelo = (x: number, z: number) => boolean;

/**
 * El personaje del jugador.
 *
 * Se mueve de dos formas que conviven: con teclado o joystick, y —si no hay
 * entrada— caminando solo hacia donde trabajaste. Lo segundo es lo que hace
 * que sembrar siga sintiendose bien sin tener que conducirlo a mano.
 */
export class AvatarMesh {
  readonly grupo = new THREE.Group();

  private cuerpo: THREE.Mesh;
  private material: THREE.MeshLambertMaterial;
  private destino = new THREE.Vector3();
  private mirandoIzquierda = false;
  private tiempo = 0;
  private caminando = false;
  private firma = '';
  private aspecto: AvatarState;
  private poseActual: Pose | null = null;
  /** Momento del proximo parpadeo y hasta cuando dura el actual. */
  private proximoParpadeo = 2;
  private parpadeoHasta = 0;
  /** Gesto en curso, o esperando a que el personaje llegue a destino. */
  private gesto: { tipo: Reaccion; hasta: number } | null = null;
  private gestoPendiente: { tipo: Reaccion; vence: number } | null = null;
  /** Hasta cuando se muestra la flecha que lo señala. */
  private senalHasta = 0;
  private flecha: THREE.Mesh;

  /** Direccion horizontal hacia la que apunta, para disparar desde aqui. */
  readonly mirada = new THREE.Vector3(0, 0, -1);

  private adelante = new THREE.Vector3();
  private derecha = new THREE.Vector3();

  constructor(avatar: AvatarState) {
    this.aspecto = avatar;
    this.material = new THREE.MeshLambertMaterial({
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
    });

    this.cuerpo = new THREE.Mesh(geometriaPlano, this.material);
    this.cuerpo.castShadow = true;
    this.grupo.add(this.cuerpo);

    this.flecha = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.5),
      new THREE.MeshBasicMaterial({
        map: texturaDeMatriz('avatar:flecha', FLECHA, PALETA_FLECHA),
        transparent: true,
        alphaTest: 0.5,
        // Se ve aunque el personaje este atras de la casa: para eso esta.
        depthTest: false,
      }),
    );
    this.flecha.position.y = 1.12;
    // El grupo se achica en X para respetar la proporcion del sprite: la
    // flecha lo compensa para no salir aplastada.
    this.flecha.scale.x = 1 / PROPORCION;
    this.flecha.renderOrder = 11;
    this.flecha.visible = false;
    this.grupo.add(this.flecha);

    this.grupo.position.set(avatar.x, 0, avatar.z);
    this.grupo.scale.set(ALTO * PROPORCION, ALTO, ALTO * PROPORCION);
    this.destino.set(avatar.x, 0, avatar.z);

    this.aplicarAspecto(avatar);
  }

  /** Cambia el aspecto; las texturas de cada pose se generan al usarse. */
  aplicarAspecto(avatar: AvatarState): void {
    const firma = [
      avatar.piel, avatar.pelo, avatar.ropa, avatar.pantalon,
      avatar.sombrero, avatar.colorSombrero,
      avatar.peinado, avatar.prenda, avatar.accesorio, avatar.colorAccesorio,
    ].join('|');
    if (firma === this.firma) return;
    this.firma = firma;
    this.aspecto = avatar;
    this.poseActual = null;
    this.mostrar('quieto');
  }

  /**
   * Un gesto: festejar o ponerse a trabajar. Si el personaje todavia esta
   * caminando hacia la planta, el gesto espera a que llegue.
   */
  reaccionar(tipo: Reaccion): void {
    // Festejar le gana a trabajar: cosechar tambien es "hacer algo".
    if (this.gesto?.tipo === 'festejo' && tipo === 'trabajo') return;
    this.gestoPendiente = { tipo, vence: this.tiempo + 3 };
  }

  private mostrar(pose: Pose): void {
    if (pose === this.poseActual) return;
    this.poseActual = pose;
    const nuevo = texturaDeMatriz(
      `avatar:${this.firma}:${pose}`,
      matrizAvatar(this.aspecto, pose),
      paletaAvatar(this.aspecto),
    );
    const primera = !this.material.map;
    this.material.map = nuevo;
    if (primera) this.material.needsUpdate = true;
  }

  /** Lo pone en un lugar sin caminar hasta ahi. */
  ubicar(x: number, z: number): void {
    this.grupo.position.set(x, 0, z);
    this.destino.set(x, 0, z);
  }

  /** Muestra la flecha un rato: "acá estoy". */
  senalar(): void {
    this.senalHasta = this.tiempo + SENAL;
  }

  irA(x: number, z: number): void {
    this.destino.set(x, 0, z);
  }

  get x(): number {
    return this.grupo.position.x;
  }

  get z(): number {
    return this.grupo.position.z;
  }

  update(dt: number, camara: THREE.Camera, pisable: PruebaDeSuelo): void {
    this.tiempo += dt;

    // Encara la camara solo en Y, igual que los animales.
    this.grupo.rotation.y = Math.atan2(
      camara.position.x - this.grupo.position.x,
      camara.position.z - this.grupo.position.z,
    );

    this.calcularEjes(camara);

    const entrada = controles.mover;
    const intensidad = Math.hypot(entrada.x, entrada.y);

    if (intensidad > ZONA_MUERTA) {
      this.moverPorEntrada(dt, entrada.x, entrada.y, pisable);
      // Mover a mano cancela el "caminar hacia lo ultimo que tocaste".
      this.destino.copy(this.grupo.position);
    } else {
      this.moverHaciaDestino(dt, pisable);
    }

    this.animar();
  }

  /** Ejes del mundo relativos a la vista: W siempre aleja de la camara. */
  private calcularEjes(camara: THREE.Camera): void {
    camara.getWorldDirection(this.adelante);
    this.adelante.y = 0;
    if (this.adelante.lengthSq() < 1e-6) this.adelante.set(0, 0, -1);
    this.adelante.normalize();

    this.derecha.set(-this.adelante.z, 0, this.adelante.x);
  }

  private moverPorEntrada(dt: number, ex: number, ey: number, pisable: PruebaDeSuelo): void {
    const dx = this.derecha.x * ex + this.adelante.x * ey;
    const dz = this.derecha.z * ex + this.adelante.z * ey;

    const largo = Math.hypot(dx, dz);
    if (largo < 1e-5) return;

    const paso = VELOCIDAD * dt * Math.min(1, Math.hypot(ex, ey));
    this.avanzar((dx / largo) * paso, (dz / largo) * paso, pisable);

    this.mirada.set(dx / largo, 0, dz / largo);
    this.orientar(dx, dz);
    this.caminando = true;
  }

  private moverHaciaDestino(dt: number, pisable: PruebaDeSuelo): void {
    const dx = this.destino.x - this.grupo.position.x;
    const dz = this.destino.z - this.grupo.position.z;
    const distancia = Math.hypot(dx, dz);

    this.caminando = distancia > 0.06;
    if (!this.caminando) return;

    const paso = Math.min(distancia, VELOCIDAD * dt);
    this.avanzar((dx / distancia) * paso, (dz / distancia) * paso, pisable);
    this.mirada.set(dx / distancia, 0, dz / distancia);
    this.orientar(dx, dz);
  }

  /**
   * Avanza respetando el borde de la isla.
   *
   * Si el paso completo cae al vacio se prueban los ejes por separado: asi
   * el personaje se desliza a lo largo del borde en vez de clavarse, que es
   * lo que uno espera al empujar el joystick contra una pared.
   */
  private avanzar(dx: number, dz: number, pisable: PruebaDeSuelo): void {
    const p = this.grupo.position;

    if (pisable(p.x + dx, p.z + dz)) {
      p.x += dx;
      p.z += dz;
      return;
    }
    if (pisable(p.x + dx, p.z)) {
      p.x += dx;
      return;
    }
    if (pisable(p.x, p.z + dz)) {
      p.z += dz;
    }
  }

  private orientar(dx: number, dz: number): void {
    const haciaDerecha = dx * this.derecha.x + dz * this.derecha.z;
    if (Math.abs(haciaDerecha) > 0.01) this.mirandoIzquierda = haciaDerecha < 0;
  }

  private elegirPose(): Pose {
    const t = this.tiempo;

    if (this.gestoPendiente) {
      if (!this.caminando) {
        this.gesto = {
          tipo: this.gestoPendiente.tipo,
          hasta: t + DURACION[this.gestoPendiente.tipo],
        };
        this.gestoPendiente = null;
      } else if (t > this.gestoPendiente.vence) {
        this.gestoPendiente = null;
      }
    }
    if (this.gesto && t > this.gesto.hasta) this.gesto = null;
    if (this.gesto && !this.caminando) return this.gesto.tipo;

    if (this.caminando) {
      // quieto, paso, quieto, el otro paso: se lee como caminar sin cuadros de mas.
      const cuadro = Math.floor(t / PASO) % 4;
      return cuadro === 1 ? 'pasoA' : cuadro === 3 ? 'pasoB' : 'quieto';
    }

    if (t > this.proximoParpadeo) {
      this.parpadeoHasta = t + 0.13;
      this.proximoParpadeo = t + 2.2 + Math.random() * 3.5;
    }
    return t < this.parpadeoHasta ? 'parpadeo' : 'quieto';
  }

  private animar(): void {
    this.mostrar(this.elegirPose());

    const senalando = this.tiempo < this.senalHasta;
    this.flecha.visible = senalando;
    if (senalando) {
      // Sube y baja, que es lo que hace que el ojo la encuentre.
      this.flecha.position.y = 1.12 + Math.abs(Math.sin(this.tiempo * 4)) * 0.12;
    }

    if (this.gesto?.tipo === 'festejo' && !this.caminando) {
      // Dos saltitos de alegria.
      const resto = this.gesto.hasta - this.tiempo;
      this.cuerpo.position.y = Math.abs(Math.sin(resto * 7)) * 0.16;
      this.cuerpo.rotation.z = 0;
      this.cuerpo.scale.y = 1;
    } else if (this.gesto?.tipo === 'trabajo' && !this.caminando) {
      // Se agacha un poco, como quien riega.
      this.cuerpo.position.y = 0;
      this.cuerpo.rotation.z = 0;
      this.cuerpo.scale.y = 0.94;
    } else if (this.caminando) {
      // Trote: rebote ligado al reloj, con una inclinacion apenas perceptible.
      this.cuerpo.position.y = Math.abs(Math.sin(this.tiempo * 11)) * 0.07;
      this.cuerpo.rotation.z = Math.sin(this.tiempo * 11) * 0.05;
      this.cuerpo.scale.y = 1;
    } else {
      this.cuerpo.position.y = 0;
      this.cuerpo.rotation.z = 0;
      this.cuerpo.scale.y = 1 + Math.sin(this.tiempo * 2.2) * 0.022;
    }
    this.cuerpo.scale.x = this.mirandoIzquierda ? -1 : 1;
  }

  dispose(): void {
    this.material.dispose();
    this.grupo.removeFromParent();
  }
}
