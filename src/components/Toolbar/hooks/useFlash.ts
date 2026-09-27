'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { FLASH_DURATION_MS } from '../consts';

export const useFlash = () => {
  const timerRef = useRef<number | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const triggerFlash = useCallback(() => {
    setFlash(true);

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setFlash(false);
    }, FLASH_DURATION_MS);
  }, []);

  return { flash, triggerFlash };
};
