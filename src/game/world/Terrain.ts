import * as THREE from 'three';
import { celdaAMundo, celdaId, celdaLocal, parseCeldaLocal, VECINAS } from '../../state/config';
import { bordesDeIsla, esAgua, esParcela, ruidoCelda } from '../../state/islas';
import type { CeldaId, IslaState, PropTipo } from '../../state/types';
import * as P from '../art/props';
import { cajasGeometry, materialVoxel, voxelGeometry, type Caja } from '../art/voxel';

/** Altura de la superficie de una parcela. Las plantas se apoyan aqui. */
export const ALTURA_BANCAL = 0.22;
const COLOR_TIERRA_SECA = '#8a6238';
const COLOR_TIERRA_MOJADA = '#5e4228';

const VERDES = ['#5fa14a', '#5b9b46', '#64a84f', '#588f42', '#69ae53'];
// Las capas de abajo se aclaran a proposito: la panza de la isla queda
// contraluz, y con marrones oscuros se leeria como un bloque negro.
const TIERRA = ['#7d5836', '#6e4d2f', '#61432a', '#553a24'];

/** Objetos que salen de una matriz extruida. La farola se arma aparte, con cajas. */
const MATRIZ_PROP: Record<
  Exclude<PropTipo, 'farola'>,
  { matriz: readonly string[]; paleta: Record<string, string>; fondo: number; escala: number }
> = {
  farol: { matriz: P.FAROL, paleta: P.PALETA_FAROL, fondo: 6, escala: 1.1 },
  maceta: { matriz: P.MACETA, paleta: P.PALETA_MACETA, fondo: 8, escala: 0.9 },
  regadera: { matriz: P.REGADERA, paleta: P.PALETA_REGADERA, fondo: 7, escala: 0.8 },
};

/**
 * El terreno de todas las islas.
 *
 * Se reconstruye entero cada vez que cambia la forma del territorio. Suena
 * caro, pero expandir es una accion puntual del jugador y la geometria se
 * arma en pocos milisegundos; a cambio no hay estado incremental que se
 * pueda desincronizar del modelo.
 */
export class Terrain {
  readonly grupo = new THREE.Group();

  /** Parcelas aradas, por clave global. Son las que cambian de color al regar. */
  readonly parcelas = new Map<CeldaId, THREE.Mesh>();
  /** Malla del cesped y las bases: sirve para levantar celdas por raycast. */
  readonly suelo: THREE.Mesh[] = [];
  /** Posiciones de los faroles, para colgarles una luz. */
  readonly faroles: THREE.Vector3[] = [];
  /**
   * Objetos altos que se pueden tocar. Una farola mide mas de dos tiles:
   * quien la toca apunta a la lampara, que en pantalla queda sobre otra
   * celda. Cada una sabe en que celda esta parada.
   */
  readonly tocables: THREE.Mesh[] = [];

  /* Compartidos por todas las farolas: no se liberan al reconstruir. */
  private geoFarola = cajasGeometry(P.cajasFarola(), 0.8);
  private geoVidrio = new THREE.BoxGeometry(P.VIDRIO_FAROLA.ancho, P.VIDRIO_FAROLA.alto, P.VIDRIO_FAROLA.ancho);
  /** Sin luz propia: `MeshBasicMaterial` no depende de las luces de la escena. */
  private materialVidrio = new THREE.MeshBasicMaterial({ color: P.COLOR_VIDRIO_DIA });
  private colorDia = new THREE.Color(P.COLOR_VIDRIO_DIA);
  private colorNoche = new THREE.Color(P.COLOR_VIDRIO_NOCHE);

  private aguas: Array<{ malla: THREE.Mesh; base: Float32Array }> = [];
  private humedas = new Map<CeldaId, boolean>();
  private tintes = new Map<CeldaId, number>();
  private geoParcela = new THREE.BoxGeometry(1, ALTURA_BANCAL + 0.55, 1);
  private tiempo = 0;

  constructor(islas: IslaState[]) {
    this.reconstruir(islas);
  }

  /* ---------------------------------------------------------------- */
  /* Construccion                                                      */
  /* ---------------------------------------------------------------- */

