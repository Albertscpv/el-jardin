/**
 * Las cuatro casas, armadas con cajas en unidades de tile.
 *
 * Son las mismas de la propuesta que se vio en 3D antes de construirlas. Se
 * separan en tres listas porque cada una lleva su material: lo solido va con
 * colores por vertice, los vidrios de las ventanas y las lamparas se
 * encienden de noche.
 *
 * Las flores no estan aca: las macetas llevan la tierra, y la flor la dibuja
 * la planta de verdad que el jugador siembra. Por eso cada modelo devuelve
 * donde queda la tierra de cada maceta.
 */

import type { TipoCasa } from '../../state/types';
import type { Caja } from './voxel';

export interface Punto {
  x: number;
  y: number;
  z: number;
}

export interface ModeloCasa3D {
  solidos: Caja[];
  vidrios: Caja[];
  brillos: Caja[];
  /** Tierra de cada maceta, donde se apoya la flor. En orden. */
  macetas: Punto[];
  /** Luces de afuera, con su intensidad de noche. */
  luces: Array<Punto & { fuerza: number }>;
  /** Centro de las paredes: el modelo se corre para que caiga en su huella. */
  centro: { x: number; z: number };
}

const COL = {
  pared: '#f4efe6', moldura: '#e3dccd', zocalo: '#d6cbb8',
  techo: '#7a4a2e', techo2: '#643a22', chimenea: '#9c5a3c',
  madera: '#8a5a33', maderaClara: '#b07a4a', piso: '#c9ab86',
  puerta: '#6b4326', marco: '#fffaf2', picaporte: '#e8c46a', hierro: '#3b3a40', cable: '#2e2a30',
  maceta: '#c2683f', macetaBorde: '#9c4f2e', sustrato: '#4d3322',
};

type Destino = 'solido' | 'vidrio' | 'brillo';

class Armado {
  readonly m: ModeloCasa3D;

  constructor(centro: { x: number; z: number }) {
    this.m = { solidos: [], vidrios: [], brillos: [], macetas: [], luces: [], centro };
  }

  caja(x: number, y: number, z: number, ancho: number, alto: number, fondo: number, color: string, destino: Destino = 'solido') {
    const caja = { x, y, z, ancho, alto, fondo, color };
    if (destino === 'vidrio') this.m.vidrios.push(caja);
    else if (destino === 'brillo') this.m.brillos.push(caja);
    else this.m.solidos.push(caja);
  }

  /** Algo pegado a una pared. eje 'z': pared en z = p que mira hacia dir. */
  enCara(eje: 'x' | 'z', p: number, dir: number, c: number, y: number, w: number, h: number, prof: number, color: string, destino: Destino = 'solido') {
    const a = dir > 0 ? p : p - prof;
    if (eje === 'z') this.caja(c - w / 2, y, a, w, h, prof, color, destino);
    else this.caja(a, y, c - w / 2, prof, h, w, color, destino);
  }

  ventana(eje: 'x' | 'z', p: number, dir: number, c: number, cy: number, w = 0.42, h = 0.42) {
    this.enCara(eje, p, dir, c, cy - h / 2 - 0.05, w + 0.1, h + 0.1, 0.03, COL.marco);
    this.enCara(eje, p, dir, c, cy - h / 2, w, h, 0.05, '#9cc4df', 'vidrio');
    this.enCara(eje, p, dir, c, cy - h / 2, 0.035, h, 0.06, COL.marco);
    this.enCara(eje, p, dir, c, cy - 0.018, w, 0.035, 0.06, COL.marco);
    this.enCara(eje, p, dir, c, cy - h / 2 - 0.1, w + 0.18, 0.05, 0.12, COL.marco);
  }

  puerta(eje: 'x' | 'z', p: number, dir: number, c: number, y: number, vidriada = false) {
    const w = 0.38;
    const h = 0.72;
    this.enCara(eje, p, dir, c, y, w + 0.1, h + 0.06, 0.03, COL.marco);
    this.enCara(eje, p, dir, c, y, w, h, 0.05, vidriada ? '#9cc4df' : COL.puerta, vidriada ? 'vidrio' : 'solido');
    if (vidriada) this.enCara(eje, p, dir, c, y, 0.035, h, 0.06, COL.marco);
    else this.enCara(eje, p, dir, c + w * 0.3, y + h * 0.45, 0.05, 0.05, 0.08, COL.picaporte);
  }

  aplique(eje: 'x' | 'z', p: number, dir: number, c: number, y: number) {
    this.enCara(eje, p, dir, c, y, 0.08, 0.16, 0.04, COL.madera);
    this.enCara(eje, p, dir, c, y + 0.02, 0.12, 0.12, 0.1, '#8f8a78', 'brillo');
    this.enCara(eje, p, dir, c, y + 0.14, 0.15, 0.03, 0.12, COL.madera);
  }

