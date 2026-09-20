import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useAuth } from '../state/auth';
import { escribirLocal } from '../state/persistence/local';
import { useGame } from '../state/store';
import { AdoptModal } from './AdoptModal';
import { AnimalSheet } from './AnimalSheet';
import { AnimalsPanel } from './AnimalsPanel';
import { AuthPanel } from './AuthPanel';
import { BuildPanel } from './BuildPanel';
import { CameraControls } from './CameraControls';
import { CharacterPanel } from './CharacterPanel';
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
    // La sesión primero: define de dónde sale la partida que se carga.
    void useAuth
      .getState()
      .inicializar((cambio) => useGame.getState().alCambiarSesion(cambio))
      .finally(() => useGame.getState().inicializar());
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
      {/* El jardín ocupa toda la pantalla; el resto flota encima. */}
      <GameCanvas />

      <HUD />
      <CameraControls />
      <AnimalSheet />
      <Toolbar />

      <AnimatePresence>
        {panel === 'tienda' && <ShopPanel key="tienda" />}
        {panel === 'construir' && <BuildPanel key="construir" />}
        {panel === 'animales' && <AnimalsPanel key="animales" />}
        {panel === 'personaje' && <CharacterPanel key="personaje" />}
        {panel === 'cuenta' && <AuthPanel key="cuenta" />}
        {panel === 'ayuda' && <HelpPanel key="ayuda" />}
      </AnimatePresence>

      <AdoptModal />
      <Toasts />
    </div>
  );
}
