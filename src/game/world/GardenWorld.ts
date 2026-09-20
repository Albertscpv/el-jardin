import * as THREE from 'three';
import { celdaAMundo, celdaId, parseCeldaId } from '../../state/config';
import { ANIMAL_SPECIES } from '../../state/content';
import { celdasExpandibles, celdaEnMundo, limitesMundo } from '../../state/islas';
import { stageOf } from '../../state/sim';
import { useGame } from '../../state/store';
import type { GameState, IslaState } from '../../state/types';
import { texturaAnimal, texturaComida, texturaFlor, texturaSeleccion } from '../art/gameTextures';
import { EventBus } from '../EventBus';
import { AnimalMesh } from './AnimalMesh';
import { AvatarMesh } from './AvatarMesh';
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

  private plantas = new Map<string, PlantMesh>();
  private animales = new Map<string, AnimalMesh>();
  private avatar: AvatarMesh;

  private seleccion: THREE.Mesh;
  private fantasmas: THREE.Mesh[] = [];
  private grupoFantasmas = new THREE.Group();
  private materialFantasma: THREE.MeshLambertMaterial;

  private raycaster = new THREE.Raycaster();
  private puntero = new THREE.Vector2();
  private contenedor: HTMLElement;

  private desuscribir: Array<() => void> = [];
  private islasVistas: IslaState[] | null = null;
  private herramientaVista: string | null = null;
  private tiempo = 0;
  private acumuladorPosiciones = 0;

  constructor(contenedor: HTMLElement) {
    this.contenedor = contenedor;
    this.engine = new Engine(contenedor);

    const estado = useGame.getState().estado;

    this.terreno = new Terrain(estado.islas);
    this.engine.escena.add(this.terreno.grupo);

    this.luces = new Lighting(this.engine.escena);
    this.luces.setFaroles(this.terreno.faroles);

    this.cielo = new Sky();
    this.engine.escena.add(this.cielo.grupo);

    this.pasto = new GrassField(estado.islas);
    this.engine.escena.add(this.pasto.grupo);

    this.efectos = new Effects();
    this.engine.escena.add(this.efectos.grupo);

    this.avatar = new AvatarMesh(estado.avatar);
    this.engine.escena.add(this.avatar.grupo);

    /* Marco que sigue a la celda bajo el cursor. */
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
    this.seleccion.visible = false;
    this.engine.escena.add(this.seleccion);

    /* Fantasmas de expansión. */
    this.materialFantasma = new THREE.MeshLambertMaterial({
      color: '#a8e08a',
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    this.engine.escena.add(this.grupoFantasmas);

    this.islasVistas = estado.islas;

    this.conectarEntrada();
    this.conectarEventos();
    this.conectarStore();

    this.sincronizar(estado);
    this.engine.centrar(limitesMundo(estado.islas));

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

  private conectarEntrada(): void {
    const aNDC = (evento: PointerEvent) => {
      const caja = this.contenedor.getBoundingClientRect();
      this.puntero.set(
        ((evento.clientX - caja.left) / caja.width) * 2 - 1,
        -((evento.clientY - caja.top) / caja.height) * 2 + 1,
      );
    };

    // El Engine solo llama a esto cuando el gesto fue un toque, no un giro.
    this.engine.alTocar = (evento) => {
      aNDC(evento);

      if (useGame.getState().herramienta === 'expandir') {
        const fantasma = this.fantasmaBajoPuntero();
        if (fantasma) {
          const { islaId, col, row } = fantasma;
          EventBus.emit('celda:expandir', { islaId, col, row });
          return;
        }
      }

      // Los animales tienen prioridad: están por encima del suelo.
      const uid = this.animalBajoPuntero();
      if (uid) {
        EventBus.emit('animal:click', { uid });
        return;
      }

      const celda = this.celdaBajoPuntero();
      if (celda) EventBus.emit('celda:click', { celda });
    };

    this.engine.alMover = (evento) => {
      aNDC(evento);
      this.actualizarSeleccion();
      this.contenedor.style.cursor =
        this.animalBajoPuntero() || this.celdaBajoPuntero() ? 'pointer' : 'grab';
    };
  }

  private actualizarSeleccion(): void {
    if (useGame.getState().herramienta === 'expandir') {
      const fantasma = this.fantasmaBajoPuntero();
      if (!fantasma) return this.ocultarSeleccion();
      this.seleccion.position.set(fantasma.x, 0.06, fantasma.z);
      this.seleccion.visible = true;
      return;
    }

    const celda = this.celdaBajoPuntero();
    if (!celda) return this.ocultarSeleccion();

    const { islaId, col, row } = parseCeldaId(celda);
    const isla = useGame.getState().estado.islas.find((i) => i.id === islaId);
    if (!isla) return this.ocultarSeleccion();

    const { x, z } = celdaAMundo(isla, col, row);
    const arada = isla.parcelas.includes(`${col},${row}`);
    this.seleccion.position.set(x, (arada ? ALTURA_BANCAL : 0) + 0.02, z);
    this.seleccion.visible = true;
  }

  private ocultarSeleccion(): void {
    this.seleccion.visible = false;
  }

  /** Celda de tierra bajo el cursor, resuelta por el punto de impacto. */
  private celdaBajoPuntero(): string | null {
    this.raycaster.setFromCamera(this.puntero, this.engine.camara);

    const objetivos = [...this.terreno.parcelas.values(), ...this.terreno.suelo];
    const golpes = this.raycaster.intersectObjects(objetivos, false);
    const golpe = golpes[0];
    if (!golpe) return null;

    // Una parcela arada sabe quién es; para el césped se deduce del punto.
    const propia = golpe.object.userData.celda;
    if (typeof propia === 'string') return propia;

    const { islas } = useGame.getState().estado;
    const encontrada = celdaEnMundo(islas, golpe.point.x, golpe.point.z);
    if (!encontrada) return null;
    return celdaId(encontrada.isla.id, encontrada.col, encontrada.row);
  }

  private animalBajoPuntero(): string | null {
    this.raycaster.setFromCamera(this.puntero, this.engine.camara);
    const cuerpos = [...this.animales.values()].map((a) => a.cuerpo);
    const golpes = this.raycaster.intersectObjects(cuerpos, false);
    const uid = golpes[0]?.object.userData.animal;
    return typeof uid === 'string' ? uid : null;
  }

  private fantasmaBajoPuntero():
    | { islaId: string; col: number; row: number; x: number; z: number }
    | null {
    this.raycaster.setFromCamera(this.puntero, this.engine.camara);
    const golpes = this.raycaster.intersectObjects(this.fantasmas, false);
    const datos = golpes[0]?.object.userData;
    if (!datos || typeof datos.islaId !== 'string') return null;
    return datos as { islaId: string; col: number; row: number; x: number; z: number };
  }

  /* ---------------------------------------------------------------- */
  /* Sincronizacion                                                    */
  /* ---------------------------------------------------------------- */

  private conectarStore(): void {
    this.desuscribir.push(
      useGame.subscribe((s, prev) => {
        if (s.estado !== prev.estado) this.sincronizar(s.estado);
        if (s.herramienta !== prev.herramienta) this.sincronizarFantasmas(s.estado);
      }),
    );
  }

  private sincronizar(estado: GameState): void {
    /* --- Territorio: se rehace solo si cambió la forma de las islas --- */
    if (estado.islas !== this.islasVistas) {
      this.islasVistas = estado.islas;
      this.terreno.reconstruir(estado.islas);
      this.pasto.reconstruir(estado.islas);
      this.luces.setFaroles(this.terreno.faroles);
      this.sincronizarFantasmas(estado);
    }

    /* --- Cultivos --- */
    const vistas = new Set<string>();
    for (const [id, planta] of Object.entries(estado.cultivos)) {
      vistas.add(id);
      this.terreno.setHumedad(id, planta.humedad > 0.35);

      const textura = texturaFlor(planta.variantId, stageOf(planta));
      const malla = this.plantas.get(id);

      if (malla) {
        malla.cambiarTextura(textura);
      } else {
        const { islaId, col, row } = parseCeldaId(id);
        const isla = estado.islas.find((i) => i.id === islaId);
        if (!isla) continue;
        const { x, z } = celdaAMundo(isla, col, row);
        const nueva = new PlantMesh(x, z, textura);
        this.engine.escena.add(nueva.grupo);
        this.plantas.set(id, nueva);
      }
    }
    for (const [id, malla] of this.plantas) {
      if (!vistas.has(id)) {
        malla.dispose();
        this.plantas.delete(id);
        this.terreno.setHumedad(id, false);
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

    /* --- Personaje --- */
    this.avatar.aplicarAspecto(estado.avatar);
    this.avatar.irA(estado.avatar.x, estado.avatar.z);
  }

  /** Cubos translúcidos sobre cada celda donde se puede ganar terreno. */
  private sincronizarFantasmas(estado: GameState): void {
    const herramienta = useGame.getState().herramienta;
    if (herramienta === this.herramientaVista && this.fantasmas.length > 0) {
      if (herramienta !== 'expandir') return;
    }
    this.herramientaVista = herramienta;

    for (const malla of this.fantasmas) {
      this.grupoFantasmas.remove(malla);
      malla.geometry.dispose();
    }
    this.fantasmas = [];

    if (herramienta !== 'expandir') return;

    // Algo mas altos que el cesped: tienen que leerse como una invitacion
    // flotando sobre el vacio, no como un parche del suelo.
    const geo = new THREE.BoxGeometry(0.9, 0.22, 0.9);
    for (const isla of estado.islas) {
      for (const { col, row } of celdasExpandibles(isla)) {
        const { x, z } = celdaAMundo(isla, col, row);
        const malla = new THREE.Mesh(geo.clone(), this.materialFantasma);
        malla.position.set(x, 0.02, z);
        malla.userData = { islaId: isla.id, col, row, x, z };
        this.grupoFantasmas.add(malla);
        this.fantasmas.push(malla);
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Efectos                                                           */
  /* ---------------------------------------------------------------- */

  private posicionDeCelda(id: string): { x: number; z: number } | null {
    const { islaId, col, row } = parseCeldaId(id);
    const isla = useGame.getState().estado.islas.find((i) => i.id === islaId);
    return isla ? celdaAMundo(isla, col, row) : null;
  }

  private conectarEventos(): void {
    this.desuscribir.push(
      EventBus.on('camara:centrar', () => {
        this.engine.centrar(limitesMundo(useGame.getState().estado.islas));
      }),

      EventBus.on('camara:mirar', ({ x, z }) => this.engine.mirar(x, z)),
      EventBus.on('camara:zoom', ({ delta }) => this.engine.aplicarZoom(delta)),
      EventBus.on('avatar:cambio', () => this.avatar.aplicarAspecto(useGame.getState().estado.avatar)),

      EventBus.on('efecto:plantar', ({ celda }) => {
        const p = this.posicionDeCelda(celda);
        if (!p) return;
        this.efectos.emitir({
          x: p.x, y: ALTURA_BANCAL, z: p.z,
          cantidad: 12, colores: ['#8a6238', '#6b4a2e', '#a3763f'],
          velocidad: 1.3, empuje: 1.5, vida: 0.6,
        });
      }),

      EventBus.on('efecto:expandir', ({ celda }) => {
        const p = this.posicionDeCelda(celda);
        if (!p) return;
        this.efectos.emitir({
          x: p.x, y: 0.2, z: p.z,
          cantidad: 22, colores: ['#7fd18a', '#5fa14a', '#e8d8b0'],
          velocidad: 1.8, empuje: 2.2, vida: 0.9,
        });
      }),

      EventBus.on('efecto:regar', ({ celda }) => {
        const p = this.posicionDeCelda(celda);
        if (!p) return;
        this.efectos.emitir({
          x: p.x, y: ALTURA_BANCAL + 0.9, z: p.z,
          cantidad: 14, colores: ['#9fd8f5', '#5bb4e8', '#8ec5ff'],
          velocidad: 0.7, empuje: -0.4, gravedad: 7, vida: 0.7, escala: 0.07,
        });
      }),

      EventBus.on('efecto:regarTodo', () => {
        const estado = useGame.getState().estado;
        let n = 0;
        for (const id of Object.keys(estado.cultivos)) {
          const p = this.posicionDeCelda(id);
          if (!p || n++ > 40) continue;
          this.efectos.emitir({
            x: p.x, y: ALTURA_BANCAL + 0.9, z: p.z,
            cantidad: 4, colores: ['#9fd8f5', '#5bb4e8'],
            velocidad: 0.5, empuje: -0.3, gravedad: 7, vida: 0.6, escala: 0.06,
          });
        }
      }),

      EventBus.on('efecto:cosechar', ({ celda, color }) => {
        const p = this.posicionDeCelda(celda);
        if (!p) return;
        this.efectos.emitir({
          x: p.x, y: ALTURA_BANCAL + 0.6, z: p.z,
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

      EventBus.on('mundo:resincronizar', () => {
        const estado = useGame.getState().estado;
        // Fuerza la reconstrucción del terreno aunque la referencia coincida.
        this.islasVistas = null;
        this.sincronizar(estado);
        this.engine.centrar(limitesMundo(estado.islas));
      }),
    );
  }

  /* ---------------------------------------------------------------- */
  /* Bucle                                                             */
  /* ---------------------------------------------------------------- */

  private update(dt: number): void {
    this.tiempo += dt;

    // Las sombras se concentran donde mira la cámara: un solo mapa no alcanza
    // para varias islas repartidas por el mundo.
    this.luces.centroSombras.copy(this.engine.camara.position);
    this.luces.centroSombras.y = 0;
    this.luces.actualizar();

    this.terreno.actualizar(dt);
    this.pasto.update(dt);

    for (const planta of this.plantas.values()) planta.update(dt);
    for (const animal of this.animales.values()) animal.update(dt, this.engine.camara);
    this.avatar.update(dt, this.engine.camara);

    this.efectos.update(dt, this.luces.noche, this.tiempo);

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

    // Los fantasmas laten para que se lean como una invitación y no como suelo.
    if (this.fantasmas.length > 0) {
      this.materialFantasma.opacity = 0.44 + Math.sin(this.tiempo * 2.6) * 0.16;
    }

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
    this.avatar.dispose();
    this.terreno.dispose();
    this.plantas.clear();
    this.animales.clear();
    this.engine.destruir();
  }
}
