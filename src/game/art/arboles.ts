/**
 * Arboles.
 *
 * No salen de un sprite extruido como el resto de los objetos: un arbol
 * visto de frente y estirado hacia atras queda como un cartel. Se arman
 * con cajas en unidades de mundo, con el pie en el origen, igual que la
 * farola, y asi tienen volumen desde cualquier angulo de la camara.
 *
 * La copa cambia con la estacion: verde claro en primavera, oscuro en
 * verano, dorada en otoño y pelada en invierno. El tronco, no: la madera
 * es la misma todo el año.
 *
 * El ruido de cada arbol sale de su posicion, no de Math.random: dos
 * arboles vecinos tienen que verse distintos, pero el mismo arbol tiene
 * que verse igual cada vez que se reconstruye el mundo.
 */

import type { Caja } from './voxel';
import type { Estacion } from '../../state/estaciones';

export type TipoArbol = 'roble' | 'pino' | 'sauce' | 'cerezo';

/** Los cuatro, en el orden en que se muestran. */
export const TIPOS_ARBOL: TipoArbol[] = ['roble', 'pino', 'sauce', 'cerezo'];

const CORTEZA = '#6b4a2f';
const CORTEZA_OSCURA = '#54371f';
const RAMA_PELADA = '#5c4530';
/** La nieve que se junta en las ramas peladas. */
const NIEVE = '#e8eef2';

/** Los tres verdes de cada copa, por estacion. En invierno no hay copa. */
const FOLLAJE: Record<TipoArbol, Record<Estacion, string[]>> = {
  roble: {
    primavera: ['#5fb04a', '#6fc257', '#4e9a3c'],
    verano: ['#3f8f32', '#4c9f3d', '#357a2a'],
    otono: ['#c98a2e', '#d8a03c', '#a86b1e'],
    invierno: ['#4a6a44', '#567650', '#3e5a3a'],
  },
  pino: {
    primavera: ['#2f7a46', '#3a8c52', '#27653a'],
    verano: ['#27693c', '#2f7a46', '#1f5631'],
    otono: ['#2a6b42', '#357a4c', '#215638'],
    invierno: ['#2a5c3c', '#346a46', '#214b31'],
  },
  sauce: {
    primavera: ['#8fc45a', '#9ed268', '#7aae49'],
    verano: ['#78b04a', '#88bf59', '#649a3c'],
    otono: ['#d6c24a', '#e2d05c', '#b8a037'],
    invierno: ['#6a7a52', '#76875d', '#5a6a46'],
  },
  cerezo: {
    primavera: ['#f2a8c8', '#ffbcd6', '#dd8db0'],
    verano: ['#5aa84a', '#69b858', '#4a903c'],
    otono: ['#d8798a', '#e68c9c', '#b85f72'],
    invierno: ['#8a6a74', '#9a7a84', '#755a62'],
  },
};

