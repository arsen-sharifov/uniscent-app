'use client';

import { type RefObject, useEffect } from 'react';

import {
  LANDING_SCREEN_SELECTOR,
  SNAP_EDGE_TOLERANCE_PX,
  SNAP_GESTURE_LOCK_MS,
  SNAP_HEADER_OFFSET_PX,
  SNAP_MIN_DELTA_PX,
} from '../consts';
import { useReducedMotion } from './useReducedMotion';

export const useSnapPager = (containerRef: RefObject<HTMLElement | null>) => {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const screens = [...container.querySelectorAll<HTMLElement>(LANDING_SCREEN_SELECTOR)];
    if (screens.length === 0) return;

    const listeners = new AbortController();

    let locked = false;
    let gesture: AbortController | null = null;
    let fallback: number | null = null;

    const settle = () => {
      container.style.scrollSnapType = '';
      locked = false;

      if (fallback !== null) window.clearTimeout(fallback);
      fallback = null;
      gesture?.abort();
      gesture = null;
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) < SNAP_MIN_DELTA_PX) return;

      const targets = screens.map((screen) => Math.max(screen.offsetTop - SNAP_HEADER_OFFSET_PX, 0));
      const top = container.scrollTop;
      const direction = event.deltaY > 0 ? 1 : -1;
      const current = targets.reduce(
        (accumulator, target, index) => (target <= top + SNAP_EDGE_TOLERANCE_PX ? index : accumulator),
        0,
      );
      const screen = screens[current];
      const currentTarget = targets[current];
      if (!screen || currentTarget === undefined) return;

      const visibleHeight = container.clientHeight - SNAP_HEADER_OFFSET_PX;
      const oversized = screen.offsetHeight > visibleHeight + SNAP_EDGE_TOLERANCE_PX;
      const interiorRoom =
        direction > 0
          ? screen.offsetTop + screen.offsetHeight - (top + container.clientHeight) > SNAP_EDGE_TOLERANCE_PX
          : top - currentTarget > SNAP_EDGE_TOLERANCE_PX;
      if (oversized && interiorRoom) return;

      event.preventDefault();
      if (locked) return;

      const next = Math.min(Math.max(current + direction, 0), targets.length - 1);
      const nextTarget = targets[next];
      if (next === current || nextTarget === undefined) return;

      locked = true;
      container.style.scrollSnapType = 'none';
      container.scrollTo({ top: nextTarget, behavior: reducedMotion ? 'auto' : 'smooth' });

      gesture = new AbortController();
      container.addEventListener('scrollend', settle, { once: true, signal: gesture.signal });
      fallback = window.setTimeout(settle, SNAP_GESTURE_LOCK_MS);
    };

    container.addEventListener('wheel', handleWheel, { passive: false, signal: listeners.signal });

    return () => {
      settle();
      listeners.abort();
    };
  }, [containerRef, reducedMotion]);
};
