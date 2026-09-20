import { AnimatePresence, motion } from 'framer-motion';
import { useGame } from '../state/store';

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const descartar = useGame((s) => s.descartarToast);

  return (
    <div className="toasts" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            className={`toast ${t.tono}`}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            onClick={() => descartar(t.id)}
          >
            {t.texto}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}
