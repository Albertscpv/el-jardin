import * as THREE from 'three';
import { matrizAvatar, paletaAvatar } from '../../state/content';
import type { AvatarState } from '../../state/types';
import { texturaDeMatriz } from '../art/spriteTexture';
import { controles } from '../input/Controls';

const geometriaPlano = new THREE.PlaneGeometry(1, 1);
geometriaPlano.translate(0, 0.5, 0);

/** Altura del personaje en unidades de mundo. */
const ALTO = 1.35;
/** Unidades por segundo caminando. */
const VELOCIDAD = 3.4;
/** Magnitud minima del joystick para que cuente como intencion de moverse. */
const ZONA_MUERTA = 0.12;

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

  /** Direccion horizontal hacia la que apunta, para disparar desde aqui. */
  readonly mirada = new THREE.Vector3(0, 0, -1);

  private adelante = new THREE.Vector3();
  private derecha = new THREE.Vector3();

  constructor(avatar: AvatarState) {
    this.material = new THREE.MeshLambertMaterial({
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
    });

    this.cuerpo = new THREE.Mesh(geometriaPlano, this.material);
    this.cuerpo.castShadow = true;
    this.grupo.add(this.cuerpo);

    this.grupo.position.set(avatar.x, 0, avatar.z);
    this.grupo.scale.setScalar(ALTO);
    this.destino.set(avatar.x, 0, avatar.z);

    this.aplicarAspecto(avatar);
  }

  /** Regenera la textura solo si cambió alguna elección del jugador. */
  aplicarAspecto(avatar: AvatarState): void {
    const firma = [
      avatar.piel, avatar.pelo, avatar.ropa, avatar.pantalon,
      avatar.sombrero, avatar.colorSombrero,
    ].join('|');
    if (firma === this.firma) return;
    this.firma = firma;

    this.material.map = texturaDeMatriz(
      `avatar:${firma}`,
      matrizAvatar(avatar),
      paletaAvatar(avatar),
    );
    this.material.needsUpdate = true;
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

  private animar(): void {
    if (this.caminando) {
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
