import { describe, expect, it } from 'vitest';
import { IDS_OBRAS, type ObraId } from '../../../state/arte';
import { PINTURAS, pixelesDe } from '.';

/** Qué parte de un rectángulo (en fracciones del cuadro) es de estos colores. */
function proporcion(id: ObraId, u0: number, v0: number, u1: number, v1: number, colores: string[]): number {
  const { ancho, alto } = PINTURAS[id];
  const px = pixelesDe(id);
  let total = 0;
  let si = 0;
  for (let y = Math.floor(v0 * alto); y < Math.ceil(v1 * alto); y++) {
    for (let x = Math.floor(u0 * ancho); x < Math.ceil(u1 * ancho); x++) {
      total++;
      if (colores.includes(px[y * ancho + x])) si++;
    }
  }
  return si / total;
}

describe('la galería de obras', () => {
  for (const id of IDS_OBRAS) {
    const p = PINTURAS[id];

    it(`${p.ficha.titulo}: tiene todos sus píxeles, siempre iguales y de su paleta`, () => {
      const px = p.pixeles();
      expect(px).toHaveLength(p.ancho * p.alto);
      expect(p.pixeles()).toEqual(px);
      const paleta = new Set(p.paleta);
      expect(px.every((c) => paleta.has(c))).toBe(true);
      // Un cuadro, no una mancha: usa buena parte de su paleta.
      expect(new Set(px).size).toBeGreaterThanOrEqual(Math.min(6, paleta.size));
    });

    it(`${p.ficha.titulo}: tiene su ficha completa`, () => {
      for (const campo of Object.values(p.ficha)) expect(String(campo).length).toBeGreaterThan(0);
    });
  }

  it('respeta la forma de los originales', () => {
    const forma = (id: ObraId) => PINTURAS[id].ancho / PINTURAS[id].alto;
    expect(forma('beso')).toBe(1);
    expect(forma('gioconda')).toBeLessThan(0.8); // vertical
    expect(forma('grito')).toBeLessThan(0.9);
    expect(forma('perla')).toBeLessThan(1);
    expect(forma('noche')).toBeGreaterThan(1.15); // apaisados
    expect(forma('ola')).toBeGreaterThan(1.3);
    expect(forma('nenufares')).toBeGreaterThan(1.15);
  });

  it('cada cuadro tiene lo suyo donde va', () => {
    const paleta = (id: ObraId) => PINTURAS[id].paleta as string[];
    // El grito: arriba, el cielo en llamas (naranjas, rojos y amarillos).
    expect(proporcion('grito', 0, 0, 1, 0.25, paleta('grito').slice(0, 3))).toBeGreaterThan(0.95);
    // La joven de la perla: las esquinas de arriba son el fondo oscuro.
    expect(proporcion('perla', 0, 0, 0.12, 0.12, paleta('perla').slice(0, 2))).toBeGreaterThan(0.9);
    // La gran ola: hay espuma blanca en la cresta y mucha agua azul.
    expect(proporcion('ola', 0, 0, 1, 1, ['#f2ecdc'])).toBeGreaterThan(0.03);
    expect(proporcion('ola', 0, 0.5, 1, 1, ['#1f3a6a', '#2f5a8e', '#6a96c0'])).toBeGreaterThan(0.4);
    // Monet: nenúfares verdes flotando abajo, en el agua.
    expect(proporcion('nenufares', 0, 0.55, 1, 1, ['#5a8a3a', '#7aa848'])).toBeGreaterThan(0.08);
  });

  it('pinta cada obra una sola vez', () => {
    expect(pixelesDe('noche')).toBe(pixelesDe('noche'));
  });
});
