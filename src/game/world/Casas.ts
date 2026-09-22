import * as THREE from 'three';
import { CASAS, idCuerpoCasa, idMaceta } from '../../state/casas';
import type { CasaColocada, IslaState, TipoCasa } from '../../state/types';
import { ESCALA_CASA, modeloCasa } from '../art/casas';
import { cajasGeometry, materialVoxel } from '../art/voxel';

/** Fuerza de las luces de una casa respecto de un farol: van pegadas a paredes blancas. */
const FUERZA_LUZ_CASA = 0.22;

/** Planta en maceta: mas chica que en la tierra, a la escala de la terraza. */
export const ESCALA_FLOR_MACETA = 0.42;

interface Geometrias {
  solidos: THREE.BufferGeometry;
  vidrios: THREE.BufferGeometry;
  brillos: THREE.BufferGeometry;
}

/**
 * Las casas puestas en el jardin.
 *
 * Se rehace entera cuando cambian las casas o las islas, como el terreno.
 * Las geometrias se arman una vez por tipo y se comparten entre todas las
 * casas de ese tipo; los vidrios y las lamparas tienen su propio material,
 * que de noche se enciende.
 */
export class CapaCasas {
  readonly grupo = new THREE.Group();
  /** Lo que se puede tocar: el cuerpo de cada casa y cada maceta. */
  readonly tocables: THREE.Mesh[] = [];
  /** Donde se apoya la flor de cada maceta, por id de maceta. */
  readonly macetas = new Map<string, THREE.Vector3>();
  readonly luces: THREE.Vector3[] = [];
  readonly fuerzas: number[] = [];

  private geometrias = new Map<TipoCasa, Geometrias>();
  private materialSolido = materialVoxel();
  private materialVidrio = new THREE.MeshLambertMaterial({ color: '#9cc4df', emissive: '#000000' });
  private materialBrillo = new THREE.MeshBasicMaterial({ color: '#8f8a78' });
  /** Caja invisible para tocar una maceta: la maceta es chica y la flor, un plano. */
  private geoToque = new THREE.BoxGeometry(0.5, 0.8, 0.5);
  private materialToque = new THREE.MeshBasicMaterial({ visible: false });

  private vidrioDia = new THREE.Color('#9cc4df');
  private vidrioNoche = new THREE.Color('#ffe7b0');
  private brilloDia = new THREE.Color('#8f8a78');
  private brilloNoche = new THREE.Color('#ffe7a6');
  private emisionNoche = new THREE.Color('#ffb04d');
  private negro = new THREE.Color('#000000');

  private geometriasDe(tipo: TipoCasa): Geometrias {
    let g = this.geometrias.get(tipo);
    if (!g) {
      const m = modeloCasa(tipo);
      g = {
        solidos: cajasGeometry(m.solidos, 0.7),
        vidrios: cajasGeometry(m.vidrios, 0.4),
        brillos: cajasGeometry(m.brillos, 0),
      };
      this.geometrias.set(tipo, g);
    }
    return g;
  }

  reconstruir(casas: CasaColocada[], islas: IslaState[]): void {
    this.grupo.clear();
    this.tocables.length = 0;
    this.macetas.clear();
    this.luces.length = 0;
    this.fuerzas.length = 0;

    for (const casa of casas) {
      const isla = islas.find((i) => i.id === casa.islaId);
      if (!isla) continue;
      const { ancho, fondo } = CASAS[casa.tipo];
      const modelo = modeloCasa(casa.tipo);
      const geo = this.geometriasDe(casa.tipo);

      // El centro de la huella en el mundo; el modelo se corre para caer ahi.
      const cx = isla.ox + casa.col + ancho / 2;
      const cz = isla.oz + casa.row + fondo / 2;
      const g = new THREE.Group();
      g.position.set(cx - modelo.centro.x * ESCALA_CASA, 0, cz - modelo.centro.z * ESCALA_CASA);
      g.scale.setScalar(ESCALA_CASA);

      const cuerpo = idCuerpoCasa(casa.id);
      for (const [geometria, material] of [
        [geo.solidos, this.materialSolido],
        [geo.vidrios, this.materialVidrio],
        [geo.brillos, this.materialBrillo],
      ] as const) {
        const malla = new THREE.Mesh(geometria, material);
        malla.castShadow = material !== this.materialBrillo;
        malla.receiveShadow = true;
        malla.userData.celda = cuerpo;
        g.add(malla);
        this.tocables.push(malla);
      }

      const aMundo = (p: { x: number; y: number; z: number }) =>
        new THREE.Vector3(g.position.x + p.x * ESCALA_CASA, p.y * ESCALA_CASA, g.position.z + p.z * ESCALA_CASA);

      modelo.macetas.forEach((p, i) => {
        const id = idMaceta(casa.id, i);
        this.macetas.set(id, aMundo(p));
        const toque = new THREE.Mesh(this.geoToque, this.materialToque);
        toque.position.set(p.x, p.y + 0.3, p.z);
        toque.userData.celda = id;
        g.add(toque);
        this.tocables.push(toque);
      });

      for (const luz of modelo.luces) {
        this.luces.push(aMundo(luz));
        this.fuerzas.push(luz.fuerza * FUERZA_LUZ_CASA);
      }

      this.grupo.add(g);
    }
  }

  /** Enciende ventanas y lamparas segun la hora. */
  encender(noche: number): void {
    this.materialVidrio.color.lerpColors(this.vidrioDia, this.vidrioNoche, noche);
    this.materialVidrio.emissive.lerpColors(this.negro, this.emisionNoche, noche);
    this.materialVidrio.emissiveIntensity = 0.55;
    this.materialBrillo.color.lerpColors(this.brilloDia, this.brilloNoche, noche);
  }

  dispose(): void {
    this.grupo.clear();
    for (const g of this.geometrias.values()) {
      g.solidos.dispose();
      g.vidrios.dispose();
      g.brillos.dispose();
    }
    this.geoToque.dispose();
    this.materialSolido.dispose();
    this.materialVidrio.dispose();
    this.materialBrillo.dispose();
    this.materialToque.dispose();
  }
}
