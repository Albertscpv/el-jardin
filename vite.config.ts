import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5178, strictPort: true },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // Three es pesado: se separa para que el HUD cargue primero.
        manualChunks: (id: string) => (id.includes('node_modules/three') ? 'three' : undefined),
      },
    },
  },
});
