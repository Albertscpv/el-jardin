import * as THREE from 'three';
import { celdaAMundo, parseCeldaLocal } from '../../state/config';
import { esAgua, esParcela, ruidoCelda } from '../../state/islas';
import type { IslaState } from '../../state/types';
import { cajasGeometry, type Caja } from '../art/voxel';

const VERDES = ['#4c8a3c', '#5fa14a', '#69ae53', '#3e7331', '#74b95a'];

/**
 * Tallos de pasto repartidos por el cesped de todas las islas.
 *
 * El movimiento se hace en el vertex shader, no en JavaScript: son cientos
 * de tallos en una sola malla, y asi ondean todos sin costar un solo calculo
 * por frame en la CPU. La oscilacion se pondera por la altura del vertice,
 * asi que la base queda clavada al suelo y solo se mueve la punta.
 */
export class GrassField {
  readonly grupo = new THREE.Group();

  private uniforme = { value: 0 };
  private material: THREE.MeshLambertMaterial;

  constructor(islas: IslaState[]) {
    this.material = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.uTiempo = this.uniforme;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uTiempo;
           attribute float aFase;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           // La base (y = 0) no se mueve; la punta es la que ondea.
           float peso = clamp(transformed.y / 0.5, 0.0, 1.0);
           float onda = sin(uTiempo * 1.7 + aFase) * 0.5 + sin(uTiempo * 0.7 + aFase * 1.9) * 0.5;
           transformed.x += onda * 0.11 * peso;
           transformed.z += onda * 0.05 * peso;`,
        );
    };

    this.reconstruir(islas);
  }

  reconstruir(islas: IslaState[]): void {
    for (const hijo of [...this.grupo.children]) {
      this.grupo.remove(hijo);
      (hijo as THREE.Mesh).geometry.dispose();
    }

    const cajas: Caja[] = [];

    for (const isla of islas) {
      const ocupadas = new Set(isla.props.map((p) => `${p.col},${p.row}`));

      for (const local of isla.suelo) {
        const { col, row } = parseCeldaLocal(local);
        if (esParcela(isla, col, row) || esAgua(isla, col, row)) continue;
        if (ocupadas.has(local)) continue;

        const ruido = ruidoCelda(`${isla.id}:pasto`, col, row);
        // No todos los tiles llevan pasto alto: el cesped raso tiene que respirar.
        if (ruido > 0.55) continue;

        const { x, z } = celdaAMundo(isla, col, row);
        const tallos = 2 + Math.floor(ruido * 6);

        for (let i = 0; i < tallos; i++) {
          const d = ruidoCelda(`${isla.id}:t${i}`, col, row);
          const grosor = 0.05 + d * 0.04;
          cajas.push({
            x: x - 0.4 + d * 0.8,
            y: 0,
            z: z - 0.4 + ((d * 7) % 1) * 0.8,
            ancho: grosor,
            alto: 0.2 + ((d * 3) % 1) * 0.32,
            fondo: grosor,
            color: VERDES[Math.floor(d * VERDES.length)],
          });
        }
      }
    }

    if (cajas.length === 0) return;

    const geometria = cajasGeometry(cajas);

    // Una fase por vertice, derivada de su posicion: tallos vecinos ondean
    // casi juntos y los lejanos van desfasados, como una racha real de viento.
    const posiciones = geometria.attributes.position;
    const fases = new Float32Array(posiciones.count);
    for (let i = 0; i < posiciones.count; i++) {
      fases[i] = posiciones.getX(i) * 0.6 + posiciones.getZ(i) * 0.35;
    }
    geometria.setAttribute('aFase', new THREE.BufferAttribute(fases, 1));

    const malla = new THREE.Mesh(geometria, this.material);
    malla.castShadow = true;
    malla.receiveShadow = true;
    // El sway mueve los vertices en el shader: el culling por caja se vuelve
    // impreciso y podria descartar la malla entera en los bordes.
    malla.frustumCulled = false;
    this.grupo.add(malla);
  }

  update(dt: number): void {
    this.uniforme.value += dt;
  }
}
