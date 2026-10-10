import { describe, expect, it } from 'vitest';
import { anotarVariedad, nombreEnAlbum, progresoAlbum, variedadesDe, yaVista } from './album';
import { FLOWER_VARIANTS } from './content';
import { crearEstadoInicial } from './sim';

describe('el álbum de flores', () => {
  it('una partida nueva lo tiene vacío', () => {
    const p = progresoAlbum(crearEstadoInicial());
    expect(p.vistas).toBe(0);
    expect(p.total).toBe(FLOWER_VARIANTS.length);
    expect(p.completo).toBe(false);
  });

  it('la primera cosecha de una variedad la anota, y repetirla no cambia nada', () => {
    const base = crearEstadoInicial();
    const una = anotarVariedad(base, 'tulipan-rojo');
    expect(yaVista(una, 'tulipan-rojo')).toBe(true);
    expect(progresoAlbum(una).vistas).toBe(1);

    // La misma otra vez: ni duplica ni crea un estado nuevo.
    expect(anotarVariedad(una, 'tulipan-rojo')).toBe(una);
  });

  it('cuenta por especie, que es como se muestra', () => {
    let e = crearEstadoInicial();
    for (const v of variedadesDe('tulipan')) e = anotarVariedad(e, v.id);
    e = anotarVariedad(e, 'rosa-roja');

    const p = progresoAlbum(e);
    const tulipanes = p.porEspecie.find((x) => x.especie === 'tulipan')!;
    const rosas = p.porEspecie.find((x) => x.especie === 'rosa')!;

    expect(tulipanes.vistas).toBe(tulipanes.total);
    expect(rosas.vistas).toBe(1);
    expect(rosas.vistas).toBeLessThan(rosas.total);
  });

  it('con todas, el álbum está completo', () => {
    let e = crearEstadoInicial();
    for (const v of FLOWER_VARIANTS) e = anotarVariedad(e, v.id);
    const p = progresoAlbum(e);
    expect(p.completo).toBe(true);
    expect(p.vistas).toBe(p.total);
  });

  it('las que no salieron todavía no muestran su nombre', () => {
    const e = anotarVariedad(crearEstadoInicial(), 'girasol-clasico');
    expect(nombreEnAlbum(e, 'girasol-clasico')).toBe('Girasol');
    expect(nombreEnAlbum(e, 'lavanda-azul')).toBe('¿?');
  });

  it('una partida vieja, sin el campo, no se rompe', () => {
    const vieja = { ...crearEstadoInicial(), variedadesVistas: undefined };
    expect(progresoAlbum(vieja).vistas).toBe(0);
    expect(anotarVariedad(vieja, 'rosa-blanca').variedadesVistas).toEqual(['rosa-blanca']);
  });
});
