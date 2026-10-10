'use client';

import { type MouseEvent, useState } from 'react';

import type { IExportMenuModel, TCanvasExportFormat, TCanvasExportOutcome } from '@interfaces';

import { useTranslations } from '@/i18n';
import { awardBadge } from '@/lib/badges';
import { event } from '@/lib/events';
import { useOnboardingStore } from '@/lib/onboarding';
import { useCanvasStore } from '@/lib/stores';

import { useToolbarMenu } from './useToolbarMenu';

const runExport = async (
  threadId: string,
  threadName: string,
  format: TCanvasExportFormat,
): Promise<TCanvasExportOutcome> => {
  const root = document.querySelector<HTMLElement>(`[data-canvas-thread="${CSS.escape(threadId)}"]`);
  if (!root) throw new Error('The active canvas is unavailable');

  const { exportCanvas } = await import('@/lib/canvas/export');

  return exportCanvas(root, threadName, format);
};

export const useExportMenu = (threadId: string, threadName: string): IExportMenuModel => {
  const t = useTranslations();
  const hydrated = useCanvasStore((state) => state.hydrated);
  const activeThreadId = useCanvasStore((state) => state.threadId);
  const hasNodes = useCanvasStore((state) => state.nodes.length > 0);

  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const { close, toggle, ...menu } = useToolbarMenu(loading);

  const disabled = !hydrated || activeThreadId !== threadId || !hasNodes;

  const exportFormat = async (format: TCanvasExportFormat) => {
    if (disabled || loading) return;

    setLoading(true);
    setHint(null);

    const outcome = await runExport(threadId, threadName, format).catch((error: unknown) => {
      event.error(error, { title: t.common.errorTitles.exportFailed, context: 'canvas.export' });

      return null;
    });

    setLoading(false);
    if (outcome === 'too-large') setHint(t.platform.canvas.export.tooLarge);
    if (outcome !== 'downloaded') return;

    useOnboardingStore.getState().markSignal('canvasExported');
    awardBadge('cartographer');
    if (menu.menuRef.current) close(true);
  };

  return {
    ...menu,
    disabled,
    loading,
    hint,
    toggle: (click: MouseEvent<HTMLButtonElement>) => {
      setHint(null);
      toggle(click);
    },
    exportFormat,
  };
};
