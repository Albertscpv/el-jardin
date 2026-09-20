import * as THREE from 'three';
import {
  PLOT_COLS,
  PLOT_ORIGIN_COL,
  PLOT_ORIGIN_ROW,
  PLOT_ROWS,
  POND,
  SENDERO_ROW,
  WORLD_COLS,
  WORLD_ROWS,
  tileToWorld,
} from '../../state/config';
import { seededRandom } from '../art/render';
import { cajasGeometry, type Caja } from '../art/voxel';

const VERDES = ['#4c8a3c', '#5fa14a', '#69ae53', '#3e7331', '#74b95a'];

/**
 * Tallos de pasto repartidos por el cesped.
 *
 * El movimiento se hace en el vertex shader, no en JavaScript: son cientos
 * de tallos en una sola malla, y asi ondean todos sin costar un solo calculo
 * por frame en la CPU. La oscilacion se pondera por la altura del vertice,
 * asi que la base queda clavada al suelo y solo se mueve la punta.
 */
export class GrassField {
  readonly malla: THREE.Mesh;

  private uniforme = { value: 0 };

  constructor() {
    const rnd = seededRandom(31415);

    const enBancal = (col: number, row: number) =>
      col >= PLOT_ORIGIN_COL &&
      col < PLOT_ORIGIN_COL + PLOT_COLS &&
      row >= PLOT_ORIGIN_ROW &&
      row < PLOT_ORIGIN_ROW + PLOT_ROWS;
    const enEstanque = (col: number, row: number) =>
      col >= POND.col - 1 &&
      col < POND.col + POND.cols + 1 &&
      row >= POND.row - 1 &&
      row < POND.row + POND.rows + 1;
    const enSendero = (row: number) => row === SENDERO_ROW;
    const enCerca = (col: number, row: number) =>
      col === 0 || row === 0 || col === WORLD_COLS - 1 || row === WORLD_ROWS - 1;

    const cajas: Caja[] = [];

    for (let row = 0; row < WORLD_ROWS; row++) {
      for (let col = 0; col < WORLD_COLS; col++) {
        if (enBancal(col, row) || enEstanque(col, row) || enSendero(row) || enCerca(col, row)) {
          continue;
        }
        // No todos los tiles llevan pasto alto: el cesped raso tiene que respirar.
        if (rnd() > 0.62) continue;

        const { x, z } = tileToWorld(col, row);
        const tallos = 2 + Math.floor(rnd() * 3);

        for (let i = 0; i < tallos; i++) {
          const grosor = 0.05 + rnd() * 0.04;
          cajas.push({
            x: x - 0.4 + rnd() * 0.8,
            y: 0,
            z: z - 0.4 + rnd() * 0.8,
            ancho: grosor,
            alto: 0.22 + rnd() * 0.34,
            fondo: grosor,
            color: VERDES[Math.floor(rnd() * VERDES.length)],
          });
        }
      }
    }

    const geometria = cajasGeometry(cajas);

    // Una fase por vertice, derivada de su posicion: tallos vecinos ondean
    // casi juntos y los lejanos van desfasados, como una racha real de viento.
    const posiciones = geometria.attributes.position;
    const fases = new Float32Array(posiciones.count);
    for (let i = 0; i < posiciones.count; i++) {
      fases[i] = posiciones.getX(i) * 0.6 + posiciones.getZ(i) * 0.35;
    }
    geometria.setAttribute('aFase', new THREE.BufferAttribute(fases, 1));

    const material = new THREE.MeshLambertMaterial({ vertexColors: true });
    material.onBeforeCompile = (shader) => {
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

    this.malla = new THREE.Mesh(geometria, material);
    this.malla.castShadow = true;
    this.malla.receiveShadow = true;
    // El sway mueve los vertices en el shader: el culling por caja se vuelve
    // impreciso y podria descartar la malla entera en los bordes.
    this.malla.frustumCulled = false;
  }

  update(dt: number): void {
    this.uniforme.value += dt;
  }
}
