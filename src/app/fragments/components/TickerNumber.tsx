'use client';

import { useEffect, useRef, useState } from 'react';

import { TICKER_DURATION_MS } from '../consts';
import { useReducedMotion } from '../hooks';

interface ITickerNumberProps {
  value: number;
}

export const TickerNumber = ({ value }: ITickerNumberProps) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [progress, setProgress] = useState(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const element = spanRef.current;
    if (!element || reducedMotion) return;

    let animationFrameId: number | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();

        const startedAt = performance.now();
        const step = (now: number) => {
          const elapsed = Math.min((now - startedAt) / TICKER_DURATION_MS, 1);
          setProgress(1 - Math.pow(1 - elapsed, 3));
          if (elapsed < 1) animationFrameId = requestAnimationFrame(step);
        };
        setProgress(0);
        animationFrameId = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
    };
  }, [value, reducedMotion]);

  return (
    <span ref={spanRef} className="tabular-nums">
      {reducedMotion ? value : Math.round(value * progress)}
    </span>
  );
};
