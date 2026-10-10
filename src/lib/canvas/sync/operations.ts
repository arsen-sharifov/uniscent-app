import type { TCanvasOperation, TCanvasOperationListener } from '@interfaces';

const listeners = new Set<TCanvasOperationListener>();

export const emitCanvasOperation = (operation: TCanvasOperation): void => {
  listeners.forEach((listener) => listener(operation));
};

export const subscribeCanvasOperations = (listener: TCanvasOperationListener): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
