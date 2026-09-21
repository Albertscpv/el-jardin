import { useMemo } from 'react';
import type { Matrix } from '../game/art/matrices';
import { matrixToDataURL, type Palette } from '../game/art/render';

interface Props {
  matrix: Matrix;
  palette: Palette;
  size?: number;
  className?: string;
  title?: string;
}

/**
 * Dibuja una matriz de pixeles como <img>. Es el mismo arte que usa Phaser,
 * asi que el HUD y el jardin nunca muestran cosas distintas.
 */
export function PixelIcon({ matrix, palette, size = 32, className, title }: Props) {
  const src = useMemo(() => matrixToDataURL(matrix, palette, 4), [matrix, palette]);
  return (
    <img
      src={src}
      width={size}
      height={size}
      className={className}
      title={title}
      alt=""
      draggable={false}
      // `contain`: un caballo mide 32x28 y la caja es cuadrada; sin esto
      // se estiraba para llenarla.
      style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
    />
  );
}