  reconstruir(islas: IslaState[]): void {
    this.vaciar();

    const cajas: Caja[] = [];
    const cajasCerca: Caja[] = [];
    const cajasDecoracion: Caja[] = [];

    for (const isla of islas) {
      this.construirIsla(isla, cajas, cajasDecoracion);
      this.construirCerca(isla, cajasCerca);
      this.construirProps(isla);
    }

    for (const [lista, sombra] of [
      [cajas, true],
      [cajasCerca, true],
      [cajasDecoracion, true],
    ] as const) {
      if (lista.length === 0) continue;
      const malla = new THREE.Mesh(cajasGeometry(lista, 0.55), materialVoxel());
      malla.castShadow = sombra;
      malla.receiveShadow = true;
      this.grupo.add(malla);
      this.suelo.push(malla);
    }
  }

  private construirIsla(isla: IslaState, cajas: Caja[], decoracion: Caja[]): void {
    const suelo = new Set(isla.suelo);

    for (const local of isla.suelo) {
      const { col, row } = parseCeldaLocal(local);
      const { x, z } = celdaAMundo(isla, col, row);
      const x0 = x - 0.5;
      const z0 = z - 0.5;
      const ruido = ruidoCelda(isla.id, col, row);

      if (esParcela(isla, col, row)) {
        this.crearParcela(isla, col, row, ruido);
        continue;
      }

      if (esAgua(isla, col, row)) {
        // Hueco excavado con fondo de barro. No lleva el cuerpo de tierra de
        // abajo: lo taparia y el agua no se veria.
        cajas.push({ x: x0, y: -0.9, z: z0, ancho: 1, alto: 0.5, fondo: 1, color: '#4a3a26' });
        this.crearAgua(x0, z0);
        continue;
      } else {
        // Tapa de cesped fina sobre cuerpo de tierra: al mirar el canto de la
        // isla se ve la linea verde sobre el marron, como corresponde.
        cajas.push({
          x: x0, y: -0.1, z: z0, ancho: 1, alto: 0.1, fondo: 1,
          color: VERDES[Math.floor(ruido * VERDES.length)],
        });
        this.sembrarDecoracion(isla, col, row, x, z, ruido, decoracion);
      }

      cajas.push({ x: x0, y: -0.55, z: z0, ancho: 1, alto: 0.45, fondo: 1, color: TIERRA[0] });
    }

    /* --- Panza de la isla: capas erosionadas que la hacen flotar --- */
    let capa = new Set(isla.suelo);
    let y = -0.55;
    for (let nivel = 1; nivel <= 3; nivel++) {
      const siguiente = new Set<string>();
      for (const local of capa) {
        const { col, row } = parseCeldaLocal(local);
        // Solo sobrevive lo que tiene tierra en los cuatro costados: la isla
        // se afina hacia abajo sola, sin modelar nada a mano.
        const rodeada = VECINAS.every(([dc, dr]) => capa.has(celdaLocal(col + dc, row + dr)));
        if (rodeada) siguiente.add(local);
      }
      if (siguiente.size === 0) break;

      const alto = 0.55 + nivel * 0.35;
      y -= alto;
      for (const local of siguiente) {
        const { col, row } = parseCeldaLocal(local);
        const { x, z } = celdaAMundo(isla, col, row);
        cajas.push({
          x: x - 0.5, y, z: z - 0.5, ancho: 1, alto, fondo: 1,
          color: TIERRA[Math.min(nivel, TIERRA.length - 1)],
        });
      }
      capa = siguiente;
      void suelo;
    }
  }

