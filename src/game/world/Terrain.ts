import * as THREE from 'three';
import {
  PLOT_COLS,
  PLOT_COUNT,
  PLOT_ORIGIN_COL,
  PLOT_ORIGIN_ROW,
  PLOT_ROWS,
  POND,
  SENDERO_ROW,
  WORLD_COLS,
  WORLD_ROWS,
  plotToTile,
  tileToWorld,
} from '../../state/config';
import { seededRandom } from '../art/render';
import * as P from '../art/props';
import { cajasGeometry, materialVoxel, voxelGeometry, type Caja } from '../art/voxel';

/** Altura de la superficie del bancal. Las plantas se apoyan aqui. */
export const ALTURA_BANCAL = 0.24;

const COLOR_TIERRA_SECA = '#8a6238';
const COLOR_TIERRA_MOJADA = '#5e4228';

const VERDES = ['#5fa14a', '#5b9b46', '#64a84f', '#588f42', '#69ae53'];

/** Todo lo que no se mueve: suelo, bancal, estanque, cerca y adornos. */
export class Terrain {
  readonly grupo = new THREE.Group();
  readonly parcelas: THREE.Mesh[] = [];
  readonly posicionFarol: THREE.Vector3;

  /** Tinte propio de cada parcela: evita que el bancal sea un bloque liso. */
  private tintes: number[] = [];
  private humedas: boolean[] = [];

  private agua: THREE.Mesh;
  private aguaBase: Float32Array;
  private tiempo = 0;

