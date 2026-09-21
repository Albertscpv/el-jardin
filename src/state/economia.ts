/**
 * Economia del jardin: regalo diario, caballo de la casa, pedidos del
 * pueblo y la paga del campo de tiro.
 *
 * Todo es puro: recibe un estado y devuelve otro, sin tocar el store ni el
 * reloj por su cuenta. El store decide cuando llamar a cada cosa; aca solo
 * viven las reglas, y por eso se pueden probar sin montar el juego.
 */

import { BALANCE } from './config';
import { FLOWER_SPECIES, FLOWER_VARIANTS, variantsOfSpecies } from './content';
import { celdaAleatoria } from './islas';
import type {
  AnimalState,
  FlowerSpeciesId,
  GameState,
  IslaState,
  Pedido,
} from './types';

/* ------------------------------------------------------------------ */
/* Dias                                                                */
/* ------------------------------------------------------------------ */

/**
 * El dia local como "2026-09-21". Es local a proposito: el regalo tiene que
 * renovarse a la medianoche del jugador, no a la de Greenwich.
 */
export function claveDelDia(ahora: number): string {
  const d = new Date(ahora);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Milisegundos hasta la proxima medianoche local. */
export function faltaParaManana(ahora: number): number {
  const d = new Date(ahora);
  const manana = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return manana.getTime() - ahora;
}

/* ------------------------------------------------------------------ */
/* Regalo diario                                                       */
/* ------------------------------------------------------------------ */

export function regaloDiarioDisponible(estado: GameState, ahora: number): boolean {
  return estado.regaloDiario !== claveDelDia(ahora);
}

/**
 * Cobra el regalo del dia. Si ya se cobro, devuelve el mismo estado: el
 * boton puede tocarse dos veces sin que eso regale dos veces.
 */
export function reclamarRegaloDiario(estado: GameState, ahora: number): GameState {
  if (!regaloDiarioDisponible(estado, ahora)) return estado;
  return {
    ...estado,
    monedas: estado.monedas + BALANCE.regaloDiario,
    regaloDiario: claveDelDia(ahora),
  };
}

/* ------------------------------------------------------------------ */
/* Caballo de la casa                                                  */
/* ------------------------------------------------------------------ */

const NOMBRES_CABALLO = ['Trueno', 'Luna', 'Brisa', 'Centella', 'Nube', 'Tizón', 'Estrella'];

/**
 * Un caballo ya adoptado, con nombre, parado sobre una isla concreta.
 * El pelaje y el nombre salen del orden de la isla, asi cada isla tiene el
 * suyo y recargar no los cambia.
 */
export function caballoDeLaCasa(isla: IslaState, orden: number, ahora: number): AnimalState {
  const variantes = variantsOfSpecies('caballo');
  const variante = variantes[orden % variantes.length];
  const { x, z } = celdaAleatoria([isla], () => ((orden + 1) * 0.618) % 1);

  return {
    uid: `caballo-casa-${isla.id}`,
    especie: 'caballo',
    variante: variante.id,
    nombre: NOMBRES_CABALLO[orden % NOMBRES_CABALLO.length],
    estado: 'adoptado',
    confianza: 100,
    hambre: 20,
    felicidad: 90,
    vinculo: 10,
    adoptadoEn: ahora,
    x,
    z,
    proximoRegalo: ahora + BALANCE.minutosEntreRegalos * 60_000,
  };
}

/**
 * Le da su caballo a cada isla que todavia no lo tuvo.
 *
 * Se lleva la cuenta por isla y no por "hay un caballo en el jardin": asi
 * una isla nueva recibe el suyo aunque ya haya otros, y un caballo que
 * llego solo como visitante no le quita el de la casa a nadie.
 */
export function asegurarCaballos(
  estado: GameState,
  ahora: number,
): { estado: GameState; nuevos: AnimalState[] } {
  const con = new Set(estado.islasConCaballo ?? []);
  const faltan = estado.islas.filter((i) => !con.has(i.id));
  if (faltan.length === 0) return { estado, nuevos: [] };

  const nuevos = faltan.map((isla) => caballoDeLaCasa(isla, estado.islas.indexOf(isla), ahora));

  return {
    estado: {
      ...estado,
      animales: [...estado.animales, ...nuevos],
      islasConCaballo: [...con, ...faltan.map((i) => i.id)],
    },
    nuevos,
  };
}

/* ------------------------------------------------------------------ */
/* Pedidos del pueblo                                                  */
/* ------------------------------------------------------------------ */

const CLIENTES = [
  'La panadería',
  'La florería del pueblo',
  'Doña Rosa',
  'La escuela',
  'El café de la plaza',
  'Una boda en el pueblo',
  'La biblioteca',
];

/** Cuantas flores pide cada especie: las lentas, menos. */
const CANTIDAD: Record<FlowerSpeciesId, [number, number]> = {
  margarita: [4, 6],
  tulipan: [4, 6],
  lavanda: [3, 5],
  rosa: [2, 4],
  girasol: [2, 3],
};

function ventaPromedio(especie: FlowerSpeciesId): number {
  const vs = FLOWER_VARIANTS.filter((v) => v.especie === especie);
  return vs.reduce((n, v) => n + v.precioVenta, 0) / vs.length;
}

/**
 * Un pedido nuevo. Nunca repite la especie del anterior, para que dos
 * pedidos seguidos no pidan lo mismo.
 */
export function nuevoPedido(anterior: Pedido | undefined, rng = Math.random): Pedido {
  const especies = (Object.keys(FLOWER_SPECIES) as FlowerSpeciesId[]).filter(
    (e) => e !== anterior?.especie,
  );
  const especie = especies[Math.floor(rng() * especies.length)];
  const [min, max] = CANTIDAD[especie];
  const cantidad = min + Math.floor(rng() * (max - min + 1));
  // Paga encima de la venta: cada flor ya se cobra al cosecharla.
  const recompensa = Math.round(cantidad * ventaPromedio(especie) * BALANCE.bonoPedido + 20);

  return {
    id: `pedido-${Date.now().toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`,
    cliente: CLIENTES[Math.floor(rng() * CLIENTES.length)],
    especie,
    cantidad,
    progreso: 0,
    recompensa,
  };
}

/** Garantiza que haya un pedido activo. */
export function asegurarPedido(estado: GameState, rng = Math.random): GameState {
  if (estado.pedido) return estado;
  return { ...estado, pedido: nuevoPedido(undefined, rng) };
}

export interface ResultadoCosecha {
  estado: GameState;
  /** El pedido se completo con esta cosecha y se cobro la recompensa. */
  entregado: Pedido | null;
  /** Avanzo el pedido pero todavia falta. */
  avanzo: boolean;
}

/**
 * Anota una flor cosechada en el pedido activo. Si lo completa, paga la
 * recompensa y deja otro pedido esperando.
 */
export function anotarCosecha(
  estado: GameState,
  especie: FlowerSpeciesId,
  rng = Math.random,
): ResultadoCosecha {
  const pedido = estado.pedido;
  if (!pedido || pedido.especie !== especie) return { estado, entregado: null, avanzo: false };

  const progreso = pedido.progreso + 1;
  if (progreso < pedido.cantidad) {
    return { estado: { ...estado, pedido: { ...pedido, progreso } }, entregado: null, avanzo: true };
  }

  return {
    estado: {
      ...estado,
      monedas: estado.monedas + pedido.recompensa,
      pedidosCompletados: (estado.pedidosCompletados ?? 0) + 1,
      pedido: nuevoPedido(pedido, rng),
    },
    entregado: { ...pedido, progreso },
    avanzo: true,
  };
}

/** Cambia el pedido por otro. No cuesta nada: es para no quedar trabado. */
export function rechazarPedido(estado: GameState, rng = Math.random): GameState {
  return { ...estado, pedido: nuevoPedido(estado.pedido, rng) };
}

/* ------------------------------------------------------------------ */
/* Campo de tiro                                                       */
/* ------------------------------------------------------------------ */

/** Lo que el campo de tiro todavia puede pagar hoy. */
export function restanteTiroHoy(estado: GameState, ahora: number): number {
  const hoy = claveDelDia(ahora);
  const ganado = estado.tiroDiario?.dia === hoy ? estado.tiroDiario.ganado : 0;
  return Math.max(0, BALANCE.topeTiroDiario - ganado);
}

/**
 * Paga un flechazo en el muneco. Cuanto mas lejos, mas paga, porque mas
 * cuesta acertar: el viento y la caida pesan con la distancia.
 */
export function pagarTiro(
  estado: GameState,
  metros: number,
  ahora: number,
): { estado: GameState; pago: number } {
  const restante = restanteTiroHoy(estado, ahora);
  const pago = Math.min(restante, Math.max(1, Math.round(metros * BALANCE.monedasPorMetro)));
  if (pago <= 0) return { estado, pago: 0 };

  const hoy = claveDelDia(ahora);
  const ganado = (estado.tiroDiario?.dia === hoy ? estado.tiroDiario.ganado : 0) + pago;

  return {
    estado: { ...estado, monedas: estado.monedas + pago, tiroDiario: { dia: hoy, ganado } },
    pago,
  };
}
