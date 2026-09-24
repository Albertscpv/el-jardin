import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { audio } from '../game/audio/sonidos';
import { PERSONAJE_ACTIVO } from '../state/config';
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
import { GiftsPanel } from './GiftsPanel';
import { HelpPanel } from './HelpPanel';
import { HUD } from './HUD';
import { OrdersPanel } from './OrdersPanel';
import { RangeScreen } from './RangeScreen';
import { ShopPanel } from './ShopPanel';
import { Toasts } from './Toasts';
import { Toolbar } from './Toolbar';
import { esTactil } from '../game/input/Controls';
import { TouchControls } from './TouchControls';

/** Cada cuánto avanza la simulación mientras la pestaña está visible. */
const TICK_MS = 1000;

/**
 * El navegador no deja sonar nada hasta que la persona toca algo, asi que
 * el audio se prepara con el primer gesto y despues se desengancha.
 */
function useAudioAlPrimerToque() {
  useEffect(() => {
    const despertar = () => audio.despertar();
    for (const evento of ['pointerdown', 'keydown']) {
      window.addEventListener(evento, despertar, { once: true });
    }
    return () => {
      for (const evento of ['pointerdown', 'keydown']) {
        window.removeEventListener(evento, despertar);
      }
    };
  }, []);
}

export function App() {
  const cargando = useGame((s) => s.cargando);
  const panel = useGame((s) => s.panel);
  const modo = useGame((s) => s.modo);

  // Va antes de cualquier return: los hooks no se saltean.
  useAudioAlPrimerToque();

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

  // El campo de tiro es otro escenario: se monta en lugar del jardín, no
  // encima. Así no paga el render del mundo 3D mientras se practica.
  if (modo === 'practica') {
    return (
      <div className="app">
        <RangeScreen />
        <Toasts />
      </div>
    );
  }

  // El joystick se queda con la franja de abajo. Avisarlo con una clase
  // deja que el CSS reserve ese espacio solo cuando el joystick existe, en
  // vez de dejar un hueco muerto con el personaje apagado.
  const conJoystick = PERSONAJE_ACTIVO && esTactil();

  return (
    <div className={conJoystick ? 'app con-joystick' : 'app'}>
      {/* El jardín ocupa toda la pantalla; el resto flota encima. */}
      <GameCanvas />

      <HUD />
      <CameraControls />
      <AnimalSheet />
      <Toolbar />

      {conJoystick && <TouchControls />}

      <AnimatePresence>
        {panel === 'tienda' && <ShopPanel key="tienda" />}
        {panel === 'construir' && <BuildPanel key="construir" />}
        {panel === 'animales' && <AnimalsPanel key="animales" />}
        {panel === 'personaje' && <CharacterPanel key="personaje" />}
        {panel === 'cuenta' && <AuthPanel key="cuenta" />}
        {panel === 'regalos' && <GiftsPanel key="regalos" />}
        {panel === 'pedidos' && <OrdersPanel key="pedidos" />}
        {panel === 'ayuda' && <HelpPanel key="ayuda" />}
      </AnimatePresence>

      <AdoptModal />
      <Toasts />
    </div>
  );
}
