import { create } from 'zustand';
import { EventBus } from '../game/EventBus';
import {
  BALANCE,
  celdaId as hacerCeldaId,
  celdaLocal,
  costoProximaCelda,
  parseCeldaId,
} from './config';
import {
  ANIMAL_SPECIES,
  FOODS,
  getAnimalVariant,
  getFlowerVariant,
  nombreFlor,
  unArticulo,
} from './content';
import { celdaEnMundo, crearIslaNueva, esAgua, esParcela, tieneSuelo, totalCeldas } from './islas';
import {
  borrarLocal,
  cargarPartida,
  cobrarRegalosPendientes,
  guardarPartida,
  leerLocal,
  olvidarLectura,
  partidaAlEntrar,
} from './persistence';
import {
  anotarCosecha,
  asegurarCaballos,
  asegurarPedido,
  pagarTiro,
  reclamarRegaloDiario,
  restanteTiroHoy,
  regaloDiarioDisponible,
  rechazarPedido,
} from './economia';
import { alimentarTodos as alimentarTodosPuro } from './alimentar';
import {
  alternarNenufar,
  celdasDeAgua,
  secarCelda,
  verterAgua,
  type ResultadoAgua,
} from './agua';
import { comprarFarolas, propEn, usarFarola, type ResultadoFarola } from './objetos';
import {
  CASAS,
  TIPOS_CASA,
  casaDeId,
  casaEnCelda,
  comprarCasa as comprarCasaPura,
  esCuerpoCasa,
  esMaceta,
  guardadas,
  guardarCasa,
  macetasOcupadas,
  ponerCasa,
  type ResultadoCasa,
} from './casas';
import { aplicarRegalos } from './regalos';
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
  PlantState,
  PropTipo,
  PestanaTienda,
  TipoCasa,
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
  | 'regalos'
  | 'pedidos'
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
  /** La casa que pone la herramienta Casa. */
  casaSeleccionada: TipoCasa | null;
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
  setCasa: (tipo: TipoCasa) => void;
  comprarCasa: (tipo: TipoCasa) => void;
  /** Tocar el cuerpo de una casa: con la herramienta Casa la guarda; si no, la describe. */
  tocarCasa: (casaId: string) => void;
  setPanel: (p: PanelId) => void;
  abrirAnimal: (uid: string | null) => void;
  cerrarAdopcion: () => void;
  avisar: (texto: string, tono?: Toast['tono'], extra?: { abrirTienda?: PestanaTienda; duracion?: number }) => void;
  /** Pestaña que muestra la tienda al abrirse. */
  pestanaTienda: PestanaTienda;
  setPestanaTienda: (p: PestanaTienda) => void;
  /** Abre la tienda (sin alternar) directo en una pestaña. */
  abrirTienda: (p: PestanaTienda) => void;
  descartarToast: (id: number) => void;

  /* --- jardin --- */
  usarEnCelda: (id: CeldaId) => void;
  regarTodo: () => void;
  /** Le da a cada animal con hambre su comida favorita; avisa lo que falta. */
  alimentarTodos: () => void;
  comprarSemilla: (variantId: string, cantidad?: number) => void;
  comprarComida: (foodId: FoodId, cantidad?: number) => void;
  comprarFarolas: (cantidad?: number) => void;

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
  reclamarRegaloDiario: () => void;
  /** Busca y entrega los regalos que un administrador le dejo a la cuenta. */
  cobrarRegalosPersonales: () => Promise<void>;
  rechazarPedido: () => void;
  registrarMojada: () => void;
  despertarRival: () => void;
}

/**
 * Todo lo que se le aplica a una partida al entrar, venga de donde venga:
 * regalos pendientes, el caballo de cada isla y un pedido activo. Cada paso
 * es idempotente, asi que volver a entrar no duplica nada.
 */
