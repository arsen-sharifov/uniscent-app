'use client';

import { useEffect } from 'react';

import { useCanvasStore } from '@/lib/stores';

import { MIDDLE_MOUSE_BUTTON } from '../consts';

export const useMiddlePan = (): boolean => {
  const middlePan = useCanvasStore((state) => state.middlePan);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== MIDDLE_MOUSE_BUTTON) return;

      event.preventDefault();
      useCanvasStore.getState().setMiddlePan(true);
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (event.button !== MIDDLE_MOUSE_BUTTON) return;

      useCanvasStore.getState().setMiddlePan(false);
    };

    const handleAuxClick = (event: MouseEvent) => {
      if (event.button === MIDDLE_MOUSE_BUTTON) event.preventDefault();
    };

    const handleBlur = () => useCanvasStore.getState().setMiddlePan(false);

    const captureOptions = { capture: true } as const;

    window.addEventListener('mousedown', handleMouseDown, captureOptions);
    window.addEventListener('mouseup', handleMouseUp, captureOptions);
    window.addEventListener('auxclick', handleAuxClick, captureOptions);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown, captureOptions);
      window.removeEventListener('mouseup', handleMouseUp, captureOptions);
      window.removeEventListener('auxclick', handleAuxClick, captureOptions);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    if (!middlePan) return;

    document.body.classList.add('canvas-middle-pan');

    return () => document.body.classList.remove('canvas-middle-pan');
  }, [middlePan]);

  return middlePan;
};
