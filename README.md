# Jardín Pixel

Un jardín virtual en pixel art 3D. Sembrás flores, las regás, las cosechás, y
los animales que van llegando se pueden alimentar, mimar, adoptar y bautizar.
Todo avanza con el reloj real: si cerrás la pestaña, el jardín sigue creciendo.

![Stack](https://img.shields.io/badge/Three.js-r186-black) ![Stack](https://img.shields.io/badge/React-19-blue) ![Stack](https://img.shields.io/badge/TypeScript-strict-3178c6)

## Arrancar

```bash
npm install
npm run dev
```

Abre en `http://localhost:5178`. No necesita ninguna configuración extra: sin
credenciales de Supabase, la partida se guarda en `localStorage`.

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Chequeo de tipos + build de producción en `dist/` |
| `npm run typecheck` | Solo el chequeo de tipos |
| `npm run preview` | Sirve el build de producción |

## Cómo se juega

1. **Sembrá.** Elegí una semilla en la barra de abajo y tocá una parcela.
2. **Regá.** Sin agua la planta deja de crecer y termina marchitándose. El color
   de la tierra te dice si tiene humedad.
3. **Cosechá.** Cuando la flor se abre, cosechala por monedas. A veces te
   devuelve una semilla.
4. **Cuidá a los animales.** Llegan solos si hay flores abiertas: una mariposa
   con la primera, un zorro recién con dieciséis. Dales de comer y acariciálos
   hasta ganarte su confianza; ahí podés adoptarlos y ponerles nombre.

Teclas `Q` y `E` (o los botones del canvas) giran la cámara un cuarto de vuelta.

## Decisiones técnicas

### El pixel art son matrices de texto

Todo el arte de personajes vive en [`src/game/art/matrices.ts`](src/game/art/matrices.ts)
como arrays de strings, donde cada carácter es un píxel:

```ts
export const TULIP: Matrix = [
  '................',
  '.....3.33.3.....',
  '....31.33.13....',
  ...
```

Los caracteres se resuelven contra una paleta en tiempo de ejecución. Eso hace
que **un solo dibujo genere muchas variedades**: el mismo tulipán produce el
rojo, el amarillo, el rosa y el morado cambiando cinco colores. El proyecto no
tiene ni un archivo de imagen — se dibuja todo en canvas al arrancar. El arte es
legible en un diff, editable sin herramientas y pesa lo que pesa el texto.

El HUD de React usa exactamente las mismas matrices vía
[`PixelIcon`](src/ui/PixelIcon.tsx), así que la interfaz y el mundo nunca se
desincronizan.

### Render híbrido: voxel + billboards

- **El terreno, la cerca, los props, el pasto y las nubes son voxels.**
  [`voxel.ts`](src/game/art/voxel.ts) extruye una matriz a geometría 3D, y emite
  solo las caras que dan al aire: una losa de 16×16 cuesta unos cientos de
  triángulos en vez de miles.
- **Las flores son billboards en cruz** — dos planos perpendiculares. A
  diferencia de un sprite que mira siempre a la cámara, la cruz tiene presencia
  real en el espacio: proyecta sombra y no "gira" cuando rotás la vista.
- **Los animales son billboards encarados a la cámara**, girando solo en Y. Es
  el truco de Octopath Traveler: conserva el dibujo hecho a mano dentro de una
  escena con luz y sombras reales.

El pixelado es genuino, no un filtro: la escena se renderiza en un buffer de
unos 400×300 píxeles y el canvas se estira por CSS con `image-rendering:
pixelated`. La cámara es ortográfica a exactamente 16 píxeles por unidad de
mundo, que es la misma resolución a la que están dibujados los sprites.

### El tiempo es una sola regla

[`sim.ts`](src/state/sim.ts) es una función pura: `advance(estado, ahora)`. El
mismo código corre en cada tick con la pestaña abierta y al volver después de
seis horas. No hay una ruta para "el juego corriendo" y otra para "recuperar
tiempo offline", que es donde suelen aparecer las inconsistencias. Se simulan
hasta 8 horas de ausencia, así que irte un día entero no arruina el jardín.

### Separación entre estado y render

`src/state/` no importa Three.js en ningún lado. El mundo 3D escucha al store de
Zustand y se comunica con el HUD por un `EventBus` tipado. Esa frontera ya se
pagó una vez: el proyecto empezó en 2D con Phaser y pasar a Three.js significó
reemplazar `src/game/` sin tocar una línea de la lógica del juego.

## Estructura

```
src/
  game/
    art/        matrices de píxeles, extrusión a voxels, texturas
    world/      motor, terreno, cielo, luces, plantas, animales, efectos
    EventBus.ts puente tipado entre el mundo 3D y React
  state/
    config.ts   medidas del mundo y balance, todo en un solo lugar
    content.ts  las 14 variedades de flor, 15 de animal y 5 comidas
    sim.ts      simulación pura del paso del tiempo
    store.ts    estado y acciones (Zustand)
    persistence/ adaptadores de guardado: nube y local
  ui/           HUD, paneles y modales en React
supabase/
  schema.sql    tabla y políticas RLS para el guardado en la nube
```

## Guardado en la nube (opcional)

Sin configurar nada, el juego guarda en `localStorage`. Para sincronizar entre
dispositivos:

1. Creá un proyecto en [Supabase](https://supabase.com).
2. Corré [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor.
3. Habilitá **Anonymous sign-ins** en Authentication → Providers.
4. Copiá `.env.example` a `.env` y completá:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

El juego detecta las credenciales solo y muestra `☁ nube` en la esquina. Si la
red falla, degrada a guardado local y reintenta después; nunca se pierde una
partida por estar sin conexión. Cuando hay dos versiones, gana la que se simuló
más recientemente.

## Balance

Todos los números del juego están en `BALANCE`, en
[`config.ts`](src/state/config.ts): cuánto dura la humedad, cuánto tarda una
planta en marchitarse, cada cuánto un animal feliz deja un regalo. Los precios y
tiempos de crecimiento de cada flor están en
[`content.ts`](src/state/content.ts).

## Herramientas de desarrollo

Con `npm run dev`, la consola del navegador expone:

- `__jardin` — el store de Zustand (`__jardin.getState()`)
- `__mundo` — el mundo 3D; `__mundo.luces.faseForzada = 0.8` fija la hora del
  día para mirar la escena de noche sin esperar el ciclo de 8 minutos.
