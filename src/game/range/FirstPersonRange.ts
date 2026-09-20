import { climaActual, type Clima } from '../../state/clima';
import * as M from '../art/matrices';
import { drawMatrix, seededRandom, type Palette } from '../art/render';

/* ------------------------------------------------------------------ */
/* Camara y mundo                                                      */
/* ------------------------------------------------------------------ */

/** Cuantos pixeles de pantalla ocupa un pixel del juego. */
const ESCALA_PIXEL = 3;
/** Tope del buffer logico, para no dispararlo en un monitor grande. */
const MAX_LADO = 460;

/**
 * Campo de vision horizontal.
 *
 * La focal se deriva de esto y del ancho del lienzo, no al reves: asi el
 * angulo que se ve es el mismo en un monitor apaisado y en un telefono
 * vertical, y solo cambia cuanto mundo entra a los costados.
 */
const FOV = (77 * Math.PI) / 180;

/** Fraccion del alto a la que queda el horizonte. */
const FRACCION_HORIZONTE = 0.47;

/** Altura de los ojos sobre el suelo, en metros. */
const ALTURA_OJOS = 1.55;

/** Metros por segundo al cuadrado. Aca las unidades son reales. */
const GRAVEDAD = 9.8;
/**
 * Cuanto acelera el viento lateralmente por unidad de `clima.viento`.
 * Calibrado para que un ventarron obligue a corregir casi el ancho de un
 * muneco: menos que eso no se siente y no cambia como se juega.
 */
const VIENTO_ESCALA = 3;
const ARRASTRE = { flecha: 0.05, bomba: 0.22 };
/** Velocidad de salida segun la carga, en m/s. */
const IMPULSO = { flecha: [34, 68], bomba: [16, 30] } as const;

/** Segundos de tension para llegar a potencia maxima. */
const TIEMPO_TENSADO = 1.0;

/** Profundidad a la que el proyectil se da por perdido. */
const Z_MAX = 75;

const ALTO_MUNECO = 1.85;
const ANCHO_MUNECO = 0.78;
const ALTO_RIVAL = 1.35;
const ANCHO_RIVAL = 0.62;

export type Municion = 'flecha' | 'bomba';

export interface ResultadoTiro {
  tipo: Municion;
  acierto: 'muneco' | 'rival' | null;
  /** Distancia al punto de impacto, en metros. */
  metros: number;
}

interface Proyectil {
  tipo: Municion;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  vida: number;
  resuelto: boolean;
  /** Rastro reciente, para dibujar la estela. */
  estela: Array<{ x: number; y: number; z: number }>;
}

interface Muneco {
  x: number;
  z: number;
  sacudida: number;
  tocado: number;
}

const PALETA_MUNECO: Palette = {
  p: '#e0c078', P: '#c2a35c', k: '#3a3038',
  d: '#8a5a33', r: '#b8764a', R: '#8a5232', s: '#6b4326',
};

const PALETA_RIVAL: Palette = {
  h: '#3a2a20', g: '#d84a4a', k: '#e8b48c', K: '#c08a64',
  e: '#2a2320', r: '#5a8ad8', p: '#3a4a5a', z: '#2a2f38',
};

const PALETA_BOMBA: Palette = { b: '#4aa8e0', w: '#bfe8ff', n: '#2c6b96' };

/**
 * Campo de tiro en primera persona.
 *
 * El mundo es 3D pero se dibuja proyectando a mano sobre un canvas 2D, que
 * a esta escala pesa nada y deja el pixel art intacto. Desde los ojos del
 * arquero la caida y la deriva del viento se leen mientras pasan: se ve la
 * flecha bajar y correrse sobre el blanco, que es justo lo que en vista
 * lateral habia que deducir.
 */
export class FirstPersonRange {
  /** Se llama en cada desenlace, para que el store lleve el marcador. */
  alResolver: (r: ResultadoTiro) => void = () => {};

  /** Fija el clima en vez de seguir el reloj. Para inspeccion y pruebas. */
  climaForzado: Clima | null = null;

  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private observador: ResizeObserver;

