'use client';

import { useEffect, useState } from 'react';

const readFocused = (): HTMLElement | null =>
  typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null;

export const useReturnFocus = (active: boolean): void => {
  const [tracked, setTracked] = useState(active);
  const [target, setTarget] = useState(() => (active ? readFocused() : null));

  if (tracked !== active) {
    setTracked(active);
    if (active) setTarget(readFocused());
  }

  useEffect(() => {
    if (!active) return;

    return () => target?.focus();
  }, [active, target]);
};