  colgante(x: number, z: number, techo = 2.0) {
    this.caja(x - 0.012, techo - 0.3, z - 0.012, 0.024, 0.3, 0.024, COL.cable);
    this.caja(x - 0.08, techo - 0.33, z - 0.08, 0.16, 0.04, 0.16, COL.hierro);
    this.caja(x - 0.06, techo - 0.45, z - 0.06, 0.12, 0.12, 0.12, '#8f8a78', 'brillo');
  }

  volumen(x: number, z: number, w: number, d: number, pisos: number) {
    this.caja(x, 0, z, w, pisos, d, COL.pared);
    this.caja(x - 0.02, 0, z - 0.02, w + 0.04, 0.12, d + 0.04, COL.zocalo);
    for (let p = 1; p < pisos; p++) this.caja(x - 0.04, p - 0.05, z - 0.04, w + 0.08, 0.06, d + 0.08, COL.moldura);
  }

  techoCuatroAguas(x: number, z: number, w: number, d: number, y: number, { vuelo = 0.18, pasos = 4, alto = 0.16 } = {}) {
    const W = w + 2 * vuelo;
    const D = d + 2 * vuelo;
    const paso = Math.min(W, D) / (2 * pasos + 0.6);
    for (let k = 0; k < pasos; k++) {
      const i = k * paso;
      this.caja(x - vuelo + i, y + k * alto, z - vuelo + i, W - 2 * i, alto, D - 2 * i, k % 2 ? COL.techo2 : COL.techo);
    }
  }

  /** A dos aguas con la cumbrera sobre x: faldones escalonados y hastial blanco. */
  techoDosAguas(x: number, z: number, w: number, d: number, y: number, { vuelo = 0.18, alero = 0.16, pasos = 4, alto = 0.18 } = {}) {
    const sd = d / (2 * pasos);
    for (let k = 0; k < pasos; k++) {
      const yk = y + k * alto;
      const zi = z + k * sd;
      const dk = d - 2 * k * sd;
      const sale = k === 0 ? alero : 0.02;
      const c = k % 2 ? COL.techo2 : COL.techo;
      this.caja(x - vuelo, yk, zi - sale, w + 2 * vuelo, alto, sd + sale, c);
      this.caja(x - vuelo, yk, zi + dk - sd, w + 2 * vuelo, alto, sd + sale, c);
      if (dk - 2 * sd > 0.001) this.caja(x, yk, zi + sd, w, alto, dk - 2 * sd, COL.pared);
    }
    this.caja(x - vuelo - 0.02, y + pasos * alto, z + d / 2 - 0.08, w + 2 * vuelo + 0.04, 0.08, 0.16, COL.techo2);
  }

  baranda(puntos: Array<[number, number]>, y: number, cerrada = false) {
    const alto = 0.36;
    const tramos: Array<[[number, number], [number, number]]> = [];
    for (let i = 0; i < puntos.length - 1; i++) tramos.push([puntos[i], puntos[i + 1]]);
    if (cerrada) tramos.push([puntos[puntos.length - 1], puntos[0]]);
    for (const [[ax, az], [bx, bz]] of tramos) {
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.42));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        this.caja(ax + (bx - ax) * t - 0.03, y, az + (bz - az) * t - 0.03, 0.06, alto, 0.06, COL.madera);
      }
      for (const [yy, grosor, col] of [[y + alto, 0.05, COL.maderaClara], [y + alto * 0.45, 0.03, COL.madera]] as const) {
        if (ax === bx) this.caja(ax - 0.035, yy, Math.min(az, bz) - 0.035, 0.07, grosor, Math.abs(bz - az) + 0.07, col);
        else this.caja(Math.min(ax, bx) - 0.035, yy, az - 0.035, Math.abs(bx - ax) + 0.07, grosor, 0.07, col);
      }
    }
  }

  /** Maceta vacia: la flor la pone la planta que se siembre. */
  maceta(x: number, y: number, z: number) {
    this.caja(x - 0.12, y, z - 0.12, 0.24, 0.2, 0.24, COL.maceta);
    this.caja(x - 0.14, y + 0.17, z - 0.14, 0.28, 0.05, 0.28, COL.macetaBorde);
    this.caja(x - 0.1, y + 0.2, z - 0.1, 0.2, 0.03, 0.2, COL.sustrato);
    this.m.macetas.push({ x, y: y + 0.23, z });
  }

  jardinera(x: number, y: number, z: number, largo: number, eje: 'x' | 'z') {
    const w = eje === 'x' ? largo : 0.22;
    const d = eje === 'x' ? 0.22 : largo;
    this.caja(x - w / 2, y, z - d / 2, w, 0.18, d, COL.maceta);
    this.caja(x - w / 2 + 0.03, y + 0.18, z - d / 2 + 0.03, w - 0.06, 0.02, d - 0.06, COL.sustrato);
    this.m.macetas.push({ x, y: y + 0.2, z });
  }

  luz(x: number, y: number, z: number, fuerza: number) {
    this.m.luces.push({ x, y, z, fuerza });
  }
}