/** Hash estable: la misma celda da siempre el mismo arbol. */
function ruido(semilla: number): number {
  let h = Math.imul(semilla ^ 0x27d4eb2d, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x9e3779b1);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function tronco(alto: number, grosor: number, color = CORTEZA): Caja[] {
  return [
    { x: -grosor / 2, y: 0, z: -grosor / 2, ancho: grosor, alto, fondo: grosor, color },
    // Raiz: un escalon mas ancho al ras del suelo, para que no parezca clavado.
    {
      x: -grosor / 2 - 0.05,
      y: 0,
      z: -grosor / 2 - 0.05,
      ancho: grosor + 0.1,
      alto: 0.12,
      fondo: grosor + 0.1,
      color: CORTEZA_OSCURA,
    },
  ];
}

/**
 * Una copa redondeada: capas de cubos que se angostan arriba y abajo. El
 * resultado no es una esfera perfecta a proposito, que seria de plastico.
 */
function copaRedonda(
  base: number,
  radio: number,
  colores: string[],
  semilla: number,
  capas = 4,
): Caja[] {
  const cajas: Caja[] = [];
  const paso = 0.28;

  for (let capa = 0; capa < capas; capa++) {
    // Mas angosta en la primera y en la ultima: eso es lo que la redondea.
    const k = capa === 0 || capa === capas - 1 ? 0.62 : 1;
    const r = radio * k;
    const y = base + capa * paso;
    const cubos = Math.max(2, Math.round(r / 0.26));

    for (let i = 0; i < cubos * 4; i++) {
      const n = ruido(semilla + capa * 31 + i * 7);
      const angulo = (i / (cubos * 4)) * Math.PI * 2 + n * 0.4;
      const distancia = r * (0.45 + ruido(semilla + i * 13 + capa) * 0.55);
      const lado = 0.24 + n * 0.14;

      cajas.push({
        x: Math.cos(angulo) * distancia - lado / 2,
        y: y + (n - 0.5) * 0.1,
        z: Math.sin(angulo) * distancia - lado / 2,
        ancho: lado,
        alto: lado,
        fondo: lado,
        color: colores[Math.floor(n * colores.length) % colores.length],
      });
    }
  }
  return cajas;
}

/**
 * Copa conica: faldones que se achican hacia arriba, cada uno mas chato
 * que alto. El escalon entre faldon y faldon es lo que lee como pino; con
 * capas del mismo ancho queda una columna verde.
 */
function copaConica(base: number, radio: number, colores: string[], semilla: number): Caja[] {
  const cajas: Caja[] = [];
  const capas = 5;
  const altoFaldon = 0.34;

  for (let capa = 0; capa < capas; capa++) {
    const r = radio * (1 - capa * 0.19);
    // Cada faldon arranca un poco antes de que termine el anterior: sin ese
    // solape se ven las rendijas entre capas.
    const y = base + capa * (altoFaldon * 0.78);
    const cubos = Math.max(1, Math.round(r / 0.2));

    for (let i = -cubos; i <= cubos; i++) {
      for (let j = -cubos; j <= cubos; j++) {
        if (Math.hypot(i, j) > cubos + 0.25) continue;
        const n = ruido(semilla + capa * 17 + i * 101 + j * 7);
        const lado = 0.22;
        const borde = Math.hypot(i, j) > cubos - 0.6;

        cajas.push({
          x: i * 0.2 - lado / 2,
          y: y + (n - 0.5) * 0.05,
          // El borde del faldon cae un poco: le da el filo de las ramas.
          alto: borde ? altoFaldon * 0.6 : altoFaldon,
          z: j * 0.2 - lado / 2,
          ancho: lado,
          fondo: lado,
          color: colores[Math.floor(n * colores.length) % colores.length],
        });
      }
    }
  }

  // La punta.
  cajas.push({
    x: -0.09,
    y: base + capas * (altoFaldon * 0.78),
    z: -0.09,
    ancho: 0.18,
    alto: 0.3,
    fondo: 0.18,
    color: colores[2],
  });
  return cajas;
}

/** Ramas que caen: lo que hace que un sauce sea un sauce. */
function cortina(base: number, radio: number, colores: string[], semilla: number): Caja[] {
  const cajas: Caja[] = [];
  const cuantas = 14;

  for (let i = 0; i < cuantas; i++) {
    const n = ruido(semilla + i * 23);
    const angulo = (i / cuantas) * Math.PI * 2 + n * 0.3;
    const distancia = radio * (0.7 + n * 0.35);
    const largo = 0.5 + n * 0.7;

    cajas.push({
      x: Math.cos(angulo) * distancia - 0.09,
      y: base - largo,
      z: Math.sin(angulo) * distancia - 0.09,
      ancho: 0.18,
      alto: largo,
      fondo: 0.18,
      color: colores[Math.floor(n * colores.length) % colores.length],
    });
  }
  return cajas;
}

/**
 * Ramas peladas del invierno, para los que pierden la hoja.
 *
 * Cada rama es una escalerita de cubos que sale del tronco y sube. Con una
 * sola caja larga por rama quedaba una placa plana, que desde arriba se
 * veia como una mesa y no como un arbol sin hojas.
 */
function ramasDesnudas(base: number, radio: number, semilla: number): Caja[] {
  const cajas: Caja[] = [];
  const ramas = 6;

  for (let i = 0; i < ramas; i++) {
    const n = ruido(semilla + i * 41);
    const angulo = (i / ramas) * Math.PI * 2 + n * 0.8;
    const tramos = 3 + Math.floor(n * 2);

    for (let t = 1; t <= tramos; t++) {
      // Cada tramo sale un poco mas y sube un poco mas: eso la curva.
      const distancia = (radio * 0.9 * t) / tramos;
      const lado = 0.17 - t * 0.02;
      cajas.push({
        x: Math.cos(angulo) * distancia - lado / 2,
        y: base + t * 0.17 + n * 0.1,
        z: Math.sin(angulo) * distancia - lado / 2,
        ancho: lado,
        alto: lado,
        fondo: lado,
        color: RAMA_PELADA,
      });
    }

    // Un poco de nieve en la punta de algunas ramas.
    if (n > 0.55) {
      const distancia = radio * 0.9;
      cajas.push({
        x: Math.cos(angulo) * distancia - 0.07,
        y: base + tramos * 0.17 + n * 0.1 + 0.1,
        z: Math.sin(angulo) * distancia - 0.07,
        ancho: 0.14,
        alto: 0.08,
        fondo: 0.14,
        color: NIEVE,
      });
    }
  }
  return cajas;
}

/**
 * Las cajas de un arbol, listas para extruir. `semilla` hace que dos
 * arboles del mismo tipo no salgan calcados.
 */
export function cajasArbol(tipo: TipoArbol, estacion: Estacion, semilla = 0): Caja[] {
  const colores = FOLLAJE[tipo][estacion];
  const pelado = estacion === 'invierno' && tipo !== 'pino';

  switch (tipo) {
    case 'pino': {
      // El unico que no cambia con la estacion: por algo es perenne.
      return [...tronco(0.85, 0.24, CORTEZA_OSCURA), ...copaConica(0.55, 0.78, colores, semilla)];
    }

    case 'sauce': {
      const base = [...tronco(1.5, 0.3)];
      if (pelado) return [...base, ...ramasDesnudas(1.45, 1.1, semilla)];
      return [
        ...base,
        ...copaRedonda(1.35, 0.78, colores, semilla, 3),
        ...cortina(1.45, 0.72, colores, semilla + 5),
      ];
    }

    case 'cerezo': {
      const base = [...tronco(1.25, 0.24)];
      if (pelado) return [...base, ...ramasDesnudas(1.2, 0.95, semilla)];
      return [...base, ...copaRedonda(1.15, 0.68, colores, semilla, 4)];
    }

    default: {
      // Roble: tronco grueso y copa ancha.
      const base = [...tronco(1.35, 0.34)];
      if (pelado) return [...base, ...ramasDesnudas(1.25, 1.15, semilla)];
      return [...base, ...copaRedonda(1.2, 0.85, colores, semilla, 5)];
    }
  }
}

/** Altura aproximada, para saber donde ponerle la sombra o un pajaro. */
export const ALTURA_ARBOL: Record<TipoArbol, number> = {
  roble: 2.5,
  pino: 2.4,
  sauce: 2.4,
  cerezo: 2.3,
};
