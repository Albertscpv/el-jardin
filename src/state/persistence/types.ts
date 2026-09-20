import type { GameState } from '../types';

export type AdapterName = 'nube' | 'local';

export interface SaveAdapter {
  readonly nombre: AdapterName;
  cargar(): Promise<GameState | null>;
  guardar(estado: GameState): Promise<void>;
}
