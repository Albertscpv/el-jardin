import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  subtitulo?: string;
  onCerrar: () => void;
  children: ReactNode;
}

/** Panel lateral deslizante. Comparten forma la tienda, los animales y la ayuda. */
export function Drawer({ titulo, subtitulo, onCerrar, children }: Props) {
  return (
    <motion.aside
      className="drawer"
      initial={{ x: '100%', opacity: 0.4 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0.2 }}
      transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      role="dialog"
      aria-label={titulo}
    >
      <header className="drawer-cabecera">
        <div>
          <h2>{titulo}</h2>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        <button className="cerrar" onClick={onCerrar} aria-label="Cerrar panel">
          ✕
        </button>
      </header>
      <div className="drawer-cuerpo">{children}</div>
    </motion.aside>
  );
}