  constructor() {
    const rnd = seededRandom(20260920);

    const esEstanque = (col: number, row: number) =>
      col >= POND.col && col < POND.col + POND.cols && row >= POND.row && row < POND.row + POND.rows;
    const esSendero = (col: number, row: number) =>
      row === SENDERO_ROW && col >= POND.col + POND.cols + 1;

    /* --- Suelo ------------------------------------------------------ */
    const suelo: Caja[] = [];
    for (let row = 0; row < WORLD_ROWS; row++) {
      for (let col = 0; col < WORLD_COLS; col++) {
        const { x, z } = tileToWorld(col, row);

        if (esEstanque(col, row)) {
          // El estanque es un hueco excavado en el terreno.
          suelo.push({ x: x - 0.5, y: -0.6, z: z - 0.5, ancho: 1, alto: 0.32, fondo: 1, color: '#4a3a26' });
          continue;
        }

        const sendero = esSendero(col, row);
        const alto = sendero ? 0.54 : 0.5;
        const color = sendero
          ? rnd() > 0.5 ? '#b8a98c' : '#a89a7e'
          : VERDES[Math.floor(rnd() * VERDES.length)];

        suelo.push({ x: x - 0.5, y: -0.5, z: z - 0.5, ancho: 1, alto, fondo: 1, color });
      }
    }

    const mallaSuelo = new THREE.Mesh(cajasGeometry(suelo), materialVoxel());
    mallaSuelo.receiveShadow = true;
    this.grupo.add(mallaSuelo);

    /* --- Marco de madera del bancal --------------------------------- */
    const min = tileToWorld(PLOT_ORIGIN_COL, PLOT_ORIGIN_ROW);
    const max = tileToWorld(
      PLOT_ORIGIN_COL + PLOT_COLS - 1,
      PLOT_ORIGIN_ROW + PLOT_ROWS - 1,
    );
    const x0 = min.x - 0.5;
    const x1 = max.x + 0.5;
    const z0 = min.z - 0.5;
    const z1 = max.z + 0.5;
    const grosor = 0.16;

    const marco: Caja[] = [
      { x: x0 - grosor, y: 0, z: z0 - grosor, ancho: x1 - x0 + grosor * 2, alto: 0.34, fondo: grosor, color: '#8a6238' },
      { x: x0 - grosor, y: 0, z: z1, ancho: x1 - x0 + grosor * 2, alto: 0.34, fondo: grosor, color: '#8a6238' },
      { x: x0 - grosor, y: 0, z: z0, ancho: grosor, alto: 0.34, fondo: z1 - z0, color: '#7a5433' },
      { x: x1, y: 0, z: z0, ancho: grosor, alto: 0.34, fondo: z1 - z0, color: '#7a5433' },
    ];
    const mallaMarco = new THREE.Mesh(cajasGeometry(marco), materialVoxel());
    mallaMarco.castShadow = true;
    mallaMarco.receiveShadow = true;
    this.grupo.add(mallaMarco);

    /* --- Parcelas (una malla cada una, para cambiar de color) -------- */
    const geoParcela = new THREE.BoxGeometry(1, ALTURA_BANCAL, 1);
    for (let i = 0; i < PLOT_COUNT; i++) {
      const { col, row } = plotToTile(i);
      const { x, z } = tileToWorld(col, row);
      const tinte = 0.88 + rnd() * 0.24;
      this.tintes.push(tinte);
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color(COLOR_TIERRA_SECA).multiplyScalar(tinte),
      });
      const malla = new THREE.Mesh(geoParcela, material);
      malla.position.set(x, ALTURA_BANCAL / 2, z);
      malla.receiveShadow = true;
      malla.userData.parcela = i;
      this.parcelas.push(malla);
      this.grupo.add(malla);
    }

    /* --- Agua -------------------------------------------------------- */
    const anchoAgua = POND.cols - 0.1;
    const fondoAgua = POND.rows - 0.1;
    const centro = tileToWorld(POND.col, POND.row);
    const geoAgua = new THREE.PlaneGeometry(anchoAgua, fondoAgua, 10, 10);
    geoAgua.rotateX(-Math.PI / 2);
    this.aguaBase = Float32Array.from(geoAgua.attributes.position.array);

    this.agua = new THREE.Mesh(
      geoAgua,
      new THREE.MeshLambertMaterial({
        color: '#3d84b8',
        transparent: true,
        opacity: 0.86,
      }),
    );
    this.agua.position.set(
      centro.x - 0.5 + anchoAgua / 2 + 0.05,
      -0.16,
      centro.z - 0.5 + fondoAgua / 2 + 0.05,
    );
    this.agua.receiveShadow = true;
    this.grupo.add(this.agua);

    /* --- Cerca perimetral -------------------------------------------- */
    this.grupo.add(this.construirCerca());

    /* --- Adornos ------------------------------------------------------ */
    this.grupo.add(this.construirVegetacion(rnd));

    // Junto al sendero, para que de noche ilumine el centro del jardin.
    const farol = tileToWorld(10, 8);
    this.posicionFarol = new THREE.Vector3(farol.x, 1.25, farol.z);
    this.grupo.add(this.prop(P.FAROL, P.PALETA_FAROL, farol.x, farol.z, 6, 1.1));

    const maceta = tileToWorld(13, 3);
    this.grupo.add(this.prop(P.MACETA, P.PALETA_MACETA, maceta.x, maceta.z, 8, 0.9));

    const regadera = tileToWorld(7, 9);
    this.grupo.add(this.prop(P.REGADERA, P.PALETA_REGADERA, regadera.x, regadera.z, 7, 0.8));
  }

  /** Extruye una matriz y la planta en el suelo. */
  private prop(
    matriz: readonly string[],
    palette: Record<string, string>,
    x: number,
    z: number,
    profundidad: number,
    escala: number,
  ): THREE.Mesh {
    const geo = voxelGeometry('prop', matriz, palette, {
      cell: 1 / 16,
      depth: profundidad,
      anchor: 'center-bottom',
      sombreado: 0.6,
    });
    const malla = new THREE.Mesh(geo, materialVoxel());
    malla.position.set(x, 0, z);
    malla.scale.setScalar(escala);
    malla.castShadow = true;
    malla.receiveShadow = true;
    return malla;
  }

  private construirCerca(): THREE.Mesh {
    const cajas: Caja[] = [];
    const poste = 0.2;
    const alturaPoste = 0.95;

    const agregarPoste = (x: number, z: number) => {
      cajas.push({
        x: x - poste / 2, y: 0, z: z - poste / 2,
        ancho: poste, alto: alturaPoste, fondo: poste, color: '#6b4326',
      });
    };

    const agregarRiel = (x: number, z: number, largo: number, horizontal: boolean) => {
      for (const y of [0.32, 0.62]) {
        cajas.push({
          x: horizontal ? x : x - 0.06,
          y,
          z: horizontal ? z - 0.06 : z,
          ancho: horizontal ? largo : 0.12,
          alto: 0.13,
          fondo: horizontal ? 0.12 : largo,
          color: '#8a6238',
        });
      }
    };

    // Borde trasero y delantero.
    for (const row of [0, WORLD_ROWS - 1]) {
      const { z } = tileToWorld(0, row);
      for (let col = 0; col < WORLD_COLS; col++) {
        const { x } = tileToWorld(col, row);
        if (col % 2 === 0) agregarPoste(x, z);
        agregarRiel(x - 0.5, z, 1, true);
      }
    }
    // Laterales.
    for (const col of [0, WORLD_COLS - 1]) {
      const { x } = tileToWorld(col, 0);
      for (let row = 1; row < WORLD_ROWS - 1; row++) {
        const { z } = tileToWorld(col, row);
        if (row % 2 === 0) agregarPoste(x, z);
        agregarRiel(x, z - 0.5, 1, false);
      }
    }

    const malla = new THREE.Mesh(cajasGeometry(cajas), materialVoxel());
    malla.castShadow = true;
    malla.receiveShadow = true;
    return malla;
  }

  private construirVegetacion(rnd: () => number): THREE.Mesh {
    const cajas: Caja[] = [];

    const arbusto = (col: number, row: number) => {
      const { x, z } = tileToWorld(col, row);
      // Un arbusto es un racimo de cubos de distinto verde y tamano.
      for (let i = 0; i < 9; i++) {
        const s = 0.26 + rnd() * 0.22;
        cajas.push({
          x: x - 0.34 + rnd() * 0.5,
          y: rnd() * 0.42,
          z: z - 0.34 + rnd() * 0.5,
          ancho: s, alto: s, fondo: s,
          color: ['#3e7331', '#4c8a3c', '#356128'][Math.floor(rnd() * 3)],
        });
      }
      for (let i = 0; i < 2; i++) {
        cajas.push({
          x: x - 0.2 + rnd() * 0.4, y: 0.28 + rnd() * 0.3, z: z - 0.2 + rnd() * 0.4,
          ancho: 0.12, alto: 0.12, fondo: 0.12, color: '#e0556a',
        });
      }
    };

    const piedra = (col: number, row: number) => {
      const { x, z } = tileToWorld(col, row);
      cajas.push({ x: x - 0.3, y: 0, z: z - 0.24, ancho: 0.6, alto: 0.2, fondo: 0.48, color: '#7d7f8c' });
      cajas.push({ x: x - 0.22, y: 0.2, z: z - 0.18, ancho: 0.4, alto: 0.14, fondo: 0.34, color: '#9aa0ad' });
    };

    for (const [c, r] of [[2, 2], [13, 1], [14, 5], [5, 9], [9, 9], [13, 9], [2, 5]]) {
      arbusto(c, r);
    }
    for (const [c, r] of [[12, 8], [1, 4], [14, 8], [1, 1]]) {
      piedra(c, r);
    }

    const malla = new THREE.Mesh(cajasGeometry(cajas), materialVoxel());
    malla.castShadow = true;
    malla.receiveShadow = true;
    return malla;
  }

  /* ---------------------------------------------------------------- */
  /* Estado                                                            */
  /* ---------------------------------------------------------------- */

  setHumedad(index: number, humeda: boolean): void {
    const malla = this.parcelas[index];
    if (!malla) return;
    if (this.humedas[index] === humeda) return;
    this.humedas[index] = humeda;

    const material = malla.material as THREE.MeshLambertMaterial;
    material.color
      .setStyle(humeda ? COLOR_TIERRA_MOJADA : COLOR_TIERRA_SECA)
      .multiplyScalar(this.tintes[index]);
  }

  actualizar(dt: number): void {
    this.tiempo += dt;
    // Ondas suaves en el estanque: se notan justo lo necesario.
    const atributo = this.agua.geometry.attributes.position as THREE.BufferAttribute;
    const array = atributo.array as Float32Array;
    for (let i = 0; i < array.length; i += 3) {
      const x = this.aguaBase[i];
      const z = this.aguaBase[i + 2];
      array[i + 1] = Math.sin(this.tiempo * 1.6 + x * 2.2 + z * 1.4) * 0.035;
    }
    atributo.needsUpdate = true;
  }
}
