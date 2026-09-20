import { createRoot } from 'react-dom/client';
import { useGame } from './state/store';
import { App } from './ui/App';
import './ui/styles.css';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Falta #root en index.html');

if (import.meta.env.DEV) {
  // Consola de desarrollo: permite adelantar el reloj y probar el ciclo largo
  // sin esperar los minutos reales de crecimiento.
  (window as unknown as Record<string, unknown>).__jardin = useGame;
}

// Sin StrictMode a propósito: su doble montaje en desarrollo crearía dos
// instancias de Phaser sobre el mismo div.
createRoot(raiz).render(<App />);
