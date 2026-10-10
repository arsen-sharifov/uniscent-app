'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

import type { ICanvasSnapshot, IUseCanvasSyncResult } from '@interfaces';
import { getCanvasContent } from '@api/client';
import { isToolDisabled } from '@/components/Toolbar';
import { ECanvasTool } from '@/components/tools';
import {
  enqueueOperation,
  flushNow,
  getSaveState,
  hasUnsavedChanges,
  resetQueue,
  subscribeCanvasOperations,
  subscribeSaveState,
} from '@/lib/canvas';
import { event } from '@/lib/events';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

import { HISTORY_ACCESS_KEYS, LOAD_TIMEOUT_MESSAGE, LOAD_TIMEOUT_MS } from '../consts';

const loadCanvasContent = (workspaceId: string, threadId: string): Promise<ICanvasSnapshot> =>
  Promise.race([
    getCanvasContent(workspaceId, threadId),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(LOAD_TIMEOUT_MESSAGE)), LOAD_TIMEOUT_MS)),
  ]);

export const useCanvasSync = (workspaceId: string, threadId: string): IUseCanvasSyncResult => {
  const saveState = useSyncExternalStore(subscribeSaveState, getSaveState, getSaveState);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => subscribeCanvasOperations(enqueueOperation), []);

  useEffect(
    () =>
      usePermissionsStore.subscribe((access, previous) => {
        if (HISTORY_ACCESS_KEYS.every((key) => access[key] === previous[key])) return;

        useCanvasStore.temporal.getState().clear();

        const { activeTool, setActiveTool } = useCanvasStore.getState();
        if (isToolDisabled(activeTool, { canUndo: false, canRedo: false, canEditCanvas: access.canEditCanvas })) {
          setActiveTool(ECanvasTool.Select);
        }
      }),
    [],
  );

  useEffect(() => {
    const onBeforeUnload = (beforeUnloadEvent: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) beforeUnloadEvent.preventDefault();
    };

    window.addEventListener('beforeunload', onBeforeUnload);

    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadCanvasContent(workspaceId, threadId)
      .then((snapshot) => {
        if (cancelled) return;
        useCanvasStore.getState().loadCanvas(threadId, snapshot);
        setLoadFailed(false);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoadFailed(true);
        event.error(error, { toast: false, context: 'canvas.load' });
      });

    return () => {
      cancelled = true;
      if (useCanvasStore.getState().threadId !== threadId) return;

      useCanvasStore.getState().clearCanvas();
      flushNow().finally(() => {
        if (useCanvasStore.getState().threadId === null && !hasUnsavedChanges()) resetQueue();
      });
    };
  }, [workspaceId, threadId, loadAttempt]);

  return {
    saveState,
    loadFailed,
    retryLoad: () => {
      setLoadFailed(false);
      setLoadAttempt((previous) => previous + 1);
    },
  };
};
