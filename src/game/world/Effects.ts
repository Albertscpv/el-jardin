import * as THREE from 'three';
import { HEART } from '../art/matrices';
import { texturaDeMatriz } from '../art/spriteTexture';

const MAX_PARTICULAS = 320;
const MAX_CORAZONES = 24;
const AMBIENTE = 48;

interface Particula {
  vida: number;
  vidaTotal: number;
  vx: number;
  vy: number;
  vz: number;
  gravedad: number;
  escala: number;
}

export interface EmisionOpts {
  x: number;
  y: number;
  z: number;
  cantidad: number;
  colores: string[];
  /** Velocidad inicial en unidades por segundo. */
  velocidad?: number;
  /** Empuje vertical extra. */
  empuje?: number;
  gravedad?: number;
  vida?: number;
  escala?: number;
}

/**
 * Efectos del jardin.
 *
 * Las particulas son cubos diminutos, no sprites: en una escena voxel un
 * cubo que rebota lee mejor que un puntito difuso, y ademas recibe la misma
 * luz que todo lo demas.
 */
export class Effects {
  readonly grupo = new THREE.Group();

  private cubos: THREE.InstancedMesh;
  private datos: Particula[] = [];
  private siguiente = 0;

  private corazones: THREE.Sprite[] = [];
  private datosCorazon: Particula[] = [];
  private siguienteCorazon = 0;

  private ambiente: THREE.InstancedMesh;
  private faseAmbiente: number[] = [];
  private materialAmbiente: THREE.MeshBasicMaterial;

  private dummy = new THREE.Object3D();
  private color = new THREE.Color();

  constructor() {
    /* --- Cubos --- */
    this.cubos = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial(),
      MAX_PARTICULAS,
    );
    this.cubos.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.cubos.frustumCulled = false;

    for (let i = 0; i < MAX_PARTICULAS; i++) {
      this.datos.push({ vida: 0, vidaTotal: 1, vx: 0, vy: 0, vz: 0, gravedad: 0, escala: 0 });
      this.cubos.setColorAt(i, this.color.setStyle('#ffffff'));
      this.ocultar(this.cubos, i);
    }
    this.cubos.instanceMatrix.needsUpdate = true;
    this.grupo.add(this.cubos);

