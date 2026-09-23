/**
 * La voz del juego.
 *
 * Los avisos que salen mil veces —"no te alcanza", "ahí no hay nada"— son
 * los que mas rapido suenan a maquina: leer la misma linea exacta por
 * decima vez recuerda que atras hay un if. Por eso los mas repetidos
 * tienen varias formas y se elige una al azar.
 *
 * El tono es el de alguien que sabe de plantas y te habla de vos: frases
 * cortas, concretas, sin signos de admiracion de mas y sin palabras de
 * programa (nada de "celda", "entidad" ni "operacion invalida").
 */

export function unaDe(frases: readonly string[], rng = Math.random): string {
  return frases[Math.floor(rng() * frases.length)] ?? frases[0];
}

export const SIN_MONEDAS = [
  'Con lo que tenés en el bolsillo no alcanza',
  'Te falta plata para eso',
  'Todavía no. Cosechá un poco y volvé',
] as const;

export const NADA_ACA = [
  'Ahí no hay nada todavía',
  'Ese pedacito está vacío',
  'No hay nada que tocar ahí',
] as const;

export const NADA_QUE_REGAR = [
  'Ahí no hay nada con sed',
  'Ese pedacito está vacío: primero hay que sembrar',
] as const;

export const TODAVIA_NO_ESTA = [
  'Todavía le falta un poco',
  'Esa flor está en camino. Dale tiempo',
  'Aún no abrió del todo',
] as const;

export const AHI_HAY_CASA = [
  'Ahí está tu casa',
  'Ese lugar ya es de la casa',
] as const;
