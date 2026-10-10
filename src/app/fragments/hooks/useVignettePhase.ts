'use client';

import { useEffect, useState } from 'react';

import { useReducedMotion } from './useReducedMotion';

export const useVignettePhase = (phaseCount: number, intervalMs: number): number => {
  const [phase, setPhase] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    const timer = setInterval(() => setPhase((previous) => (previous + 1) % phaseCount), intervalMs);

    return () => clearInterval(timer);
  }, [phaseCount, intervalMs, reducedMotion]);

  return phase;
};
