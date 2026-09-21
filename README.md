# El Jardín de Pan

Un jardín virtual en pixel art 3D, sobre islas flotantes. Sembrás flores, las
regás, las cosechás, y los animales que van llegando se pueden alimentar, mimar,
adoptar y bautizar. Le ganás terreno al vacío celda por celda, fundás islas
nuevas y armás tu propio personaje. Todo avanza con el reloj real: si cerrás la
pestaña, el jardín sigue creciendo.

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
| `npm test` | Tests de la lógica de sesión y persistencia |
| `npm run preview` | Sirve el build de producción |

## Cómo se juega

1. **Sembrá.** Elegí una semilla en la barra de abajo y tocá una parcela arada.
2. **Regá.** Sin agua la planta deja de crecer y termina marchitándose. El color
   de la tierra te dice si tiene humedad.
3. **Cosechá.** Cuando la flor se abre, cosechala por monedas. A veces te
   devuelve una semilla.
4. **Cuidá a los animales.** Llegan solos si hay flores abiertas: una mariposa
   con la primera, un zorro recién con dieciséis. Dales de comer y acariciálos
   hasta ganarte su confianza; ahí podés adoptarlos y ponerles nombre.
5. **Hacé crecer el jardín.** En *Construir* le ganás terreno al vacío celda por
   celda, arás césped para sembrar y fundás islas nuevas.
6. **Practicá tiro.** *Práctica* abre el campo de tiro: otro escenario, en
   primera persona, donde el clima del momento te corre las flechas.

**Cámara libre:** arrastrá para orbitar en cualquier ángulo y altura, Shift (o
el botón derecho) para desplazarte, rueda para acercar, ⌖ para encuadrar todo.

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

- **El personaje** es otro billboard, con su textura generada desde las mismas
  matrices: el sombrero es una matriz aparte que se superpone al cuerpo.

El pixelado es genuino, no un filtro: la escena se renderiza en un buffer de
unos 400×300 píxeles y el canvas se estira por CSS con `image-rendering:
pixelated`. La cámara es ortográfica y con zoom 1 pone exactamente 16 píxeles
por unidad de mundo, la misma resolución a la que están dibujados los sprites.
Al orbitar, lo que cambia es cuánto mundo entra en cuadro; el tamaño del píxel
en pantalla no se mueve.

### El territorio es dato, no geometría

No hay un mapa fijo. El mundo es una lista de islas, y cada isla es un conjunto
de celdas `"col,row"`. De ahí se derivan todas las cosas que parecerían tener
que modelarse a mano:

- **La cerca** sale de [`bordesDeIsla`](src/state/islas.ts): los lados de celda
  que dan al vacío. El jugador extiende tierra y la valla se reacomoda sola —
  por eso no hay una herramienta para mover vallas, y no hace falta.
- **La panza de las islas** se afina sola: cada capa hacia abajo conserva solo
  las celdas con tierra en los cuatro costados, y el resultado es la silueta
  clásica de isla flotante sin modelar nada.
- **Los adornos** (arbustos, piedras, matas de pasto) se sortean con un hash
  estable de la celda, así que sobreviven a cada reconstrucción sin ocupar lugar
  en la partida guardada.

El terreno se rehace entero cuando cambia la forma del territorio. Suena caro,
pero expandir es una acción puntual y la geometría se arma en milisegundos; a
cambio no hay estado incremental que pueda desincronizarse del modelo.

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
    input/      teclado y joystick, unificados en un solo vector
    range/      campo de tiro en primera persona (canvas 2D)
    world/      motor y cámara libre, terreno, cielo, luces, plantas,
                animales, personaje, efectos
    EventBus.ts puente tipado entre el mundo 3D y React
  state/
    config.ts   claves de celda y balance, todo en un solo lugar
    content.ts  las 14 variedades de flor, 15 de animal, 5 comidas y el avatar
    clima.ts    clima derivado del reloj, sin guardarse
    islas.ts    geometría del territorio: bordes, expansión, generación
    sim.ts      simulación pura del paso del tiempo
    store.ts    estado y acciones (Zustand)
    persistence/ adaptadores de guardado: nube y local
  ui/           HUD, paneles y modales en React
supabase/
  schema.sql    tabla y políticas RLS para el guardado en la nube
  historial.sql versiones anteriores de cada jardín, para poder recuperarlas
  proteccion.sql la base rechaza reemplazar un jardín por otro distinto
  regalos.sql   regalos personales para un jugador, escritos desde el SQL Editor
