'use client';

import { clsx } from 'clsx';

interface IScrimProps {
  onClick: () => void;
  blurred?: boolean;
}

export const Scrim = ({ onClick, blurred = false }: IScrimProps) => (
  <button
    type="button"
    tabIndex={-1}
    aria-hidden
    onClick={onClick}
    className={clsx('absolute inset-0 bg-[color:var(--scrim)]', blurred && 'backdrop-blur-sm')}
  />
);