function casaEnL(): ModeloCasa3D {
  const a = new Armado({ x: 0.1, z: -0.25 });
  a.volumen(-1.9, -1.4, 2.0, 2.3, 2);
  a.volumen(0.1, -0.7, 2.0, 1.6, 1);
  a.caja(0.1, 1.0, -0.7, 2.0, 0.06, 1.6, COL.piso);
  a.baranda([[0.1, -0.7], [2.1, -0.7], [2.1, 0.9], [0.1, 0.9]], 1.06);
  a.techoCuatroAguas(-1.9, -1.4, 2.0, 2.3, 2.0, { pasos: 5, alto: 0.15 });
  a.caja(-1.35, 2.2, -0.95, 0.28, 0.75, 0.28, COL.chimenea);
  a.caja(-1.39, 2.95, -0.99, 0.36, 0.06, 0.36, COL.techo2);
  a.puerta('z', 0.9, 1, -0.9, 0);
  a.ventana('z', 0.9, 1, -1.5, 0.55);
  a.ventana('z', 0.9, 1, -1.45, 1.55);
  a.ventana('z', 0.9, 1, -0.45, 1.55);
  a.ventana('z', 0.9, 1, 1.1, 0.55);
  a.ventana('x', 2.1, 1, 0.1, 0.55);
  a.ventana('x', -1.9, -1, -0.25, 1.55);
  a.ventana('x', -1.9, -1, -0.25, 0.55);
  a.puerta('x', 0.1, 1, -0.2, 1.06, true);
  a.ventana('z', -1.4, -1, -0.9, 1.55);
  for (const [x, z] of [[1.85, -0.45], [1.85, 0.1], [1.85, 0.62], [1.25, 0.62], [0.68, 0.62], [0.68, -0.45]]) a.maceta(x, 1.06, z);
  a.aplique('z', 0.9, 1, -0.5, 0.5);
  a.luz(1.4, 1.55, 0.3, 0.6);
  a.luz(-0.5, 0.65, 1.7, 0.55);
  return a.m;
}

function casaAlFrente(): ModeloCasa3D {
  const a = new Armado({ x: 0, z: -0.15 });
  a.volumen(-1.5, -1.3, 3.0, 2.3, 1);
  a.caja(-1.5, 1.0, -1.3, 3.0, 0.06, 2.3, COL.piso);
  a.caja(-1.0, 1.0, -1.3, 2.0, 1.0, 1.4, COL.pared);
  a.baranda([[-1.5, -1.3], [-1.5, 1.0], [1.5, 1.0], [1.5, -1.3]], 1.06);
  a.techoDosAguas(-1.0, -1.3, 2.0, 1.4, 2.0, { pasos: 4, alto: 0.17 });
  a.puerta('z', 1.0, 1, 0, 0);
  a.ventana('z', 1.0, 1, -0.95, 0.55);
  a.ventana('z', 1.0, 1, 0.95, 0.55);
  a.ventana('x', 1.5, 1, -0.15, 0.55);
  a.ventana('x', -1.5, -1, -0.15, 0.55);
  a.puerta('z', 0.1, 1, 0.4, 1.06, true);
  a.ventana('z', 0.1, 1, -0.45, 1.55);
  a.ventana('x', 1.0, 1, -0.6, 1.55);
  for (const [x, z] of [[-1.2, 0.75], [-0.55, 0.75], [1.2, 0.75], [1.25, -0.5]]) a.maceta(x, 1.06, z);
  a.aplique('z', 1.0, 1, 0.38, 0.5);
  a.luz(0, 1.5, 0.85, 0.6);
  a.luz(0.38, 0.65, 1.75, 0.55);
  return a.m;
}

