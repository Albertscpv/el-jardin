-- Regalos personales: darle algo a un jugador concreto desde el SQL Editor.
-- Ejecutalo en el SQL Editor de Supabase, después de schema.sql.
-- Se puede correr más de una vez: no borra nada que ya exista.
--
-- Sirve, por ejemplo, para devolverle a alguien un jardín que perdió. Vos
-- escribís qué le toca; la próxima vez que entre con su cuenta, el juego lo
-- arma con sus propias funciones (una isla regalada es igual a una fundada
-- jugando) y se lo muestra en el apartado Regalos con tu mensaje.
--
-- No importa si el jugador tiene el juego abierto: no se toca su jardín
-- desde acá, se deja el regalo esperando. Cada regalo se entrega una sola
-- vez, y se marca como cobrado recién cuando el jardín con el regalo quedó
-- guardado en la nube: si algo falla en el medio, se reintenta al volver.


-- 1. La tabla -----------------------------------------------------------

create table if not exists public.regalos_personales (
  id          bigint generated always as identity primary key,
  usuario_id  uuid        not null references auth.users (id) on delete cascade,
  -- Lo que ve el jugador en el apartado Regalos.
  mensaje     text        not null default '',
  -- Qué le toca. Formato al final del archivo.
  contenido   jsonb       not null,
  creado_en   timestamptz not null default now(),
  -- null mientras está pendiente.
  cobrado_en  timestamptz
);

create index if not exists regalos_personales_pendientes_idx
  on public.regalos_personales (usuario_id)
  where cobrado_en is null;


-- 2. Quién puede tocarla ------------------------------------------------

alter table public.regalos_personales enable row level security;

-- Cada jugador ve solo sus regalos.
drop policy if exists "leer los regalos propios" on public.regalos_personales;
create policy "leer los regalos propios"
  on public.regalos_personales for select
  using (auth.uid() = usuario_id);

-- Los regalos se crean desde el SQL Editor. Ningún jugador puede crearse,
-- cambiarse ni borrarse uno.
revoke insert, update, delete on public.regalos_personales from anon, authenticated;


-- 3. Marcar como cobrado ------------------------------------------------

-- La única escritura que hace el juego. security definer porque el jugador
-- no tiene permiso de update; a cambio solo puede marcar sus propios
-- regalos, y solo de pendiente a cobrado: no puede "descobrar" uno para
-- recibirlo otra vez.
create or replace function public.marcar_regalo_cobrado(p_id bigint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.regalos_personales
  set cobrado_en = now()
  where id = p_id
    and usuario_id = auth.uid()
    and cobrado_en is null;
$$;

revoke execute on function public.marcar_regalo_cobrado(bigint) from public, anon;
grant execute on function public.marcar_regalo_cobrado(bigint) to authenticated;


-- ======================================================================
-- Cómo dar un regalo
-- ======================================================================
--
-- Cambiá el email, el mensaje y el contenido:
--
--   insert into public.regalos_personales (usuario_id, mensaje, contenido)
--   select id,
--     'Te devolvemos tu jardín 💛',
--     '{
--        "monedas": 3000,
--        "tierra": 40,
--        "islas": 1,
--        "farolas": 2,
--        "semillas": { "rosa-roja": 5, "girasol-clasico": 3 },
--        "comida":   { "heno": 6, "manzana": 4 },
--        "animales": [
--          { "especie": "caballo", "nombre": "Canela", "variante": "caballo-zaino" },
--          { "especie": "gato",    "nombre": "Michi" }
--        ]
--      }'::jsonb
--   from auth.users
--   where email = 'jugador@ejemplo.com';
--
-- Todo es opcional: poné solo lo que le corresponda. Lo que esté mal escrito
-- (una especie que no existe, un número negativo) se descarta sin romper
-- nada, y hay topes por si se escapa un cero: 1.000.000 monedas, 999 de
-- cada cosa, 10 islas, 400 celdas de tierra y 30 animales por regalo.
--
--   monedas   número
--   tierra    celdas de tierra extra en la isla principal
--   islas     islas nuevas; cada una trae su caballo de la casa
--   farolas   farolas para poner
--   semillas  { "variedad": cantidad }
--   comida    { "comida": cantidad }
--   animales  lista de { "especie", "nombre", "variante" }; llegan adoptados.
--             Sin nombre se llaman como su especie; sin variante, una al azar.
--
-- Semillas:  tulipan-rojo, tulipan-amarillo, tulipan-rosa, tulipan-morado,
--            rosa-roja, rosa-rosada, rosa-blanca, rosa-durazno,
--            girasol-clasico, girasol-rojizo, margarita-blanca,
--            margarita-rosada, lavanda-clasica, lavanda-azul
-- Comida:    nectar, alpiste, zanahoria, bayas, pescado, heno, manzana
-- Animales (especie -> variantes):
--            mariposa -> mariposa-monarca, mariposa-azul, mariposa-blanca
--            pajaro   -> pajaro-azul, pajaro-rojo, pajaro-amarillo
--            conejo   -> conejo-blanco, conejo-cafe, conejo-gris
--            gato     -> gato-naranja, gato-gris, gato-negro, gato-blanco
--            zorro    -> zorro-rojo, zorro-artico
--            poni     -> poni-canela, poni-pinto, poni-gris
--            yegua    -> yegua-alazana, yegua-baya, yegua-blanca
--            caballo  -> caballo-negro, caballo-zaino, caballo-tordillo
--
-- Ver los regalos y si ya se entregaron:
--
--   select r.id, u.email, r.mensaje, r.creado_en, r.cobrado_en, r.contenido
--   from public.regalos_personales r
--   join auth.users u on u.id = r.usuario_id
--   order by r.creado_en desc;
--
-- Cancelar uno que todavía no se entregó:
--
--   delete from public.regalos_personales where id = 123 and cobrado_en is null;
