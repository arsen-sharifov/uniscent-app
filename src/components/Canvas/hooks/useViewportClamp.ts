'use client';

import { type RefObject, useCallback, useLayoutEffect } from 'react';

import type { IScreenPoint } from '@interfaces';
import { useViewportChange } from '@hooks';

import { clampToViewport } from '../utils';

export const useViewportClamp = (
  elementRef: RefObject<HTMLElement | null>,
  { x, y }: IScreenPoint,
  enabled: boolean = true,
): void => {
  const place = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;

    const position = clampToViewport(
      { x, y },
      { width: element.offsetWidth, height: element.offsetHeight },
      { width: window.innerWidth, height: window.innerHeight },
    );

    element.style.left = `${position.x}px`;
    element.style.top = `${position.y}px`;
  }, [elementRef, x, y]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!enabled || !element) return;

    place();

    const observer = new ResizeObserver(place);
    observer.observe(element);

    return () => observer.disconnect();
  }, [elementRef, enabled, place]);

  useViewportChange({ onResize: place, enabled });
};
