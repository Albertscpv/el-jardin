/**
 * Regalos personales: lo que un administrador le da a un jugador concreto,
 * por ejemplo para devolverle un jardin que perdio.
 *
 * El regalo llega como datos escritos a mano en Supabase, asi que aca se
 * valida todo: una especie mal escrita o un numero negativo se descartan en
 * vez de romper la partida. Lo que se entrega se arma con las mismas
 * funciones del juego, asi que una isla o un animal regalados son
 * identicos a los que el jugador consigue jugando.
 *
 * Es puro: el store decide cuando entregar, aca solo esta como.
 */

import { ANIMAL_SPECIES, FLOWER_VARIANT_BY_ID, FOODS, variantsOfSpecies } from './content';
import { asegurarCaballos } from './economia';
import { celdaAleatoria, celdasExpandibles, crearIslaNueva } from './islas';
import { BALANCE, celdaLocal } from './config';
import type {
  AnimalSpeciesId,
  AnimalState,
  ContenidoRegalo,
  FoodId,
  GameState,
  RegaloPersonal,
} from './types';

/** Topes de cordura: un cero de mas tipeado a mano no rompe el juego. */
const TOPE_MONEDAS = 1_000_000;
const TOPE_CANTIDAD = 999;
const TOPE_ISLAS = 10;
const TOPE_TIERRA = 400;
const TOPE_ANIMALES = 30;

/** Un entero positivo y acotado, o 0 si el dato no sirve. */
function cantidad(valor: unknown, tope: number): number {
  const n = Math.floor(Number(valor));
  return Number.isFinite(n) && n > 0 ? Math.min(n, tope) : 0;
}

export function yaRecibido(estado: GameState, id: number): boolean {
  return (estado.regalosPersonales ?? []).some((r) => r.id === id);
}

export interface ResultadoRegaloPersonal {
  estado: GameState;
  /** False si ya se habia entregado antes: no se toco nada. */
  aplicado: boolean;
  resumen: string[];
}

/**
 * Entrega un regalo personal. Es idempotente: si el jardin ya lo tiene
 * anotado, devuelve el mismo estado sin cambios.
 */
export function aplicarRegaloPersonal(
  previo: GameState,
  regalo: RegaloPersonal,
  ahora: number,
  rng: () => number = Math.random,
): ResultadoRegaloPersonal {
  if (yaRecibido(previo, regalo.id)) return { estado: previo, aplicado: false, resumen: [] };

  const c: ContenidoRegalo = regalo.contenido ?? {};
  let estado: GameState = { ...previo };
  const resumen: string[] = [];

  const monedas = cantidad(c.monedas, TOPE_MONEDAS);
  if (monedas > 0) {
    estado.monedas += monedas;
    resumen.push(`${monedas} monedas`);
  }

  // Semillas: solo variedades que existen.
  let semillas = 0;
  const nuevasSemillas = { ...estado.semillas };
  for (const [id, n] of Object.entries(c.semillas ?? {})) {
    const k = cantidad(n, TOPE_CANTIDAD);
    if (k === 0 || !FLOWER_VARIANT_BY_ID.has(id)) continue;
    nuevasSemillas[id] = (nuevasSemillas[id] ?? 0) + k;
    semillas += k;
  }
  if (semillas > 0) {
    estado.semillas = nuevasSemillas;
    resumen.push(semillas === 1 ? '1 semilla' : `${semillas} semillas`);
  }

  let comida = 0;
  const nuevaComida = { ...estado.comida };
  for (const [id, n] of Object.entries(c.comida ?? {})) {
    const k = cantidad(n, TOPE_CANTIDAD);
    if (k === 0 || !Object.hasOwn(FOODS, id)) continue;
    nuevaComida[id as FoodId] = (nuevaComida[id as FoodId] ?? 0) + k;
    comida += k;
  }
  if (comida > 0) {
    estado.comida = nuevaComida;
    resumen.push(comida === 1 ? '1 comida' : `${comida} comidas`);
  }

  const farolas = cantidad(c.farolas, TOPE_CANTIDAD);
  if (farolas > 0) {
    estado.objetos = { ...estado.objetos, farola: (estado.objetos?.farola ?? 0) + farolas };
    resumen.push(farolas === 1 ? '1 farola' : `${farolas} farolas`);
  }

  // Tierra antes que islas y animales: los animales pueden aparecer en ella.
  const tierra = cantidad(c.tierra, TOPE_TIERRA);
  if (tierra > 0 && estado.islas.length > 0) {
    const [principal, ...resto] = estado.islas;
    const suelo = [...principal.suelo];
    let ganadas = 0;
    for (let i = 0; i < tierra; i++) {
      const libres = celdasExpandibles({ ...principal, suelo });
      if (libres.length === 0) break;
      const { col, row } = libres[Math.floor(rng() * libres.length)];
      suelo.push(celdaLocal(col, row));
      ganadas++;
    }
    estado.islas = [{ ...principal, suelo }, ...resto];
    if (ganadas > 0) resumen.push(ganadas === 1 ? '1 celda de tierra' : `${ganadas} celdas de tierra`);
  }

  const islas = cantidad(c.islas, TOPE_ISLAS);
  if (islas > 0) {
    const todas = [...estado.islas];
    for (let i = 0; i < islas; i++) todas.push(crearIslaNueva(todas));
    estado.islas = todas;
    // Cada isla trae su caballo, igual que si el jugador la fundara.
    estado = asegurarCaballos(estado, ahora).estado;
    resumen.push(islas === 1 ? '1 isla nueva' : `${islas} islas nuevas`);
  }

  const animales: AnimalState[] = [];
  for (const [i, pedido] of (c.animales ?? []).slice(0, TOPE_ANIMALES).entries()) {
    const especie = pedido?.especie as AnimalSpeciesId;
    // hasOwn y no un acceso directo: 'constructor' tambien es una clave de
    // cualquier objeto, y un regalo escrito a mano no tiene que poder romper nada.
    if (typeof especie !== 'string' || !Object.hasOwn(ANIMAL_SPECIES, especie)) continue;
    const variantes = variantsOfSpecies(especie);
    const variante =
      variantes.find((v) => v.id === pedido.variante) ??
      variantes[Math.floor(rng() * variantes.length)];
    const nombre =
      String(pedido.nombre ?? '').trim().slice(0, 18) || ANIMAL_SPECIES[especie].nombre;
    const { x, z } = celdaAleatoria(estado.islas, rng);

    animales.push({
      uid: `regalo-${regalo.id}-${i}`,
      especie,
      variante: variante.id,
      nombre,
      estado: 'adoptado',
      confianza: 100,
      hambre: 20,
      felicidad: 90,
      vinculo: 10,
      adoptadoEn: ahora,
      x,
      z,
      proximoRegalo: ahora + BALANCE.minutosEntreRegalos * 60_000,
    });
    resumen.push(`${nombre} (${ANIMAL_SPECIES[especie].nombre.toLowerCase()})`);
  }
  if (animales.length > 0) estado.animales = [...estado.animales, ...animales];

  estado.regalosPersonales = [
    ...(estado.regalosPersonales ?? []),
    { id: regalo.id, mensaje: regalo.mensaje ?? '', recibidoEn: ahora, resumen },
  ];

  return { estado, aplicado: true, resumen };
}
