/**
 * Los sonidos del jardin.
 *
 * No hay archivos: cada sonido se sintetiza con osciladores y ruido. Un
 * jardin en pixel art pide sonidos chiquitos y sintetizados, y ademas asi
 * no hay descargas, ni licencias, ni un segundo de espera la primera vez.
 *
 * El navegador no deja sonar nada hasta que la persona toca la pantalla,
 * asi que el contexto se crea recien con el primer gesto. Antes de eso
 * `sonar` no hace nada, y no pasa nada malo.
 *
 * El volumen y el silencio viven en el navegador, no en la partida: son de
 * este aparato, no del jardin.
 */

const CLAVE = 'jardin-pixel:audio';

type Forma = 'sine' | 'square' | 'triangle' | 'sawtooth';

interface Nota {
  /** Frecuencia inicial, en Hz. */
  hz: number;
  /** Adonde llega la frecuencia al final, si se desliza. */
  hasta?: number;
  forma?: Forma;
  /** Segundos. */
  duracion: number;
  volumen?: number;
  /** Segundos de espera antes de sonar: sirve para armar acordes y melodias. */
  demora?: number;
}

interface Ruido {
  duracion: number;
  volumen?: number;
  /** Corte del filtro, en Hz: grave suena a agua, agudo a hojas. */
  corte: number;
  /** Adonde llega el corte al final. */
  corteFinal?: number;
  demora?: number;
}

export interface Sonido {
  notas?: Nota[];
  ruidos?: Ruido[];
}

/* ------------------------------------------------------------------ */
/* El catalogo                                                          */
/* ------------------------------------------------------------------ */

export const SONIDOS = {
  /** Semilla a la tierra: un toque corto y seco. */
  plantar: { notas: [{ hz: 380, hasta: 520, forma: 'triangle', duracion: 0.09, volumen: 0.5 }] },

  /** Agua cayendo sobre la tierra. */
  regar: { ruidos: [{ duracion: 0.3, corte: 900, corteFinal: 340, volumen: 0.5 }] },

  /** Regar todo: la misma agua, mas larga. */
  regarTodo: {
    ruidos: [
      { duracion: 0.45, corte: 1100, corteFinal: 300, volumen: 0.55 },
      { duracion: 0.3, corte: 700, corteFinal: 260, volumen: 0.35, demora: 0.2 },
    ],
  },

  /** Cosechar: dos notas que suben, como quien se alegra. */
  cosechar: {
    notas: [
      { hz: 560, forma: 'sine', duracion: 0.1, volumen: 0.45 },
      { hz: 780, forma: 'sine', duracion: 0.16, volumen: 0.4, demora: 0.07 },
    ],
  },

  /** Monedas al bolsillo. */
  moneda: {
    notas: [
      { hz: 980, forma: 'square', duracion: 0.06, volumen: 0.22 },
      { hz: 1320, forma: 'square', duracion: 0.09, volumen: 0.18, demora: 0.05 },
    ],
  },

  /** Un balde de agua en el pasto. */
  balde: {
    notas: [{ hz: 300, hasta: 150, forma: 'sine', duracion: 0.22, volumen: 0.35 }],
    ruidos: [{ duracion: 0.26, corte: 600, corteFinal: 220, volumen: 0.45 }],
  },

  /** Algo pesado que se apoya: una casa, una farola, un juego. */
  poner: {
    notas: [{ hz: 170, hasta: 120, forma: 'square', duracion: 0.11, volumen: 0.32 }],
  },

  /** Una caricia. */
  mimar: {
    notas: [{ hz: 520, hasta: 700, forma: 'sine', duracion: 0.18, volumen: 0.3 }],
  },

  /** Un animal comiendo. */
  comer: {
    notas: [
      { hz: 240, forma: 'triangle', duracion: 0.07, volumen: 0.35 },
      { hz: 200, forma: 'triangle', duracion: 0.07, volumen: 0.3, demora: 0.1 },
    ],
  },

  /** Un animal que se queda a vivir. */
  adoptar: {
    notas: [
      { hz: 520, forma: 'sine', duracion: 0.12, volumen: 0.4 },
      { hz: 660, forma: 'sine', duracion: 0.12, volumen: 0.38, demora: 0.1 },
      { hz: 880, forma: 'sine', duracion: 0.22, volumen: 0.36, demora: 0.2 },
    ],
  },

  /** Una rana, de noche. */
  rana: {
    notas: [
      { hz: 190, hasta: 120, forma: 'sawtooth', duracion: 0.13, volumen: 0.22 },
      { hz: 175, hasta: 115, forma: 'sawtooth', duracion: 0.11, volumen: 0.18, demora: 0.18 },
    ],
  },

  /** Algo salió mal, sin retar a nadie. */
  aviso: {
    notas: [{ hz: 300, hasta: 230, forma: 'triangle', duracion: 0.12, volumen: 0.25 }],
  },

  /** El jardín secreto. */
  secreto: {
    notas: [
      { hz: 523, forma: 'sine', duracion: 0.16, volumen: 0.35 },
      { hz: 659, forma: 'sine', duracion: 0.16, volumen: 0.35, demora: 0.15 },
      { hz: 784, forma: 'sine', duracion: 0.16, volumen: 0.35, demora: 0.3 },
      { hz: 1046, forma: 'sine', duracion: 0.5, volumen: 0.32, demora: 0.45 },
    ],
  },
} as const satisfies Record<string, Sonido>;

