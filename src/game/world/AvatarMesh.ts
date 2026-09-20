import * as THREE from 'three';
import { matrizAvatar, paletaAvatar } from '../../state/content';
import type { AvatarState } from '../../state/types';
import { texturaDeMatriz } from '../art/spriteTexture';

const geometriaPlano = new THREE.PlaneGeometry(1, 1);
geometriaPlano.translate(0, 0.5, 0);

/** Altura del personaje en unidades de mundo. */
const ALTO = 1.35;
/** Unidades por segundo caminando. */
const VELOCIDAD = 3.2;

/**
 * El personaje del jugador.
 *
 * Camina solo hacia donde trabajas: al sembrar, regar o acariciar, el store
 * mueve su destino y el resto lo resuelve aqui. Asi el avatar acompana sin
 * meterse en el medio pidiendo que lo conduzcas.
 */
export class AvatarMesh {
  readonly grupo = new THREE.Group();

  private cuerpo: THREE.Mesh;
  private material: THREE.MeshLambertMaterial;
  private destino = new THREE.Vector3();
  private mirandoIzquierda = false;
  private tiempo = 0;
  private caminando = false;
  /** Firma del aspecto actual, para no regenerar la textura de gusto. */
  private firma = '';

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

  update(dt: number, camara: THREE.Camera): void {
    this.tiempo += dt;

    // Encara la camara solo en Y, igual que los animales.
    this.grupo.rotation.y = Math.atan2(
      camara.position.x - this.grupo.position.x,
      camara.position.z - this.grupo.position.z,
    );

    const dx = this.destino.x - this.grupo.position.x;
    const dz = this.destino.z - this.grupo.position.z;
    const distancia = Math.hypot(dx, dz);

    this.caminando = distancia > 0.06;

    if (this.caminando) {
      const paso = Math.min(distancia, VELOCIDAD * dt);
      this.grupo.position.x += (dx / distancia) * paso;
      this.grupo.position.z += (dz / distancia) * paso;

      // El volteo se decide contra el eje horizontal de la camara.
      const derecha = new THREE.Vector3();
      camara.getWorldDirection(derecha);
      derecha.cross(new THREE.Vector3(0, 1, 0)).normalize();
      const haciaDerecha = dx * derecha.x + dz * derecha.z;
      if (Math.abs(haciaDerecha) > 0.01) this.mirandoIzquierda = haciaDerecha > 0;

      // Trote: rebote ligado al avance, con una inclinacion apenas perceptible.
      this.cuerpo.position.y = Math.abs(Math.sin(this.tiempo * 11)) * 0.07;
      this.cuerpo.rotation.z = Math.sin(this.tiempo * 11) * 0.05;
    } else {
      // Respiracion en reposo.
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
