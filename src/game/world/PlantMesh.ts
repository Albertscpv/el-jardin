import * as THREE from 'three';
import { ALTURA_BANCAL } from './Terrain';

/** Alto de una flor adulta, en unidades de mundo. */
const ALTO = 1.38;

const geometriaPlano = new THREE.PlaneGeometry(1, 1);
// El origen queda en la base: la planta crece hacia arriba desde la tierra.
geometriaPlano.translate(0, 0.5, 0);

/**
 * Una planta dibujada como billboard en cruz: dos planos perpendiculares.
 *
 * Es la tecnica clasica de vegetacion en 3D. A diferencia de un sprite que
 * mira siempre a la camara, la cruz tiene presencia real en el espacio: se
 * la ve desde cualquier angulo, proyecta sombra y no "gira" al rotar la vista.
 */
export class PlantMesh {
  readonly grupo = new THREE.Group();

  private material: THREE.MeshLambertMaterial;
  private fase = Math.random() * Math.PI * 2;
  private tiempo = 0;
  /** Segundos restantes del rebote al cambiar de etapa. */
  private rebote = 0;
  /** Alto de esta planta: en una maceta es mas chica que en la tierra. */
  private alto: number;

  constructor(x: number, z: number, textura: THREE.Texture, y = ALTURA_BANCAL, escala = 1) {
    this.alto = ALTO * escala;
    this.material = new THREE.MeshLambertMaterial({
      map: textura,
      // `alphaTest` en vez de transparencia: bordes duros y sombras correctas.
      alphaTest: 0.5,
      transparent: false,
      side: THREE.DoubleSide,
    });

    for (const giro of [0, Math.PI / 2]) {
      const plano = new THREE.Mesh(geometriaPlano, this.material);
      plano.rotation.y = giro;
      plano.castShadow = true;
      plano.receiveShadow = false;
      this.grupo.add(plano);
    }

    this.grupo.position.set(x, y, z);
    this.grupo.scale.setScalar(this.alto);
  }

  cambiarTextura(textura: THREE.Texture): void {
    if (this.material.map === textura) return;
    this.material.map = textura;
    this.material.needsUpdate = true;
    this.rebote = 0.26;
  }

  update(dt: number): void {
    this.tiempo += dt;

    // Vaiven suave desde la base, con desfase por planta para que no lata todo junto.
    const brisa = Math.sin(this.tiempo * 1.5 + this.fase) * 0.045;
    this.grupo.rotation.z = brisa;
    this.grupo.rotation.x = Math.cos(this.tiempo * 1.1 + this.fase) * 0.025;

    if (this.rebote > 0) {
      this.rebote = Math.max(0, this.rebote - dt);
      const k = this.rebote / 0.26;
      this.grupo.scale.set(this.alto * (1 + k * 0.18), this.alto * (1 - k * 0.14), this.alto * (1 + k * 0.18));
    } else {
      this.grupo.scale.setScalar(this.alto);
    }
  }

  dispose(): void {
    this.material.dispose();
    this.grupo.removeFromParent();
  }
}
