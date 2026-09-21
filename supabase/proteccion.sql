-- Protección: la base no deja reemplazar el jardín de una cuenta por otro.
-- Ejecutalo en el SQL Editor de Supabase, después de schema.sql.
-- Se puede correr más de una vez: no borra nada que ya exista.
--
-- El juego ya se niega a pisar un jardín distinto, pero esa regla vive en el
-- navegador: una pestaña abierta con una versión vieja del juego sigue
-- guardando a ciegas, y así se puede perder un jardín entero. Poner la regla
-- en la base la hace valer para cualquier versión que escriba.
--
-- Cada jardín se reconoce por `creadoEn`, que se fija al crearlo y no cambia.
-- Un guardado que intente cambiarlo se rechaza con el código PT409, que
-- Supabase devuelve como HTTP 409 (conflicto). El jardín de la cuenta queda
-- intacto y el juego sigue guardando en el navegador.
--
-- La única excepción es "Reiniciar jardín", que el jugador pide a propósito.
-- Pasa por la función `reemplazar_jardin`, que habilita el reemplazo solo
-- durante esa escritura: el permiso no queda guardado en ninguna fila, así
-- que ningún otro guardado lo puede heredar.


-- 1. El trigger que protege ---------------------------------------------

create or replace function public.proteger_jardin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (old.estado ->> 'creadoEn') is distinct from (new.estado ->> 'creadoEn')
     and coalesce(current_setting('jardin.reemplazar', true), '') <> 'si' then
    raise exception 'jardin_distinto'
      using errcode = 'PT409',
            detail  = 'La cuenta ya tiene otro jardín guardado y no se sobrescribe.',
            hint    = 'Solo "Reiniciar jardín" puede reemplazarlo.';
  end if;
  return new;
end;
$$;

-- before: se corta antes de escribir. Un guardado rechazado no llega al
-- historial porque no ocurrió.
drop trigger if exists proteger_jardin on public.jardines;
create trigger proteger_jardin
  before update on public.jardines
  for each row
  execute function public.proteger_jardin();


-- 2. La única forma de reemplazar a propósito --------------------------

-- security invoker: corre como el jugador, con sus políticas RLS, así que
-- solo puede tocar su propia fila. Lo que habilita es su propio reemplazo.
create or replace function public.reemplazar_jardin(p_estado jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'sin_sesion' using errcode = 'PT401';
  end if;

  -- `true`: vale solo para esta transacción. Al terminar se borra solo.
  perform set_config('jardin.reemplazar', 'si', true);

  insert into public.jardines (usuario_id, estado, actualizado_en)
  values (auth.uid(), p_estado, now())
  on conflict (usuario_id) do update
    set estado = excluded.estado,
        actualizado_en = excluded.actualizado_en;

  perform set_config('jardin.reemplazar', '', true);
end;
$$;

revoke execute on function public.reemplazar_jardin(jsonb) from public, anon;
grant execute on function public.reemplazar_jardin(jsonb) to authenticated;


-- ======================================================================
-- Comprobar que quedó instalado
-- ======================================================================
--
-- Tiene que aparecer `proteger_jardin` junto a los dos del historial:
--
--   select tgname
--   from pg_trigger
--   where tgrelid = 'public.jardines'::regclass and not tgisinternal;
--
-- Si alguna vez hace falta reemplazar un jardín a mano desde el SQL Editor,
-- hay que habilitarlo dentro de una misma transacción:
--
--   begin;
--   select set_config('jardin.reemplazar', 'si', true);
--   update public.jardines ... ;
--   commit;
--
-- La restauración que está al final de historial.sql ya lo hace así.
