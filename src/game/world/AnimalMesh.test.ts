import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearEstadoInicial, crearVisitante } from '../../state/sim';
import type { AnimalSpeciesId } from '../../state/types';
import { AnimalMesh } from './AnimalMesh';

/**
 * El movimiento de los animales se prueba sin WebGL: AnimalMesh solo usa
 * mallas y materiales, que existen sin renderer. Asi se puede avanzar el
 * reloj a mano y mirar que textura muestra en cada momento.
 */

const camara = new THREE.PerspectiveCamera();
camara.position.set(20, 20, 20);
camara.lookAt(0, 0, 0);

/** Texturas con nombre, para poder decir cual se esta mostrando. */
function textura(nombre: string): THREE.Texture {
  const t = new THREE.Texture();
  t.name = nombre;
  return t;
}

function crear(especie: AnimalSpeciesId, conPoses: boolean, destinos: () => { x: number; z: number }) {
  const estado = { ...crearVisitante(especie, crearEstadoInicial()), x: 0, z: 0 };
  const poses = conPoses
    ? { paso: [0, 1, 2, 3].map((i) => textura(`paso${i}`)), pastar: textura('pastar') }
    : null;
  const malla = new AnimalMesh(estado, textura('quieto'), textura('comida'), destinos, poses);
  const material = malla.cuerpo.material as THREE.MeshLambertMaterial;
  return { malla, visto: () => material.map?.name };
}

/** Avanza la simulacion y junta las texturas que se vieron. */
function correr(malla: AnimalMesh, visto: () => string | undefined, segundos: number) {
  const vistas = new Set<string>();
  for (let t = 0; t < segundos; t += 1 / 60) {
    malla.update(1 / 60, camara);
    const v = visto();
    if (v) vistas.add(v);
  }
  return vistas;
}

afterEach(() => vi.restoreAllMocks());

/** Azar fijo por debajo de toda probabilidad: trota y pasta siempre que puede. */
const siempre = () => vi.spyOn(Math, 'random').mockReturnValue(0.1);

describe('animales con poses', () => {
  it('mueve las patas al caminar: pasa por los cuatro tiempos del paso', () => {
    // Siempre un destino lejano, para que camine todo el tiempo.
    let lado = 1;
    const { malla, visto } = crear('caballo', true, () => ({ x: (lado *= -1) * 6, z: 0 }));
    const vistas = correr(malla, visto, 20);

    for (const i of [0, 1, 2, 3]) expect(vistas).toContain(`paso${i}`);
  });

  it('a veces se queda pastando entre un paseo y otro', () => {
    siempre();
    let n = 0;
    const { malla, visto } = crear('caballo', true, () => ({ x: (n++ % 2) * 3, z: 0 }));
    expect(correr(malla, visto, 90)).toContain('pastar');
  });

  it('en un viaje largo a veces trota: recorre más rápido que al paso', () => {
    siempre();
    // Mide la mayor velocidad alcanzada en muchos viajes largos.
    let lado = 1;
    const { malla } = crear('caballo', true, () => ({ x: (lado *= -1) * 8, z: 0 }));
    const alPaso = 30 / 16;
    let maxima = 0;
    let previo = malla.x;
    for (let t = 0; t < 60; t += 1 / 60) {
      malla.update(1 / 60, camara);
      maxima = Math.max(maxima, Math.abs(malla.x - previo) * 60);
      previo = malla.x;
    }
    expect(maxima).toBeGreaterThan(alPaso * 1.5);
  });

  it('pasea lejos: un caballo cubre mucho más terreno que un conejo', () => {
    const alcance = (especie: AnimalSpeciesId, conPoses: boolean) => {
      const pedidos: number[] = [];
      const buscar = (_x: number, _z: number, radio: number) => {
        pedidos.push(radio);
        return { x: 0, z: 0 };
      };
      const estado = { ...crearVisitante(especie, crearEstadoInicial()), x: 0, z: 0 };
      new AnimalMesh(estado, textura('q'), textura('c'), buscar, conPoses ? {
        paso: [textura('p')], pastar: textura('g'),
      } : null);
      return pedidos[0];
    };
    expect(alcance('caballo', true)).toBeGreaterThan(alcance('conejo', false) * 1.5);
  });
});

describe('animales sin poses', () => {
  it('siguen mostrando su único dibujo y nunca trotan', () => {
    let lado = 1;
    const { malla, visto } = crear('gato', false, () => ({ x: (lado *= -1) * 8, z: 0 }));
    const vistas = correr(malla, visto, 20);
    expect([...vistas]).toEqual(['quieto']);
  });
});

describe('tamaño', () => {
  it('el plano del caballo mide lo que su dibujo, a 16 píxeles por tile', () => {
    const { malla } = crear('caballo', true, () => ({ x: 0, z: 0 }));
    malla.cuerpo.geometry.computeBoundingBox();
    const caja = malla.cuerpo.geometry.boundingBox!;
    expect(caja.max.x - caja.min.x).toBeCloseTo(32 / 16);
    expect(caja.max.y - caja.min.y).toBeCloseTo(28 / 16);
    // Apoyado en el piso, no enterrado a la mitad.
    expect(caja.min.y).toBeCloseTo(0);
  });

  it('un gato conserva su plano de un tile', () => {
    const { malla } = crear('gato', false, () => ({ x: 0, z: 0 }));
    malla.cuerpo.geometry.computeBoundingBox();
    const caja = malla.cuerpo.geometry.boundingBox!;
    expect(caja.max.x - caja.min.x).toBeCloseTo(1);
    expect(caja.max.y - caja.min.y).toBeCloseTo(1);
  });
});
