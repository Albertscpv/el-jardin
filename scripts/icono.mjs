/**
 * Genera el icono de la pestana: public/tulipan.svg.
 *
 * Se ejecuta a mano con `npm run icono`, no en cada build: el dibujo casi
 * nunca cambia y el resultado se versiona. Si alguien retoca la matriz TULIP
 * o la paleta del tulipan rojo, hay que volver a correrlo.
 */
import fs from 'node:fs';

/* La matriz y la paleta salen del juego, no de una copia a mano: el icono
   y el tulipan que se planta en el jardin no se pueden desincronizar. */
const fuente = fs.readFileSync('src/game/art/matrices.ts', 'utf8');
const bloque = fuente.match(/export const TULIP: Matrix = \[([\s\S]*?)\];/);
if (!bloque) throw new Error('no encontre TULIP');
const filas = [...bloque[1].matchAll(/'([^']*)'/g)].map((m) => m[1]);

const contenido = fs.readFileSync('src/state/content.ts', 'utf8');
const variante = contenido.match(/id: 'tulipan-rojo',[\s\S]*?palette: \{([^}]*)\}/);
if (!variante) throw new Error('no encontre tulipan-rojo');
const paleta = { s: '#62a04a', S: '#3f7a35', l: '#6fb355', L: '#4a8a3c' };
for (const m of variante[1].matchAll(/'(\w)':\s*'(#[0-9a-fA-F]{6})'/g)) paleta[m[1]] = m[2];

const ancho = filas[0].length;
const alto = filas.length;

const rects = [];
for (let y = 0; y < alto; y++) {
  let x = 0;
  while (x < ancho) {
    const color = paleta[filas[y][x]];
    if (!color) { x++; continue; }
    let fin = x;
    while (fin + 1 < ancho && paleta[filas[y][fin + 1]] === color) fin++;
    rects.push(`  <rect x="${x}" y="${y}" width="${fin - x + 1}" height="1" fill="${color}"/>`);
    x = fin + 1;
  }
}

const svg = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" shape-rendering="crispEdges">`,
  '  <title>El Jardín de Pan</title>',
  // Fondo: sin el, el tallo verde oscuro se pierde contra una barra de
  // pestanas oscura. Es el mismo color que el theme-color de la pagina.
  `  <rect width="${ancho}" height="${alto}" rx="3.5" fill="#2b1d16"/>`,
  ...rects,
  '</svg>',
].join('\n');

fs.writeFileSync('public/tulipan.svg', svg + '\n');
console.log(`${rects.length} rects · ${svg.length + 1} bytes`);
