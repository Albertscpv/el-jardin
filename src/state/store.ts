import { create } from 'zustand';
import { EventBus } from '../game/EventBus';
import {
  BALANCE,
  celdaId as hacerCeldaId,
  celdaLocal,
  costoProximaCelda,
  parseCeldaId,
} from './config';
import { ANIMAL_SPECIES, FOODS, getAnimalVariant, getFlowerVariant } from './content';
import { crearIslaNueva, esAgua, esParcela, tieneSuelo, totalCeldas } from './islas';
import {
  borrarLocal,
  cargarPartida,
  guardarPartida,
  leerLocal,
  partidaAlEntrar,
} from './persistence';
import {
  advance,
  aforo,
  contarFlores,
  crearEstadoInicial,
  crearVisitante,
  especiesDisponibles,
  stageOf,
} from './sim';
import type {
  AnimalState,
  Records,
  AvatarState,
  CeldaId,
  FoodId,
  GameState,
  IslaState,
  Toast,
  ToolId,
} from './types';

const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

/** Ventana muerta entre caricias al mismo animal, para que no se pueda spamear. */
const COOLDOWN_CARICIA = 1100;

export type Modo = 'jardin' | 'practica';
export type Municion = 'flecha' | 'bomba';

/** Marcador vacio, para partidas anteriores a la practica de tiro. */
export const RECORDS_VACIOS: Records = {
  disparos: 0,
  impactos: 0,
  mejorDistancia: 0,
  mojadas: 0,
};

export type PanelId =
  | 'tienda'
  | 'animales'
  | 'construir'
  | 'personaje'
  | 'cuenta'
  | 'ayuda'
  | null;

interface Store {
  /* --- datos --- */
  estado: GameState;
  cargando: boolean;

  /* --- interfaz --- */
  herramienta: ToolId;
  semillaSeleccionada: string | null;
  comidaSeleccionada: FoodId | null;
  panel: PanelId;
  animalAbierto: string | null;
  adoptando: string | null;
  toasts: Toast[];

  /* --- practica de tiro --- */
  modo: Modo;
  municion: Municion;

  /* --- ciclo de vida --- */
  inicializar: () => Promise<void>;
  /** Recarga la partida cuando cambia quién tiene la sesión. */
  alCambiarSesion: (cambio: 'entro' | 'salio') => Promise<void>;
  tick: () => void;
  guardar: () => void;
  reiniciar: () => void;

  /* --- interfaz --- */
  setHerramienta: (h: ToolId) => void;
  setSemilla: (id: string) => void;
  setComida: (id: FoodId) => void;
  setPanel: (p: PanelId) => void;
  abrirAnimal: (uid: string | null) => void;
  cerrarAdopcion: () => void;
  avisar: (texto: string, tono?: Toast['tono']) => void;
  descartarToast: (id: number) => void;

  /* --- jardin --- */
  usarEnCelda: (id: CeldaId) => void;
  regarTodo: () => void;
  comprarSemilla: (variantId: string, cantidad?: number) => void;
  comprarComida: (foodId: FoodId, cantidad?: number) => void;

  /* --- territorio --- */
  expandir: (islaId: string, col: number, row: number) => void;
  fundarIsla: () => void;
  renombrarIsla: (islaId: string, nombre: string) => void;

  /* --- animales --- */
  interactuarAnimal: (uid: string) => void;
  adoptar: (uid: string, nombre: string) => void;
  renombrar: (uid: string, nombre: string) => void;
  liberar: (uid: string) => void;
  moverAnimal: (uid: string, x: number, z: number) => void;

  /* --- personaje --- */
  personalizarAvatar: (cambios: Partial<AvatarState>) => void;
  moverAvatar: (x: number, z: number) => void;

  /* --- practica de tiro --- */
  setModo: (m: Modo) => void;
  setMunicion: (m: Municion) => void;
  registrarDisparo: () => void;
  registrarImpacto: (distancia: number) => void;
  registrarMojada: () => void;
  despertarRival: () => void;
}

let siguienteToast = 1;
let temporizadorGuardado: ReturnType<typeof setTimeout> | null = null;
const ultimaCaricia = new Map<string, number>();

