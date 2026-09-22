import { describe, expect, it } from 'vitest';
import { ACCESORIOS, PEINADOS, PRENDAS, SOMBREROS } from '../../state/content';
import { crearAvatarInicial } from '../../state/islas';
import { ALTO_PERSONAJE, ANCHO_PERSONAJE, paletaPersonaje, spritePersonaje, type Pose } from './personaje';

const POSES: Pose[] = ['quieto', 'pasoA', 'pasoB', 'parpadeo', 'festejo', 'trabajo'];

describe('personaje', () => {
  it('toda combinación arma un sprite de 16x20 sin letras sin color', () => {
    const base = crearAvatarInicial();
    for (const peinado of PEINADOS)
      for (const prenda of PRENDAS)
        for (const accesorio of ACCESORIOS)
          for (const sombrero of SOMBREROS) {
            const ap = {
              ...base,
              peinado: peinado.id,
              prenda: prenda.id,
              accesorio: accesorio.id,
              sombrero: sombrero.id,
            };
            const paleta = paletaPersonaje(ap);
            for (const pose of POSES) {
              const m = spritePersonaje(ap, pose);
              expect(m).toHaveLength(ALTO_PERSONAJE);
              for (const fila of m) {
                expect(fila).toHaveLength(ANCHO_PERSONAJE);
                for (const ch of fila) if (ch !== '.') expect(paleta[ch], `${ch} en ${pose}`).toBeTruthy();
              }
            }
          }
  });

  it('un avatar guardado antes del rediseño (sin los campos nuevos) se sigue dibujando', () => {
    const viejo = {
      nombre: 'X', piel: '#e8b48c', pelo: '#5a3a26', ropa: '#6fae5a', pantalon: '#4a6a8a',
      sombrero: 'gorro' as const, colorSombrero: '#e0b463', x: 0, z: 0,
    };
    expect(spritePersonaje(viejo)).toHaveLength(ALTO_PERSONAJE);
  });

  it('las poses cambian el dibujo', () => {
    const a = crearAvatarInicial();
    expect(spritePersonaje(a, 'pasoA')).not.toEqual(spritePersonaje(a, 'quieto'));
    expect(spritePersonaje(a, 'parpadeo')).not.toEqual(spritePersonaje(a, 'quieto'));
    expect(spritePersonaje(a, 'festejo')).not.toEqual(spritePersonaje(a, 'quieto'));
  });
});
