/**
 * Puente tipado entre el mundo 3D y React.
 *
 * Three dibuja el mundo, React dibuja el HUD, y ninguno importa al otro:
 * solo se hablan por aqui.
 */

export interface GameEvents {
  /** El jugador tocó una celda de tierra. */
  'celda:click': { celda: string };
  /** El jugador tocó una celda vacía con la herramienta de expandir. */
  'celda:expandir': { islaId: string; col: number; row: number };
  /** El jugador tocó un animal. */
  'animal:click': { uid: string };

  /* Efectos que React pide y el mundo dibuja */
  'efecto:plantar': { celda: string };
  'efecto:regar': { celda: string };
  'efecto:regarTodo': Record<string, never>;
  'efecto:cosechar': { celda: string; color: string };
  'efecto:expandir': { celda: string };
  'efecto:mimar': { uid: string };
  'efecto:comer': { uid: string };
  'efecto:adoptar': { uid: string };

  /** Reconstruir el mundo porque el estado cambió de forma no incremental. */
  'mundo:resincronizar': Record<string, never>;
  /** El aspecto del personaje cambió y hay que regenerar su textura. */
  'avatar:cambio': Record<string, never>;
  /** Marcar al personaje un rato, para encontrarlo en el jardin. */
  'avatar:senalar': Record<string, never>;
  /** Guardar una foto del jardin, sin interfaz encima. */
  'foto:sacar': Record<string, never>;

  /* Práctica de tiro */
  'practica:modo': { activa: boolean };
  'practica:impacto': { tipo: 'muneco' | 'rival' | 'suelo'; x: number; y: number; z: number };

  /* Cámara */
  'camara:mirar': { x: number; z: number };
  'camara:centrar': Record<string, never>;
  'camara:zoom': { delta: number };
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
}

export const EventBus = new TypedEmitter();
