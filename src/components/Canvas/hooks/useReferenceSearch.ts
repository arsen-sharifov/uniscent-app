'use client';

import { useEffect, useMemo, useState } from 'react';

import type { IReferenceSearchInput, IReferenceSearchResponse, IReferenceSearchResult } from '@interfaces';
import { searchReferenceTargets } from '@api/client';
import { useTranslations } from '@/i18n';
import { event } from '@/lib/events';
import { useCanvasStore } from '@/lib/stores';

export const useReferenceSearch = ({ workspaceId, threadId }: IReferenceSearchInput): IReferenceSearchResult => {
  const t = useTranslations();
  const isPanelOpen = useCanvasStore((state) => state.referenceSearchPosition !== null);
  const [response, setResponse] = useState<IReferenceSearchResponse | null>(null);
  const request = useMemo(() => (isPanelOpen ? { workspaceId, threadId } : null), [workspaceId, threadId, isPanelOpen]);

  useEffect(() => {
    if (!request) return;

    let cancelled = false;

    searchReferenceTargets(request.workspaceId, request.threadId)
      .then((nodes) => {
        if (cancelled) return;

        setResponse({ request, nodes });
      })
      .catch((error: unknown) => {
        if (cancelled) return;

        setResponse({ request, nodes: [] });
        event.error(error, { title: t.common.errorTitles.searchFailed, context: 'canvas.referenceSearch' });
      });

    return () => {
      cancelled = true;
    };
  }, [request, t]);

  const currentResponse = request !== null && response?.request === request ? response : null;

  return { nodes: currentResponse?.nodes ?? [], loading: isPanelOpen && currentResponse === null };
};
