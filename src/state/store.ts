import { create } from 'zustand';
import { EventBus } from '../game/EventBus';
import { BALANCE } from './config';
import {
  ANIMAL_SPECIES,
  FOODS,
  getAnimalVariant,
  getFlowerVariant,
} from './content';
import { conRespaldoLocal, crearAdaptador, type AdapterName } from './persistence';
import { borrarLocal } from './persistence';
import {
  advance,
  aforo,
  contarFlores,
  crearEstadoInicial,
  crearVisitante,
  especiesDisponibles,
  stageOf,
} from './sim';
import type { AnimalState, FoodId, GameState, PlotState, Toast, ToolId } from './types';

const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

const adaptador = conRespaldoLocal(crearAdaptador());

/** Ventana muerta entre caricias al mismo animal, para que no se pueda spamear. */
const COOLDOWN_CARICIA = 1100;

export type PanelId = 'tienda' | 'animales' | 'ayuda' | null;

interface Store {
  /* --- datos --- */
  estado: GameState;
  cargando: boolean;
  origenGuardado: AdapterName;

  /* --- interfaz --- */
  herramienta: ToolId;
  semillaSeleccionada: string | null;
  comidaSeleccionada: FoodId | null;
  panel: PanelId;
  animalAbierto: string | null;
  adoptando: string | null;
  toasts: Toast[];

  /* --- ciclo de vida --- */
  inicializar: () => Promise<void>;
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
  usarEnParcela: (index: number) => void;
  regarTodo: () => void;
  comprarSemilla: (variantId: string, cantidad?: number) => void;
  comprarComida: (foodId: FoodId, cantidad?: number) => void;

  /* --- animales --- */
  interactuarAnimal: (uid: string) => void;
  adoptar: (uid: string, nombre: string) => void;
  renombrar: (uid: string, nombre: string) => void;
  liberar: (uid: string) => void;
  moverAnimal: (uid: string, x: number, z: number) => void;
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

  const mutarParcela = (index: number, fn: (p: PlotState) => PlotState) =>
    mutar((estado) => ({
      ...estado,
      parcelas: estado.parcelas.map((p) => (p.index === index ? fn(p) : p)),
    }));

  return {
    estado: crearEstadoInicial(),
    cargando: true,
    origenGuardado: adaptador.nombre,

    herramienta: 'plantar',
    semillaSeleccionada: 'margarita-blanca',
    comidaSeleccionada: 'nectar',
    panel: null,
    animalAbierto: null,
    adoptando: null,
    toasts: [],

    /* ---------------------------------------------------------------- */
    /* Ciclo de vida                                                     */
    /* ---------------------------------------------------------------- */

    async inicializar() {
      const guardado = await adaptador.cargar();
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
        const visitante = crearVisitante(elegida);
        animales = [...animales, visitante];
        get().avisar(`Llegó ${unArticulo(elegida)} al jardín`, 'info');
      }

      set({ estado: { ...estado, animales } });
      eventos.forEach((e) => get().avisar(e, 'info'));

      if (eventos.length > 0 || animales !== estado.animales) get().guardar();
    },

    guardar() {
      if (temporizadorGuardado) clearTimeout(temporizadorGuardado);
      temporizadorGuardado = setTimeout(() => {
        void adaptador.guardar(get().estado);
      }, 1200);
    },

    reiniciar() {
      borrarLocal();
      set({ estado: crearEstadoInicial(), animalAbierto: null, panel: null, adoptando: null });
      void adaptador.guardar(get().estado);
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

    usarEnParcela(index) {
      const { estado, herramienta, semillaSeleccionada, avisar } = get();
      const parcela = estado.parcelas[index];
      if (!parcela) return;
      const planta = parcela.planta;

      switch (herramienta) {
        case 'plantar': {
          if (planta) return avisar('Esa parcela ya está ocupada', 'aviso');
          if (!semillaSeleccionada) return avisar('Elegí una semilla primero', 'aviso');
          if ((estado.semillas[semillaSeleccionada] ?? 0) <= 0) {
            return avisar('No te quedan semillas de esa flor', 'aviso');
          }

          const variante = getFlowerVariant(semillaSeleccionada);
          mutar((e) => ({
            ...e,
            semillas: { ...e.semillas, [variante.id]: (e.semillas[variante.id] ?? 0) - 1 },
            parcelas: e.parcelas.map((p) =>
              p.index === index
                ? {
                    ...p,
                    // Se siembra ya regada: el primer riego lo hace el jugador.
                    planta: {
                      variantId: variante.id,
                      plantedAt: Date.now(),
                      growth: 0,
                      humedad: 1,
                      marchitez: 0,
                    },
                  }
                : p,
            ),
          }));
          EventBus.emit('efecto:plantar', { index });
          return;
        }

        case 'regar': {
          if (!planta) return avisar('Ahí no hay nada que regar', 'aviso');
          mutarParcela(index, (p) => ({
            ...p,
            planta: p.planta
              ? {
                  ...p.planta,
                  humedad: BALANCE.riego,
                  marchitez: Math.max(0, p.planta.marchitez - 0.25),
                }
              : null,
          }));
          EventBus.emit('efecto:regar', { index });
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

          mutar((e) => ({
            ...e,
            monedas: e.monedas + variante.precioVenta,
            floresCosechadas: e.floresCosechadas + 1,
            semillas: bonus
              ? { ...e.semillas, [variante.id]: (e.semillas[variante.id] ?? 0) + 1 }
              : e.semillas,
            parcelas: e.parcelas.map((p) => (p.index === index ? { ...p, planta: null } : p)),
          }));

          EventBus.emit('efecto:cosechar', { index, color: variante.palette['2'] ?? '#ffd447' });
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
          mutarParcela(index, (p) => ({ ...p, planta: null }));
          avisar('Parcela despejada', 'info');
          return;
        }

        default:
          avisar('Esa herramienta es para los animales', 'aviso');
      }
    },

    regarTodo() {
      const { estado } = get();
      const secas = estado.parcelas.filter((p) => p.planta && p.planta.humedad < 0.95).length;
      if (secas === 0) return get().avisar('Todo el jardín está regado', 'info');

      mutar((e) => ({
        ...e,
        parcelas: e.parcelas.map((p) =>
          p.planta
            ? {
                ...p,
                planta: {
                  ...p.planta,
                  humedad: BALANCE.riego,
                  marchitez: Math.max(0, p.planta.marchitez - 0.25),
                },
              }
            : p,
        ),
      }));
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

function formatearLapso(minutos: number): string {
  if (minutos < 60) return `${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? 'una hora' : `${horas} horas`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'un día' : `${dias} días`;
}
