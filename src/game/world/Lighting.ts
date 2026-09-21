import * as THREE from 'three';

/** Duracion de un dia completo, en ms de tiempo real. */
export const CICLO_DIA = 8 * 60_000;

/** Tope de luces calidas simultaneas: mas obligaria a recompilar shaders. */
/**
 * Luces puntuales reales. Cada una encarece el sombreado de toda la escena,
 * asi que son pocas y se reparten entre las farolas mas cercanas a lo que
 * se esta mirando. El vidrio de cada farola brilla aparte, sin luz.
 */
const MAX_FAROLES = 8;

interface Momento {
  t: number;
  /** Color y fuerza del sol (o de la luna). */
  sol: string;
  solInt: number;
  /** Luz de relleno: cielo arriba, rebote del pasto abajo. */
  cielo: string;
  suelo: string;
  hemiInt: number;
  /** Cielo: cenit y horizonte. El horizonte tambien tine la niebla. */
  cieloAlto: string;
  fondo: string;
  /** Altura del sol sobre el horizonte, en grados. */
  elevacion: number;
  /** 0 de dia, 1 de noche: enciende faroles y luciernagas. */
  noche: number;
}

const MOMENTOS: Momento[] = [
  { t: 0.00, sol: '#ffb877', solInt: 0.95, cielo: '#ffd9b0', suelo: '#8a9a6a', hemiInt: 0.42, cieloAlto: '#3f5a80', fondo: '#f0a878', elevacion: 7, noche: 0.35 },
  { t: 0.12, sol: '#fff0d8', solInt: 1.5, cielo: '#cfe6ff', suelo: '#93ab74', hemiInt: 0.52, cieloAlto: '#4a90c8', fondo: '#a8d8e8', elevacion: 26, noche: 0 },
  { t: 0.40, sol: '#ffffff', solInt: 1.75, cielo: '#dbefff', suelo: '#9cb47c', hemiInt: 0.55, cieloAlto: '#3f86c4', fondo: '#a8d8ea', elevacion: 42, noche: 0 },
  { t: 0.58, sol: '#ffb163', solInt: 1.4, cielo: '#ffd2a0', suelo: '#8fa370', hemiInt: 0.5, cieloAlto: '#5a7fb0', fondo: '#f0b878', elevacion: 20, noche: 0 },
  { t: 0.68, sol: '#ff7a4a', solInt: 0.8, cielo: '#e8a07a', suelo: '#7a8a60', hemiInt: 0.4, cieloAlto: '#3a4a78', fondo: '#e0785a', elevacion: 6, noche: 0.4 },
  { t: 0.78, sol: '#8fa8e8', solInt: 0.4, cielo: '#22305c', suelo: '#3a4a3c', hemiInt: 0.3, cieloAlto: '#0e1430', fondo: '#2a3a5c', elevacion: 38, noche: 1 },
  { t: 0.94, sol: '#8fa8e8', solInt: 0.4, cielo: '#22305c', suelo: '#3a4a3c', hemiInt: 0.3, cieloAlto: '#0e1430', fondo: '#2a3a5c', elevacion: 26, noche: 1 },
  { t: 1.00, sol: '#ffb877', solInt: 0.95, cielo: '#ffd9b0', suelo: '#8a9a6a', hemiInt: 0.42, cieloAlto: '#3f5a80', fondo: '#f0a878', elevacion: 7, noche: 0.35 },
];

/** Gestiona las luces de la escena y su recorrido a lo largo del dia. */
export class Lighting {
  readonly sol: THREE.DirectionalLight;
  readonly hemisferio: THREE.HemisphereLight;

  /** 0 de dia, 1 de noche. Lo consultan las luciernagas y el cielo. */
  noche = 0;
  /** 0..1 dentro del ciclo. Mueve el sol por el cielo de fondo. */
  faseDia = 0;
  /**
   * Fija la hora del dia en vez de seguir el reloj. Pensado para inspeccionar
   * la escena desde la consola en desarrollo; en null sigue el ciclo normal.
   */
  faseForzada: number | null = null;

  /** Colores del degradado del cielo, que consume la clase Sky. */
  readonly cieloArriba = new THREE.Color('#3f86c4');
  readonly cieloAbajo = new THREE.Color('#a8d8ea');

  /**
   * Punto que debe quedar bien sombreado. Con varias islas repartidas por el
   * mundo un solo mapa de sombras no alcanza para todo, asi que se lo lleva
   * adonde mira la camara.
   */
  readonly centroSombras = new THREE.Vector3();

  private escena: THREE.Scene;
  private faroles: THREE.PointLight[] = [];
  private posicionesFaroles: THREE.Vector3[] = [];
  /** Donde estaba el foco la ultima vez que se repartieron las luces. */
  private ultimoReparto = new THREE.Vector3(Infinity, 0, Infinity);
  private colorA = new THREE.Color();
  private colorB = new THREE.Color();
  private fondo = new THREE.Color();