  private crearParcela(isla: IslaState, col: number, row: number, ruido: number): void {
    const id = celdaId(isla.id, col, row);
    const { x, z } = celdaAMundo(isla, col, row);
    const tinte = 0.88 + ruido * 0.24;
    this.tintes.set(id, tinte);

    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(COLOR_TIERRA_SECA).multiplyScalar(tinte),
    });
    const malla = new THREE.Mesh(this.geoParcela, material);
    malla.position.set(x, (ALTURA_BANCAL - 0.55) / 2, z);
    malla.receiveShadow = true;
    malla.userData.celda = id;
    this.parcelas.set(id, malla);
    this.grupo.add(malla);
  }

  private crearAgua(x0: number, z0: number): void {
    const geo = new THREE.PlaneGeometry(1, 1, 3, 3);
    geo.rotateX(-Math.PI / 2);
    const base = Float32Array.from(geo.attributes.position.array);

    const malla = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({ color: '#3d84b8', transparent: true, opacity: 0.86 }),
    );
    malla.position.set(x0 + 0.5, -0.18, z0 + 0.5);
    malla.receiveShadow = true;
    this.grupo.add(malla);
    this.aguas.push({ malla, base });
  }

  private sembrarDecoracion(
    isla: IslaState,
    col: number,
    row: number,
    x: number,
    z: number,
    ruido: number,
    cajas: Caja[],
  ): void {
    const ocupada = isla.props.some((p) => p.col === col && p.row === row);
    if (ocupada) return;

    if (ruido < 0.09) {
      // Arbusto: racimo de cubos de distinto verde.
      const r2 = ruidoCelda(`${isla.id}:arb`, col, row);
      for (let i = 0; i < 8; i++) {
        const d = ruidoCelda(`${isla.id}:a${i}`, col, row);
        const s = 0.24 + d * 0.22;
        cajas.push({
          x: x - 0.32 + d * 0.5,
          y: ((d * 7) % 1) * 0.4,
          z: z - 0.32 + ((d * 3) % 1) * 0.5,
          ancho: s, alto: s, fondo: s,
          color: ['#3e7331', '#4c8a3c', '#356128'][Math.floor(d * 3)],
        });
      }
      if (r2 > 0.5) {
        cajas.push({ x: x - 0.1, y: 0.34, z: z - 0.05, ancho: 0.12, alto: 0.12, fondo: 0.12, color: '#e0556a' });
      }
    } else if (ruido < 0.125) {
      cajas.push({ x: x - 0.3, y: 0, z: z - 0.24, ancho: 0.6, alto: 0.2, fondo: 0.48, color: '#7d7f8c' });
      cajas.push({ x: x - 0.22, y: 0.2, z: z - 0.18, ancho: 0.4, alto: 0.14, fondo: 0.34, color: '#9aa0ad' });
    }
  }

  /**
   * Cerca sobre cada lado expuesto del contorno.
   *
   * Al derivarse del borde y no guardarse, el jugador extiende tierra y la
   * valla se reacomoda sola. Es lo que hace que expandir se sienta bien.
   */
  private construirCerca(isla: IslaState, cajas: Caja[]): void {
    const poste = 0.18;
    const alturaPoste = 0.9;

    const agregarPoste = (x: number, z: number) => {
      cajas.push({
        x: x - poste / 2, y: -0.1, z: z - poste / 2,
        ancho: poste, alto: alturaPoste, fondo: poste, color: '#6b4326',
      });
    };

    for (const { col, row, dc, dr } of bordesDeIsla(isla)) {
      const { x, z } = celdaAMundo(isla, col, row);
      const bx = x + dc * 0.5;
      const bz = z + dr * 0.5;

      for (const y of [0.24, 0.54]) {
        cajas.push({
          x: dc !== 0 ? bx - 0.06 : bx - 0.5,
          y,
          z: dr !== 0 ? bz - 0.06 : bz - 0.5,
          ancho: dc !== 0 ? 0.12 : 1,
          alto: 0.12,
          fondo: dr !== 0 ? 0.12 : 1,
          color: '#8a6238',
        });
      }

      // Un poste en cada punta del tramo; los repetidos se funden al unirse.
      if (dc !== 0) {
        agregarPoste(bx, bz - 0.5);
        agregarPoste(bx, bz + 0.5);
      } else {
        agregarPoste(bx - 0.5, bz);
        agregarPoste(bx + 0.5, bz);
      }
    }
  }

  private construirProps(isla: IslaState): void {
    for (const prop of isla.props) {
      if (prop.tipo === 'farola') {
        this.construirFarola(isla, prop.col, prop.row);
        continue;
      }
      const def = MATRIZ_PROP[prop.tipo];
      const { x, z } = celdaAMundo(isla, prop.col, prop.row);

      const geo = voxelGeometry(prop.tipo, def.matriz, def.paleta, {
        cell: 1 / 16,
        depth: def.fondo,
        anchor: 'center-bottom',
        sombreado: 0.6,
      });
      const malla = new THREE.Mesh(geo, materialVoxel());
      malla.position.set(x, 0, z);
      malla.scale.setScalar(def.escala);
      malla.castShadow = true;
      malla.receiveShadow = true;
      this.grupo.add(malla);

      if (prop.tipo === 'farol') this.faroles.push(new THREE.Vector3(x, 1.25, z));
    }
  }

  private construirFarola(isla: IslaState, col: number, row: number): void {
    const { x, z } = celdaAMundo(isla, col, row);
    const celda = celdaId(isla.id, col, row);

    const poste = new THREE.Mesh(this.geoFarola, materialVoxel());
    poste.position.set(x, 0, z);
    poste.castShadow = true;
    poste.receiveShadow = true;
    poste.userData.celda = celda;
    this.grupo.add(poste);

    const vidrio = new THREE.Mesh(this.geoVidrio, this.materialVidrio);
    vidrio.position.set(x, P.VIDRIO_FAROLA.y + P.VIDRIO_FAROLA.alto / 2, z);
    vidrio.userData.celda = celda;
    this.grupo.add(vidrio);

    this.tocables.push(poste, vidrio);
    this.faroles.push(new THREE.Vector3(x, P.ALTURA_LUZ_FAROLA, z));
  }

  /**
   * Enciende el vidrio de las farolas segun la hora. Las luces que
   * proyectan sobre el pasto son pocas y se reparten; el vidrio brilla en
   * todas, asi ninguna farola se ve apagada de noche.
   */
  encenderFarolas(noche: number): void {
    this.materialVidrio.color.lerpColors(this.colorDia, this.colorNoche, noche);
  }

  /* ---------------------------------------------------------------- */
  /* Estado                                                            */
  /* ---------------------------------------------------------------- */

  setHumedad(id: CeldaId, humeda: boolean): void {
    const malla = this.parcelas.get(id);
    if (!malla) return;
    if (this.humedas.get(id) === humeda) return;
    this.humedas.set(id, humeda);

    const material = malla.material as THREE.MeshLambertMaterial;
    material.color
      .setStyle(humeda ? COLOR_TIERRA_MOJADA : COLOR_TIERRA_SECA)
      .multiplyScalar(this.tintes.get(id) ?? 1);
  }

  actualizar(dt: number): void {
    this.tiempo += dt;
    // Ondas suaves en el agua: se notan justo lo necesario.
    for (const { malla, base } of this.aguas) {
      const atributo = malla.geometry.attributes.position as THREE.BufferAttribute;
      const array = atributo.array as Float32Array;
      for (let i = 0; i < array.length; i += 3) {
        array[i + 1] =
          Math.sin(this.tiempo * 1.6 + (base[i] + malla.position.x) * 2.2 + (base[i + 2] + malla.position.z) * 1.4) * 0.035;
      }
      atributo.needsUpdate = true;
    }
  }

  private vaciar(): void {
    for (const hijo of [...this.grupo.children]) {
      this.grupo.remove(hijo);
      const malla = hijo as THREE.Mesh;
      const compartida = [this.geoParcela, this.geoFarola, this.geoVidrio];
      if (malla.geometry && !compartida.includes(malla.geometry)) malla.geometry.dispose();
      const material = malla.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else if (material !== this.materialVidrio) material?.dispose();
    }
    this.parcelas.clear();
    this.suelo.length = 0;
    this.faroles.length = 0;
    this.tocables.length = 0;
    this.aguas = [];
    this.humedas.clear();
    this.tintes.clear();
  }

  dispose(): void {
    this.vaciar();
    this.geoParcela.dispose();
    this.geoFarola.dispose();
    this.geoVidrio.dispose();
    this.materialVidrio.dispose();
  }
}
