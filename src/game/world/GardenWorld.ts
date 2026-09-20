import * as THREE from 'three';
import { plotToTile, tileToWorld } from '../../state/config';
import { ANIMAL_SPECIES } from '../../state/content';
import { stageOf } from '../../state/sim';
import { useGame } from '../../state/store';
import type { GameState } from '../../state/types';
import {
  texturaAnimal,
  texturaComida,
  texturaFlor,
  texturaSeleccion,
} from '../art/gameTextures';
import { EventBus } from '../EventBus';
import { AnimalMesh } from './AnimalMesh';
import { Effects } from './Effects';
import { Engine } from './Engine';
import { GrassField } from './GrassField';
import { Lighting } from './Lighting';
import { PlantMesh } from './PlantMesh';
import { Sky } from './Sky';
import { ALTURA_BANCAL, Terrain } from './Terrain';

/** Cada cuanto se persiste la posicion de los animales. */
const GUARDAR_POSICIONES_CADA = 4;

/**
 * Orquestador del mundo 3D.
 *
 * Conecta el estado del juego con lo que se ve: escucha el store, reconcilia
 * mallas, traduce clics a acciones y dibuja los efectos que pide el HUD.
 */
export class GardenWorld {
  readonly engine: Engine;
  readonly terreno: Terrain;
  readonly luces: Lighting;
  readonly efectos: Effects;
  readonly cielo: Sky;
  readonly pasto: GrassField;

  private plantas = new Map<number, PlantMesh>();
  private animales = new Map<string, AnimalMesh>();

  private seleccion: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private puntero = new THREE.Vector2();

  private desuscribir: Array<() => void> = [];
  private tiempo = 0;
  private acumuladorPosiciones = 0;

  constructor(contenedor: HTMLElement) {
    this.engine = new Engine(contenedor);

    this.terreno = new Terrain();
    this.engine.escena.add(this.terreno.grupo);

    this.luces = new Lighting(this.engine.escena, this.terreno.posicionFarol);

    this.cielo = new Sky();
    this.engine.escena.add(this.cielo.grupo);

    this.pasto = new GrassField();
    this.engine.escena.add(this.pasto.malla);

    this.efectos = new Effects();
    this.engine.escena.add(this.efectos.grupo);

    /* Marco que sigue a la parcela bajo el cursor. */
    const geoSeleccion = new THREE.PlaneGeometry(1, 1);
    geoSeleccion.rotateX(-Math.PI / 2);
    this.seleccion = new THREE.Mesh(
      geoSeleccion,
      new THREE.MeshBasicMaterial({
        map: texturaSeleccion(),
        transparent: true,
        depthWrite: false,
      }),
    );
    this.seleccion.position.y = ALTURA_BANCAL + 0.01;
    this.seleccion.visible = false;
    this.engine.escena.add(this.seleccion);

    this.conectarEntrada(contenedor);
    this.conectarEventos();
    this.conectarStore();

    this.sincronizar(useGame.getState().estado);

    this.desuscribir.push(this.engine.enCadaFrame((dt) => this.update(dt)));
    this.engine.arrancar();

    if (import.meta.env.DEV) {
      // Handle de desarrollo: permite inspeccionar luces y camara desde la consola.
      (window as unknown as Record<string, unknown>).__mundo = this;
    }
  }

  /* ---------------------------------------------------------------- */
  /* Entrada                                                           */
  /* ---------------------------------------------------------------- */

