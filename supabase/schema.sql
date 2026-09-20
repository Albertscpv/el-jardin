-- Esquema para el guardado en la nube de El Jardín.
-- Ejecutalo en el SQL Editor de tu proyecto de Supabase.
--
-- Cada jardín pertenece a una cuenta de auth.users. Las políticas RLS de
-- abajo son lo único que impide que alguien lea o toque el jardín de otro:
-- la anon key viaja en el bundle del navegador, así que la seguridad no
-- puede depender de que esa clave sea secreta.

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

-- Configuración necesaria en el panel de Supabase
--
-- 1. Authentication → Providers → Email: dejalo habilitado.
-- 2. Authentication → URL Configuration → Site URL: la URL de tu deploy.
--    De ahí salen los enlaces de confirmación y de cambio de contraseña; si
--    apunta a otro lado, el usuario confirma y aterriza en la nada.
-- 3. Si querés probar sin lidiar con la entrega de correos, desactivá
--    "Confirm email" en Authentication → Providers → Email. Para producción,
--    dejalo activado.
