/**
 * Puente tipado entre Phaser y React.
 *
 * Phaser dibuja el mundo, React dibuja el HUD, y ninguno importa al otro:
 * solo se hablan por aqui.
 */

export interface GameEvents {
  /** El jugador tocó una parcela del bancal. */
  'parcela:click': { index: number };
  /** El jugador tocó un animal. */
  'animal:click': { uid: string };

  /* Efectos que React pide y Phaser dibuja */
  'efecto:plantar': { index: number };
  'efecto:regar': { index: number };
  'efecto:regarTodo': Record<string, never>;
  'efecto:cosechar': { index: number; color: string };
  'efecto:mimar': { uid: string };
  'efecto:comer': { uid: string };
  'efecto:adoptar': { uid: string };
  /** Reconstruir sprites porque el estado cambió de forma no incremental. */
  'mundo:resincronizar': Record<string, never>;
  /** Girar la cámara un cuarto de vuelta. */
  'camara:rotar': { dir: 1 | -1 };
}

type Handler<K extends keyof GameEvents> = (payload: GameEvents[K]) => void;

class TypedEmitter {
  private oyentes = new Map<string, Set<(payload: unknown) => void>>();

  on<K extends keyof GameEvents>(evento: K, handler: Handler<K>): () => void {
    const set = this.oyentes.get(evento) ?? new Set();
    set.add(handler as (payload: unknown) => void);
    this.oyentes.set(evento, set);
    return () => this.off(evento, handler);
  }

  off<K extends keyof GameEvents>(evento: K, handler: Handler<K>): void {
    this.oyentes.get(evento)?.delete(handler as (payload: unknown) => void);
  }

  emit<K extends keyof GameEvents>(evento: K, payload: GameEvents[K]): void {
    const set = this.oyentes.get(evento);
    if (!set) return;
    // Copia defensiva: un handler puede desuscribirse durante la emisión.
    for (const handler of [...set]) handler(payload);
  }

  clear(): void {
    this.oyentes.clear();
  }
}

export const EventBus = new TypedEmitter();
