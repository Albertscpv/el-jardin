/**
 * Pixel art como matrices de texto.
 *
 * Cada string es una fila y cada caracter un pixel. El caracter se resuelve
 * contra una paleta (ver `render.ts`), asi que un mismo dibujo produce
 * muchas variantes de color sin duplicar arte.
 *
 * Convenciones de caracteres
 *   '.'        transparente
 *   FLORES     1/2/3 petalo claro/medio/oscuro  ·  7/8 centro claro/oscuro
 *              s/S tallo claro/oscuro  ·  l/L hoja clara/oscura
 *              b/B semilla clara/oscura
 *   ANIMALES   a cuerpo  ·  b sombra  ·  c vientre  ·  d detalle
 *              e ojo  ·  f brillo del ojo  ·  g pico y patas
 */

export type Matrix = readonly string[];

/* ------------------------------------------------------------------ */
/* Etapas compartidas por todas las flores                             */
/* ------------------------------------------------------------------ */

export const SEED: Matrix = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......BBBB......',
  '.....BbbbbB.....',
  '.....BbbbbB.....',
  '......BBBB......',
  '................',
  '................',
];

export const SPROUT: Matrix = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.......ss.......',
  '....ll.ss.ll....',
  '...lLl.ss.lLl...',
  '....ll.ss.ll....',
  '.......ss.......',
  '.......ss.......',
  '.......ss.......',
  '.......SS.......',
  '................',
  '................',
];

export const BUD: Matrix = [
  '................',
  '................',
  '................',
  '................',
  '.......33.......',
  '......3223......',
  '.....322223.....',
  '.....322223.....',
  '......3223......',
  '.......ss.......',
  '.......ss.......',
  '....ll.ss.ll....',
  '...lLl.ss.lLl...',
  '....ll.ss.ll....',
  '.......ss.......',
  '.......SS.......',
];

export const WILTED: Matrix = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......bbb.......',
  '.....bBb..b.....',
  '......b..bBb....',
  '......Sb.b......',
  '.......SS.......',
  '......S.S.......',
  '.......SS.......',
  '.......SS.......',
  '.......SS.......',
  '.......SS.......',
];

/* ------------------------------------------------------------------ */
/* Flores en floracion                                                 */
/* ------------------------------------------------------------------ */

export const TULIP: Matrix = [
  '................',
  '.....3.33.3.....',
  '....31.33.13....',
  '....31111113....',
  '....31111113....',
  '....32111123....',
  '....32211223....',
  '.....322223.....',
  '......3333......',
  '.......ss.......',
  '.......ss.......',
  '....ll.ss.ll....',
  '...lLl.ss.lLl...',
  '....ll.ss.ll....',
  '.......ss.......',
  '.......SS.......',
];

export const ROSE: Matrix = [
  '................',
  '.....322223.....',
  '...3321111233...',
  '...3211331123...',
  '...2113223112...',
  '...2113111232...',
  '...3211111123...',
  '....33222233....',
  '......3333......',
  '.......ss.......',
  '.......ss.......',
  '....ll.ss.ll....',
  '...lLl.ss.lLl...',
  '....ll.ss.ll....',
  '.......ss.......',
  '.......SS.......',
];

export const SUNFLOWER: Matrix = [
  '.....1.11.1.....',
  '...1111111111...',
  '..112288882211..',
  '..128888888821..',
  '.12288787888821.',
  '.12288878788821.',
  '.12288787888821.',
  '..128888888821..',
  '..112288882211..',
  '...1111111111...',
  '.....1.11.1.....',
  '.......ss.......',
  '....ll.ss.ll....',
  '...lLl.ss.lLl...',
  '....ll.ss.ll....',
  '.......SS.......',
];

export const DAISY: Matrix = [
  '................',
  '......1111......',
  '....1.1111.1....',
  '..11.122221.11..',
  '..111277882111..',
  '..111278872111..',
  '..111277882111..',
  '..11.122221.11..',
  '....1.1111.1....',
  '......1111......',
  '.......ss.......',
  '.......ss.......',
  '....ll.ss.ll....',
  '...lLl.ss.lLl...',
  '....ll.ss.ll....',
  '.......SS.......',
];

