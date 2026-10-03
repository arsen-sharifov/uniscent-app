'use client';

import { useEffect } from 'react';

import { ECanvasNodeType, type TTranslations } from '@interfaces';
import { APP_OVERLAY_SELECTOR } from '@constants';
import { ECanvasTool } from '@/components/tools';
import { useTranslations } from '@/i18n';
import { event } from '@/lib/events';
import { useCanvasStore, usePermissionsStore } from '@/lib/stores';
import { canDeleteNode, isTypingTarget } from '@/lib/utils';

import { SELECT_DELETE_KEYS, TOOL_KEY_MAP } from '../consts';
import { isToolDisabled, toShortcutKey } from '../utils';

const isInsideOverlay = (target: EventTarget | null): boolean =>
  target instanceof Element && target.closest(APP_OVERLAY_SELECTOR) !== null;

const deleteSelection = (t: TTranslations) => {
  const store = useCanvasStore.getState();
  const access = usePermissionsStore.getState();
  if (!access.canEditCanvas) return;

  const selectedNodes = store.nodes.filter((node) => node.selected);
  const blockedNodes = selectedNodes.filter((node) => !canDeleteNode(node, access));

  if (blockedNodes.length > 0) {
    event.info(
      blockedNodes.every((node) => node.type === ECanvasNodeType.Question)
        ? t.platform.canvas.deleteBlocked.question
        : t.platform.canvas.deleteBlocked.foreignNodes,
    );

    return;
  }

  store.deleteElements(
    selectedNodes.map((node) => node.id),
    store.edges.filter((edge) => edge.selected).map((edge) => edge.id),
  );
};

export const useToolbarShortcuts = (onToggleShortcuts: () => void): void => {
  const t = useTranslations();

  useEffect(() => {
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (isTypingTarget(keyEvent.target)) return;

      if (keyEvent.key === '?') {
        keyEvent.preventDefault();
        onToggleShortcuts();

        return;
      }

      if (isInsideOverlay(keyEvent.target)) return;

      const key = toShortcutKey(keyEvent);
      const isModifier = keyEvent.metaKey || keyEvent.ctrlKey;
      const store = useCanvasStore.getState();

      if (isModifier && key === 'z') {
        keyEvent.preventDefault();
        if (keyEvent.shiftKey) store.redo();
        else store.undo();

        return;
      }

      if (keyEvent.altKey || isModifier) return;

      if (SELECT_DELETE_KEYS.includes(keyEvent.key)) {
        if (keyEvent.shiftKey || store.activeTool !== ECanvasTool.Select) return;

        keyEvent.preventDefault();
        deleteSelection(t);

        return;
      }

      const tool = TOOL_KEY_MAP[key];
      if (!tool) return;

      const temporal = useCanvasStore.temporal.getState();
      const disabled = isToolDisabled(tool, {
        canUndo: temporal.pastStates.length > 0,
        canRedo: temporal.futureStates.length > 0,
        canEditCanvas: usePermissionsStore.getState().canEditCanvas,
      });
      if (disabled) return;

      keyEvent.preventDefault();
      store.setActiveTool(tool);
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onToggleShortcuts, t]);
};
