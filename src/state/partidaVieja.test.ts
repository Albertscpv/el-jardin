import { describe, expect, it } from 'vitest';
import { advance } from './sim';
import { prepararPartida } from './store';
import type { GameState } from './types';
// Una partida hecha con el codigo que estaba en produccion antes de las
// casas, congelada: no se regenera. Si una version nueva deja de cargarla
// entera, este test lo dice antes de que llegue a un jugador.
import crudo from './__fixtures__/partida-antes-de-casas.json?raw';

const vieja = (): GameState => JSON.parse(crudo) as GameState;

/** El camino completo de una carga: lo que hace el juego al abrir. */
function cargar(partida: GameState): GameState {
  const { estado } = prepararPartida(partida, partida.ultimoTick);
  return advance(estado, partida.ultimoTick).estado;
}

describe('una partida anterior a las casas', () => {
  it('carga sin perder ni cambiar nada de lo que tenía', () => {
    const antes = vieja();
    const despues = cargar(vieja());

    for (const campo of Object.keys(antes) as Array<keyof GameState>) {
      expect(despues[campo], campo).toEqual(antes[campo]);
    }
  });

  it('conserva la identidad del jardín, que es lo que protege la nube', () => {
    // La base rechaza cualquier guardado con otro creadoEn: si la carga lo
    // cambiara, la partida quedaria bloqueada para siempre.
    expect(cargar(vieja()).creadoEn).toBe(vieja().creadoEn);
  });

  it('sobrevive a guardarse y volver a leerse', () => {
    const cargada = cargar(vieja());
    const releida = JSON.parse(JSON.stringify(cargada)) as GameState;
    for (const campo of Object.keys(vieja()) as Array<keyof GameState>) {
      expect(releida[campo], campo).toEqual(vieja()[campo]);
    }
  });

  it('sigue avanzando en el tiempo como antes: las plantas crecen', () => {
    const antes = vieja();
    const una_hora = advance(cargar(vieja()), antes.ultimoTick + 3600_000).estado;
    const [id] = Object.keys(antes.cultivos);
    expect(una_hora.cultivos[id].growth).toBeGreaterThanOrEqual(antes.cultivos[id].growth);
  });
});
