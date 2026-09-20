-- Esquema para el guardado en la nube de El Jardín.
-- Ejecutalo en el SQL Editor de tu proyecto de Supabase.
--
-- El juego usa sesiones anónimas (auth.signInAnonymously), así que cada
-- navegador obtiene un usuario real y las políticas RLS de abajo alcanzan
-- para que nadie pueda leer ni tocar el jardín de otro.

create table if not exists public.jardines (
  usuario_id     uuid primary key references auth.users (id) on delete cascade,
  estado         jsonb       not null,
  actualizado_en timestamptz not null default now()
);

alter table public.jardines enable row level security;

-- Una política por operación: cada quien ve y escribe solo su fila.
drop policy if exists "leer el jardin propio" on public.jardines;
create policy "leer el jardin propio"
  on public.jardines for select
  using (auth.uid() = usuario_id);

drop policy if exists "crear el jardin propio" on public.jardines;
create policy "crear el jardin propio"
  on public.jardines for insert
  with check (auth.uid() = usuario_id);

drop policy if exists "actualizar el jardin propio" on public.jardines;
create policy "actualizar el jardin propio"
  on public.jardines for update
  using (auth.uid() = usuario_id)
  with check (auth.uid() = usuario_id);

drop policy if exists "borrar el jardin propio" on public.jardines;
create policy "borrar el jardin propio"
  on public.jardines for delete
  using (auth.uid() = usuario_id);

-- Para listar jardines por actividad reciente sin escanear la tabla entera.
create index if not exists jardines_actualizado_en_idx
  on public.jardines (actualizado_en desc);

-- Acordate de habilitar "Anonymous sign-ins" en
-- Authentication → Providers → Anonymous, o signInAnonymously fallará.
