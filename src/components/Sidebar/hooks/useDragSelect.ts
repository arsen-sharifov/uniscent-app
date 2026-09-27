'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import type { IRect } from '@interfaces';

import {
  AUTO_SCROLL_INTERVAL_MS,
  AUTO_SCROLL_STEP_PX,
  AUTO_SCROLL_ZONE_PX,
  DRAG_SELECT_ACTIVATION_PX,
} from '../consts';

interface IUseDragSelectOptions {
  containerRef: RefObject<HTMLElement | null>;
  onSelectionChange: (ids: Set<string>) => void;
  enabled?: boolean;
}

const rectsOverlap = (a: DOMRect, b: IRect): boolean =>
  a.left < b.x + b.width && a.right > b.x && a.top < b.y + b.height && a.bottom > b.y;

export const useDragSelect = ({ containerRef, onSelectionChange, enabled = true }: IUseDragSelectOptions) => {
  const [rect, setRect] = useState<IRect | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const isActive = useRef(false);
  const rafId = useRef<number | null>(null);
  const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSelectedIds = useRef<Set<string>>(new Set());

  const clearAutoScroll = useCallback(() => {
    if (scrollInterval.current !== null) {
      clearInterval(scrollInterval.current);
      scrollInterval.current = null;
    }
  }, []);

  const computeRect = useCallback((clientX: number, clientY: number): IRect | null => {
    const start = startPos.current;
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

      startPos.current = { x: event.clientX, y: event.clientY };
      isActive.current = false;
    },
    [enabled],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      const start = startPos.current;
      if (!start) return;

      if (!isActive.current) {
        if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < DRAG_SELECT_ACTIVATION_PX) return;
        isActive.current = true;
      }

      if (rafId.current !== null) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        const selectionRect = computeRect(event.clientX, event.clientY);
        if (!selectionRect) return;

        setRect(selectionRect);
        const ids = findIntersectingIds(selectionRect);
        const prev = lastSelectedIds.current;
        if (ids.size !== prev.size || [...ids].some((id) => !prev.has(id))) {
          lastSelectedIds.current = ids;
          onSelectionChange(ids);
        }
      });

      const scrollParent = containerRef.current?.closest('[data-sidebar-scroll]') as HTMLElement | null;
      if (!scrollParent) return;

      const scrollBounds = scrollParent.getBoundingClientRect();
      const relativeY = event.clientY - scrollBounds.top;
      const distFromTop = relativeY;
      const distFromBottom = scrollBounds.height - relativeY;

      clearAutoScroll();

      if (distFromTop < AUTO_SCROLL_ZONE_PX && scrollParent.scrollTop > 0) {
        scrollInterval.current = setInterval(() => {
          scrollParent.scrollTop -= AUTO_SCROLL_STEP_PX;
        }, AUTO_SCROLL_INTERVAL_MS);
      } else if (
        distFromBottom < AUTO_SCROLL_ZONE_PX &&
        scrollParent.scrollTop < scrollParent.scrollHeight - scrollParent.clientHeight
      ) {
        scrollInterval.current = setInterval(() => {
          scrollParent.scrollTop += AUTO_SCROLL_STEP_PX;
        }, AUTO_SCROLL_INTERVAL_MS);
      }
    },
    [computeRect, findIntersectingIds, onSelectionChange, containerRef, clearAutoScroll],
  );

  const handleMouseUp = useCallback(() => {
    startPos.current = null;
    isActive.current = false;
    lastSelectedIds.current = new Set();
    setRect(null);
    clearAutoScroll();
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
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
      if (rafId.current !== null) cancelAnimationFrame(rafId.current);
    };
  }, [containerRef, enabled, handleMouseDown, handleMouseMove, handleMouseUp, clearAutoScroll]);

  return { rect };
};