export const useGame = create<Store>()((set, get) => {
  /** Aplica un cambio al estado guardado y programa la persistencia. */
  const mutar = (fn: (estado: GameState) => GameState) => {
    set((s) => ({ estado: fn(s.estado) }));
    get().guardar();
  };

  const mutarAnimal = (uid: string, fn: (a: AnimalState) => AnimalState) =>
    mutar((estado) => ({
      ...estado,
      animales: estado.animales.map((a) => (a.uid === uid ? fn(a) : a)),
    }));

  const mutarIsla = (islaId: string, fn: (isla: IslaState) => IslaState) =>
    mutar((estado) => ({
      ...estado,
      islas: estado.islas.map((i) => (i.id === islaId ? fn(i) : i)),
    }));

  return {
    estado: crearEstadoInicial(),
    cargando: true,

    herramienta: 'plantar',
    semillaSeleccionada: 'margarita-blanca',
    comidaSeleccionada: 'nectar',
    panel: null,
    animalAbierto: null,
    adoptando: null,
    toasts: [],

    modo: 'jardin',
    municion: 'flecha',

    /* ---------------------------------------------------------------- */
    /* Ciclo de vida                                                     */
    /* ---------------------------------------------------------------- */

    async inicializar() {
      const guardado = await cargarPartida();
      const base = guardado ?? crearEstadoInicial();
      const { estado, eventos } = advance(base, Date.now());

      set({ estado, cargando: false });

      if (guardado) {
        const minutos = Math.round((Date.now() - base.ultimoTick) / 60_000);
        if (minutos >= 2) {
          get().avisar(`Volviste después de ${formatearLapso(minutos)}`, 'info');
        }
      }
      eventos.forEach((e) => get().avisar(e, 'info'));
      EventBus.emit('mundo:resincronizar', {});
    },

    tick() {
      const { estado: previo } = get();
      const { estado, eventos } = advance(previo, Date.now());

      // Los visitantes llegan solos si el jardín da motivos para venir.
      const flores = contarFlores(estado);
      let animales = estado.animales;
      const disponibles = especiesDisponibles(flores);

      if (disponibles.length > 0 && animales.length < aforo(flores) && Math.random() < 0.05) {
        // Las especies exigentes aparecen menos seguido.
        const pesos = disponibles.map((id) => 1 / (1 + ANIMAL_SPECIES[id].floresParaVisitar / 4));
        const total = pesos.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        let elegida = disponibles[0];
        for (let i = 0; i < disponibles.length; i++) {
          r -= pesos[i];
          if (r <= 0) {
            elegida = disponibles[i];
            break;
          }
        }
        animales = [...animales, crearVisitante(elegida, estado)];
        get().avisar(`Llegó ${unArticulo(elegida)} al jardín`, 'info');
      }

      set({ estado: { ...estado, animales } });
      eventos.forEach((e) => get().avisar(e, 'info'));

      if (eventos.length > 0 || animales !== estado.animales) get().guardar();
    },

    guardar() {
      if (temporizadorGuardado) clearTimeout(temporizadorGuardado);
      temporizadorGuardado = setTimeout(() => {
        void guardarPartida(get().estado);
      }, 1200);
    },

    /**
     * Al entrar manda la partida de la cuenta; al salir, la del navegador.
     * En los dos casos el mundo 3D se reconstruye desde cero, porque el
     * territorio pudo cambiar de forma entera.
     */
    async alCambiarSesion(cambio) {
      set({ cargando: true, panel: null, animalAbierto: null, adoptando: null });

      let base: GameState | null = null;
      try {
        base = cambio === 'entro' ? await partidaAlEntrar() : leerLocal();
      } catch (e) {
        console.warn('[jardin] no se pudo cambiar de partida', e);
        base = leerLocal();
      }

      const { estado, eventos } = advance(base ?? crearEstadoInicial(), Date.now());
      set({ estado, cargando: false });
      EventBus.emit('mundo:resincronizar', {});
      eventos.forEach((e) => get().avisar(e, 'info'));

      get().avisar(
        cambio === 'entro' ? 'Cargamos tu jardín ☁️' : 'Volviste a la partida de este navegador',
        'info',
      );
    },

    reiniciar() {
      borrarLocal();
      set({ estado: crearEstadoInicial(), animalAbierto: null, panel: null, adoptando: null });
      void guardarPartida(get().estado);
      EventBus.emit('mundo:resincronizar', {});
      get().avisar('Jardín nuevo. A sembrar de nuevo 🌱', 'info');
    },

    /* ---------------------------------------------------------------- */
    /* Interfaz                                                          */
    /* ---------------------------------------------------------------- */

    setHerramienta: (herramienta) => set({ herramienta }),
    setSemilla: (semillaSeleccionada) => set({ semillaSeleccionada, herramienta: 'plantar' }),
    setComida: (comidaSeleccionada) => set({ comidaSeleccionada, herramienta: 'alimentar' }),
    setPanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel })),
    abrirAnimal: (animalAbierto) => set({ animalAbierto }),
    cerrarAdopcion: () => set({ adoptando: null }),

    avisar(texto, tono = 'info') {
      const id = siguienteToast++;
      set((s) => ({ toasts: [...s.toasts.slice(-4), { id, texto, tono }] }));
      setTimeout(() => get().descartarToast(id), 4200);
    },

    descartarToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    /* ---------------------------------------------------------------- */
    /* Jardin                                                            */
    /* ---------------------------------------------------------------- */

    usarEnCelda(id) {
      const { estado, herramienta, semillaSeleccionada, avisar } = get();
      const { islaId, col, row } = parseCeldaId(id);
      const isla = estado.islas.find((i) => i.id === islaId);
      if (!isla) return;

      // El personaje camina a donde trabajás: no hace falta moverlo aparte.
      get().moverAvatar(isla.ox + col + 0.5, isla.oz + row + 0.5);

      const planta = estado.cultivos[id];
      const arada = esParcela(isla, col, row);

      switch (herramienta) {
        case 'arar': {
          if (esAgua(isla, col, row)) return avisar('Ahí hay agua', 'aviso');
          if (arada) {
            if (planta) return avisar('Primero sacá lo que está sembrado', 'aviso');
            mutarIsla(islaId, (i) => ({
              ...i,
              parcelas: i.parcelas.filter((c) => c !== celdaLocal(col, row)),
            }));
            mutar((e) => ({ ...e, monedas: e.monedas + Math.floor(BALANCE.costoArar / 2) }));
            return avisar('Parcela devuelta a césped', 'info');
          }
          if (estado.monedas < BALANCE.costoArar) {
            return avisar(`Arar cuesta ${BALANCE.costoArar} monedas`, 'aviso');
          }
          mutar((e) => ({
            ...e,
            monedas: e.monedas - BALANCE.costoArar,
            islas: e.islas.map((i) =>
              i.id === islaId ? { ...i, parcelas: [...i.parcelas, celdaLocal(col, row)] } : i,
            ),
          }));
          EventBus.emit('efecto:plantar', { celda: id });
          return avisar('Tierra lista para sembrar', 'exito');
        }

        case 'plantar': {
          if (!arada) return avisar('Ahí no hay tierra arada. Usá la azada', 'aviso');
          if (planta) return avisar('Esa parcela ya está ocupada', 'aviso');
          if (!semillaSeleccionada) return avisar('Elegí una semilla primero', 'aviso');
          if ((estado.semillas[semillaSeleccionada] ?? 0) <= 0) {
            return avisar('No te quedan semillas de esa flor', 'aviso');
          }

          const variante = getFlowerVariant(semillaSeleccionada);
          mutar((e) => ({
            ...e,
            semillas: { ...e.semillas, [variante.id]: (e.semillas[variante.id] ?? 0) - 1 },
            cultivos: {
              ...e.cultivos,
              // Se siembra ya regada: el primer riego lo hace el jugador.
              [id]: {
                variantId: variante.id,
                plantedAt: Date.now(),
                growth: 0,
                humedad: 1,
                marchitez: 0,
              },
            },
          }));
          EventBus.emit('efecto:plantar', { celda: id });
          return;
        }

        case 'regar': {
          if (!planta) return avisar('Ahí no hay nada que regar', 'aviso');
          mutar((e) => ({
            ...e,
            cultivos: {
              ...e.cultivos,
              [id]: {
                ...planta,
                humedad: BALANCE.riego,
                marchitez: Math.max(0, planta.marchitez - 0.25),
              },
            },
          }));
          EventBus.emit('efecto:regar', { celda: id });
          return;
        }

        case 'cosechar': {
          if (!planta) return avisar('Ahí no hay nada', 'aviso');
          const etapa = stageOf(planta);
          if (etapa === 'marchita') {
            return avisar('Está marchita. Usá la pala para limpiarla', 'aviso');
          }
          if (etapa !== 'flor') return avisar('Todavía no está lista', 'aviso');

          const variante = getFlowerVariant(planta.variantId);
          const bonus = Math.random() < BALANCE.probabilidadSemilla;

          mutar((e) => {
            const cultivos = { ...e.cultivos };
            delete cultivos[id];
            return {
              ...e,
              monedas: e.monedas + variante.precioVenta,
              floresCosechadas: e.floresCosechadas + 1,
              semillas: bonus
                ? { ...e.semillas, [variante.id]: (e.semillas[variante.id] ?? 0) + 1 }
                : e.semillas,
              cultivos,
            };
          });

          EventBus.emit('efecto:cosechar', { celda: id, color: variante.palette['2'] ?? '#ffd447' });
          avisar(
            bonus
              ? `+${variante.precioVenta} monedas y una semilla de regalo 🌰`
              : `+${variante.precioVenta} monedas`,
            'exito',
          );
          return;
        }

        case 'pala': {
          if (!planta) return avisar('Ahí no hay nada que quitar', 'aviso');
          mutar((e) => {
            const cultivos = { ...e.cultivos };
            delete cultivos[id];
            return { ...e, cultivos };
          });
          avisar('Parcela despejada', 'info');
          return;
        }

        default:
          avisar('Esa herramienta no se usa en la tierra', 'aviso');
      }
    },

    regarTodo() {
      const { estado } = get();
      const secas = Object.values(estado.cultivos).filter((p) => p.humedad < 0.95).length;
      if (secas === 0) return get().avisar('Todo el jardín está regado', 'info');

      mutar((e) => {
        const cultivos: GameState['cultivos'] = {};
        for (const [id, planta] of Object.entries(e.cultivos)) {
          cultivos[id] = {
            ...planta,
            humedad: BALANCE.riego,
            marchitez: Math.max(0, planta.marchitez - 0.25),
          };
        }
        return { ...e, cultivos };
      });
      EventBus.emit('efecto:regarTodo', {});
      get().avisar(`Regaste ${secas} ${secas === 1 ? 'planta' : 'plantas'} 💧`, 'exito');
    },

    comprarSemilla(variantId, cantidad = 1) {
      const variante = getFlowerVariant(variantId);
      const costo = variante.precioSemilla * cantidad;
      if (get().estado.monedas < costo) return get().avisar('No te alcanzan las monedas', 'aviso');

      mutar((e) => ({
        ...e,
        monedas: e.monedas - costo,
        semillas: { ...e.semillas, [variantId]: (e.semillas[variantId] ?? 0) + cantidad },
      }));
      set({ semillaSeleccionada: variantId });
      get().avisar(`+${cantidad} ${variante.nombre}`, 'exito');
    },

    comprarComida(foodId, cantidad = 1) {
      const comida = FOODS[foodId];
      const costo = comida.precio * cantidad;
      if (get().estado.monedas < costo) return get().avisar('No te alcanzan las monedas', 'aviso');

      mutar((e) => ({
        ...e,
        monedas: e.monedas - costo,
        comida: { ...e.comida, [foodId]: (e.comida[foodId] ?? 0) + cantidad },
      }));
      set({ comidaSeleccionada: foodId });
      get().avisar(`+${cantidad} ${comida.nombre}`, 'exito');
    },

    /* ---------------------------------------------------------------- */
    /* Territorio                                                        */
    /* ---------------------------------------------------------------- */

    expandir(islaId, col, row) {
      const { estado, avisar } = get();
      const isla = estado.islas.find((i) => i.id === islaId);
      if (!isla) return;
      if (tieneSuelo(isla, col, row)) return;

      const costo = costoProximaCelda(totalCeldas(estado.islas));
      if (estado.monedas < costo) {
        return avisar(`Esa celda cuesta ${costo} monedas`, 'aviso');
      }

      mutar((e) => ({
        ...e,
        monedas: e.monedas - costo,
        islas: e.islas.map((i) =>
          i.id === islaId ? { ...i, suelo: [...i.suelo, celdaLocal(col, row)] } : i,
        ),
      }));

      EventBus.emit('efecto:expandir', { celda: hacerCeldaId(islaId, col, row) });
      avisar(`Jardín ampliado · −${costo} 🪙`, 'exito');
    },

    fundarIsla() {
      const { estado, avisar } = get();
      if (estado.monedas < BALANCE.costoIsla) {
        return avisar(`Fundar una isla cuesta ${BALANCE.costoIsla} monedas`, 'aviso');
      }

      const isla = crearIslaNueva(estado.islas);
      mutar((e) => ({
        ...e,
        monedas: e.monedas - BALANCE.costoIsla,
        islas: [...e.islas, isla],
      }));
      EventBus.emit('camara:mirar', { x: isla.ox + 2.5, z: isla.oz + 2.5 });
      avisar(`${isla.nombre} emergió del mar 🏝️`, 'exito');
    },

    renombrarIsla(islaId, nombre) {
      const limpio = nombre.trim().slice(0, 24);
      if (!limpio) return;
      mutarIsla(islaId, (i) => ({ ...i, nombre: limpio }));
    },

    /* ---------------------------------------------------------------- */
    /* Animales                                                          */
    /* ---------------------------------------------------------------- */

    interactuarAnimal(uid) {
      const { estado, herramienta, comidaSeleccionada, avisar } = get();
      const animal = estado.animales.find((a) => a.uid === uid);
      if (!animal) return;

      if (herramienta === 'alimentar') {
        if (!comidaSeleccionada) return avisar('Elegí qué darle de comer', 'aviso');
        if ((estado.comida[comidaSeleccionada] ?? 0) <= 0) {
          return avisar('Te quedaste sin esa comida', 'aviso');
        }

        const comida = FOODS[comidaSeleccionada];
        const especie = ANIMAL_SPECIES[animal.especie];
        const favorita = especie.comidaFavorita === comida.id;

        get().moverAvatar(animal.x, animal.z);
        mutar((e) => ({
          ...e,
          comida: { ...e.comida, [comida.id]: (e.comida[comida.id] ?? 0) - 1 },
          animales: e.animales.map((a) =>
            a.uid !== uid
              ? a
              : {
                  ...a,
                  hambre: clamp100(a.hambre - comida.saciedad * (favorita ? 1.3 : 1)),
                  felicidad: clamp100(a.felicidad + (favorita ? 16 : 8)),
                  confianza: clamp100(
                    a.confianza +
                      (favorita ? BALANCE.confianzaPorFavorita : BALANCE.confianzaPorComida),
                  ),
                },
          ),
        }));

        EventBus.emit('efecto:comer', { uid });
        avisar(
          favorita
            ? `¡${nombreDe(animal)} adora ${comida.nombre.toLowerCase()}!`
            : `${nombreDe(animal)} comió ${comida.nombre.toLowerCase()}`,
          'exito',
        );
        revisarAdopcion(uid);
        return;
      }

      if (herramienta === 'mimar') {
        const ahora = Date.now();
        if (ahora - (ultimaCaricia.get(uid) ?? 0) < COOLDOWN_CARICIA) return;
        ultimaCaricia.set(uid, ahora);

        get().moverAvatar(animal.x, animal.z);
        mutarAnimal(uid, (a) => ({
          ...a,
          felicidad: clamp100(a.felicidad + 6),
          confianza: clamp100(a.confianza + BALANCE.confianzaPorCaricia),
        }));
        EventBus.emit('efecto:mimar', { uid });
        revisarAdopcion(uid);
        return;
      }

      // Con cualquier otra herramienta, tocar un animal abre su ficha.
      set({ animalAbierto: uid });
    },

    adoptar(uid, nombre) {
      const limpio = nombre.trim().slice(0, 18);
      if (!limpio) return get().avisar('Ponele un nombre primero', 'aviso');

      mutarAnimal(uid, (a) => ({
        ...a,
        estado: 'adoptado',
        nombre: limpio,
        confianza: 100,
        felicidad: 100,
        vinculo: 10,
        adoptadoEn: Date.now(),
        proximoRegalo: Date.now() + BALANCE.minutosEntreRegalos * 60_000,
      }));

      set({ adoptando: null, animalAbierto: uid });
      EventBus.emit('efecto:adoptar', { uid });
      get().avisar(`${limpio} ahora vive en tu jardín 💚`, 'exito');
    },

    renombrar(uid, nombre) {
      const limpio = nombre.trim().slice(0, 18);
      if (!limpio) return;
      mutarAnimal(uid, (a) => ({ ...a, nombre: limpio }));
    },

    liberar(uid) {
      const animal = get().estado.animales.find((a) => a.uid === uid);
      mutar((e) => ({ ...e, animales: e.animales.filter((a) => a.uid !== uid) }));
      set({ animalAbierto: null });
      EventBus.emit('mundo:resincronizar', {});
      if (animal) get().avisar(`${nombreDe(animal)} volvió a su casa`, 'info');
    },

    /** Persiste la posicion del animal sin disparar guardado ni re-render caro. */
    moverAnimal(uid, x, z) {
      set((s) => ({
        estado: {
          ...s.estado,
          animales: s.estado.animales.map((a) => (a.uid === uid ? { ...a, x, z } : a)),
        },
      }));
    },

    /* ---------------------------------------------------------------- */
    /* Personaje                                                         */
    /* ---------------------------------------------------------------- */

    personalizarAvatar(cambios) {
      mutar((e) => ({ ...e, avatar: { ...e.avatar, ...cambios } }));
      EventBus.emit('avatar:cambio', {});
    },

    /** Marca adonde debe caminar el personaje; la malla lo sigue suavemente. */
    moverAvatar(x, z) {
      set((s) => ({ estado: { ...s.estado, avatar: { ...s.estado.avatar, x, z } } }));
    },

    /* ---------------------------------------------------------------- */
    /* Practica de tiro                                                  */
    /* ---------------------------------------------------------------- */

    setModo(modo) {
      // Entrar a practicar cierra los paneles: se necesita la pantalla libre.
      set({ modo, panel: null, animalAbierto: null });
      if (modo === 'practica') {
        const conRival = Boolean(get().estado.rivalDespierto);
        set({ municion: conRival ? get().municion : 'flecha' });
      }
      EventBus.emit('practica:modo', { activa: modo === 'practica' });
    },

    setMunicion: (municion) => set({ municion }),

    registrarDisparo() {
      mutar((e) => ({
        ...e,
        records: { ...(e.records ?? RECORDS_VACIOS), disparos: (e.records?.disparos ?? 0) + 1 },
      }));
    },

    registrarImpacto(distancia) {
      const previos = get().estado.records ?? RECORDS_VACIOS;
      const record = distancia > previos.mejorDistancia;

      mutar((e) => ({
        ...e,
        records: {
          ...(e.records ?? RECORDS_VACIOS),
          impactos: (e.records?.impactos ?? 0) + 1,
          mejorDistancia: Math.max(e.records?.mejorDistancia ?? 0, distancia),
        },
      }));

      if (record && distancia > 6) {
        get().avisar(`¡Blanco a ${distancia.toFixed(1)} m! Nuevo récord 🎯`, 'exito');
      }
    },

    registrarMojada() {
      mutar((e) => ({
        ...e,
        records: { ...(e.records ?? RECORDS_VACIOS), mojadas: (e.records?.mojadas ?? 0) + 1 },
      }));
      const total = get().estado.records?.mojadas ?? 0;
      get().avisar(BURLAS[total % BURLAS.length], 'exito');
    },

    despertarRival() {
      if (get().estado.rivalDespierto) return;
      mutar((e) => ({ ...e, rivalDespierto: true }));
      get().avisar('Escuchaste una risita del otro lado de la cerca… 🎈', 'info');
    },
  };

  /** Si un visitante llegó a confiar del todo, ofrece la adopción. */
  function revisarAdopcion(uid: string) {
    const animal = get().estado.animales.find((a) => a.uid === uid);
    if (animal && animal.estado === 'visitante' && animal.confianza >= 100) {
      set({ adoptando: uid });
    }
  }
});

