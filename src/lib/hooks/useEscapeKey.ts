'use client';

import { useEffect } from 'react';

export const useEscapeKey = (onEscape: () => void, enabled: boolean = true): void => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, enabled]);
};
