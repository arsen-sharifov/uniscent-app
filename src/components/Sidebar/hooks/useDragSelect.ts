'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { IRect, IScreenPoint, IUseDragSelectOptions } from '@interfaces';

import {
  AUTO_SCROLL_INTERVAL_MS,
  AUTO_SCROLL_STEP_PX,
  AUTO_SCROLL_ZONE_PX,
  DRAG_SELECT_ACTIVATION_PX,
} from '../consts';

const rectsOverlap = (element: DOMRect, selection: IRect): boolean =>
  element.left < selection.x + selection.width &&
  element.right > selection.x &&
  element.top < selection.y + selection.height &&
  element.bottom > selection.y;

export const useDragSelect = ({ containerRef, onSelectionChange, enabled = true }: IUseDragSelectOptions) => {
  const [rect, setRect] = useState<IRect | null>(null);
  const startPositionRef = useRef<IScreenPoint | null>(null);
  const isActiveRef = useRef(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSelectedIdsRef = useRef<Set<string>>(new Set());

  const clearAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current !== null) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const computeRect = useCallback((clientX: number, clientY: number): IRect | null => {
    const start = startPositionRef.current;
    if (!start) return null;

    const x = Math.min(start.x, clientX);
    const y = Math.min(start.y, clientY);
    const width = Math.abs(clientX - start.x);
    const height = Math.abs(clientY - start.y);

    return { x, y, width, height };
  }, []);

  const findIntersectingIds = useCallback(
    (selectionRect: IRect): Set<string> => {
      const container = containerRef.current;
      if (!container) return new Set();

      return new Set(
        Array.from(container.querySelectorAll('[data-item-id]'))
          .map((element) => ({
            id: element.getAttribute('data-item-id'),
            rect: element.getBoundingClientRect(),
          }))
          .filter(
            (entry): entry is { id: string; rect: DOMRect } =>
              entry.id !== null && entry.rect.height > 0 && rectsOverlap(entry.rect, selectionRect),
          )
          .map((entry) => entry.id),
      );
    },
    [containerRef],
  );

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;
      if (event.button !== 0) return;

      const target = event.target as HTMLElement;
      if (target.closest('button, input, [data-item-id]')) return;

      startPositionRef.current = { x: event.clientX, y: event.clientY };
      isActiveRef.current = false;
    },
    [enabled],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const start = startPositionRef.current;
      if (!start) return;

      if (!isActiveRef.current) {
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < DRAG_SELECT_ACTIVATION_PX) return;
        isActiveRef.current = true;
      }

      if (animationFrameIdRef.current !== null) cancelAnimationFrame(animationFrameIdRef.current);

      animationFrameIdRef.current = requestAnimationFrame(() => {
        const selectionRect = computeRect(event.clientX, event.clientY);
        if (!selectionRect) return;

        setRect(selectionRect);
        const ids = findIntersectingIds(selectionRect);
        const previous = lastSelectedIdsRef.current;
        if (ids.size !== previous.size || [...ids].some((id) => !previous.has(id))) {
          lastSelectedIdsRef.current = ids;
          onSelectionChange(ids);
        }
      });

      const scrollParent = containerRef.current?.closest('[data-sidebar-scroll]') as HTMLElement | null;
      if (!scrollParent) return;

      const scrollBounds = scrollParent.getBoundingClientRect();
      const distanceFromTop = event.clientY - scrollBounds.top;
      const distanceFromBottom = scrollBounds.height - distanceFromTop;

      clearAutoScroll();

      if (distanceFromTop < AUTO_SCROLL_ZONE_PX && scrollParent.scrollTop > 0) {
        scrollIntervalRef.current = setInterval(() => {
          scrollParent.scrollTop -= AUTO_SCROLL_STEP_PX;
        }, AUTO_SCROLL_INTERVAL_MS);
      } else if (
        distanceFromBottom < AUTO_SCROLL_ZONE_PX &&
        scrollParent.scrollTop < scrollParent.scrollHeight - scrollParent.clientHeight
      ) {
        scrollIntervalRef.current = setInterval(() => {
          scrollParent.scrollTop += AUTO_SCROLL_STEP_PX;
        }, AUTO_SCROLL_INTERVAL_MS);
      }
    },
    [computeRect, findIntersectingIds, onSelectionChange, containerRef, clearAutoScroll],
  );

  const handleMouseUp = useCallback(() => {
    startPositionRef.current = null;
    isActiveRef.current = false;
    lastSelectedIdsRef.current = new Set();
    setRect(null);
    clearAutoScroll();
    if (animationFrameIdRef.current !== null) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }
  }, [clearAutoScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const scrollParent = container.closest('[data-sidebar-scroll]') as HTMLElement | null;
    const mouseDownTarget = scrollParent ?? container;

    mouseDownTarget.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      mouseDownTarget.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      clearAutoScroll();
      if (animationFrameIdRef.current !== null) cancelAnimationFrame(animationFrameIdRef.current);
    };
  }, [containerRef, enabled, handleMouseDown, handleMouseMove, handleMouseUp, clearAutoScroll]);

  return { rect };
};
