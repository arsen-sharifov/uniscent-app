'use client';

import { type Dispatch, type SetStateAction, useEffect } from 'react';

import type { TNavItem } from '@interfaces';

import { setThreadResolved } from '@/components/Sidebar';
import { isThreadResolved } from '@/lib/canvas';
import { useCanvasStore } from '@/lib/stores';

export const useThreadResolutionSync = (setNavItems: Dispatch<SetStateAction<TNavItem[]>>) => {
  useEffect(() => {
    const initial = useCanvasStore.getState();
    let lastThreadId = initial.threadId;
    let lastResolved = isThreadResolved(initial.nodes, initial.edges);

    return useCanvasStore.subscribe((state, previous) => {
      const { threadId, nodes, edges } = state;
      if (!threadId) return;
      if (threadId === lastThreadId && nodes === previous.nodes && edges === previous.edges) return;

      const resolved = isThreadResolved(nodes, edges);
      if (threadId === lastThreadId && resolved === lastResolved) return;

      lastThreadId = threadId;
      lastResolved = resolved;
      setNavItems((items) => setThreadResolved(items, threadId, resolved));
    });
  }, [setNavItems]);
};