```

## Desplegar en Vercel

El repo ya trae [`vercel.json`](vercel.json) con el framework, el comando de
build y el directorio de salida, así que Vercel no tiene que adivinar nada.

1. Entrá a [vercel.com/new](https://vercel.com/new) e importá este repositorio.
2. Dejá los valores que detecta solos (framework Vite, `npm run build`, `dist`).
3. Si querés cuentas y guardado en la nube, agregá las dos variables de la
   sección siguiente en **Settings → Environment Variables**. Sin ellas el juego
   funciona igual, guardando en `localStorage` y sin registro.
4. Deploy.

Desde ahí, cada push a `main` publica a producción y cada rama abre su propio
preview. El build corre `tsc --noEmit` antes de compilar, así que un error de
tipos frena el deploy en vez de llegar a producción.

Las variables de Vite se inlinean en el bundle en tiempo de build: lo que pongas
en `VITE_*` queda visible en el JS que sirve el sitio. La `anon key` de Supabase
está pensada para eso — lo que protege los datos son las políticas RLS de
[`schema.sql`](supabase/schema.sql), no el secreto de la clave. Nunca pongas ahí
una `service_role key`.

## Campo de tiro

Es un escenario aparte, no un panel sobre el jardín: se monta en lugar del
mundo 3D, así no paga su render mientras practicás.

La vista es en primera persona y se dibuja sobre un canvas 2D proyectando a
mano (`escala = focal / z`). No hace falta un motor 3D para esto, y a cambio
el pixel art queda intacto. Desde los ojos del arquero la caída y la deriva se
**ven mientras pasan**, que es justo lo que en vista isométrica había que
adivinar.

- Mantené apretado para tensar, soltá para disparar. Cuanto más tensás, más
  tiembla la mira: sostener el arco cansa, y sin eso cargar al máximo sería
  gratis y siempre la mejor jugada.
- Los tres muñecos están a 10, 17 y 26 m. El primero se acierta apuntando al
  centro; el último obliga a elevar la mira y a leer el viento.
- La resolución lógica del lienzo se deriva del tamaño real de la pantalla, así
  que en un teléfono vertical el encuadre sigue siendo jugable en vez de quedar
  como una franja.

### El clima

Lo define [`clima.ts`](src/state/clima.ts) y **no se guarda en la partida**: se
deriva del reloj en bloques de cuatro minutos. Un bloque da siempre el mismo
cielo, así que recargar no lo cambia, todos ven lo mismo a la misma hora y no
hay un campo más que migrar.

El viento acelera la flecha de costado y se muestra arriba como una manga, con
el pasto y las nubes inclinados: si no se ve por qué fallaste, el viento es una
trampa en vez de una mecánica.

### El personaje, por ahora apagado

El personaje que caminaba por el jardín está desactivado con
`PERSONAJE_ACTIVO` en [`config.ts`](src/state/config.ts). La malla, el control
por teclado y el joystick táctil siguen enteros: no se montan, nada más.
Ponerlo en `true` lo devuelve.

## Cuentas y guardado en la nube (opcional)

Sin configurar nada, el juego guarda en `localStorage` y no hay registro: se
juega y listo. Conectando un proyecto de Supabase se habilita crear cuenta,
iniciar sesión y sincronizar el jardín entre dispositivos.

1. Creá un proyecto en [Supabase](https://supabase.com).
2. Corré [`supabase/schema.sql`](supabase/schema.sql) en el SQL Editor. Al final
   del archivo está la configuración que hay que tocar en el panel (Site URL y
   confirmación de correo).
3. Corré [`supabase/historial.sql`](supabase/historial.sql) también. Guarda la
   versión anterior de cada jardín cuando cambia, así una versión pisada se puede
   recuperar. Al final del archivo están las consultas para ver y restaurar.
4. Corré [`supabase/proteccion.sql`](supabase/proteccion.sql). Hace que la base
   rechace cualquier guardado que reemplace el jardín de una cuenta por otro,
   venga de la versión del juego que venga. Solo "Reiniciar jardín" puede.
5. Corré [`supabase/regalos.sql`](supabase/regalos.sql) si querés poder darle
   algo a un jugador concreto (por ejemplo, devolverle un jardín perdido). Al
   final del archivo está cómo escribir un regalo y la lista de nombres válidos.
6. Copiá `.env.example` a `.env` y completá:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

El juego detecta las credenciales solo: aparece el panel **Cuenta** y el chip de
la esquina pasa de `💾 local` a `☁ sincronizado` al iniciar sesión.

### Cómo se comporta

- **Sin cuenta** se juega igual, guardando en el navegador. La cuenta es opcional
  a propósito: pedirle registro a alguien antes de dejarlo plantar una flor es
  la forma más rápida de perderlo.
- **Al registrarte**, el jardín que tenías en el navegador se sube tal cual. No
  se pierde nada por crear la cuenta tarde.
- **Al iniciar sesión**, manda la partida de la cuenta. Iniciar sesión significa
  "traeme mi jardín", así que lo local no pisa lo de la cuenta.
- **Al cerrar sesión** volvés a la partida del navegador; la de la nube queda
  intacta.
- **Con sesión activa**, entre la copia del navegador y la de la nube gana la
  simulada más recientemente, que es lo que resuelve jugar en dos dispositivos.
- Si la red falla, el guardado local ya ocurrió y el siguiente intento
  reintenta la nube. Nunca se pierde una partida por estar sin conexión.

### Si querés volver la cuenta obligatoria

Es una guarda en [`App.tsx`](src/ui/App.tsx): cuando `useAuth` reporta estado
`invitado`, renderizá `<AuthPanel />` en vez del juego.

### Sobre la anon key

Las variables de Vite se inlinean en el bundle en tiempo de build: lo que pongas
en `VITE_*` queda visible en el JS que sirve el sitio. La `anon key` está
pensada para eso — lo que protege los datos son las políticas RLS de
[`schema.sql`](supabase/schema.sql), no el secreto de la clave. Nunca pongas ahí
una `service_role key`.


## Balance

Todos los números del juego están en `BALANCE`, en
[`config.ts`](src/state/config.ts): cuánto dura la humedad, cuánto tarda una
planta en marchitarse, cada cuánto un animal feliz deja un regalo, cuánto cuesta
una celda de terreno. Los precios y tiempos de crecimiento de cada flor están en
[`content.ts`](src/state/content.ts).

Expandir usa precio creciente: cada celda encarece la siguiente
(`costoProximaCelda`), para que crecer sea una decisión y no un trámite.

## Herramientas de desarrollo

Con `npm run dev`, la consola del navegador expone:

- `__jardin` — el store de Zustand (`__jardin.getState()`)
- `__mundo` — el mundo 3D; `__mundo.luces.faseForzada = 0.8` fija la hora del
  día para mirar la escena de noche sin esperar el ciclo de 8 minutos.