  private conectarEntrada(contenedor: HTMLElement): void {
    const aNDC = (evento: PointerEvent) => {
      const caja = contenedor.getBoundingClientRect();
      this.puntero.set(
        ((evento.clientX - caja.left) / caja.width) * 2 - 1,
        -((evento.clientY - caja.top) / caja.height) * 2 + 1,
      );
    };

    const alMover = (evento: PointerEvent) => {
      aNDC(evento);
      const parcela = this.parcelaBajoPuntero();
      if (parcela === null) {
        this.seleccion.visible = false;
        contenedor.style.cursor = this.animalBajoPuntero() ? 'pointer' : 'default';
        return;
      }
      const { col, row } = plotToTile(parcela);
      const { x, z } = tileToWorld(col, row);
      this.seleccion.position.set(x, ALTURA_BANCAL + 0.01, z);
      this.seleccion.visible = true;
      contenedor.style.cursor = 'pointer';
    };

    const alTocar = (evento: PointerEvent) => {
      aNDC(evento);
      // Los animales tienen prioridad: estan por encima del bancal.
      const uid = this.animalBajoPuntero();
      if (uid) {
        EventBus.emit('animal:click', { uid });
        return;
      }
      const parcela = this.parcelaBajoPuntero();
      if (parcela !== null) EventBus.emit('parcela:click', { index: parcela });
    };

    const alSalir = () => {
      this.seleccion.visible = false;
    };

    contenedor.addEventListener('pointermove', alMover);
    contenedor.addEventListener('pointerdown', alTocar);
    contenedor.addEventListener('pointerleave', alSalir);

    this.desuscribir.push(() => {
      contenedor.removeEventListener('pointermove', alMover);
      contenedor.removeEventListener('pointerdown', alTocar);
      contenedor.removeEventListener('pointerleave', alSalir);
    });

    const alTeclear = (e: KeyboardEvent) => {
      // Sin esto, escribir "que" en el nombre de un animal giraria el jardin.
      const foco = document.activeElement;
      if (
        foco instanceof HTMLInputElement ||
        foco instanceof HTMLTextAreaElement ||
        (foco instanceof HTMLElement && foco.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'q' || e.key === 'Q') this.engine.rotar(-1);
      if (e.key === 'e' || e.key === 'E') this.engine.rotar(1);
    };
    window.addEventListener('keydown', alTeclear);
    this.desuscribir.push(() => window.removeEventListener('keydown', alTeclear));
  }

  private parcelaBajoPuntero(): number | null {
    this.raycaster.setFromCamera(this.puntero, this.engine.camara);
    const golpes = this.raycaster.intersectObjects(this.terreno.parcelas, false);
    const indice = golpes[0]?.object.userData.parcela;
    return typeof indice === 'number' ? indice : null;
  }

  private animalBajoPuntero(): string | null {
    this.raycaster.setFromCamera(this.puntero, this.engine.camara);
    const cuerpos = [...this.animales.values()].map((a) => a.cuerpo);
    const golpes = this.raycaster.intersectObjects(cuerpos, false);
    const uid = golpes[0]?.object.userData.animal;
    return typeof uid === 'string' ? uid : null;
  }

  /* ---------------------------------------------------------------- */
  /* Sincronizacion                                                    */
  /* ---------------------------------------------------------------- */

  private conectarStore(): void {
    this.desuscribir.push(
      useGame.subscribe((s, prev) => {
        if (s.estado !== prev.estado) this.sincronizar(s.estado);
      }),
    );
  }

  private sincronizar(estado: GameState): void {
    /* --- Parcelas y plantas --- */
    for (const parcela of estado.parcelas) {
      const planta = parcela.planta;
      this.terreno.setHumedad(parcela.index, Boolean(planta && planta.humedad > 0.35));

      const malla = this.plantas.get(parcela.index);

      if (!planta) {
        if (malla) {
          malla.dispose();
          this.plantas.delete(parcela.index);
        }
        continue;
      }

      const textura = texturaFlor(planta.variantId, stageOf(planta));

      if (malla) {
        malla.cambiarTextura(textura);
      } else {
        const { col, row } = plotToTile(parcela.index);
        const { x, z } = tileToWorld(col, row);
        const nueva = new PlantMesh(x, z, textura);
        this.engine.escena.add(nueva.grupo);
        this.plantas.set(parcela.index, nueva);
      }
    }

    /* --- Animales --- */
    const vistos = new Set<string>();
    for (const animal of estado.animales) {
      vistos.add(animal.uid);
      const malla = this.animales.get(animal.uid);

      if (malla) {
        malla.actualizar(animal);
        malla.cambiarTextura(texturaAnimal(animal.variante));
      } else {
        const nueva = new AnimalMesh(
          animal,
          texturaAnimal(animal.variante),
          texturaComida(ANIMAL_SPECIES[animal.especie].comidaFavorita),
        );
        this.engine.escena.add(nueva.grupo);
        this.animales.set(animal.uid, nueva);
        // Aparece con una nubecita: se nota que llegó alguien.
        this.efectos.emitir({
          x: animal.x, y: 0.2, z: animal.z,
          cantidad: 10, colores: ['#ffffff', '#dbe8d8'],
          velocidad: 1.2, empuje: 1, vida: 0.5, escala: 0.07,
        });
      }
    }

    for (const [uid, malla] of this.animales) {
      if (!vistos.has(uid)) {
        malla.dispose();
        this.animales.delete(uid);
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Efectos                                                           */
  /* ---------------------------------------------------------------- */

  private centroParcela(index: number): { x: number; z: number } {
    const { col, row } = plotToTile(index);
    return tileToWorld(col, row);
  }

  private conectarEventos(): void {
    this.desuscribir.push(
      EventBus.on('camara:rotar', ({ dir }) => this.engine.rotar(dir)),

      EventBus.on('efecto:plantar', ({ index }) => {
        const { x, z } = this.centroParcela(index);
        this.efectos.emitir({
          x, y: ALTURA_BANCAL, z,
          cantidad: 12, colores: ['#8a6238', '#6b4a2e', '#a3763f'],
          velocidad: 1.3, empuje: 1.5, vida: 0.6,
        });
      }),

      EventBus.on('efecto:regar', ({ index }) => {
        const { x, z } = this.centroParcela(index);
        this.efectos.emitir({
          x, y: ALTURA_BANCAL + 0.9, z,
          cantidad: 14, colores: ['#9fd8f5', '#5bb4e8', '#8ec5ff'],
          velocidad: 0.7, empuje: -0.4, gravedad: 7, vida: 0.7, escala: 0.07,
        });
      }),

      EventBus.on('efecto:regarTodo', () => {
        for (let i = 0; i < 32; i++) {
          const { x, z } = this.centroParcela(i);
          this.efectos.emitir({
            x, y: ALTURA_BANCAL + 0.9, z,
            cantidad: 4, colores: ['#9fd8f5', '#5bb4e8'],
            velocidad: 0.5, empuje: -0.3, gravedad: 7, vida: 0.6, escala: 0.06,
          });
        }
      }),

      EventBus.on('efecto:cosechar', ({ index, color }) => {
        const { x, z } = this.centroParcela(index);
        this.efectos.emitir({
          x, y: ALTURA_BANCAL + 0.6, z,
          cantidad: 20, colores: [color, '#fff3c4', '#ffd447'],
          velocidad: 2.2, empuje: 2.4, vida: 0.9, escala: 0.1,
        });
      }),

      EventBus.on('efecto:mimar', ({ uid }) => {
        const malla = this.animales.get(uid);
        if (!malla) return;
        malla.celebrar();
        this.efectos.emitirCorazones(malla.x, 1, malla.z, 3);
      }),

      EventBus.on('efecto:comer', ({ uid }) => {
        const malla = this.animales.get(uid);
        if (!malla) return;
        malla.comer();
        this.efectos.emitir({
          x: malla.x, y: 0.3, z: malla.z,
          cantidad: 7, colores: ['#e8c87a', '#c98a12'],
          velocidad: 0.9, empuje: 1, vida: 0.5, escala: 0.06,
        });
      }),

      EventBus.on('efecto:adoptar', ({ uid }) => {
        const malla = this.animales.get(uid);
        if (!malla) return;
        malla.girarDeAlegria();
        this.efectos.emitirCorazones(malla.x, 1.1, malla.z, 10);
      }),

      EventBus.on('mundo:resincronizar', () => this.sincronizar(useGame.getState().estado)),
    );
  }

  /* ---------------------------------------------------------------- */
  /* Bucle                                                             */
  /* ---------------------------------------------------------------- */

  private update(dt: number): void {
    this.tiempo += dt;

    this.luces.actualizar();
    this.terreno.actualizar(dt);
    this.pasto.update(dt);
    this.cielo.actualizar(
      dt,
      this.engine.camara,
      this.engine.camara.right,
      this.engine.camara.top,
      this.luces.noche,
      this.luces.faseDia,
      this.luces.cieloArriba,
      this.luces.cieloAbajo,
    );

    for (const planta of this.plantas.values()) planta.update(dt);
    for (const animal of this.animales.values()) animal.update(dt, this.engine.camara);

    this.efectos.update(dt, this.luces.noche, this.tiempo);

    this.acumuladorPosiciones += dt;
    if (this.acumuladorPosiciones > GUARDAR_POSICIONES_CADA) {
      this.acumuladorPosiciones = 0;
      const mover = useGame.getState().moverAnimal;
      for (const animal of this.animales.values()) mover(animal.uid, animal.x, animal.z);
    }
  }

  destruir(): void {
    for (const off of this.desuscribir) off();
    this.desuscribir = [];
    for (const planta of this.plantas.values()) planta.dispose();
    for (const animal of this.animales.values()) animal.dispose();
    this.plantas.clear();
    this.animales.clear();
    this.engine.destruir();
  }
}
