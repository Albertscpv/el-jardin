import { describe, expect, it, vi } from 'vitest';
import { amigosDe, claveAmistad, cultivarAmistades, olvidarAmistades, sonAmigos } from './amistades';
import { crearEstadoInicial } from './sim';
import type { AnimalState, GameState } from './types';

const animal = (uid: string, x: number, z: number, estado: AnimalState['estado'] = 'adoptado'): AnimalState => ({
  uid, especie: 'conejo', variante: 'conejo-blanco', nombre: uid, estado,
  confianza: 100, hambre: 20, felicidad: 80, vinculo: 10, adoptadoEn: 0, x, z, proximoRegalo: 0,
});

const jardin = (animales: AnimalState[]): GameState => ({ ...crearEstadoInicial(), animales });

describe('amistades entre animales', () => {
  it('dos que andan cerca terminan siendo amigos', () => {
    const e = jardin([animal('Copo', 5, 5), animal('Luna', 6, 5)]);
    // Un rato largo juntos: la amistad sale sí o sí.
    const { estado, nuevas } = cultivarAmistades(e, 600);

    expect(nuevas).toHaveLength(1);
    expect(sonAmigos(estado, 'Copo', 'Luna')).toBe(true);
    expect(amigosDe(estado, 'Copo')).toEqual(['Luna']);
  });

  it('dos que están lejos no se hacen amigos', () => {
    const e = jardin([animal('Copo', 0, 0), animal('Luna', 20, 20)]);
    const { estado, nuevas } = cultivarAmistades(e, 600);

    expect(nuevas).toEqual([]);
    expect(estado).toBe(e);
  });

  it('los visitantes no cuentan: la amistad es de los que se quedan', () => {
    const e = jardin([animal('Copo', 5, 5), animal('Pasa', 5.5, 5, 'visitante')]);
    expect(cultivarAmistades(e, 600).nuevas).toEqual([]);
  });

  it('la amistad es una sola, no una por cada lado, y no se duplica', () => {
    const e = jardin([animal('Copo', 5, 5), animal('Luna', 5.5, 5)]);
    const primera = cultivarAmistades(e, 600).estado;
    const segunda = cultivarAmistades(primera, 600);

    expect(segunda.nuevas).toEqual([]);
    expect(segunda.estado.amistades).toHaveLength(1);
    expect(sonAmigos(primera, 'Luna', 'Copo')).toBe(true);
    expect(claveAmistad('Luna', 'Copo')).toBe(claveAmistad('Copo', 'Luna'));
  });

  it('lleva su tiempo: un ratito corto casi nunca alcanza', () => {
    const e = jardin([animal('Copo', 5, 5), animal('Luna', 5.5, 5)]);
    // Con la suerte en contra, cuatro segundos no bastan.
    const azar = vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(cultivarAmistades(e, 4).nuevas).toEqual([]);
    azar.mockRestore();
  });

  it('si un animal se va, sus amistades se olvidan', () => {
    const e = jardin([animal('Copo', 5, 5), animal('Luna', 5.5, 5), animal('Sol', 5.2, 5.2)]);
    const conAmigos = cultivarAmistades(e, 600).estado;
    expect(conAmigos.amistades!.length).toBeGreaterThanOrEqual(2);

    const sinLuna = olvidarAmistades(conAmigos, 'Luna');
    expect(amigosDe(sinLuna, 'Luna')).toEqual([]);
    expect(sonAmigos(sinLuna, 'Copo', 'Sol')).toBe(true);
  });

  it('una partida vieja, sin amistades, no se rompe', () => {
    const vieja = { ...jardin([animal('Copo', 5, 5)]), amistades: undefined };
    expect(amigosDe(vieja, 'Copo')).toEqual([]);
    expect(olvidarAmistades(vieja, 'Copo')).toBe(vieja);
  });
});