/* ------------------------------------------------------------------ */
/* Utilidades de texto                                                 */
/* ------------------------------------------------------------------ */

export function nombreDe(animal: AnimalState): string {
  if (animal.nombre) return animal.nombre;
  const especie = ANIMAL_SPECIES[animal.especie].nombre;
  const variante = getAnimalVariant(animal.variante).nombre;
  return `${especie} ${variante.toLowerCase()}`;
}

function unArticulo(especie: keyof typeof ANIMAL_SPECIES): string {
  const nombre = ANIMAL_SPECIES[especie].nombre.toLowerCase();
  return especie === 'mariposa' ? `una ${nombre}` : `un ${nombre}`;
}

/** Lo que dice el vecino cada vez que le pega una bomba. Todo en broma. */
const BURLAS = [
  '¡Le diste! El vecino se sacude y se rie 💦',
  '"¡Fallaste!", grita empapado de pies a cabeza',
  'Se seca la cara y te hace una reverencia burlona',
  '"Eso no cuenta", dice chorreando agua',
  '¡Directo! Ahora se esconde detras de un muneco',
  'Se rie tanto que se le cae la gorra 💦',
];

function formatearLapso(minutos: number): string {
  if (minutos < 60) return `${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? 'una hora' : `${horas} horas`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'un día' : `${dias} días`;
}
