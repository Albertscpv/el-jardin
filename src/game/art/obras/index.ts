/**
 * El catalogo de pinturas: cada obra con su tamaño, sus pixeles y su ficha.
 *
 * El atril del jardin y el visor grande leen de aca, asi que sumar una obra
 * es pintarla y anotarla en esta lista.
 */

import type { ObraId } from '../../../state/arte';
import { COLORES_BESO, FICHA_BESO, LADO_BESO, pixelesDelBeso } from '../beso';
import { ALTO_GIOCONDA, ANCHO_GIOCONDA, FICHA_GIOCONDA, PALETA_GIOCONDA, pixelesGioconda } from './gioconda';
import { ALTO_OLA, ANCHO_OLA, FICHA_OLA, PALETA_OLA, pixelesGranOla } from './granOla';
import { ALTO_GRITO, ANCHO_GRITO, FICHA_GRITO, PALETA_GRITO, pixelesGrito } from './grito';
import { ALTO_PERLA, ANCHO_PERLA, FICHA_PERLA, PALETA_PERLA, pixelesJovenPerla } from './jovenPerla';
import { ALTO_NENUFARES, ANCHO_NENUFARES, FICHA_NENUFARES, PALETA_NENUFARES, pixelesNenufares } from './nenufares';
import { ALTO_NOCHE, ANCHO_NOCHE, FICHA_NOCHE, PALETA_NOCHE, pixelesNocheEstrellada } from './nocheEstrellada';
import type { Ficha } from './pincel';

export interface Pintura {
  ancho: number;
  alto: number;
  /** Colores en orden de lectura: fila por fila, de arriba hacia abajo. */
  pixeles: () => string[];
  paleta: readonly string[];
  ficha: Ficha;
}

export const PINTURAS: Record<ObraId, Pintura> = {
  beso: {
    ancho: LADO_BESO,
    alto: LADO_BESO,
    pixeles: () => pixelesDelBeso(),
    paleta: Object.values(COLORES_BESO),
    ficha: FICHA_BESO,
  },
  noche: { ancho: ANCHO_NOCHE, alto: ALTO_NOCHE, pixeles: pixelesNocheEstrellada, paleta: PALETA_NOCHE, ficha: FICHA_NOCHE },
  gioconda: { ancho: ANCHO_GIOCONDA, alto: ALTO_GIOCONDA, pixeles: pixelesGioconda, paleta: PALETA_GIOCONDA, ficha: FICHA_GIOCONDA },
  ola: { ancho: ANCHO_OLA, alto: ALTO_OLA, pixeles: pixelesGranOla, paleta: PALETA_OLA, ficha: FICHA_OLA },
  perla: { ancho: ANCHO_PERLA, alto: ALTO_PERLA, pixeles: pixelesJovenPerla, paleta: PALETA_PERLA, ficha: FICHA_PERLA },
  grito: { ancho: ANCHO_GRITO, alto: ALTO_GRITO, pixeles: pixelesGrito, paleta: PALETA_GRITO, ficha: FICHA_GRITO },
  nenufares: {
    ancho: ANCHO_NENUFARES,
    alto: ALTO_NENUFARES,
    pixeles: pixelesNenufares,
    paleta: PALETA_NENUFARES,
    ficha: FICHA_NENUFARES,
  },
};

const pintadas = new Map<ObraId, string[]>();

/** Los pixeles de una obra, pintados una sola vez y guardados. */
export function pixelesDe(id: ObraId): string[] {
  let px = pintadas.get(id);
  if (!px) {
    px = PINTURAS[id].pixeles();
    pintadas.set(id, px);
  }
  return px;
}
