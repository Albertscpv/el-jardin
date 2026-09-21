import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Credenciales de Supabase que llegan al navegador.
 *
 * La integración de Supabase con Vercel inyecta las variables SIN el prefijo
 * `VITE_`, y Vite solo expone al cliente las que lo llevan. Sin este puente
 * el sitio compila igual pero se despliega sin cuentas, en silencio: el
 * panel dice "local" y nadie se entera hasta que alguien intenta registrarse.
 *
 * La lista es explícita a propósito. Exponer todo lo que empiece con
 * `SUPABASE_` filtraría la `service_role key` al bundle, que es acceso total
 * a la base saltándose las políticas RLS. Acá solo entran la URL y la clave
 * pública, que están pensadas para viajar al navegador.
 */
function credencialesSupabase(env: Record<string, string>) {
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
  const anon =
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  return {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(url),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(anon),
  };
}

export default defineConfig(({ mode }) => {
  // Prefijo vacío: hay que leer también las variables sin `VITE_` que pone
  // Vercel. Solo se usan las dos de arriba; el resto no sale de acá.
  // La ruta va como '.' y no `process.cwd()` a propósito: significa lo mismo
  // (Vite la resuelve contra el cwd) y evita depender de los tipos de Node,
  // que este proyecto no instala.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    server: { port: 5178, strictPort: true },
    define: credencialesSupabase(env),
    build: {
      target: 'es2022',
      rollupOptions: {
        output: {
          // Three es pesado: se separa para que el HUD cargue primero.
          manualChunks: (id: string) => (id.includes('node_modules/three') ? 'three' : undefined),
        },
      },
    },
  };
});
