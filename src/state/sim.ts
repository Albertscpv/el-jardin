/**
 * Simulacion pura del jardin.
 *
 * Todo avanza en funcion del tiempo real transcurrido, no de los frames.
 * Eso permite una sola regla para el juego abierto y para las horas en que
 * estuvo cerrado: `advance(estado, ahora)`.
 */

import { BALANCE, SAVE_VERSION } from './config';
import {
  ANIMAL_SPECIES,
  FLOWER_SPECIES,
  getFlowerVariant,
  unArticulo,
  variantsOfSpecies,
} from './content';
import { celdaAleatoria, crearAvatarInicial, crearIslaInicial } from './islas';
import type {
  AnimalSpeciesId,
  AnimalState,
  CeldaId,
  GameState,
  GrowthStage,
  PlantState,
} from './types';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function stageOf(planta: PlantState): GrowthStage {
  if (planta.marchitez >= 1) return 'marchita';
  if (planta.growth >= 1) return 'flor';
  if (planta.growth >= BALANCE.etapaCapullo) return 'capullo';
  if (planta.growth >= BALANCE.etapaBrote) return 'brote';
  return 'semilla';
}

export function contarFlores(estado: GameState): number {
  let n = 0;
  for (const planta of Object.values(estado.cultivos)) {
    if (stageOf(planta) === 'flor') n++;
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* Estado inicial                                                      */
/* ------------------------------------------------------------------ */

export function crearEstadoInicial(nombreJardin = 'Mi jardín'): GameState {
  const ahora = Date.now();

  return {
    version: SAVE_VERSION,
    nombreJardin,
    monedas: BALANCE.monedasIniciales,
    // Un puñado de semillas fáciles para que la primera partida arranque sola.
    semillas: { 'margarita-blanca': 3, 'tulipan-rojo': 2 },
    comida: { nectar: 2 },
    islas: [crearIslaInicial()],
    cultivos: {},
    animales: [],
    avatar: crearAvatarInicial(),
    floresCosechadas: 0,
    creadoEn: ahora,
    ultimoTick: ahora,
  };
}

/* ------------------------------------------------------------------ */
/* Avance temporal                                                     */
/* ------------------------------------------------------------------ */

export interface AdvanceResult {
  estado: GameState;
  /** Cosas que pasaron mientras tanto y vale la pena contarle al jugador. */
  eventos: string[];
}

/**
 * Avanza el estado hasta `ahora`. Es puro: devuelve un estado nuevo.
 * Se llama tanto en cada tick del juego como al cargar la partida.
 */
export function advance(previo: GameState, ahora: number, rng = Math.random): AdvanceResult {
  const brutos = (ahora - previo.ultimoTick) / 1000;
  if (brutos <= 0) return { estado: previo, eventos: [] };

  const dt = Math.min(brutos, BALANCE.maxSegundosOffline);
  const eventos: string[] = [];

  /* --- Plantas ---------------------------------------------------- */
  let florecieron = 0;
  let seMarchitaron = 0;

  const cultivos: Record<CeldaId, PlantState> = {};
  for (const [id, planta] of Object.entries(previo.cultivos)) {
    const etapaAntes = stageOf(planta);
    const variante = getFlowerVariant(planta.variantId);
    const segundosTotales = FLOWER_SPECIES[variante.especie].minutosCrecimiento * 60;

    const humedad = clamp01(planta.humedad - dt / BALANCE.segundosDeHumedad);

    // Solo crece mientras tenga agua; el tiempo seco cuenta hacia la marchitez.
    const segundosHumedos = Math.min(dt, planta.humedad * BALANCE.segundosDeHumedad);
    const segundosSecos = dt - segundosHumedos;

    const growth = clamp01(planta.growth + segundosHumedos / segundosTotales);
    const marchitez = clamp01(
      planta.marchitez +
        segundosSecos / BALANCE.segundosHastaMarchitar -
        // Regar no solo detiene la marchitez: la revierte a la mitad de ritmo.
        segundosHumedos / (BALANCE.segundosHastaMarchitar * 2),
    );

    const siguiente: PlantState = { ...planta, humedad, growth, marchitez };
    const etapaDespues = stageOf(siguiente);

    if (etapaAntes !== 'flor' && etapaDespues === 'flor') florecieron++;
    if (etapaAntes !== 'marchita' && etapaDespues === 'marchita') seMarchitaron++;

    cultivos[id] = siguiente;
  }

  if (florecieron > 0) {
    eventos.push(
      florecieron === 1 ? 'Una flor se abrió 🌷' : `${florecieron} flores se abrieron 🌷`,
    );
  }
  if (seMarchitaron > 0) {
    eventos.push(
      seMarchitaron === 1
        ? 'Una planta se marchitó por falta de agua'
        : `${seMarchitaron} plantas se marchitaron por falta de agua`,
    );
  }

  /* --- Animales --------------------------------------------------- */
  let monedas = previo.monedas;
  let regalos = 0;

  const animales: AnimalState[] = [];
  for (const animal of previo.animales) {
    if (animal.estado === 'visitante') {
      // Un visitante ignorado pierde confianza y termina yéndose.
      const confianza = animal.confianza - BALANCE.confianzaPerdidaPorSegundo * dt;
      if (confianza <= 0) {
        eventos.push(`Se fue ${unArticulo(animal.especie)} del jardín`);
        continue;
      }
      animales.push({ ...animal, confianza: clamp100(confianza) });
      continue;
    }

    const hambre = clamp100(animal.hambre + (100 * dt) / BALANCE.segundosDeSaciedad);
    // Con mucha hambre la felicidad cae al doble de rapido.
    const castigo = hambre > 70 ? 2 : 1;
    const felicidad = clamp100(
      animal.felicidad - (100 * dt * castigo) / BALANCE.segundosDeFelicidad,
    );
    // El vinculo sube solo si está bien cuidado, y nunca baja de golpe.
    const vinculo = clamp100(
      animal.vinculo + (felicidad > 60 && hambre < 40 ? dt / 90 : -dt / 900),
    );

    let proximoRegalo = animal.proximoRegalo;
    if (felicidad > 70 && ahora >= proximoRegalo) {
      const vueltas = Math.max(
        1,
        Math.floor((ahora - proximoRegalo) / (BALANCE.minutosEntreRegalos * 60_000)) + 1,
      );
      for (let i = 0; i < Math.min(vueltas, 5); i++) {
        monedas += 8 + Math.floor(rng() * 12);
        regalos++;
      }
      proximoRegalo = ahora + BALANCE.minutosEntreRegalos * 60_000;
    }

    animales.push({ ...animal, hambre, felicidad, vinculo, proximoRegalo });
  }

  if (regalos > 0) {
    eventos.push(
      regalos === 1
        ? 'Un animal te dejó un regalo 🎁'
        : `Tus animales te dejaron ${regalos} regalos 🎁`,
    );
  }

  return {
    estado: { ...previo, cultivos, animales, monedas, ultimoTick: ahora },
    eventos,
  };
}

/* ------------------------------------------------------------------ */
/* Visitantes                                                          */
/* ------------------------------------------------------------------ */

/** Especies que podrian visitar el jardin con la cantidad actual de flores. */
export function especiesDisponibles(flores: number): AnimalSpeciesId[] {
  return (Object.keys(ANIMAL_SPECIES) as AnimalSpeciesId[]).filter(
    (id) => flores >= ANIMAL_SPECIES[id].floresParaVisitar,
  );
}

/** Cuantos animales caben a la vez en el jardin. */
export function aforo(flores: number): number {
  return Math.min(10, 1 + Math.floor(flores / 3));
}

export function crearVisitante(
  especie: AnimalSpeciesId,
  estado: GameState,
  rng = Math.random,
): AnimalState {
  const variantes = variantsOfSpecies(especie);
  const variante = variantes[Math.floor(rng() * variantes.length)];
  // Aparecen sobre tierra firme, en cualquiera de las islas.
  const { x, z } = celdaAleatoria(estado.islas, rng);

  return {
    uid: `${especie}-${Date.now().toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`,
    especie,
    variante: variante.id,
    nombre: null,
    estado: 'visitante',
    // Los animales raros arrancan mas desconfiados.
    confianza: Math.max(4, 30 - ANIMAL_SPECIES[especie].floresParaVisitar * 1.4),
    hambre: 40 + rng() * 30,
    felicidad: 55 + rng() * 20,
    vinculo: 0,
    adoptadoEn: null,
    x,
    z,
    proximoRegalo: Date.now() + BALANCE.minutosEntreRegalos * 60_000,
  };
}