export const LAVENDER: Matrix = [
  '.......11.......',
  '......1221......',
  '......1221......',
  '.....122221.....',
  '.....132231.....',
  '....12222221....',
  '....13222231....',
  '....12222221....',
  '.....132231.....',
  '......1221......',
  '.......ss.......',
  '....l..ss..l....',
  '...lL..ss..Ll...',
  '....l..ss..l....',
  '.......ss.......',
  '.......SS.......',
];

/* ------------------------------------------------------------------ */
/* Animales                                                            */
/* ------------------------------------------------------------------ */

export const CAT: Matrix = [
  '................',
  '................',
  '...a.a..........',
  '...adad.........',
  '..aaaaaa........',
  '..aefaaa........',
  '..aaadaa........',
  '..aaaaaa.aaa....',
  '..aaaaaaaaaaaa..',
  '..aaaaaaaaaaaaa.',
  '..caaaaaaaaaaab.',
  '..ccaaaaaaaaab..',
  '...ccaaaaaaab...',
  '...bb.bb.bb.b...',
  '................',
  '................',
];

export const RABBIT: Matrix = [
  '................',
  '...a..a.........',
  '...ad.ad........',
  '...ad.ad........',
  '...aaaaa........',
  '..aaaaaaa.......',
  '..aefaaaa.......',
  '..aaadaaa.......',
  '..aaaaaaaaaaa...',
  '..caaaaaaaaaac..',
  '..ccaaaaaaaaacc.',
  '..ccaaaaaaaaaab.',
  '...cbaaaaaaabb..',
  '...bb..bb..bb...',
  '................',
  '................',
];

export const FOX: Matrix = [
  '................',
  '...a..a.........',
  '...ada.a........',
  '...aaaaa........',
  '..aaaaaaa.......',
  '..aefaaaa.......',
  '.caaadaaa.......',
  '..aaaaaaaaaa....',
  '..caaaaaaaaaa...',
  '..ccaaaaaaaaac..',
  '...caaaaaaaaacc.',
  '...baaaaaaaaccc.',
  '...bbaaaaaabbcc.',
  '...bb..bb..bb...',
  '................',
  '................',
];

export const BIRD: Matrix = [
  '................',
  '................',
  '................',
  '.....aaaa.......',
  '....aaaaaa......',
  '....aaefaag.....',
  '...aaaaaaagg....',
  '...aabbbaaa.....',
  '...acbbbcaa.....',
  '...acccccaab....',
  '....acccaabb....',
  '.....aaaaa......',
  '......g.g.......',
  '......g.g.......',
  '.....gg.gg......',
  '................',
];