  constructor(escena: THREE.Scene) {
    this.escena = escena;

    this.hemisferio = new THREE.HemisphereLight('#dbefff', '#62954c', 0.55);
    escena.add(this.hemisferio);

    this.sol = new THREE.DirectionalLight('#ffffff', 1.75);
    this.sol.castShadow = true;
    this.sol.shadow.mapSize.set(1024, 1024);

    const c = this.sol.shadow.camera;
    c.left = -18;
    c.right = 18;
    c.top = 18;
    c.bottom = -18;
    c.near = 1;
    c.far = 70;
    c.updateProjectionMatrix();
    // Evita el acne de sombra sin despegar la sombra de su objeto.
    this.sol.shadow.bias = -0.0012;
    this.sol.shadow.normalBias = 0.03;

    escena.add(this.sol);
    escena.add(this.sol.target);

    // La camara ortografica esta lejos: la niebla arranca despues, para que
    // aporte profundidad sin lavar los colores del jardin.
    escena.fog = new THREE.Fog('#78bcd6', 44, 110);
    this.actualizar();
  }

  /**
   * Recoloca las luces calidas cuando cambia el terreno.
   * Se reutilizan las existentes: crear y destruir luces obliga a Three a
   * recompilar todos los shaders de la escena.
   */
  setFaroles(posiciones: THREE.Vector3[]): void {
    while (this.faroles.length < Math.min(posiciones.length, MAX_FAROLES)) {
      const luz = new THREE.PointLight('#ffc978', 0, 7, 2);
      this.escena.add(luz);
      this.faroles.push(luz);
    }
    this.posicionesFaroles = [...posiciones];
    // Fuerza un reparto nuevo: cambio el terreno aunque la camara no se movio.
    this.ultimoReparto.set(Infinity, 0, Infinity);
  }

  /**
   * Da las luces a las farolas mas cercanas al foco de la camara. Solo se
   * rehace si el foco se movio un poco: mover una luz es barato, pero
   * ordenar en cada cuadro no hace falta.
   */
  repartirFaroles(foco: THREE.Vector3): void {
    if (this.ultimoReparto.distanceToSquared(foco) < 1) return;
    this.ultimoReparto.copy(foco);

    const cercanas = [...this.posicionesFaroles]
      .sort((a, b) => a.distanceToSquared(foco) - b.distanceToSquared(foco))
      .slice(0, this.faroles.length);

    this.faroles.forEach((luz, i) => {
      const pos = cercanas[i];
      luz.visible = Boolean(pos);
      if (pos) luz.position.copy(pos);
    });
  }

  actualizar(): void {
    const t = this.faseForzada ?? (Date.now() % CICLO_DIA) / CICLO_DIA;

    let a = MOMENTOS[0];
    let b = MOMENTOS[MOMENTOS.length - 1];
    for (let i = 0; i < MOMENTOS.length - 1; i++) {
      if (t >= MOMENTOS[i].t && t <= MOMENTOS[i + 1].t) {
        a = MOMENTOS[i];
        b = MOMENTOS[i + 1];
        break;
      }
    }
    const k = (t - a.t) / (b.t - a.t || 1);

    this.sol.color.copy(this.mezcla(a.sol, b.sol, k));
    this.sol.intensity = THREE.MathUtils.lerp(a.solInt, b.solInt, k);

    this.hemisferio.color.copy(this.mezcla(a.cielo, b.cielo, k));
    this.hemisferio.groundColor.copy(this.mezcla(a.suelo, b.suelo, k));
    this.hemisferio.intensity = THREE.MathUtils.lerp(a.hemiInt, b.hemiInt, k);

    this.cieloArriba.copy(this.mezcla(a.cieloAlto, b.cieloAlto, k));
    this.cieloAbajo.copy(this.mezcla(a.fondo, b.fondo, k));
    // La niebla toma el color del horizonte: lo lejano se funde con el cielo.
    this.fondo.copy(this.cieloAbajo);
    this.escena.background = this.fondo;
    if (this.escena.fog) (this.escena.fog as THREE.Fog).color.copy(this.fondo);

    // El sol recorre el cielo; la sombra se alarga sola al caer la tarde.
    const elevacion = THREE.MathUtils.degToRad(THREE.MathUtils.lerp(a.elevacion, b.elevacion, k));
    const azimut = t * Math.PI * 2;
    const radio = Math.cos(elevacion) * 30;
    this.sol.position.set(
      this.centroSombras.x + Math.sin(azimut) * radio,
      Math.max(6, Math.sin(elevacion) * 30),
      this.centroSombras.z + Math.cos(azimut) * radio,
    );
    this.sol.target.position.copy(this.centroSombras);
    this.sol.target.updateMatrixWorld();

    this.faseDia = t;
    this.noche = THREE.MathUtils.lerp(a.noche, b.noche, k);
    for (const luz of this.faroles) luz.intensity = this.noche * 9;
  }

  private mezcla(hexA: string, hexB: string, k: number): THREE.Color {
    this.colorA.setStyle(hexA);
    this.colorB.setStyle(hexB);
    return this.colorA.lerp(this.colorB, k);
  }
}
