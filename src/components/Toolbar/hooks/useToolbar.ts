'use client';

import { useCallback, useMemo } from 'react';
import { useStore } from 'zustand';

import type { IToolbarModel } from '@interfaces';

import { ECanvasTool, buildCanvasToolGroups, isCanvasTool } from '@/components/tools';
import { useTranslations } from '@/i18n';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';

import { EDIT_GROUP_IDS } from '../consts';
import { isToolDisabled } from '../utils';

export const useToolbar = (workspaceLoading = false): IToolbarModel => {
  const t = useTranslations();
  const storedActiveTool = useCanvasStore((s) => s.activeTool);
  const middlePan = useCanvasStore((s) => s.middlePan);
  const canEditCanvas = usePermissionsStore((s) => s.canEditCanvas);
  const grantsPending = usePermissionsStore((s) => s.workspaceId !== null && !s.resolved);

  const activeTool = middlePan ? ECanvasTool.Pan : storedActiveTool;

  const canUndo = useStore(useCanvasStore.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(useCanvasStore.temporal, (state) => state.futureStates.length > 0);

  const toolsTranslations = t.platform.canvas.tools;
  const baseGroups = useMemo(() => buildCanvasToolGroups(toolsTranslations), [toolsTranslations]);

  const groups = useMemo(
    () =>
      baseGroups
        .filter((group) => canEditCanvas || !EDIT_GROUP_IDS.has(group.id))
        .map((group) => ({
          ...group,
          tools: group.tools.map((tool) => ({
            ...tool,
            disabled: isToolDisabled(tool.id, { canUndo, canRedo, canEditCanvas }),
          })),
        })),
    [baseGroups, canUndo, canRedo, canEditCanvas],
  );

  const pendingGroups = useMemo(
    () => (workspaceLoading || grantsPending ? baseGroups : []),
    [baseGroups, workspaceLoading, grantsPending],
  );

  const handleToolClick = useCallback((id: string) => {
    const store = useCanvasStore.getState();

    if (id === ECanvasTool.Undo) {
      store.undo();

      return;
    }
    if (id === ECanvasTool.Redo) {
      store.redo();

      return;
    }
    if (!isCanvasTool(id)) return;

    store.setActiveTool(id);
  }, []);

  return { groups, pendingGroups, activeTool, handleToolClick };
};