    /* --- Corazones --- */
    const texturaCorazon = texturaDeMatriz('corazon', HEART, {
      '1': '#ff8fb0',
      '2': '#e0456e',
    });
    for (let i = 0; i < MAX_CORAZONES; i++) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texturaCorazon, transparent: true, depthTest: false }),
      );
      sprite.scale.setScalar(0.3);
      sprite.visible = false;
      sprite.renderOrder = 20;
      this.corazones.push(sprite);
      this.datosCorazon.push({
        vida: 0, vidaTotal: 1, vx: 0, vy: 0, vz: 0, gravedad: 0, escala: 0.3,
      });
      this.grupo.add(sprite);
    }

    /* --- Ambiente --- */
    this.materialAmbiente = new THREE.MeshBasicMaterial({
      color: '#fff3c4',
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.ambiente = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.07, 0.07, 0.07),
      this.materialAmbiente,
      AMBIENTE,
    );
    this.ambiente.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.ambiente.frustumCulled = false;
    for (let i = 0; i < AMBIENTE; i++) this.faseAmbiente.push(Math.random() * Math.PI * 2);
    this.grupo.add(this.ambiente);
  }

  private ocultar(malla: THREE.InstancedMesh, i: number): void {
    this.dummy.position.set(0, -999, 0);
    this.dummy.scale.setScalar(0.0001);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.updateMatrix();
    malla.setMatrixAt(i, this.dummy.matrix);
  }

  /* ---------------------------------------------------------------- */
  /* Emision                                                           */
  /* ---------------------------------------------------------------- */

  emitir(opts: EmisionOpts): void {
    const {
      x, y, z, cantidad, colores,
      velocidad = 1.6, empuje = 1.6, gravedad = 5, vida = 0.7, escala = 0.09,
    } = opts;

    for (let n = 0; n < cantidad; n++) {
      const i = this.siguiente;
      this.siguiente = (this.siguiente + 1) % MAX_PARTICULAS;

      const angulo = Math.random() * Math.PI * 2;
      const radial = Math.random() * velocidad;

      const p = this.datos[i];
      p.vida = vida * (0.7 + Math.random() * 0.6);
      p.vidaTotal = p.vida;
      p.vx = Math.cos(angulo) * radial;
      p.vz = Math.sin(angulo) * radial;
      p.vy = empuje * (0.5 + Math.random());
      p.gravedad = gravedad;
      p.escala = escala * (0.7 + Math.random() * 0.6);

      this.dummy.position.set(x, y, z);
      this.dummy.scale.setScalar(p.escala);
      this.dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.dummy.updateMatrix();
      this.cubos.setMatrixAt(i, this.dummy.matrix);
      this.cubos.setColorAt(i, this.color.setStyle(colores[n % colores.length]));
    }

    this.cubos.instanceMatrix.needsUpdate = true;
    if (this.cubos.instanceColor) this.cubos.instanceColor.needsUpdate = true;
  }

  emitirCorazones(x: number, y: number, z: number, cantidad: number): void {
    for (let n = 0; n < cantidad; n++) {
      const i = this.siguienteCorazon;
      this.siguienteCorazon = (this.siguienteCorazon + 1) % MAX_CORAZONES;

      const p = this.datosCorazon[i];
      p.vida = 1.1;
      p.vidaTotal = 1.1;
      p.vx = (Math.random() - 0.5) * 0.5;
      p.vz = (Math.random() - 0.5) * 0.5;
      p.vy = 0.9 + Math.random() * 0.5;
      // Gravedad negativa: los corazones suben en vez de caer.
      p.gravedad = -0.4;
      p.escala = 0.26 + Math.random() * 0.1;

      const sprite = this.corazones[i];
      sprite.position.set(x + p.vx * 0.2, y, z + p.vz * 0.2);
      sprite.visible = true;
      sprite.material.opacity = 1;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Bucle                                                             */
  /* ---------------------------------------------------------------- */

  /** Zona por la que vagan las motas de ambiente. La fija el mundo. */
  radioAmbiente = 10;

  update(dt: number, noche: number, tiempo: number): void {
    this.actualizarCubos(dt);
    this.actualizarCorazones(dt);
    this.actualizarAmbiente(noche, tiempo);
  }

  private actualizarCubos(dt: number): void {
    let hayCambios = false;

    for (let i = 0; i < MAX_PARTICULAS; i++) {
      const p = this.datos[i];
      if (p.vida <= 0) continue;

      p.vida -= dt;
      if (p.vida <= 0) {
        this.ocultar(this.cubos, i);
        hayCambios = true;
        continue;
      }

      this.cubos.getMatrixAt(i, this.dummy.matrix);
      this.dummy.matrix.decompose(this.dummy.position, this.dummy.quaternion, this.dummy.scale);

      p.vy -= p.gravedad * dt;
      this.dummy.position.x += p.vx * dt;
      this.dummy.position.y += p.vy * dt;
      this.dummy.position.z += p.vz * dt;

      // Rebote seco contra el piso, con perdida de energia.
      if (this.dummy.position.y < 0.03) {
        this.dummy.position.y = 0.03;
        p.vy = Math.abs(p.vy) * 0.34;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }

      const k = p.vida / p.vidaTotal;
      this.dummy.scale.setScalar(p.escala * Math.min(1, k * 1.6));
      this.dummy.rotation.x += dt * 4;
      this.dummy.rotation.z += dt * 3;
      this.dummy.updateMatrix();
      this.cubos.setMatrixAt(i, this.dummy.matrix);
      hayCambios = true;
    }

    if (hayCambios) this.cubos.instanceMatrix.needsUpdate = true;
  }

  private actualizarCorazones(dt: number): void {
    for (let i = 0; i < MAX_CORAZONES; i++) {
      const p = this.datosCorazon[i];
      const sprite = this.corazones[i];

      if (p.vida <= 0) {
        if (sprite.visible) sprite.visible = false;
        continue;
      }

      p.vida -= dt;
      p.vy -= p.gravedad * dt;
      sprite.position.x += p.vx * dt;
      sprite.position.y += p.vy * dt;
      sprite.position.z += p.vz * dt;

      const k = Math.max(0, p.vida / p.vidaTotal);
      sprite.material.opacity = k;
      sprite.scale.setScalar(p.escala * (0.6 + k * 0.4));
    }
  }

  /**
   * Polen de dia, luciernagas de noche.
   *
   * Es un solo emisor: lo que cambia es el color, el brillo y el parpadeo,
   * no el sistema. Asi el jardin nunca se queda del todo quieto.
   */
  private actualizarAmbiente(noche: number, tiempo: number): void {
    this.materialAmbiente.color.setRGB(1 - noche * 0.17, 1, 0.77 + noche * 0.17);
    this.materialAmbiente.opacity = 0.32 + noche * 0.63;

    for (let i = 0; i < AMBIENTE; i++) {
      const f = this.faseAmbiente[i];
      // Deriva en lazos amplios, cada mota con su propio ritmo.
      this.dummy.position.set(
        Math.sin(tiempo * 0.26 + f * 2.1) * this.radioAmbiente,
        1 + Math.sin(tiempo * 0.7 + f) * 0.45 + noche * 0.3,
        Math.cos(tiempo * 0.21 + f * 1.7) * this.radioAmbiente,
      );
      // El titileo es lo que las vuelve luciernagas; de dia el polen no titila.
      const parpadeo = Math.max(0, Math.sin(tiempo * 2.6 + f * 3));
      this.dummy.scale.setScalar((1 - noche) * 0.55 + noche * (0.25 + 0.75 * parpadeo));
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.ambiente.setMatrixAt(i, this.dummy.matrix);
    }

    this.ambiente.instanceMatrix.needsUpdate = true;
  }
}