  /* --- Dimensiones logicas, recalculadas al cambiar de tamano --- */
  private ancho = 320;
  private alto = 180;
  private centroX = 160;
  private horizonte = 84;
  private focal = 200;
  /** Alto del panel inferior en px de pantalla; el arco se apoya encima. */
  private margenInferiorCss = 0;
  private margenInferior = 0;
  private frame = 0;
  private ultimo = 0;
  private tiempo = 0;

  private clima: Clima = climaActual();
  private municion: Municion = 'flecha';
  private conRival: boolean;

  private proyectiles: Proyectil[] = [];
  private munecos: Muneco[] = [];

  /* --- Punteria --- */
  /** Punto de mira en pantalla. */
  private mira = { x: 160, y: 76 };
  private tensando = false;
  private tension = 0;
  private punteroId: number | null = null;

  /* --- Rival --- */
  private rivalX = 0;
  private rivalDir = 1;
  private rivalZ = 21;
  private rivalEmpapado = 0;

  /* --- Ambiente --- */
  private nubes: Array<{ x: number; y: number; escala: number; v: number }> = [];
  private gotas: Array<{ x: number; y: number; v: number }> = [];
  private matas: Array<{ x: number; z: number }> = [];
  private salpicaduras: Array<{ sx: number; sy: number; vx: number; vy: number; vida: number; color: string }> = [];

