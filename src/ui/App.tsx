import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { escribirLocal } from '../state/persistence/local';
import { useGame } from '../state/store';
import { AdoptModal } from './AdoptModal';
import { AnimalSheet } from './AnimalSheet';
import { AnimalsPanel } from './AnimalsPanel';
import { GameCanvas } from './GameCanvas';
import { HelpPanel } from './HelpPanel';
import { HUD } from './HUD';
import { ShopPanel } from './ShopPanel';
import { Toasts } from './Toasts';
import { Toolbar } from './Toolbar';

/** Cada cuánto avanza la simulación mientras la pestaña está visible. */
const TICK_MS = 1000;

export function App() {
  const cargando = useGame((s) => s.cargando);
  const panel = useGame((s) => s.panel);

  useEffect(() => {
    void useGame.getState().inicializar();
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      // Con la pestaña oculta el navegador frena los timers; al volver, el
      // propio `advance` recupera el tiempo perdido de una sola vez.
      if (!document.hidden) useGame.getState().tick();
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    // Guardado sincrónico al salir: el debounce puede no llegar a dispararse.
    const alSalir = () => escribirLocal(useGame.getState().estado);
    const alOcultar = () => {
      if (document.hidden) alSalir();
    };
    window.addEventListener('beforeunload', alSalir);
    document.addEventListener('visibilitychange', alOcultar);
    return () => {
      window.removeEventListener('beforeunload', alSalir);
      document.removeEventListener('visibilitychange', alOcultar);
    };
  }, []);

  if (cargando) {
    return (
      <div className="cargando">
        <div className="cargando-brote">🌱</div>
        <p>Preparando el jardín…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <HUD />

      <main className="mundo">
        <GameCanvas />
        <AnimalSheet />
      </main>

      <Toolbar />

      <AnimatePresence>
        {panel === 'tienda' && <ShopPanel key="tienda" />}
        {panel === 'animales' && <AnimalsPanel key="animales" />}
        {panel === 'ayuda' && <HelpPanel key="ayuda" />}
      </AnimatePresence>

      <AdoptModal />
      <Toasts />
    </div>
  );
}