export const BUTTERFLY: Matrix = [
  '................',
  '...aa..ee..aa...',
  '..aaaa.dd.aaaa..',
  '.aaccaaddaaccaa.',
  '.accccaddacccca.',
  '.aaccaaddaaccaa.',
  '..aaaa.dd.aaaa..',
  '...aa..dd..aa...',
  '....a..dd..a....',
  '.......dd.......',
  '.......dd.......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

/* ------------------------------------------------------------------ */
/* Iconos sueltos (particulas y alimentos)                             */
/* ------------------------------------------------------------------ */

export const HEART: Matrix = [
  '..11..11..',
  '.12211221.',
  '1222222221',
  '1222222221',
  '1222222221',
  '.12222221.',
  '..122221..',
  '...1221...',
  '....11....',
  '..........',
];

export const FISH: Matrix = [
  '................',
  '................',
  '................',
  '.....aaaa.......',
  '...aaccccaa..a..',
  '..accccccccaaa..',
  '.acccceccccaaaa.',
  '.acccccccccaaaa.',
  '..accccccccaaa..',
  '...aaccccaa..a..',
  '.....aaaa.......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

export const CARROT: Matrix = [
  '................',
  '................',
  '.......dd.......',
  '....d..dd..d....',
  '....dd.dd.dd....',
  '.....ddddddd....',
  '......aaaa......',
  '......aaaa......',
  '......baab......',
  '.......aa.......',
  '.......aa.......',
  '.......ba.......',
  '........a.......',
  '................',
  '................',
  '................',
];

export const BERRIES: Matrix = [
  '................',
  '................',
  '......dd........',
  '.....d..d.......',
  '....aaa.aaa.....',
  '...acaa.acaa....',
  '...aaaa.aaaa....',
  '....aaa.aaa.....',
  '......aaa.......',
  '.....acaa.......',
  '.....aaaa.......',
  '......aa........',
  '................',
  '................',
  '................',
  '................',
];

export const NECTAR: Matrix = [
  '................',
  '................',
  '.....dddddd.....',
  '.....d....d.....',
  '......d..d......',
  '......aaaa......',
  '......aaaa......',
  '.....acaaaa.....',
  '.....aaaaaa.....',
  '.....aaaaaa.....',
  '.....acaaaa.....',
  '......aaaa......',
  '.......dd.......',
  '................',
  '................',
  '................',
];

export const BIRDSEED: Matrix = [
  '................',
  '................',
  '................',
  '....dddddddd....',
  '....d......d....',
  '....daaaaaad....',
  '....dacaacad....',
  '.....daaaad.....',
  '.....dacaad.....',
  '......daad......',
  '......dddd......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

/** Lanza si la matriz no es rectangular. Se corre al construir texturas. */
export function assertRectangular(name: string, m: Matrix): void {
  const w = m[0]?.length ?? 0;
  m.forEach((row, i) => {
    if (row.length !== w) {
      throw new Error(`Sprite "${name}" fila ${i}: ancho ${row.length}, se esperaba ${w}`);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Personaje                                                           */
/* ------------------------------------------------------------------ */

/**
 * Superpone matrices del mismo tamano: gana la ultima que no sea transparente.
 * Se usa para ponerle sombrero al avatar sin duplicar el dibujo del cuerpo.
 */
export function componerMatrices(...capas: Matrix[]): Matrix {
  const base = capas[0];
  return base.map((fila, y) =>
    [...fila]
      .map((ch, x) => {
        for (let i = capas.length - 1; i > 0; i--) {
          const encima = capas[i][y]?.[x];
          if (encima && encima !== '.') return encima;
        }
        return ch;
      })
      .join(''),
  );
}

/* ------------------------------------------------------------------ */
/* Practica de tiro y easter egg                                       */
/* ------------------------------------------------------------------ */

/** Bomba de agua. Chica a proposito: se extruye a un globo de ~0.25 unidades. */
export const BOMBA_AGUA: Matrix = [
  '..bbbb..',
  '.bwwbbb.',
  'bwbbbbbb',
  'bbbbbbbb',
  'bbbbbbbb',
  '.bbbbbb.',
  '..bbbb..',
  '...nn...',
];

/**
 * Muneco de paja para practicar tiro.
 *   p/P paja  ·  k ojos  ·  d sombrero  ·  r/R arpillera  ·  s poste
 */
export const MUNECO_PAJA: Matrix = [
  '................',
  '.......dd.......',
  '......dddd......',
  '....dddddddd....',
  '.....pppppp.....',
  '.....pkppkp.....',
  '.....pppppp.....',
  '......PPPP......',
  '..rrrrrrrrrrrr..',
  '..rrrrrrrrrrrr..',
  '....rrrrrrrr....',
  '....rrRRRrr.....',
  '.....pppppp.....',
  '......PPPP......',
  '.......ss.......',
  '.......ss.......',
];

/* ------------------------------------------------------------------ */
/* Equinos                                                             */
/* ------------------------------------------------------------------ */

/*
 * Los equinos son los unicos animales mas grandes que un tile, y se dibujan
 * a su tamano real en vez de estirar un sprite de 16x16: estirado, cada
 * pixel del caballo salia casi al doble que los de un gato y parecia de
 * otro juego. A la misma densidad que el resto, el caballo mide 32x28.
 *
 * Tambien son los unicos con mas de una pose. El cuerpo y las patas se
 * guardan por separado y se componen al cargar: los cinco fotogramas
 * comparten un solo cuerpo, asi que retocarlo es retocarlo una vez.
 * Miran a la izquierda como el resto del bestiario.
 */

/** Caballo con la cabeza en alto, sin patas. */
const CABALLO_CUERPO: Matrix = [
  '.........a.a....................',
  '.........daad...................',
  '........daaadd..................',
  '.......aaaaaadd.................',
  '......aaefaaaad.................',
  '.....aaaaaaaaadd................',
  '....aaaaaaaaaaadd...............',
  '...aaaaaaaaaaaaad...............',
  '..bgaaabbaaaaaaadd..............',
  '..bbaaa..baaaaaaadd.............',
  '.........aaaaaaaaadd............',
  '.........aaaaaaaaaaacccccca.....',
  '........aaaaaaaaaaaaaaaaacccdd..',
  '........baaaaaaaaaaaaaaaaaaabdd.',
  '........baaaaaaaaaaaaaaaaaaab.d.',
  '........baaaaaaaaaaaaaaaaaaab.d.',
  '........aaaaaaaaaaaaaaaaaaaab.d.',
  '.........aaaaaaaaaaaaaaaaaaab.dd',
  '.........aaabbbbbbbbbbbbbaaa..d.',
  '..........bbbbbbbbbbbbbbbbb...d.',
  '.............................d..',
  '.............................d..',
  '..............................d.',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
];

/** El mismo caballo con la cabeza en el pasto. */
const CABALLO_PASTANDO: Matrix = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................ddaa............',
  '..........aaddddaaaacccccca.....',
  '........adddaaaaaaaaaaaaacccdd..',
  '.......adaaaaaaaaaaaaaaaaaaabdd.',
  '......adaaaaaaaaaaaaaaaaaaaab.d.',
  '.....adaaaaaaaaaaaaaaaaaaaaab.d.',
  '....adaaaaaaaaaaaaaaaaaaaaaab.d.',
  '...adaaaaaaaaaaaaaaaaaaaaaaab.dd',
  '..adaaaaaaaabbbbbbbbbbbbbaaa..d.',
  '..aaaaaa..bbbbbbbbbbbbbbbbb...d.',
  '..aaefaa.....................d..',
  '.aaaaaa......................d..',
  '.aaaaaa.......................d.',
  '.aaaaa..........................',
  '.baaaa..........................',
  '.bgba...........................',
  '................................',
  '................................',
];

/** Franja de patas: quieto y los cuatro tiempos del paso. */
const CABALLO_PATAS: Matrix[] = [
  [
    '.........aaa.bb......bb.aaa.....',
    '..........aa.bb......bb.aa......',
    '..........aa.bb......bb.aa......',
    '..........aa.bb......bb.aa......',
    '..........aa.bb......bb.aa......',
    '..........aa.bb......bb.aa......',
    '..........gg.gg......gg.gg......',
    '................................',
  ],
  [
    '.........aaa.bb......bb.aaa.....',
    '..........aa.bb......bb.aa......',
    '.........aa..bb.....bb..aa......',
    '.........aa..bb.....bb..aa......',
    '........aa....bb...bb....aa.....',
    '........aa....bb...bb....aa.....',
    '........gg....gg...gg....gg.....',
    '................................',
  ],
  [
    '.........aaa.bb......bb.aaa.....',
    '..........aa.bb......bb.aa......',
    '..........aa.bb......bb.aa......',
    '..........aa.bb......bb.aa......',
    '.........aa..bb.....bb..aa......',
    '.........aa..bb.....bb..aa......',
    '.........gg..gg.....gg..gg......',
    '................................',
  ],
  [
    '.........aaa.bb......bb.aaa.....',
    '..........aa.bb......bb.aa......',
    '..........aabb.......bbaa.......',
    '..........aabb.......bbaa.......',
    '...........aa.........aa........',
    '...........aa.........aa........',
    '...........gg.........gg........',
    '................................',
  ],
  [
    '.........aaa.bb......bb.aaa.....',
    '..........aa.bb......bb.aa......',
    '..........aa.bb......bb.aa......',
    '..........aa.bb......bb.aa......',
    '..........aabb.......bbaa.......',
    '..........aabb.......bbaa.......',
    '..........gggg.......gggg.......',
    '................................',
  ],
];

/** Poni: retacon, patas cortas y copete sobre la frente. */
const PONI_CUERPO: Matrix = [
  '.......a.a..............',
  '.......ddadd............',
  '......ddaaadd...........',
  '.....daaaaadd...........',
  '....aaefaaaadd..........',
  '...aaaaaaaaadd..........',
  '..aaaaaaaaaaadd.........',
  '..bgaaaaaaaaaadd........',
  '..baab.aaaaaaaadd.......',
  '.......aaaaaaaacccccad..',
  '......aaaaaaaaaaaaaaadd.',
  '......baaaaaaaaaaaaaabd.',
  '......baaaaaaaaaaaaaabd.',
  '......aaaaaaaaaaaaaaabdd',
  '.......aabbbbbbbbbbbaad.',
  '........bbbbbbbbbbbbb.d.',
  '.....................d..',
  '......................d.',
  '........................',
  '........................',
  '........................',
  '........................',
];

/** Poni con la cabeza en el pasto. */
const PONI_PASTANDO: Matrix = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '............ddaa........',
  '........adddaaacccccad..',
  '......addaaaaaaaaaaaadd.',
  '.....ddaaaaaaaaaaaaaabd.',
  '....ddaaaaaaaaaaaaaaabd.',
  '...ddaaaaaaaaaaaaaaaabdd',
  '..ddaaaaabbbbbbbbbbbaad.',
  '..aefaa.bbbbbbbbbbbbb.d.',
  '.aaaaaa..............d..',
  '.aaaaa................d.',
  '.baaaa..................',
  '.bgaa...................',
  '........................',
  '........................',
];

/** Franja de patas: quieto y los cuatro tiempos del paso. */
const PONI_PATAS: Matrix[] = [
  [
    '......aaa.bb...bb.aaa...',
    '.......aa.bb...bb.aa....',
    '.......aa.bb...bb.aa....',
    '.......aa.bb...bb.aa....',
    '.......gg.gg...gg.gg....',
    '........................',
  ],
  [
    '......aaa.bb...bb.aaa...',
    '......aa..bb..bb..aa....',
    '.....aa....bbbb....aa...',
    '.....aa....bbbb....aa...',
    '.....gg....gggg....gg...',
    '........................',
  ],
  [
    '......aaa.bb...bb.aaa...',
    '.......aa.bb...bb.aa....',
    '......aa..bb..bb..aa....',
    '......aa..bb..bb..aa....',
    '......gg..gg..gg..gg....',
    '........................',
  ],
  [
    '......aaa.bb...bb.aaa...',
    '.......aabb....bbaa.....',
    '........aa......aa......',
    '........aa......aa......',
    '........gg......gg......',
    '........................',
  ],
  [
    '......aaa.bb...bb.aaa...',
    '.......aa.bb...bb.aa....',
    '.......aabb....bbaa.....',
    '.......aabb....bbaa.....',
    '.......gggg....gggg.....',
    '........................',
  ],
];

/** Pega la franja de patas al pie de un cuerpo del mismo ancho. */
function conPatas(cuerpo: Matrix, patas: Matrix): Matrix {
  const vacia = '.'.repeat(cuerpo[0].length);
  const relleno = Array.from({ length: cuerpo.length - patas.length }, () => vacia);
  return componerMatrices(cuerpo, [...relleno, ...patas]);
}

export interface Poses {
  quieto: Matrix;
  /** Los cuatro tiempos del paso, en orden. */
  paso: Matrix[];
  pastar: Matrix;
}

function poses(cuerpo: Matrix, pastando: Matrix, patas: Matrix[]): Poses {
  const [quieto, ...paso] = patas;
  return {
    quieto: conPatas(cuerpo, quieto),
    paso: paso.map((p) => conPatas(cuerpo, p)),
    pastar: conPatas(pastando, quieto),
  };
}

export const CABALLO: Poses = poses(CABALLO_CUERPO, CABALLO_PASTANDO, CABALLO_PATAS);
export const PONI: Poses = poses(PONI_CUERPO, PONI_PASTANDO, PONI_PATAS);

/** Pose quieta: la que usan los iconos y los paneles. */
export const HORSE: Matrix = CABALLO.quieto;
export const PONY: Matrix = PONI.quieto;

/* ------------------------------------------------------------------ */
/* Comida de los equinos                                               */
/* ------------------------------------------------------------------ */

/** Fardo de heno atado con dos cuerdas. */
export const HAY: Matrix = [
  '................',
  '................',
  '................',
  '....aaaaaaaa....',
  '...aabaabaaba...',
  '...adddddddda...',
  '...abaabaabaa...',
  '...aabaabaaba...',
  '...adddddddda...',
  '...abaabaabaa...',
  '....aaaaaaaa....',
  '................',
  '................',
  '................',
  '................',
  '................',
];

/** Manzana: el premio, no la comida de todos los dias. */
export const APPLE: Matrix = [
  '................',
  '................',
  '.......d........',
  '......dd.ee.....',
  '.....adddee.....',
  '....aaaaaaa.....',
  '...acaaaaaaa....',
  '...acaaaaaaa....',
  '...aaaaaaaaa....',
  '...aaaaaaaaa....',
  '....aaaaaaa.....',
  '.....aaaaa......',
  '................',
  '................',
  '................',
  '................',
];
