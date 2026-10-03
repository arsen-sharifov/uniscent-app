'use client';

import { type OnMoveEnd, useReactFlow, useStoreApi } from '@xyflow/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import { ECanvasNodeType, type IUseCanvasViewportOptions, type IUseCanvasViewportResult } from '@interfaces';

import { isCanvasNodeData, recallViewport, rememberViewport } from '@/lib/canvas';
import { useCanvasStore } from '@/lib/stores';

import {
  ARRIVAL_CLEANUP_MS,
  ARRIVAL_FIT_DURATION_MS,
  ARRIVAL_FIT_PADDING,
  FIT_REQUEST_DURATION_MS,
  FRESH_FIT_PADDING,
} from '../consts';
import { hasNodeOutsideView } from '../utils';

export const useCanvasViewport = ({ threadId, defaultZoom }: IUseCanvasViewportOptions): IUseCanvasViewportResult => {
  const { fitView, getViewport, setViewport } = useReactFlow();
  const storeApi = useStoreApi();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const hydrated = useCanvasStore((state) => state.hydrated);
  const storeThreadId = useCanvasStore((state) => state.threadId);

  const viewportThreadId = useRef<string | null>(null);
  const focusedQuestionThreadId = useRef<string | null>(null);

  const arriving = hydrated && searchParams.get('focus') === 'ref';
  const arrivalNodeId = searchParams.get('node');

  const defaultViewport = useMemo(
    () => recallViewport(threadId) ?? { x: 0, y: 0, zoom: defaultZoom / 100 },
    [threadId, defaultZoom],
  );

  const onMoveEnd: OnMoveEnd = useCallback((_event, viewport) => rememberViewport(threadId, viewport), [threadId]);

  useEffect(() => {
    if (!arriving) return;

    const animationFrameId = requestAnimationFrame(() => {
      fitView({
        duration: ARRIVAL_FIT_DURATION_MS,
        padding: ARRIVAL_FIT_PADDING,
        ...(arrivalNodeId && { nodes: [{ id: arrivalNodeId }] }),
      });
    });
    const cleanupTimer = window.setTimeout(() => {
      router.replace(pathname, { scroll: false });
    }, ARRIVAL_CLEANUP_MS);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.clearTimeout(cleanupTimer);
    };
  }, [arriving, arrivalNodeId, fitView, pathname, router]);

  useEffect(() => {
    if (!hydrated || storeThreadId !== threadId || viewportThreadId.current === threadId) return;
    viewportThreadId.current = threadId;
    if (arriving) return;

    setViewport(defaultViewport);
  }, [hydrated, storeThreadId, threadId, arriving, defaultViewport, setViewport]);

  useEffect(() => {
    if (!hydrated || arriving) return;
    if (storeThreadId !== threadId) return;
    if (focusedQuestionThreadId.current === threadId) return;

    const { nodes: loadedNodes, setEditingNodeId } = useCanvasStore.getState();
    const onlyNode = loadedNodes.length === 1 ? loadedNodes[0] : null;
    const freshQuestion = onlyNode?.type === ECanvasNodeType.Question ? onlyNode : null;
    const remembered = recallViewport(threadId);

    const animationFrameId = requestAnimationFrame(() => {
      focusedQuestionThreadId.current = threadId;
      if (remembered) return;

      const { width, height } = storeApi.getState();
      const { nodes: currentNodes } = useCanvasStore.getState();
      if (!freshQuestion && !hasNodeOutsideView(currentNodes, getViewport(), { width, height })) return;

      fitView({ duration: 0, padding: FRESH_FIT_PADDING, maxZoom: defaultZoom / 100 });
    });

    if (freshQuestion && isCanvasNodeData(freshQuestion.data) && freshQuestion.data.label.trim().length === 0) {
      setEditingNodeId(freshQuestion.id);
    }

    return () => cancelAnimationFrame(animationFrameId);
  }, [hydrated, threadId, storeThreadId, arriving, fitView, getViewport, storeApi, defaultZoom]);

  useEffect(
    () =>
      useCanvasStore.subscribe((state, previous) => {
        if (state.fitRequest === previous.fitRequest) return;

        fitView({
          duration: FIT_REQUEST_DURATION_MS,
          padding: state.fitPadding ?? FRESH_FIT_PADDING,
          maxZoom: defaultZoom / 100,
        });
      }),
    [fitView, defaultZoom],
  );

  return { defaultViewport, arriving, onMoveEnd };
};
