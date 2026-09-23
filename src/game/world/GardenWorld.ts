import * as THREE from 'three';
import { celdaAMundo, celdaId, parseCeldaId, PERSONAJE_ACTIVO } from '../../state/config';
import { ANIMAL_SPECIES } from '../../state/content';
import {
  celdaCercana,
  celdasExpandibles,
  celdaEnMundo,
  esAgua,

  limitesMundo,
} from '../../state/islas';
import { stageOf } from '../../state/sim';
import { useGame } from '../../state/store';
import type { AnimalSpeciesId, GameState, IslaState } from '../../state/types';
import {
  texturaAnimal,
  texturaComida,
  texturaFlor,
  texturaSeleccion,
  texturasPoses,
} from '../art/gameTextures';
import { EventBus } from '../EventBus';
import { controles } from '../input/Controls';
import { AnimalMesh } from './AnimalMesh';
import { AvatarMesh } from './AvatarMesh';
import { Effects } from './Effects';
import { Engine } from './Engine';
import { GrassField } from './GrassField';
import { Lighting } from './Lighting';
import { PlantMesh } from './PlantMesh';
import { Sky } from './Sky';
import { ALTURA_BANCAL, Terrain } from './Terrain';
import { CapaCasas, ESCALA_FLOR_MACETA } from './Casas';
import { celdasOcupadasPorCasas, esMaceta } from '../../state/casas';
import { celdaAcuaticaCercana } from '../../state/agua';
import type { CasaColocada } from '../../state/types';

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
  private avatar: AvatarMesh | null = null;
  private acumuladorAvatar = 0;

  private seleccion: THREE.Mesh;
  private fantasmas: THREE.Mesh[] = [];
  private grupoFantasmas = new THREE.Group();
  private materialFantasma: THREE.MeshLambertMaterial;

  private raycaster = new THREE.Raycaster();
  private puntero = new THREE.Vector2();
  private contenedor: HTMLElement;

  private desuscribir: Array<() => void> = [];
  private islasVistas: IslaState[] | null = null;
  private casasVistas: CasaColocada[] | undefined | null = null;
  private casas = new CapaCasas();
  /** Celdas bajo una casa: no se pisan. */
  private tapadas: ReadonlySet<string> = new Set();
  private herramientaVista: string | null = null;
  private tiempo = 0;
  private acumuladorPosiciones = 0;

  constructor(contenedor: HTMLElement) {
    this.contenedor = contenedor;
    this.engine = new Engine(contenedor);

    const estado = useGame.getState().estado;

    this.terreno = new Terrain(estado.islas);
    this.engine.escena.add(this.terreno.grupo);
    this.engine.escena.add(this.casas.grupo);

    this.luces = new Lighting(this.engine.escena);
    this.luces.setFaroles(this.terreno.faroles);

    this.cielo = new Sky();
    this.engine.escena.add(this.cielo.grupo);

    this.pasto = new GrassField(estado.islas);
    this.engine.escena.add(this.pasto.grupo);

    this.efectos = new Effects();
    this.engine.escena.add(this.efectos.grupo);

    if (PERSONAJE_ACTIVO) {
      this.avatar = new AvatarMesh(estado.avatar);
      this.engine.escena.add(this.avatar.grupo);
      // Al entrar se señala solo: en un jardín grande, si no, no se lo encuentra.
      this.avatar.senalar();
    }

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
    // WASD y flechas mueven al personaje; sin esto el teclado no llega a nadie.
    if (PERSONAJE_ACTIVO) this.desuscribir.push(controles.conectarTeclado());
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
  /* Suelo                                                             */
  /* ---------------------------------------------------------------- */

  /** Si el personaje puede pararse ahi. El agua y las casas no se pisan. */
  private pisable = (x: number, z: number): boolean => {
    const encontrada = celdaEnMundo(useGame.getState().estado.islas, x, z);
    if (!encontrada) return false;
    const { isla, col, row } = encontrada;
    return !esAgua(isla, col, row) && !this.tapadas.has(celdaId(isla.id, col, row));
  };

  /**
   * Si una casa quedo encima del personaje (la pusieron donde estaba, o es
   * una partida de antes), lo saca a la celda libre mas cercana.
   */
  private rescatarAvatar(): void {
    if (!this.avatar || this.pisable(this.avatar.x, this.avatar.z)) return;
    const { islas } = useGame.getState().estado;
    let mejor: { x: number; z: number; d: number } | null = null;
    for (const isla of islas) {
      for (const local of isla.suelo) {
        const [col, row] = local.split(',').map(Number);
        const x = isla.ox + col + 0.5;
        const z = isla.oz + row + 0.5;
        if (!this.pisable(x, z)) continue;
        const d = Math.hypot(x - this.avatar.x, z - this.avatar.z);
        if (!mejor || d < mejor.d) mejor = { x, z, d };
      }
    }
    if (!mejor) return;
    this.avatar.ubicar(mejor.x, mejor.z);
    useGame.getState().moverAvatar(mejor.x, mejor.z);
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

    // Las farolas entran porque tapan su celda en pantalla. El rayo devuelve
    // primero lo mas cercano a la camara, que es la lampara: tocarla cuenta
    // como tocar la celda donde esta parada.
    const objetivos = [
      ...this.casas.tocables,
      ...this.terreno.tocables,
      ...this.terreno.parcelas.values(),
      ...this.terreno.suelo,
    ];
    const golpes = this.raycaster.intersectObjects(objetivos, false);
    // Las macetas ganan aunque estén detrás de una pared: son chicas, y
    // desde muchos ángulos la casa se las tapa. Si el rayo cruza una, es
    // a ella a la que le apuntaban.
    const golpe =
      golpes.find((gg) => typeof gg.object.userData.celda === 'string' && esMaceta(gg.object.userData.celda)) ??
      golpes[0];
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
    if (estado.islas !== this.islasVistas || estado.casas !== this.casasVistas) {
      this.islasVistas = estado.islas;
      this.casasVistas = estado.casas;
      const tapadas = celdasOcupadasPorCasas(estado);
      this.tapadas = tapadas;
      this.rescatarAvatar();
      this.terreno.reconstruir(estado.islas, tapadas);
      this.pasto.reconstruir(estado.islas, tapadas);
      this.casas.reconstruir(estado.casas ?? [], estado.islas);
      // Las luces de las casas entran al mismo reparto que los faroles, mas suaves.
      this.luces.setFaroles(
        [...this.terreno.faroles, ...this.casas.luces],
        [...this.terreno.faroles.map(() => 1), ...this.casas.fuerzas],
      );
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
        const p = this.posicionDeCelda(id);
        if (!p) continue;
        const nueva = esMaceta(id)
          ? new PlantMesh(p.x, p.z, textura, p.y, ESCALA_FLOR_MACETA)
          : new PlantMesh(p.x, p.z, textura);
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
          this.buscadorDeDestino(animal.especie),
          texturasPoses(animal.variante),
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
    this.avatar?.aplicarAspecto(estado.avatar);
    this.avatar?.irA(estado.avatar.x, estado.avatar.z);
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
        if (celdaEnMundo(estado.islas, x, z)) continue;
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

  /**
   * A donde puede ir a pasear cada especie: los peces no salen del agua,
   * las ranas van del agua a la orilla, y el resto pisa tierra firme.
   */
  private buscadorDeDestino(especie: AnimalSpeciesId) {
    const habitat = ANIMAL_SPECIES[especie].habitat;
    if (!habitat) return (x: number, z: number, radio: number) => this.destinoLibre(x, z, radio);

    return (x: number, z: number, radio: number) => {
      const islas = useGame.getState().estado.islas;
      // Sin agua (la secaron con el pez adentro) se queda donde esta.
      return celdaAcuaticaCercana(islas, x, z, radio, Math.random, habitat === 'orilla') ?? { x, z };
    };
  }

  /** Un destino de paseo que no quede adentro de una casa. */
  private destinoLibre(x: number, z: number, radio: number): { x: number; z: number } {
    const estado = useGame.getState().estado;
    const tapadas = celdasOcupadasPorCasas(estado);
    for (let intento = 0; intento < 6; intento++) {
      const p = celdaCercana(estado.islas, x, z, radio);
      const celda = celdaEnMundo(estado.islas, p.x, p.z);
      if (!celda || !tapadas.has(celdaId(celda.isla.id, celda.col, celda.row))) return p;
    }
    return celdaCercana(estado.islas, x, z, radio);
  }

  /** Donde se apoya lo que crece en una celda o en una maceta. */
  private posicionDeCelda(id: string): { x: number; y: number; z: number } | null {
    if (esMaceta(id)) return this.casas.macetas.get(id) ?? null;
    const { islaId, col, row } = parseCeldaId(id);
    const isla = useGame.getState().estado.islas.find((i) => i.id === islaId);
    if (!isla) return null;
    return { ...celdaAMundo(isla, col, row), y: ALTURA_BANCAL };
  }

  private conectarEventos(): void {
    this.desuscribir.push(
      EventBus.on('camara:centrar', () => {
        this.engine.centrar(limitesMundo(useGame.getState().estado.islas));
      }),

      EventBus.on('camara:mirar', ({ x, z }) => this.engine.mirar(x, z)),

      EventBus.on('camara:zoom', ({ delta }) => this.engine.aplicarZoom(delta)),

      // El personaje reacciona a lo que hace: se agacha al trabajar y festeja.
      EventBus.on('efecto:plantar', () => this.avatar?.reaccionar('trabajo')),
      EventBus.on('efecto:regar', () => this.avatar?.reaccionar('trabajo')),
      EventBus.on('efecto:regarTodo', () => this.avatar?.reaccionar('trabajo')),
      EventBus.on('efecto:comer', () => this.avatar?.reaccionar('trabajo')),
      EventBus.on('efecto:cosechar', () => this.avatar?.reaccionar('festejo')),
      EventBus.on('efecto:adoptar', () => this.avatar?.reaccionar('festejo')),
      EventBus.on('efecto:mimar', () => this.avatar?.reaccionar('festejo')),
      EventBus.on('avatar:senalar', () => this.avatar?.senalar()),
      EventBus.on('avatar:cambio', () =>
        this.avatar?.aplicarAspecto(useGame.getState().estado.avatar),
      ),

      EventBus.on('efecto:plantar', ({ celda }) => {
        const p = this.posicionDeCelda(celda);
        if (!p) return;
        this.efectos.emitir({
          x: p.x, y: p.y, z: p.z,
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
          x: p.x, y: p.y + 0.9, z: p.z,
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
            x: p.x, y: p.y + 0.9, z: p.z,
            cantidad: 4, colores: ['#9fd8f5', '#5bb4e8'],
            velocidad: 0.5, empuje: -0.3, gravedad: 7, vida: 0.6, escala: 0.06,
          });
        }
      }),

      EventBus.on('efecto:cosechar', ({ celda, color }) => {
        const p = this.posicionDeCelda(celda);
        if (!p) return;
        this.efectos.emitir({
          x: p.x, y: p.y + 0.6, z: p.z,
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
        this.casasVistas = null;
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
    this.luces.repartirFaroles(this.engine.foco as THREE.Vector3);
    this.terreno.encenderFarolas(this.luces.noche);
    this.casas.encender(this.luces.noche);

    this.terreno.actualizar(dt);
    this.pasto.update(dt);

    for (const planta of this.plantas.values()) planta.update(dt);
    for (const animal of this.animales.values()) animal.update(dt, this.engine.camara);
    if (this.avatar) {
      this.avatar.update(dt, this.engine.camara, this.pisable);

      // La posicion del personaje se persiste de a ratos, no por frame.
      this.acumuladorAvatar += dt;
      if (this.acumuladorAvatar > 2) {
        this.acumuladorAvatar = 0;
        const { estado, moverAvatar } = useGame.getState();
        if (estado.avatar.x !== this.avatar.x || estado.avatar.z !== this.avatar.z) {
          moverAvatar(this.avatar.x, this.avatar.z);
        }
      }
    }

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
    this.avatar?.dispose();
    this.terreno.dispose();
    this.casas.dispose();
    this.plantas.clear();
    this.animales.clear();
    this.engine.destruir();
  }
}