  private limpiadores: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement, conRival: boolean) {
    this.canvas = canvas;
    this.conRival = conRival;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Sin contexto 2D');
    this.ctx = ctx;

    this.observador = new ResizeObserver(() => this.redimensionar());
    this.observador.observe(canvas);
    this.redimensionar();

    // Tres distancias bien separadas: la primera se acierta apuntando al
    // centro, la ultima obliga a levantar la mira y a leer el viento.
    this.munecos = [
      { x: -2.1, z: 10, sacudida: 0, tocado: 0 },
      { x: 1.8, z: 17, sacudida: 0, tocado: 0 },
      { x: -0.9, z: 26, sacudida: 0, tocado: 0 },
    ];

    this.conectarEntrada();
  }

  /**
   * Ajusta la resolucion logica al hueco disponible.
   *
   * El lienzo siempre llena su caja, asi que la proporcion coincide y no hay
   * bandas negras ni pixeles estirados. El pixelado sale de dividir por
   * ESCALA_PIXEL, no de un filtro.
   */
  private redimensionar(): void {
    const caja = this.canvas.getBoundingClientRect();
    const anchoCss = caja.width || 320;
    const altoCss = caja.height || 180;

    const exceso = Math.max(anchoCss / ESCALA_PIXEL / MAX_LADO, altoCss / ESCALA_PIXEL / MAX_LADO, 1);
    this.ancho = Math.max(120, Math.round(anchoCss / ESCALA_PIXEL / exceso));
    this.alto = Math.max(110, Math.round(altoCss / ESCALA_PIXEL / exceso));

    this.canvas.width = this.ancho;
    this.canvas.height = this.alto;
    this.ctx.imageSmoothingEnabled = false;

    this.centroX = this.ancho / 2;
    this.horizonte = Math.round(this.alto * FRACCION_HORIZONTE);
    // En vertical, derivar la focal solo del ancho dispara el campo de
    // vision vertical: se ve un mar de pasto y los blancos quedan diminutos.
    // Tomando tambien el alto, el encuadre se mantiene util en retrato.
    const lado = Math.max(this.ancho, this.alto * 0.8);
    this.focal = lado / (2 * Math.tan(FOV / 2));

    this.recalcularMargen();
    // Nubes, lluvia y mira viven en pixeles: hay que recolocarlas.
    this.prepararAmbiente();
    this.mira.x = Math.min(this.mira.x, this.ancho - 12);
    this.mira.y = Math.min(this.mira.y, this.horizonte + 30);
  }

  setMunicion(m: Municion): void {
    this.municion = m;
  }

  /**
   * Cuanto alto ocupa el panel de abajo.
   *
   * La escena no puede saberlo sola, y sin este dato el arco se dibuja
   * detras del panel y no se ve tensarse, que es la mitad de la gracia.
   */
  setMargenInferior(px: number): void {
    this.margenInferiorCss = px;
    this.recalcularMargen();
  }

  private recalcularMargen(): void {
    const caja = this.canvas.getBoundingClientRect();
    const escala = caja.height > 0 ? this.alto / caja.height : 1;
    this.margenInferior = this.margenInferiorCss * escala;
  }

  get climaVigente(): Clima {
    return this.clima;
  }

  /** 0..1, lo tensado que esta el arco. Lo lee la barra de potencia. */
  get tensionActual(): number {
    return this.tension;
  }

  private prepararAmbiente(): void {
    const rnd = seededRandom(90210);
    this.nubes = Array.from({ length: 6 }, () => ({
      x: rnd() * this.ancho,
      y: 10 + rnd() * 46,
      escala: 0.8 + rnd() * 1.2,
      v: 1.5 + rnd() * 3,
    }));
    this.gotas = Array.from({ length: 110 }, () => ({
      x: rnd() * this.ancho,
      y: rnd() * this.alto,
      v: 200 + rnd() * 160,
    }));
    // Matas de pasto repartidas por el campo, para dar sensacion de fuga.
    this.matas = Array.from({ length: 90 }, () => ({
      x: (rnd() - 0.5) * 26,
      z: 3 + rnd() * 52,
    }));
  }

  /* ---------------------------------------------------------------- */
  /* Proyeccion                                                        */
  /* ---------------------------------------------------------------- */

  /** Punto del mundo a pixeles. `y` es altura sobre el suelo. */
  private proyectar(x: number, y: number, z: number): { sx: number; sy: number; escala: number } {
    const escala = this.focal / Math.max(0.4, z);
    return {
      sx: this.centroX + x * escala,
      sy: this.horizonte + (ALTURA_OJOS - y) * escala,
      escala,
    };
  }

  /** Direccion de tiro que corresponde al punto de mira. */
  private direccionDeMira(): { x: number; y: number; z: number } {
    const dx = (this.mira.x - this.centroX) / this.focal;
    const dy = (this.horizonte - this.mira.y) / this.focal;
    const largo = Math.hypot(dx, dy, 1);
    return { x: dx / largo, y: dy / largo, z: 1 / largo };
  }

  /* ---------------------------------------------------------------- */
  /* Entrada                                                           */
  /* ---------------------------------------------------------------- */

  private aLogico(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * this.ancho,
      y: ((e.clientY - r.top) / r.height) * this.alto,
    };
  }

  private conectarEntrada(): void {
    const el = this.canvas;

    const apuntar = (e: PointerEvent) => {
      const p = this.aLogico(e);
      // La mira no baja del horizonte ni se sale: tirar al piso propio o
      // fuera de cuadro no es una jugada, es un error de manejo.
      this.mira.x = Math.max(12, Math.min(this.ancho - 12, p.x));
      this.mira.y = Math.max(10, Math.min(this.horizonte + 30, p.y));
    };

    const abajo = (e: PointerEvent) => {
      if (this.punteroId !== null) return;
      this.punteroId = e.pointerId;
      apuntar(e);
      this.tensando = true;
      this.tension = 0;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* sin captura se apunta igual */
      }
    };

    const mover = (e: PointerEvent) => {
      // Con mouse la mira sigue el cursor aunque no se este tensando.
      if (this.punteroId === null || e.pointerId === this.punteroId) apuntar(e);
    };

    const arriba = (e: PointerEvent) => {
      if (e.pointerId !== this.punteroId) return;
      this.punteroId = null;
      try {
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      } catch {
        /* nada que liberar */
      }
      if (this.tensando) this.disparar();
      this.tensando = false;
    };

    el.addEventListener('pointerdown', abajo);
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', arriba);
    el.addEventListener('pointercancel', arriba);

    this.limpiadores.push(() => {
      el.removeEventListener('pointerdown', abajo);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', arriba);
      el.removeEventListener('pointercancel', arriba);
    });
  }

  private disparar(): void {
    const potencia = Math.max(0.12, this.tension);
    const [min, max] = IMPULSO[this.municion];
    const rapidez = min + (max - min) * potencia;
    const d = this.direccionDeMira();

    this.proyectiles.push({
      tipo: this.municion,
      x: d.x * 0.3,
      y: ALTURA_OJOS - 0.12,
      z: 0.6,
      vx: d.x * rapidez,
      vy: d.y * rapidez,
      vz: d.z * rapidez,
      vida: 5,
      resuelto: false,
      estela: [],
    });
    this.tension = 0;
  }

  /* ---------------------------------------------------------------- */
  /* API para pruebas                                                  */
  /* ---------------------------------------------------------------- */

  paso(dt: number): void {
    this.actualizar(dt);
  }

  /** Coloca la mira en pixeles logicos. */
  apuntarManual(sx: number, sy: number): void {
    this.mira.x = sx;
    this.mira.y = sy;
  }

  dispararManual(tension = 1): void {
    this.tension = tension;
    this.disparar();
  }

  /** Centro en pantalla de un muneco, para apuntarle en una prueba. */
  miraHaciaMuneco(i: number): { sx: number; sy: number } | null {
    const m = this.munecos[i];
    if (!m) return null;
    const p = this.proyectar(m.x, ALTO_MUNECO * 0.55, m.z);
    return { sx: p.sx, sy: p.sy };
  }

  /* ---------------------------------------------------------------- */
  /* Bucle                                                             */
  /* ---------------------------------------------------------------- */

  arrancar(): void {
    this.ultimo = performance.now();
    const paso = (ahora: number) => {
      this.frame = requestAnimationFrame(paso);
      const dt = Math.min((ahora - this.ultimo) / 1000, 0.05);
      this.ultimo = ahora;
      this.actualizar(dt);
      this.dibujar();
    };
    this.frame = requestAnimationFrame(paso);
  }

  destruir(): void {
    cancelAnimationFrame(this.frame);
    this.observador.disconnect();
    for (const f of this.limpiadores) f();
    this.limpiadores = [];
  }

  private actualizar(dt: number): void {
    this.tiempo += dt;
    this.clima = this.climaForzado ?? climaActual();

    if (this.tensando) {
      this.tension = Math.min(1, this.tension + dt / TIEMPO_TENSADO);
    }

    this.moverProyectiles(dt);
    this.moverRival(dt);
    this.moverAmbiente(dt);

    for (const m of this.munecos) {
      if (m.sacudida > 0) m.sacudida = Math.max(0, m.sacudida - dt);
    }
    if (this.rivalEmpapado > 0) this.rivalEmpapado = Math.max(0, this.rivalEmpapado - dt);

    for (const s of this.salpicaduras) {
      s.vida -= dt;
      s.vy += 220 * dt;
      s.sx += s.vx * dt;
      s.sy += s.vy * dt;
    }
    this.salpicaduras = this.salpicaduras.filter((s) => s.vida > 0);
  }

  private moverProyectiles(dt: number): void {
    const viento = this.clima.viento * VIENTO_ESCALA;

    for (const p of this.proyectiles) {
      p.vida -= dt;

      p.vy -= GRAVEDAD * dt;
      p.vx += viento * dt;
      const freno = Math.max(0, 1 - ARRASTRE[p.tipo] * dt);
      p.vx *= freno;
      p.vy *= freno;
      p.vz *= freno;

      const antes = { x: p.x, y: p.y, z: p.z };
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      p.estela.push({ x: p.x, y: p.y, z: p.z });
      if (p.estela.length > 9) p.estela.shift();

      this.resolver(p, antes);
    }

    const siguen: Proyectil[] = [];
    for (const p of this.proyectiles) {
      const vive = p.vida > 0 && p.z > 0.2 && p.z < Z_MAX && !p.resuelto;
      if (vive) {
        siguen.push(p);
        continue;
      }
      // Un tiro que se pierde tambien es un tiro: sin esto la punteria
      // contaria solo los que tocan algo y quedaria inflada.
      if (!p.resuelto) {
        p.resuelto = true;
        this.alResolver({ tipo: p.tipo, acierto: null, metros: p.z });
      }
    }
    this.proyectiles = siguen;
  }

  /**
   * Colisiones por cruce de plano.
   *
   * En vez de comparar posiciones sueltas se mira si el tramo recorrido
   * atraviesa el plano de profundidad del blanco, y ahi se interpola donde
   * lo cruzo. Asi una flecha rapida no se saltea un muneco entre dos frames.
   */
  private resolver(p: Proyectil, antes: { x: number; y: number; z: number }): void {
    if (this.conRival && this.rivalEmpapado <= 0 && p.z >= this.rivalZ && antes.z < this.rivalZ) {
      const t = (this.rivalZ - antes.z) / Math.max(1e-6, p.z - antes.z);
      const x = antes.x + (p.x - antes.x) * t;
      const y = antes.y + (p.y - antes.y) * t;
      if (Math.abs(x - this.rivalX) <= ANCHO_RIVAL / 2 && y >= 0 && y <= ALTO_RIVAL) {
        this.rivalEmpapado = 1.5;
        this.impactoVisual(x, y, this.rivalZ, p.tipo);
        p.resuelto = true;
        this.alResolver({ tipo: p.tipo, acierto: 'rival', metros: this.rivalZ });
        return;
      }
    }

    for (const m of this.munecos) {
      if (!(p.z >= m.z && antes.z < m.z)) continue;
      const t = (m.z - antes.z) / Math.max(1e-6, p.z - antes.z);
      const x = antes.x + (p.x - antes.x) * t;
      const y = antes.y + (p.y - antes.y) * t;

      if (Math.abs(x - m.x) <= ANCHO_MUNECO / 2 && y >= 0 && y <= ALTO_MUNECO) {
        m.sacudida = 0.7;
        m.tocado++;
        this.impactoVisual(x, y, m.z, p.tipo);
        p.resuelto = true;
        this.alResolver({ tipo: p.tipo, acierto: 'muneco', metros: m.z });
        return;
      }
    }

    if (p.y <= 0) {
      this.impactoVisual(p.x, 0, p.z, p.tipo);
      p.resuelto = true;
      this.alResolver({ tipo: p.tipo, acierto: null, metros: p.z });
    }
  }

  private impactoVisual(x: number, y: number, z: number, tipo: Municion): void {
    const { sx, sy, escala } = this.proyectar(x, y, z);
    const color = tipo === 'bomba' ? '#7fd0f5' : '#e0c078';
    const n = tipo === 'bomba' ? 18 : 10;

    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (20 + Math.random() * 70) * Math.min(1.4, escala / 10);
      this.salpicaduras.push({
        sx, sy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 30,
        vida: 0.3 + Math.random() * 0.4,
        color,
      });
    }
  }

  private moverRival(dt: number): void {
    if (!this.conRival || this.rivalEmpapado > 0) return;
    this.rivalX += this.rivalDir * 2.2 * dt;
    if (this.rivalX > 4.5) this.rivalDir = -1;
    if (this.rivalX < -4.5) this.rivalDir = 1;
  }

  private moverAmbiente(dt: number): void {
    const viento = this.clima.viento;

    for (const n of this.nubes) {
      n.x += (n.v + viento * 5) * dt;
      if (n.x > this.ancho + 40) n.x = -40;
      if (n.x < -40) n.x = this.ancho + 40;
    }

    if (this.clima.lluvia > 0) {
      for (const g of this.gotas) {
        g.y += g.v * dt;
        g.x += viento * 14 * dt;
        if (g.y > this.alto) {
          g.y = -4;
          g.x = Math.random() * this.ancho;
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Dibujo                                                            */
  /* ---------------------------------------------------------------- */

  private dibujar(): void {
    const ctx = this.ctx;
    this.dibujarCielo(ctx);
    this.dibujarSuelo(ctx);
    this.dibujarMatas(ctx);

    // Pintor: primero lo lejano. Con esto los blancos cercanos tapan a los
    // de atras sin necesidad de buffer de profundidad.
    const cosas: Array<{ z: number; dibujar: () => void }> = this.munecos.map((m) => ({
      z: m.z,
      dibujar: () => this.dibujarMuneco(ctx, m),
    }));
    if (this.conRival) cosas.push({ z: this.rivalZ, dibujar: () => this.dibujarRival(ctx) });
    cosas.sort((a, b) => b.z - a.z);
    for (const c of cosas) c.dibujar();

    for (const p of this.proyectiles) this.dibujarProyectil(ctx, p);

    for (const s of this.salpicaduras) {
      ctx.fillStyle = s.color;
      ctx.fillRect(Math.round(s.sx), Math.round(s.sy), 2, 2);
    }

    if (this.clima.lluvia > 0) this.dibujarLluvia(ctx);

    this.dibujarArco(ctx);
    this.dibujarMira(ctx);
    this.dibujarViento(ctx);
  }

  private dibujarCielo(ctx: CanvasRenderingContext2D): void {
    const lluvia = this.clima.cielo === 'lluvia';
    const g = ctx.createLinearGradient(0, 0, 0, this.horizonte);
    g.addColorStop(0, lluvia ? '#4c5a68' : '#3f86c4');
    g.addColorStop(1, lluvia ? '#8d99a4' : '#cfe6f4');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.ancho, this.horizonte);

    ctx.fillStyle = lluvia ? '#6d7a88' : '#ffffff';
    for (const n of this.nubes) {
      const w = Math.round(24 * n.escala);
      const h = Math.round(6 * n.escala);
      ctx.fillRect(Math.round(n.x), Math.round(n.y), w, h);
      ctx.fillRect(Math.round(n.x + w * 0.28), Math.round(n.y - h * 0.7), Math.round(w * 0.5), h);
    }
  }

  /** Suelo en fuga: bandas cuya separacion se achica hacia el horizonte. */
  private dibujarSuelo(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#5fa14a';
    ctx.fillRect(0, this.horizonte, this.ancho, this.alto - this.horizonte);

    // Bandas alternadas a profundidades fijas: es lo que da la sensacion de
    // distancia sin tener que texturizar el piso.
    for (let i = 0; i < 16; i++) {
      const z = 3 + i * i * 0.55;
      const y = this.horizonte + (ALTURA_OJOS * this.focal) / z;
      if (y > this.alto) continue;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(76, 138, 60, 0.55)' : 'rgba(105, 174, 83, 0.4)';
      const zSig = 3 + (i + 1) * (i + 1) * 0.55;
      const ySig = this.horizonte + (ALTURA_OJOS * this.focal) / zSig;
      ctx.fillRect(0, Math.round(ySig), this.ancho, Math.max(1, Math.round(y - ySig)));
    }

    ctx.fillStyle = '#3e7331';
    ctx.fillRect(0, this.horizonte - 1, this.ancho, 2);
  }

  /** Matas de pasto, inclinadas por el viento y escaladas por distancia. */
  private dibujarMatas(ctx: CanvasRenderingContext2D): void {
    const inclinacion = this.clima.viento * 0.1;
    for (const mata of this.matas) {
      const { sx, sy, escala } = this.proyectar(mata.x, 0, mata.z);
      if (sy < this.horizonte || sx < -8 || sx > this.ancho + 8) continue;
      const alto = Math.max(1, Math.round(0.28 * escala));
      const vaiven = Math.sin(this.tiempo * 2 + mata.x * 3) * 0.4;
      ctx.fillStyle = '#4c8a3c';
      ctx.fillRect(Math.round(sx), Math.round(sy - alto), 1, alto);
      ctx.fillRect(
        Math.round(sx + (inclinacion + vaiven) * escala * 0.06),
        Math.round(sy - alto - 1),
        1,
        1,
      );
    }
  }

  private dibujarMuneco(ctx: CanvasRenderingContext2D, m: Muneco): void {
    const base = this.proyectar(m.x, 0, m.z);
    const alto = ALTO_MUNECO * base.escala;
    const ancho = alto; // la matriz es cuadrada
    if (alto < 3) return;

    const k = m.sacudida / 0.7;
    const angulo = Math.sin(m.sacudida * 32) * 0.3 * k;

    ctx.save();
    ctx.translate(base.sx, base.sy);
    ctx.rotate(angulo);
    drawMatrix(ctx, M.MUNECO_PAJA, PALETA_MUNECO, alto / 16, -ancho / 2, -alto);
    ctx.restore();
  }

  private dibujarRival(ctx: CanvasRenderingContext2D): void {
    const base = this.proyectar(this.rivalX, 0, this.rivalZ);
    const alto = ALTO_RIVAL * base.escala * 1.45;
    if (alto < 3) return;

    const empapado = this.rivalEmpapado > 0;
    const salto = empapado
      ? Math.abs(Math.sin(this.rivalEmpapado * 22)) * alto * 0.12
      : Math.abs(Math.sin(this.tiempo * 6)) * alto * 0.04;

    ctx.save();
    ctx.translate(base.sx, base.sy - salto);
    if (this.rivalDir > 0) ctx.scale(-1, 1);
    drawMatrix(ctx, M.NINO_RIVAL, PALETA_RIVAL, alto / 16, -alto / 2, -alto);
    ctx.restore();

    if (empapado) {
      ctx.fillStyle = 'rgba(127, 208, 245, 0.5)';
      ctx.fillRect(base.sx - alto * 0.28, base.sy - alto * 0.92, alto * 0.56, alto * 0.92);
    }
  }

  private dibujarProyectil(ctx: CanvasRenderingContext2D, p: Proyectil): void {
    // Estela: puntos del rastro, cada vez mas tenues. Hace legible la
    // curva de caida y la deriva del viento mientras la flecha viaja.
    p.estela.forEach((punto, i) => {
      const { sx, sy } = this.proyectar(punto.x, punto.y, punto.z);
      ctx.fillStyle = `rgba(255, 247, 214, ${(i / p.estela.length) * 0.45})`;
      ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    });

    const { sx, sy, escala } = this.proyectar(p.x, p.y, p.z);
    const tam = Math.max(1, Math.round(escala * 0.09));

    if (p.tipo === 'flecha') {
      ctx.fillStyle = '#c2cad6';
      ctx.fillRect(Math.round(sx - tam / 2), Math.round(sy - tam / 2), tam, tam);
      ctx.fillStyle = '#a8794a';
      ctx.fillRect(Math.round(sx - tam / 2), Math.round(sy - tam / 2), Math.max(1, tam - 1), 1);
    } else {
      const s = Math.max(1, escala * 0.02);
      drawMatrix(ctx, M.BOMBA_AGUA, PALETA_BOMBA, s, sx - s * 4, sy - s * 4);
    }
  }

  /**
   * El arco, abajo en cuadro.
   *
   * Es lo que vende la primera persona: la cuerda se va hacia atras con la
   * tension y la flecha asoma por encima, asi el jugador ve cuanto cargo sin
   * mirar la barra.
   */
  private dibujarArco(ctx: CanvasRenderingContext2D): void {
    const t = this.tension;
    // Todo el arco se mide contra el ancho del lienzo: con medidas fijas se
    // salia de cuadro en pantallas verticales.
    const radio = Math.max(26, this.ancho * 0.2);
    const baseY = this.alto - this.margenInferior + radio * 0.26 - t * radio * 0.13;
    const cx = this.centroX + (this.mira.x - this.centroX) * 0.18;

    if (this.municion === 'bomba') {
      // Con bombas no hay arco: se ve la mano con el globo.
      const s = Math.max(1, radio * (0.026 + t * 0.02));
      drawMatrix(ctx, M.BOMBA_AGUA, PALETA_BOMBA, s, cx + radio * 0.35 - s * 4, baseY - radio * 0.7 - s * 4);
      ctx.fillStyle = '#e8b48c';
      ctx.fillRect(
        Math.round(cx + radio * 0.29),
        Math.round(baseY - radio * 0.6),
        Math.round(radio * 0.19),
        Math.round(radio * 0.22),
      );
      return;
    }

    ctx.strokeStyle = '#8a5a33';
    ctx.lineWidth = Math.max(2, radio * 0.048);
    ctx.beginPath();
    ctx.arc(cx, baseY, radio, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();

    // Cuerda: el vertice se corre hacia el jugador al tensar.
    const puntaX = cx + Math.cos(Math.PI * 1.18) * radio;
    const puntaY = baseY + Math.sin(Math.PI * 1.18) * radio;
    const punta2X = cx + Math.cos(Math.PI * 1.82) * radio;
    const punta2Y = baseY + Math.sin(Math.PI * 1.82) * radio;
    const nockY = baseY - radio + radio * 0.29 + t * radio * 0.26;

    ctx.strokeStyle = '#efe6d4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(puntaX, puntaY);
    ctx.lineTo(cx, nockY);
    ctx.lineTo(punta2X, punta2Y);
    ctx.stroke();

    // Flecha apoyada, asomando por encima del arco.
    ctx.strokeStyle = '#a8794a';
    ctx.lineWidth = Math.max(1, radio * 0.032);
    ctx.beginPath();
    ctx.moveTo(cx, nockY);
    ctx.lineTo(cx, nockY - radio * 0.55 - t * radio * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#c2cad6';
    ctx.fillRect(
      Math.round(cx - 1),
      Math.round(nockY - radio * 0.61 - t * radio * 0.1),
      3,
      Math.max(2, Math.round(radio * 0.06)),
    );
  }

  /**
   * Punto de mira con oscilacion.
   *
   * Cuanto mas se tensa, mas tiembla: sostener el arco cansa, y sin esto
   * cargar al maximo seria gratis y siempre la mejor jugada.
   */
  private dibujarMira(ctx: CanvasRenderingContext2D): void {
    const temblor = this.tension * 1.8;
    const ox = Math.sin(this.tiempo * 7.3) * temblor;
    const oy = Math.cos(this.tiempo * 5.1) * temblor;
    const x = Math.round(this.mira.x + ox);
    const y = Math.round(this.mira.y + oy);

    ctx.fillStyle = 'rgba(20, 28, 20, 0.5)';
    ctx.fillRect(x - 5, y, 11, 1);
    ctx.fillRect(x, y - 5, 1, 11);

    ctx.fillStyle = '#fff7d6';
    ctx.fillRect(x - 5, y, 4, 1);
    ctx.fillRect(x + 2, y, 4, 1);
    ctx.fillRect(x, y - 5, 1, 4);
    ctx.fillRect(x, y + 2, 1, 4);
  }

  private dibujarLluvia(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = `rgba(200, 226, 240, ${0.3 + this.clima.lluvia * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const sesgo = this.clima.viento * 2.4;
    for (const g of this.gotas) {
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + sesgo, g.y + 6);
    }
    ctx.stroke();
  }

  /** Manga de viento arriba: sin esto el jugador no entiende por que falla. */
  private dibujarViento(ctx: CanvasRenderingContext2D): void {
    const y = 10;
    const fuerza = Math.abs(this.clima.viento);
    const largo = Math.min(40, 8 + fuerza * 11);
    const dir = this.clima.viento >= 0 ? 1 : -1;

    ctx.fillStyle = 'rgba(20, 30, 40, 0.35)';
    ctx.fillRect(this.centroX - largo / 2, y + 1, largo, 2);
    ctx.fillStyle = fuerza < 0.5 ? '#dce4ea' : '#ffd089';
    ctx.fillRect(this.centroX - largo / 2, y, largo, 2);
    for (let i = 0; i < 4; i++) {
      const px = this.centroX + dir * (largo / 2 - i) - (dir > 0 ? 0 : 1);
      ctx.fillRect(px, y - i, 1, 2 + i * 2);
    }
  }
}
