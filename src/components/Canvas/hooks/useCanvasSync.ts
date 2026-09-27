'use client';

import { useEffect, useState } from 'react';

import type { ICanvasSnapshot, ISaveState } from '@interfaces';
import { getCanvasContent } from '@api/client';
import {
  enqueueOperation,
  flushNow,
  getSaveState,
  resetQueue,
  subscribeCanvasOperations,
  subscribeSaveState,
} from '@/lib/canvas';
import { event } from '@/lib/events';
import { useCanvasStore } from '@/lib/stores';

interface IUseCanvasSyncResult {
  saveState: ISaveState;
  loadError: Error | null;
}

const LOAD_TIMEOUT_MS = 15000;
const TIMEOUT_ERROR_MESSAGE = 'Request timed out';

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(TIMEOUT_ERROR_MESSAGE)), ms)),
  ]);

const loadCanvasFromBackend = (threadId: string): Promise<ICanvasSnapshot> =>
  withTimeout(getCanvasContent(threadId), LOAD_TIMEOUT_MS);

const toError = (value: unknown): Error => (value instanceof Error ? value : new Error(String(value)));

export const useCanvasSync = (threadId: string): IUseCanvasSyncResult => {
  const [saveState, setSaveState] = useState<ISaveState>(() => getSaveState());
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    return subscribeSaveState(setSaveState);
  }, []);

  useEffect(() => {
    return subscribeCanvasOperations(enqueueOperation);
  }, []);

  useEffect(() => {
    const onBeforeUnload = (beforeUnloadEvent: BeforeUnloadEvent) => {
      const { pendingCount, failedCount } = getSaveState();
      if (pendingCount === 0 && failedCount === 0) return;
      beforeUnloadEvent.preventDefault();
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadCanvasFromBackend(threadId)
      .then((snapshot) => {
        if (cancelled) return;
        useCanvasStore.getState().loadCanvas(threadId, snapshot);
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadError(toError(error));
        event.error(error, { toast: false, context: 'canvas.load' });
      });

    return () => {
      cancelled = true;
      const currentThreadId = threadId;

      flushNow().finally(() => {
        const stillSameThread = useCanvasStore.getState().threadId === currentThreadId;
        if (stillSameThread) {
          useCanvasStore.getState().clearCanvas();
          resetQueue();
        }
      });
    };
  }, [threadId]);

  return { saveState, loadError };
};