function casaAzotea(): ModeloCasa3D {
  const a = new Armado({ x: 0, z: -0.05 });
  a.volumen(-1.5, -1.1, 3.0, 2.1, 2);
  a.techoCuatroAguas(-1.5, -1.1, 1.5, 2.1, 2.0, { pasos: 4, alto: 0.16, vuelo: 0.12 });
  a.caja(0.0, 2.0, -1.1, 1.5, 0.06, 2.1, COL.piso);
  // Salida de la escalera a la azotea.
  a.caja(0.05, 2.06, -1.05, 0.55, 0.72, 0.6, COL.pared);
  a.caja(0.0, 2.78, -1.1, 0.65, 0.06, 0.7, COL.techo);
  a.puerta('x', 0.6, 1, -0.75, 2.06);
  a.baranda([[0.15, -1.1], [1.5, -1.1], [1.5, 1.0], [0.15, 1.0]], 2.06);
  a.puerta('z', 1.0, 1, -0.6, 0);
  a.ventana('z', 1.0, 1, 0.6, 0.55);
  a.ventana('z', 1.0, 1, -1.15, 0.55);
  a.ventana('z', 1.0, 1, -0.8, 1.55);
  a.ventana('z', 1.0, 1, 0.1, 1.55);
  a.ventana('z', 1.0, 1, 0.9, 1.55);
  a.ventana('x', 1.5, 1, -0.05, 0.55);
  a.ventana('x', 1.5, 1, -0.05, 1.55);
  for (const [x, z] of [[1.25, -0.8], [1.25, -0.2], [1.25, 0.4], [0.85, 0.75], [0.3, 0.75]]) a.maceta(x, 2.06, z);
  a.aplique('z', 1.0, 1, -0.25, 0.5);
  a.luz(1.05, 2.5, 0.35, 0.6);
  a.luz(-0.25, 0.65, 1.75, 0.55);
  return a.m;
}

function casaChalet(): ModeloCasa3D {
  const a = new Armado({ x: 0, z: 0 });
  a.volumen(-1.2, -1.0, 2.4, 2.0, 2);
  for (const [x, z] of [[-1.6, -1.4], [1.54, -1.4], [-1.6, 1.34], [1.54, 1.34]]) a.caja(x, 0, z, 0.06, 0.94, 0.06, COL.madera);
  a.caja(-1.65, 0.94, -1.45, 3.3, 0.08, 2.9, COL.maderaClara);
  a.baranda([[-1.65, -1.45], [1.65, -1.45], [1.65, 1.45], [-1.65, 1.45]], 1.02, true);
  a.jardinera(-0.85, 1.12, 1.58, 1.0, 'x');
  a.jardinera(0.85, 1.12, 1.58, 1.0, 'x');
  a.jardinera(1.78, 1.12, 0, 1.3, 'z');
  a.jardinera(-1.78, 1.12, 0, 1.3, 'z');
  a.techoDosAguas(-1.2, -1.0, 2.4, 2.0, 2.0, { pasos: 5, alto: 0.19, vuelo: 0.55, alero: 0.62 });
  a.puerta('z', 1.0, 1, 0, 0);
  a.ventana('z', 1.0, 1, -0.75, 0.55);
  a.ventana('z', 1.0, 1, 0.75, 0.55);
  a.puerta('z', 1.0, 1, 0, 1.02, true);
  a.ventana('z', 1.0, 1, -0.75, 1.55);
  a.ventana('z', 1.0, 1, 0.75, 1.55);
  a.ventana('x', 1.2, 1, 0, 0.55);
  a.ventana('x', 1.2, 1, 0, 1.55);
  a.aplique('z', 1.0, 1, 0.36, 0.5);
  for (const x of [-1.4, -0.47, 0.47, 1.4]) {
    a.colgante(x, 1.5);
    a.colgante(x, -1.5);
  }
  for (const x of [-1.62, 1.62]) {
    a.colgante(x, 0.95);
    a.colgante(x, -0.95);
  }
  a.luz(0, 1.6, 1.3, 1.5);
  a.luz(0.36, 0.6, 1.3, 1.8);
  a.luz(0, 0.85, 1.25, 1.8);
  a.luz(0, 1.5, -1.6, 1.4);
  return a.m;
}

const CONSTRUCTORES: Record<TipoCasa, () => ModeloCasa3D> = {
  enL: casaEnL,
  alFrente: casaAlFrente,
  azotea: casaAzotea,
  chalet: casaChalet,
};

const cache = new Map<TipoCasa, ModeloCasa3D>();

/** El modelo de una casa. Se arma una vez por tipo y se reutiliza. */
export function modeloCasa(tipo: TipoCasa): ModeloCasa3D {
  let m = cache.get(tipo);
  if (!m) {
    m = CONSTRUCTORES[tipo]();
    cache.set(tipo, m);
  }
  return m;
}

/**
 * Cuanto se agranda la casa respecto de la propuesta: a escala 1 un caballo
 * le llegaba casi al techo del segundo piso.
 */
export const ESCALA_CASA = 1.2;
