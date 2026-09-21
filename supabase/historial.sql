-- Historial de versiones de cada jardín.
-- Ejecutalo en el SQL Editor de Supabase, después de schema.sql.
-- Se puede correr más de una vez: no borra nada que ya exista.
--
-- La tabla `jardines` tiene una fila por usuario y cada guardado la
-- reemplaza entera, así que una versión pisada no se podía recuperar. Esto
-- guarda la versión anterior en otra tabla cada vez que el jardín cambia:
--
--   · siempre que el jardín de la cuenta pasa a ser OTRO jardín (otro
--     `creadoEn`): es el caso en que se puede perder todo el progreso, y
--     esas versiones no se borran nunca;
--   · siempre que se borra la fila;
--   · y además una copia periódica, como mucho cada 30 minutos por usuario.
--     El juego guarda cada pocos segundos mientras se juega: archivar cada
--     guardado llenaría la base de copias casi iguales. De las periódicas se
--     conservan las 50 más nuevas por usuario, unas 25 horas de juego.
--
-- Lo escribe solamente el trigger. Desde el juego nadie puede insertar,
-- modificar ni borrar historial; cada jugador puede leer solo el suyo.
--
-- Importante: empieza a guardar desde que lo ejecutás. Las versiones que se
-- perdieron antes no aparecen acá.


-- 1. La tabla ---------------------------------------------------------

create table if not exists public.jardines_historial (
  id            bigint generated always as identity primary key,
  usuario_id    uuid        not null references auth.users (id) on delete cascade,
  -- La versión tal como estaba antes del cambio.
  estado        jsonb       not null,
  -- Cuándo se había guardado esa versión en el juego.
  guardado_en   timestamptz,
  -- Cuándo pasó al historial.
  archivado_en  timestamptz not null default now(),
  -- 'otro jardin', 'borrado', 'periodica' o 'manual' (copias hechas a mano
  -- desde el SQL Editor, por ejemplo antes de restaurar).
  motivo        text        not null
);

create index if not exists jardines_historial_usuario_idx
  on public.jardines_historial (usuario_id, archivado_en desc);


-- 2. Quién puede tocarla ----------------------------------------------

alter table public.jardines_historial enable row level security;

-- Cada jugador ve solo su historial. Sirve para una futura opción de
-- "recuperar una versión" dentro del juego.
drop policy if exists "leer el historial propio" on public.jardines_historial;
create policy "leer el historial propio"
  on public.jardines_historial for select
  using (auth.uid() = usuario_id);

-- Sin políticas de escritura: con RLS activo, eso ya prohíbe escribir. Se
-- revoca además de forma explícita, para que no dependa de acordarse.
revoke insert, update, delete on public.jardines_historial from anon, authenticated;


-- 3. El trigger que archiva ---------------------------------------------

-- security definer: corre con los permisos del dueño de la tabla, que es lo
-- que le permite escribir en el historial aunque el jugador no pueda.
-- search_path vacío y nombres completos: así nadie puede colarle una tabla
-- o función con el mismo nombre desde otro esquema.
create or replace function public.archivar_jardin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ultima            timestamptz;
  es_otro_jardin    boolean;
begin
  if tg_op = 'DELETE' then
    insert into public.jardines_historial (usuario_id, estado, guardado_en, motivo)
    values (old.usuario_id, old.estado, old.actualizado_en, 'borrado');
    return old;
  end if;

  es_otro_jardin := (old.estado ->> 'creadoEn') is distinct from (new.estado ->> 'creadoEn');

  if es_otro_jardin then
    insert into public.jardines_historial (usuario_id, estado, guardado_en, motivo)
    values (old.usuario_id, old.estado, old.actualizado_en, 'otro jardin');
    return new;
  end if;

  select max(h.archivado_en) into ultima
  from public.jardines_historial h
  where h.usuario_id = old.usuario_id
    and h.motivo = 'periodica';

  if ultima is null or ultima < now() - interval '30 minutes' then
    insert into public.jardines_historial (usuario_id, estado, guardado_en, motivo)
    values (old.usuario_id, old.estado, old.actualizado_en, 'periodica');

    -- Solo se recortan las periódicas: las de 'otro jardin' y 'borrado' son
    -- las que pueden salvar un jardín entero, y se conservan siempre.
    delete from public.jardines_historial h
    where h.usuario_id = old.usuario_id
      and h.motivo = 'periodica'
      and h.id not in (
        select h2.id
        from public.jardines_historial h2
        where h2.usuario_id = old.usuario_id
          and h2.motivo = 'periodica'
        order by h2.archivado_en desc, h2.id desc
        limit 50
      );
  end if;

  return new;
end;
$$;

-- after: solo se archiva si el cambio de verdad ocurrió. El `when` evita
-- archivar un guardado que no cambió nada.
drop trigger if exists archivar_jardin_al_cambiar on public.jardines;
create trigger archivar_jardin_al_cambiar
  after update on public.jardines
  for each row
  when (old.estado is distinct from new.estado)
  execute function public.archivar_jardin();

drop trigger if exists archivar_jardin_al_borrar on public.jardines;
create trigger archivar_jardin_al_borrar
  after delete on public.jardines
  for each row
  execute function public.archivar_jardin();


-- ======================================================================
-- Consultas para usar desde el SQL Editor
-- ======================================================================
--
-- Ver las versiones de cada usuario, de la más nueva a la más vieja:
--
--   select h.id, u.email, h.archivado_en, h.motivo,
--     to_timestamp((h.estado ->> 'creadoEn')::bigint / 1000) as jardin_creado,
--     (h.estado ->> 'monedas')::int                         as monedas,
--     (h.estado ->> 'floresCosechadas')::int                as cosechadas,
--     jsonb_array_length(h.estado -> 'animales')            as animales,
--     jsonb_array_length(h.estado -> 'islas')               as islas
--   from public.jardines_historial h
--   join auth.users u on u.id = h.usuario_id
--   order by u.email, h.archivado_en desc;
--
-- Devolverle a un usuario una versión del historial, en dos pasos
-- (cambiá 123 por el id de la versión que querés devolver):
--
--   -- 1. Copia manual de lo que tiene ahora, para poder deshacer. Las
--   --    copias 'manual' no se recortan nunca.
--   insert into public.jardines_historial (usuario_id, estado, guardado_en, motivo)
--   select j.usuario_id, j.estado, j.actualizado_en, 'manual'
--   from public.jardines j
--   join public.jardines_historial h on h.usuario_id = j.usuario_id
--   where h.id = 123;
--
--   -- 2. La restauración. Si instalaste proteccion.sql, la base rechaza
--   --    reemplazar un jardín por otro distinto; el set_config lo habilita
--   --    solo dentro de este begin/commit.
--   begin;
--   select set_config('jardin.reemplazar', 'si', true);
--   update public.jardines j
--   set estado = h.estado, actualizado_en = now()
--   from public.jardines_historial h
--   where h.id = 123 and j.usuario_id = h.usuario_id;
--   commit;
--
-- El paso 1 hace falta porque el trigger no siempre archiva lo que había:
-- si la versión devuelta es del mismo jardín y hubo una copia periódica en
-- los últimos 30 minutos, no queda registro de lo reemplazado.
--
-- Antes de restaurar, pedile al jugador que CIERRE el juego en todos lados.
-- Si la versión es de otro jardín, el juego abierto no la va a pisar (se
-- niega a escribir encima de un jardín distinto), pero si es del mismo
-- jardín, el próximo guardado de una pestaña abierta la reemplazaría.
