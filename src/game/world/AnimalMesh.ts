import * as THREE from 'three';
import { ANIMAL_SPECIES } from '../../state/content';
import { WORLD_COLS, WORLD_ROWS } from '../../state/config';
import type { AnimalState } from '../../state/types';

/** Limites de paseo: por dentro de la cerca. */
const LIMITE_X = WORLD_COLS / 2 - 1.6;
const LIMITE_Z = WORLD_ROWS / 2 - 1.6;
const VUELO_MIN = 0.9;
const VUELO_MAX = 2.1;

const geometriaPlano = new THREE.PlaneGeometry(1, 1);
geometriaPlano.translate(0, 0.5, 0);

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
  private velocidad: number;

  private destino = new THREE.Vector3();
  private esperaHasta = 0;
  private tiempo = 0;
  private fase = Math.random() * Math.PI * 2;
  private ocupadoHasta = 0;
  private mirandoIzquierda = false;

  /** Animacion puntual: salto o giro de alegria. */
  private gesto: 'ninguno' | 'salto' | 'giro' | 'comer' = 'ninguno';
  private gestoRestante = 0;

  constructor(estado: AnimalState, textura: THREE.Texture, texturaComida: THREE.Texture) {
    this.uid = estado.uid;
    this.estado = estado;

    const especie = ANIMAL_SPECIES[estado.especie];
    this.vuela = especie.vuela;
    this.velocidad = especie.velocidad / 16; // el balance esta en px/s a 16 px por unidad

    this.material = new THREE.MeshLambertMaterial({
      map: textura,
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
    });

    this.cuerpo = new THREE.Mesh(geometriaPlano, this.material);
    this.cuerpo.castShadow = true;
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
    this.indicador.position.y = 1.35;
    this.indicador.visible = false;
    this.indicador.renderOrder = 10;
    this.grupo.add(this.indicador);

    this.grupo.position.set(estado.x, this.alturaBase(), estado.z);
    // Los animales son los protagonistas: se los agranda respecto del tile.
    this.grupo.scale.setScalar(1.2);
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
    return this.vuela ? VUELO_MIN : 0;
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

  cambiarTextura(textura: THREE.Texture): void {
    if (this.material.map === textura) return;
    this.material.map = textura;
    this.material.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- */
  /* Movimiento                                                        */
  /* ---------------------------------------------------------------- */

  private elegirDestino(inmediato = false): void {
    this.destino.set(
      (Math.random() - 0.5) * 2 * LIMITE_X,
      this.vuela ? VUELO_MIN + Math.random() * (VUELO_MAX - VUELO_MIN) : 0,
      (Math.random() - 0.5) * 2 * LIMITE_Z,
    );
    this.esperaHasta = inmediato ? 0 : this.tiempo + 0.4 + Math.random() * 2.4;
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

    if (distancia < 0.05) {
      if (this.tiempo >= this.esperaHasta) this.elegirDestino();
    } else if (this.tiempo >= this.esperaHasta) {
      // Con hambre se mueve mas lento: se nota sin necesidad de texto.
      const factor = this.estado.hambre > 75 ? 0.6 : 1;
      const paso = Math.min(distancia, this.velocidad * factor * dt);
      this.grupo.position.x += (dx / distancia) * paso;
      this.grupo.position.z += (dz / distancia) * paso;

      // El volteo se decide contra el eje horizontal de la camara, no del mundo.
      const derechaCamara = new THREE.Vector3();
      camara.getWorldDirection(derechaCamara);
      derechaCamara.cross(new THREE.Vector3(0, 1, 0)).normalize();
      const haciaDerecha = dx * derechaCamara.x + dz * derechaCamara.z;
      if (Math.abs(haciaDerecha) > 0.01) this.mirandoIzquierda = haciaDerecha > 0;
    }

    this.cuerpo.scale.x = this.mirandoIzquierda ? -1 : 1;

    if (this.vuela) {
      // Aleteo: oscilacion continua alrededor de la altura de destino.
      const objetivoY = this.destino.y;
      this.grupo.position.y += (objetivoY - this.grupo.position.y) * Math.min(1, dt * 2);
      this.cuerpo.position.y = Math.sin(this.tiempo * 9 + this.fase) * 0.07;
    } else if (distancia > 0.05) {
      // Saltito de caminata, ligado al avance y no al reloj.
      this.cuerpo.position.y =
        Math.abs(Math.sin((this.grupo.position.x + this.grupo.position.z) * 4)) * 0.07;
    } else {
      // Respiracion en reposo.
      this.cuerpo.scale.y = 1 + Math.sin(this.tiempo * 2 + this.fase) * 0.03;
    }
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