export type NombreSonido = keyof typeof SONIDOS;

/* ------------------------------------------------------------------ */
/* El aparato                                                          */
/* ------------------------------------------------------------------ */

interface Preferencias {
  volumen: number;
  silencio: boolean;
}

function leerPreferencias(): Preferencias {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const p = JSON.parse(crudo) as Partial<Preferencias>;
      return {
        volumen: typeof p.volumen === 'number' ? Math.min(1, Math.max(0, p.volumen)) : 0.7,
        silencio: p.silencio === true,
      };
    }
  } catch {
    // Navegador sin storage, o con el permiso cortado: se sigue igual.
  }
  return { volumen: 0.7, silencio: false };
}

class Audio {
  private ctx: AudioContext | null = null;
  private maestro: GainNode | null = null;
  private preferencias = leerPreferencias();
  private ruidoBuffer: AudioBuffer | null = null;
  /** Ultimo instante en que sonó cada sonido, para no amontonarlos. */
  private ultimo = new Map<string, number>();

  get volumen(): number {
    return this.preferencias.volumen;
  }

  get silencio(): boolean {
    return this.preferencias.silencio;
  }

  /**
   * Prepara el audio. Tiene que llamarse desde un gesto de la persona: el
   * navegador no deja sonar nada antes de eso.
   */
  despertar(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Contexto =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return;

    this.ctx = new Contexto();
    this.maestro = this.ctx.createGain();
    this.maestro.gain.value = this.preferencias.silencio ? 0 : this.preferencias.volumen;
    this.maestro.connect(this.ctx.destination);
  }

  setVolumen(volumen: number): void {
    this.preferencias = { ...this.preferencias, volumen: Math.min(1, Math.max(0, volumen)) };
    this.aplicar();
  }

  setSilencio(silencio: boolean): void {
    this.preferencias = { ...this.preferencias, silencio };
    this.aplicar();
  }

  private aplicar(): void {
    if (this.maestro) {
      this.maestro.gain.value = this.preferencias.silencio ? 0 : this.preferencias.volumen;
    }
    try {
      localStorage.setItem(CLAVE, JSON.stringify(this.preferencias));
    } catch {
      // Si no se puede guardar, la preferencia dura lo que dure la visita.
    }
  }

  /**
   * Suena un sonido del catalogo. `separacion` es lo minimo que tiene que
   * pasar entre dos repeticiones del mismo: regar diez parcelas seguidas no
   * tiene que sonar como una ametralladora.
   */
  sonar(nombre: NombreSonido, separacion = 0.05): void {
    if (!this.ctx || !this.maestro || this.preferencias.silencio) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    const ahora = this.ctx.currentTime;
    if (ahora - (this.ultimo.get(nombre) ?? -99) < separacion) return;
    this.ultimo.set(nombre, ahora);

    const sonido: Sonido = SONIDOS[nombre];
    for (const nota of sonido.notas ?? []) this.tocarNota(nota, ahora);
    for (const ruido of sonido.ruidos ?? []) this.tocarRuido(ruido, ahora);
  }

  private tocarNota(nota: Nota, base: number): void {
    const ctx = this.ctx!;
    const inicio = base + (nota.demora ?? 0);
    const fin = inicio + nota.duracion;

    const osc = ctx.createOscillator();
    osc.type = nota.forma ?? 'sine';
    osc.frequency.setValueAtTime(nota.hz, inicio);
    if (nota.hasta !== undefined) osc.frequency.exponentialRampToValueAtTime(nota.hasta, fin);

    const gain = ctx.createGain();
    const pico = nota.volumen ?? 0.3;
    // Ataque corto y caida suave: sin esto cada nota arranca con un chasquido.
    gain.gain.setValueAtTime(0.0001, inicio);
    gain.gain.exponentialRampToValueAtTime(pico, inicio + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, fin);

    osc.connect(gain).connect(this.maestro!);
    osc.start(inicio);
    osc.stop(fin + 0.02);
  }

  private tocarRuido(ruido: Ruido, base: number): void {
    const ctx = this.ctx!;
    const inicio = base + (ruido.demora ?? 0);
    const fin = inicio + ruido.duracion;

    if (!this.ruidoBuffer) {
      const largo = Math.floor(ctx.sampleRate * 0.5);
      this.ruidoBuffer = ctx.createBuffer(1, largo, ctx.sampleRate);
      const datos = this.ruidoBuffer.getChannelData(0);
      for (let i = 0; i < largo; i++) datos[i] = Math.random() * 2 - 1;
    }

    const fuente = ctx.createBufferSource();
    fuente.buffer = this.ruidoBuffer;

    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(ruido.corte, inicio);
    if (ruido.corteFinal !== undefined) {
      filtro.frequency.exponentialRampToValueAtTime(ruido.corteFinal, fin);
    }

    const gain = ctx.createGain();
    const pico = ruido.volumen ?? 0.3;
    gain.gain.setValueAtTime(0.0001, inicio);
    gain.gain.exponentialRampToValueAtTime(pico, inicio + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, fin);

    fuente.connect(filtro).connect(gain).connect(this.maestro!);
    fuente.start(inicio);
    fuente.stop(fin + 0.02);
  }
}

export const audio = new Audio();

/** Atajo, para no escribir `audio.sonar` en cada lugar. */
export const sonar = (nombre: NombreSonido, separacion?: number) => audio.sonar(nombre, separacion);
