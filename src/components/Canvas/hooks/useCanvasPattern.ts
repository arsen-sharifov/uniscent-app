'use client';

import { useSyncExternalStore } from 'react';

import type { TCanvasPattern } from '@interfaces';
import { CANVAS_PATTERN_VALUES, DEFAULT_PREFERENCES } from '@constants';
import { createRootAttributeSubscription } from '@/lib/utils';

const subscribe = createRootAttributeSubscription(['data-canvas-pattern']);

const isCanvasPattern = (value: string | null): value is TCanvasPattern =>
  value !== null && CANVAS_PATTERN_VALUES.includes(value as TCanvasPattern);

const readPattern = (): TCanvasPattern => {
  if (typeof document === 'undefined') return DEFAULT_PREFERENCES.canvasPattern;

  const value = document.documentElement.getAttribute('data-canvas-pattern');

  return isCanvasPattern(value) ? value : DEFAULT_PREFERENCES.canvasPattern;
};

export const useCanvasPattern = (): TCanvasPattern =>
  useSyncExternalStore(subscribe, readPattern, () => DEFAULT_PREFERENCES.canvasPattern);
