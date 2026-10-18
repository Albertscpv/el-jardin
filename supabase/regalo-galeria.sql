-- Regalo para todos: la galería de arte completa.
-- Ejecutalo en el SQL Editor de Supabase, después de regalos.sql, y solo con
-- la versión del juego que ya entiende "obras" publicada: una versión vieja
-- marcaría el regalo como cobrado sin entregar los cuadros.
--
-- Le deja a cada cuenta un regalo personal con las siete obras. Se entrega
-- la próxima vez que el jugador entre, en el apartado Regalos, y los cuadros
-- quedan guardados para poner con la herramienta Arte.
--
-- Se puede correr más de una vez: a quien ya tiene este regalo (cobrado o
-- pendiente) no se le crea otro.

insert into public.regalos_personales (usuario_id, mensaje, contenido)
select u.id,
  'Abrimos la galería del jardín 🖼️ Te regalamos las siete obras: ponelas con la herramienta Arte y tocalas con Mirar para verlas de cerca',
  '{
     "obras": {
       "beso": 1, "noche": 1, "gioconda": 1, "ola": 1,
       "perla": 1, "grito": 1, "nenufares": 1
     }
   }'::jsonb
from auth.users u
where not exists (
  select 1
  from public.regalos_personales r
  where r.usuario_id = u.id
    and r.contenido ? 'obras'
    and r.mensaje like 'Abrimos la galería del jardín%'
);

-- Para ver cuántos se crearon y cuántos ya se entregaron:
--
--   select count(*) as total, count(cobrado_en) as entregados
--   from public.regalos_personales
--   where mensaje like 'Abrimos la galería del jardín%';