export function prepararPartida(
  base: GameState,
  ahora: number,
): { estado: GameState; avisos: string[]; cambio: boolean } {
  const regalos = aplicarRegalos(base);
  const caballos = asegurarCaballos(regalos.estado, ahora);
  const estado = asegurarPedido(caballos.estado);

  const avisos = [...regalos.avisos];
  for (const c of caballos.nuevos) avisos.push(`${c.nombre} llegó a tu jardín: es tu caballo 🐴`);
  if (regaloDiarioDisponible(estado, ahora)) {
    avisos.push(`Tu regalo diario de ${BALANCE.regaloDiario} monedas te espera en Regalos 🎁`);
  }
  // Cada paso devuelve el mismo objeto si no tenia nada que hacer.
  return { estado, avisos, cambio: estado !== base };
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

    // Arranca en 'mirar' a proposito: la herramienta no se guarda con la
    // partida, asi que cada carga empezaba con la de la sesion anterior y el
    // primer toque ejecutaba lo ultimo que hubieras usado, pala incluida.
    herramienta: 'mirar',
    semillaSeleccionada: 'margarita-blanca',
    comidaSeleccionada: 'nectar',
    casaSeleccionada: null,
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
      // El regalo se acredita sobre la partida que ya gano la eleccion entre
      // el navegador y la nube: aplicarlo antes, sobre las dos, lo duplicaria.
      const {
        estado: base,
        avisos,
        cambio,
      } = prepararPartida(guardado ?? crearEstadoInicial(), Date.now());
      const { estado, eventos } = advance(base, Date.now());

      set({ estado, cargando: false });
      // Lo que se acaba de acreditar tiene que llegar a la nube ya: si el
      // jugador cierra sin tocar nada, otro dispositivo leeria la copia vieja
      // y volveria a regalarle lo mismo.
      if (cambio) get().guardar();

      avisos.forEach((a) => get().avisar(a, 'exito'));

      if (guardado) {
        const minutos = Math.round((Date.now() - base.ultimoTick) / 60_000);
        if (minutos >= 2) {
          get().avisar(`Volviste después de ${formatearLapso(minutos)}`, 'info');
        }
      }
      eventos.forEach((e) => get().avisar(e, 'info'));
      EventBus.emit('mundo:resincronizar', {});
      // Despues de cargar: los regalos van sobre la partida que gano, y solo
      // hay cuenta que revisar si la nube se leyo bien.
      void get().cobrarRegalosPersonales();
    },

    tick() {
      const { estado: previo } = get();
      const { estado, eventos } = advance(previo, Date.now());

      // Los visitantes llegan solos si el jardín da motivos para venir.
      const flores = contarFlores(estado);
      let animales = estado.animales;
      const disponibles = especiesDisponibles(flores, celdasDeAgua(estado));

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
        if (cambio === 'salio') olvidarLectura();
        base = cambio === 'entro' ? await partidaAlEntrar() : leerLocal();
      } catch (e) {
        console.warn('[jardin] no se pudo cambiar de partida', e);
        base = leerLocal();
      }

      const regalados = prepararPartida(base ?? crearEstadoInicial(), Date.now());
      const { estado, eventos } = advance(regalados.estado, Date.now());
      set({ estado, cargando: false });
      if (regalados.cambio) get().guardar();
      EventBus.emit('mundo:resincronizar', {});
      regalados.avisos.forEach((a) => get().avisar(a, 'exito'));
      eventos.forEach((e) => get().avisar(e, 'info'));

      get().avisar(
        cambio === 'entro' ? 'Cargamos tu jardín ☁️' : 'Volviste a la partida de este navegador',
        'info',
      );
      if (cambio === 'entro') void get().cobrarRegalosPersonales();
    },

    reiniciar() {
      borrarLocal();
      set({ estado: crearEstadoInicial(), animalAbierto: null, panel: null, adoptando: null });
      // Es la unica accion que tiene que reemplazar el jardin de la cuenta por
      // otro: el jugador lo pidio. Cualquier otro guardado se niega a hacerlo.
      void guardarPartida(get().estado, { reemplazar: true });
      EventBus.emit('mundo:resincronizar', {});
      get().avisar('Jardín nuevo. A sembrar de nuevo 🌱', 'info');
    },

    /* ---------------------------------------------------------------- */
    /* Interfaz                                                          */
    /* ---------------------------------------------------------------- */

    setHerramienta: (herramienta) => set({ herramienta }),
    setSemilla: (semillaSeleccionada) => set({ semillaSeleccionada, herramienta: 'plantar' }),
    setComida: (comidaSeleccionada) => set({ comidaSeleccionada, herramienta: 'alimentar' }),
    setCasa: (casaSeleccionada) => set({ casaSeleccionada, herramienta: 'casa' }),

    comprarCasa(tipo) {
      const tras = comprarCasaPura(get().estado, tipo);
      if (!tras) return get().avisar('No te alcanzan las monedas', 'aviso');
      mutar(() => tras);
      set({ casaSeleccionada: tipo });
      get().avisar(`${CASAS[tipo].nombre} comprada. Ponela con la herramienta Casa 🏠`, 'exito');
    },

    tocarCasa(casaId) {
      const { estado, herramienta, avisar } = get();
      const casa = (estado.casas ?? []).find((c) => c.id === casaId);
      if (!casa) return;
      const modelo = CASAS[casa.tipo];

      if (herramienta === 'casa') {
        const { estado: tras, resultado } = guardarCasa(estado, casaId);
        if (resultado === 'macetas-con-flores') {
          return avisar('Tiene flores en las macetas: cosechalas o limpialas antes de moverla', 'aviso');
        }
        if (resultado !== 'guardada') return;
        mutar(() => tras);
        set({ casaSeleccionada: casa.tipo });
        return avisar(`${modelo.nombre} guardada. Tocá el césped para ponerla en otro lado`, 'info');
      }

      const flores = macetasOcupadas(estado, casa);
      avisar(`${modelo.nombre} · ${flores} de ${modelo.macetas} macetas sembradas. Para moverla, usá la herramienta Casa`, 'info');
    },
    setPanel: (panel) => set((s) => ({ panel: s.panel === panel ? null : panel })),
    abrirAnimal: (animalAbierto) => set({ animalAbierto }),
    cerrarAdopcion: () => set({ adoptando: null }),

    avisar(texto, tono = 'info', extra = {}) {
      const id = siguienteToast++;
      const toast: Toast = { id, texto, tono, ...(extra.abrirTienda ? { abrirTienda: extra.abrirTienda } : {}) };
      set((s) => ({ toasts: [...s.toasts.slice(-4), toast] }));
      setTimeout(() => get().descartarToast(id), extra.duracion ?? 4200);
    },

    pestanaTienda: 'semillas',
    setPestanaTienda: (pestanaTienda) => set({ pestanaTienda }),
    abrirTienda: (pestanaTienda) => set({ panel: 'tienda', pestanaTienda }),

    descartarToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    /* ---------------------------------------------------------------- */
    /* Jardin                                                            */
    /* ---------------------------------------------------------------- */

    usarEnCelda(id) {
      const { estado, herramienta, semillaSeleccionada, avisar } = get();

      // El cuerpo de una casa y sus macetas no son celdas de una isla.
      if (esCuerpoCasa(id)) return get().tocarCasa(casaDeId(id)!);
      const maceta = esMaceta(id);
      if (maceta && !HERRAMIENTAS_MACETA.has(herramienta)) {
        if (herramienta === 'casa') return get().tocarCasa(casaDeId(id)!);
        return avisar('En las macetas se siembra, se riega, se cosecha y se limpia', 'info');
      }

      const { islaId, col, row } = parseCeldaId(id);
      // En una maceta no hay isla, pero las herramientas que llegan hasta aca
      // (sembrar, regar, cosechar, limpiar, mirar) no la usan.
      const isla = estado.islas.find((i) => i.id === islaId)!;
      if (!isla && !maceta) return;

      // El personaje camina a donde trabajás: no hace falta moverlo aparte.
      // Mirar no es ir, así que esa herramienta no lo mueve.
      if (herramienta !== 'mirar' && !maceta) {
        get().moverAvatar(isla.ox + col + 0.5, isla.oz + row + 0.5);
      }

      const planta = estado.cultivos[id];
      // Una maceta siempre admite siembra: es la parcela de la terraza.
      const arada = maceta || esParcela(isla, col, row);
      const casaAca = maceta ? undefined : casaEnCelda(estado, islaId, col, row);

      switch (herramienta) {
        case 'mirar':
          if (maceta) {
            return avisar(planta ? describirCelda(planta, true, false) : 'Maceta vacía: elegí una semilla y sembrá', 'info');
          }
          if (casaAca) return get().tocarCasa(casaAca.id);
          return avisar(
            describirCelda(planta, arada, esAgua(isla, col, row), propEn(isla, col, row)?.tipo),
            'info',
          );

        case 'casa': {
          if (casaAca) return get().tocarCasa(casaAca.id);
          const elegida = get().casaSeleccionada;
          const tipo =
            elegida && guardadas(estado, elegida) > 0
              ? elegida
              : TIPOS_CASA.find((t) => guardadas(estado, t) > 0);
          if (!tipo) return avisar('No tenés casas para poner. Hay en la Tienda, en Objetos', 'aviso');
          const nuevaId = `casa-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
          const { estado: tras, resultado } = ponerCasa(estado, tipo, islaId, col, row, nuevaId);
          if (tras !== estado) mutar(() => tras);
          return avisar(MENSAJE_CASA[resultado], resultado === 'puesta' ? 'exito' : 'aviso');
        }

        case 'agua': {
          // Sobre el agua la herramienta pone y saca nenufares; sobre el
          // cesped, vierte un balde que se derrama solo.
          if (esAgua(isla, col, row)) {
            const { estado: tras, resultado } = alternarNenufar(get().estado, islaId, col, row);
            if (tras !== get().estado) mutar(() => tras);
            return avisar(
              resultado === 'puesto' ? 'Nenúfar puesto 🪷' : 'Nenúfar sacado',
              'info',
            );
          }
          if (casaAca) return avisar('Ahí está tu casa', 'aviso');
          const { estado: tras, resultado, mojadas } = verterAgua(get().estado, islaId, col, row);
          if (tras !== get().estado) mutar(() => tras);
          if (resultado !== 'vertida') return avisar(MENSAJE_AGUA[resultado], 'aviso');
          EventBus.emit('efecto:regar', { celda: id });
          return avisar(`Agua: se mojaron ${mojadas} celdas 💧`, 'exito');
        }

        case 'farola': {
          if (casaAca) return avisar('Ahí está tu casa', 'aviso');
          const { estado: tras, resultado } = usarFarola(get().estado, islaId, col, row);
          if (tras !== get().estado) mutar(() => tras);
          return avisar(MENSAJE_FAROLA[resultado], resultado === 'colocada' ? 'exito' : 'info');
        }

        case 'arar': {
          if (esAgua(isla, col, row)) return avisar('Ahí hay agua', 'aviso');
          if (casaAca) return avisar('Ahí está tu casa: no se puede arar', 'aviso');
          const objeto = propEn(isla, col, row);
          if (objeto) {
            return avisar(
              objeto.tipo === 'farola'
                ? 'Ahí hay una farola. Guardala con la herramienta Farola'
                : 'Ahí hay algo puesto: no se puede arar',
              'aviso',
            );
          }
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

          const pedido = anotarCosecha(get().estado, variante.especie);
          if (pedido.avanzo) mutar(() => pedido.estado);
          if (pedido.entregado) {
            const p = pedido.entregado;
            avisar(`¡Pedido entregado a ${p.cliente}! +${p.recompensa} 🪙`, 'exito');
          } else if (pedido.avanzo && pedido.estado.pedido) {
            const p = pedido.estado.pedido;
            avisar(`Pedido: ${p.progreso}/${p.cantidad} ${nombreFlor(p.especie, p.cantidad)}`, 'info');
          }
          avisar(
            bonus
              ? `+${variante.precioVenta} monedas y una semilla de regalo 🌰`
              : `+${variante.precioVenta} monedas`,
            'exito',
          );
          return;
        }

        case 'pala': {
          if (!maceta && esAgua(isla, col, row)) {
            const { estado: tras, secada } = secarCelda(get().estado, islaId, col, row);
            if (!secada) return avisar('Ahí no hay nada que quitar', 'aviso');
            mutar(() => tras);
            return avisar('Celda secada', 'info');
          }
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

    alimentarTodos() {
      const { estado, avisar } = get();
      const { estado: tras, comieron, faltan, conHambre } = alimentarTodosPuro(estado);
      if (conHambre === 0) return avisar('Nadie tiene hambre ahora 🐾', 'info');

      if (comieron.length > 0) {
        mutar(() => tras);
        for (const c of comieron) {
          EventBus.emit('efecto:comer', { uid: c.uid });
          revisarAdopcion(c.uid);
        }
      }

      const porNombre = (uid: string) => {
        const a = estado.animales.find((x) => x.uid === uid);
        return a ? nombreDe(a) : 'alguien';
      };
      const comieronTexto =
        comieron.length === 0
          ? 'Nadie pudo comer'
          : `Comieron ${comieron.length} ${comieron.length === 1 ? 'animal' : 'animales'}`;

      if (faltan.length === 0) return avisar(`${comieronTexto} 🥕`, 'exito');

      const detalle = faltan
        .map((f) => `${f.porciones} de ${FOODS[f.comida].nombre.toLowerCase()} (${enLista(f.uids.map(porNombre))})`)
        .join('; ');
      avisar(`${comieronTexto}. Falta: ${detalle}. Tocá acá para comprar`, 'aviso', {
        abrirTienda: 'comida',
        duracion: 9000,
      });
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

    comprarFarolas(cantidad = 1) {
      const tras = comprarFarolas(get().estado, cantidad);
      if (!tras) return get().avisar('No te alcanzan las monedas', 'aviso');
      mutar(() => tras);
      get().avisar(
        cantidad === 1 ? '+1 farola. Ponela con la herramienta Farola' : `+${cantidad} farolas`,
        'exito',
      );
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
      // Ya es tierra de otra isla: comprarla superpondria las dos.
      if (celdaEnMundo(estado.islas, isla.ox + col + 0.5, isla.oz + row + 0.5)) return;

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
      const { estado: conCaballo, nuevos } = asegurarCaballos(get().estado, Date.now());
      if (nuevos.length > 0) {
        mutar(() => conCaballo);
        EventBus.emit('mundo:resincronizar', {});
      }
      EventBus.emit('camara:mirar', { x: isla.ox + 2.5, z: isla.oz + 2.5 });
      avisar(`${isla.nombre} emergió del mar 🏝️`, 'exito');
      for (const c of nuevos) avisar(`${c.nombre} vive en la isla nueva 🐴`, 'info');
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

      const { estado: pagado, pago } = pagarTiro(get().estado, distancia, Date.now());
      if (pago > 0) mutar(() => pagado);

      if (record && distancia > 6) {
        get().avisar(`¡Blanco a ${distancia.toFixed(1)} m! Nuevo récord 🎯 +${pago} 🪙`, 'exito');
      } else if (pago > 0) {
        get().avisar(`🎯 +${pago} monedas`, 'exito');
      }
      // Se avisa una sola vez, en el tiro que llega al tope. Los siguientes
      // no pagan y tampoco dicen nada: repetirlo en cada flecha seria ruido.
      if (pago > 0 && restanteTiroHoy(get().estado, Date.now()) === 0) {
        get().avisar('Llegaste al tope de hoy en el campo de tiro. Mañana vuelve a pagar', 'info');
      }
    },

    reclamarRegaloDiario() {
      const antes = get().estado;
      const ahora = Date.now();
      if (!regaloDiarioDisponible(antes, ahora)) {
        return get().avisar('Ya cobraste el regalo de hoy', 'info');
      }
      mutar((e) => reclamarRegaloDiario(e, ahora));
      get().avisar(`+${BALANCE.regaloDiario} monedas del regalo diario 🎁`, 'exito');
    },

    async cobrarRegalosPersonales() {
      const nuevos = await cobrarRegalosPendientes(
        () => get().estado,
        (estado) => {
          set({ estado });
          EventBus.emit('mundo:resincronizar', {});
        },
        Date.now(),
      );
      for (const r of nuevos) {
        get().avisar(
          `🎁 ${r.mensaje || 'Recibiste un regalo'} · lo ves en Regalos`,
          'exito',
        );
      }
    },

    rechazarPedido() {
      mutar((e) => rechazarPedido(e));
      get().avisar('Llegó otro pedido', 'info');
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

/** "A", "A y B", "A, B y 2 más". */
function enLista(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? '';
  if (nombres.length <= 3) return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
  return `${nombres.slice(0, 2).join(', ')} y ${nombres.length - 2} más`;
}

export function nombreDe(animal: AnimalState): string {
  if (animal.nombre) return animal.nombre;
  const especie = ANIMAL_SPECIES[animal.especie].nombre;
  const variante = getAnimalVariant(animal.variante).nombre;
  return `${especie} ${variante.toLowerCase()}`;
}

/**
 * Que hay en una celda, en una linea. Es todo lo que hace la herramienta
 * "Mirar": describe sin tocar nada.
 */
function describirCelda(
  planta: PlantState | undefined,
  arada: boolean,
  hayAgua: boolean,
  objeto?: PropTipo,
): string {
  if (objeto === 'farola') return 'Una farola. De noche alumbra lo que tiene alrededor';
  if (objeto === 'farol') return 'Un farol de jardín. De noche se enciende solo';
  if (objeto) return 'Un adorno del jardín';
  if (!planta) {
    if (hayAgua) return 'Un estanque. Es decorativo: no se puede arar ni sembrar';
    if (arada) return 'Parcela arada y vacía, lista para sembrar';
    return 'Césped. Con Arar se convierte en parcela de siembra';
  }

  const variante = getFlowerVariant(planta.variantId);
  const etapa = stageOf(planta);
  if (etapa === 'marchita') return `${variante.nombre}, marchita. Limpiala y volvé a sembrar`;

  const nombreEtapa = {
    semilla: 'recién sembrada',
    brote: 'brotando',
    capullo: 'en capullo',
    flor: 'en flor',
  }[etapa];
  const sed = planta.humedad > 0.5 ? 'con agua' : planta.humedad > 0.15 ? 'le falta agua' : 'seca';

  // Con horas de margen antes de marchitarse, 'seca' ya no alcanza: una recien
  // secada y una a punto de morir se veian igual.
  if (planta.marchitez > 0.6) {
    return `${variante.nombre}, ${nombreEtapa} · se está marchitando, necesita agua ya`;
  }

  return `${variante.nombre}, ${nombreEtapa} · ${sed}`;
}

/** Lo que responde la herramienta Agua cuando no se puede verter. */
const MENSAJE_AGUA: Record<ResultadoAgua, string> = {
  vertida: '',
  'ya-hay-agua': 'Ahí ya hay agua',
  parcela: 'Ahí hay una parcela arada: el agua va sobre el césped',
  ocupada: 'Ahí hay algo puesto',
  fuera: 'Ahí no hay tierra',
  'sin-lugar': 'No hay lugar para el agua',
};

/** Las herramientas que tienen sentido sobre una maceta. */
const HERRAMIENTAS_MACETA = new Set(['mirar', 'plantar', 'regar', 'cosechar', 'pala']);

/** Lo que responde la herramienta Casa en cada caso. */
const MENSAJE_CASA: Record<ResultadoCasa, string> = {
  puesta: 'Casa puesta 🏠 Sembrá en las macetas de la terraza',
  'sin-casas': 'No tenés casas para poner. Hay en la Tienda, en Objetos',
  'no-entra': 'No entra ahí: tiene que caber entera sobre la isla',
  agua: 'No se puede poner sobre el agua',
  parcela: 'Ahí hay parcelas: la casa va sobre el césped',
  ocupada: 'Ahí ya hay algo puesto',
  fuera: 'Ahí no hay tierra',
};

/** Lo que responde la herramienta Farola en cada caso. */
const MENSAJE_FAROLA: Record<ResultadoFarola, string> = {
  colocada: 'Farola puesta 🏮',
  guardada: 'Farola guardada. Podés ponerla en otro lado',
  'sin-farolas': 'No te quedan farolas. Hay en la Tienda, en Objetos',
  ocupada: 'Ahí ya hay algo puesto',
  agua: 'En el agua no se puede poner una farola',
  parcela: 'Las farolas van en el césped: en una parcela taparían la siembra',
  fuera: 'Ahí no hay tierra',
};

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
