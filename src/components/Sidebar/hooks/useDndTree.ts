'use client';

import {
  type DragStartEvent,
  type DragMoveEvent,
  type DragEndEvent,
  type CollisionDetection,
  pointerWithin,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { IProjection, TDropZone, TNavItem, TNavItemType } from '@interfaces';

import { AUTO_EXPAND_DELAY_MS, KEYBOARD_SENSOR_OPTIONS, POINTER_SENSOR_OPTIONS } from '../consts';
import { flattenTree, getDropPosition, getProjection, removeChildrenOf, resolveDropZone } from '../utils';

interface IUseDndTreeOptions {
  items: TNavItem[];
  onMoveItem?: (id: string, type: TNavItemType, parentId: string | null, position: number) => void;
  onBulkMove?: (ids: Set<string>, parentId: string | null, position: number) => void;
  editingId?: string | null;
  selectedIds?: Set<string>;
}

export const useDndTree = ({ items, onMoveItem, onBulkMove, editingId, selectedIds }: IUseDndTreeOptions) => {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<TDropZone>('after');
  const [isPastLast, setIsPastLast] = useState(false);

  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandTargetRef = useRef<string | null>(null);
  const prevCollapsedRef = useRef<Set<string> | null>(null);
  const isBulkDragRef = useRef(false);
  const zoneRef = useRef<TDropZone>('after');
  const prevMoveOverIdRef = useRef<string | null>(null);
  const stickyOverIdRef = useRef<string | number | null>(null);

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pw = pointerWithin(args);
    if (pw.length > 0) {
      stickyOverIdRef.current = pw[0]!.id;

      return pw;
    }
    if (stickyOverIdRef.current !== null && args.droppableRects.get(stickyOverIdRef.current)) {
      return [{ id: stickyOverIdRef.current }];
    }

    return closestCenter(args);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_SENSOR_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_SENSOR_OPTIONS),
  );

  const flattenedItems = useMemo(() => flattenTree(items, collapsedIds), [items, collapsedIds]);

  const sortableItems = useMemo(() => {
    if (!activeId) return flattenedItems;
    const excludeIds =
      selectedIds && selectedIds.size > 1 && selectedIds.has(activeId)
        ? new Set([activeId, ...selectedIds])
        : new Set([activeId]);

    return removeChildrenOf(flattenedItems, excludeIds);
  }, [flattenedItems, activeId, selectedIds]);

  const sortedIds = useMemo(() => sortableItems.map((item) => item.id), [sortableItems]);

  const projected: IProjection | null = useMemo(() => {
    if (!activeId || !overId) return null;
    const base = getProjection(sortableItems, activeId, overId, dropZone);
    if (!base) return null;
    const result: IProjection = isPastLast ? { depth: 0, parentId: null, zone: 'after' } : base;

    const activeItem = sortableItems.find((item) => item.id === activeId);
    if (activeItem?.parentId !== result.parentId) return result;

    const activeIdx = sortableItems
      .filter((item) => item.parentId === result.parentId)
      .findIndex((item) => item.id === activeId);
    if (activeIdx === -1) return result;

    if (getDropPosition(sortableItems, activeId, overId, result) === activeIdx) return null;

    return result;
  }, [sortableItems, activeId, overId, dropZone, isPastLast]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }, []);

  const expandForDrop = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);

      return next;
    });
  }, []);

  const clearExpandTimer = useCallback(() => {
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current);
      expandTimerRef.current = null;
    }
  }, []);

  const resetDragState = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setDropZone('after');
    setIsPastLast(false);
    zoneRef.current = 'after';
    prevMoveOverIdRef.current = null;
    expandTargetRef.current = null;
    prevCollapsedRef.current = null;
    isBulkDragRef.current = false;
  }, []);

  const handleDragStart = useCallback(
    ({ active }: DragStartEvent) => {
      if (editingId) return;

      const id = active.id as string;
      const item = flattenedItems.find((flattenedItem) => flattenedItem.id === id);
      isBulkDragRef.current = !!(selectedIds && selectedIds.size > 1 && selectedIds.has(id));

      stickyOverIdRef.current = null;

      setActiveId(id);
      setOverId(id);

      if (item?.type === 'folder' && !collapsedIds.has(id)) {
        prevCollapsedRef.current = new Set(collapsedIds);
        setCollapsedIds((prev) => new Set(prev).add(id));
      }
    },
    [flattenedItems, collapsedIds, editingId, selectedIds],
  );

  const commitZone = useCallback((zone: TDropZone) => {
    if (zoneRef.current === zone) return;
    zoneRef.current = zone;
    setDropZone(zone);
  }, []);

  const cancelAutoExpand = useCallback(() => {
    clearExpandTimer();
    expandTargetRef.current = null;
  }, [clearExpandTimer]);

  const armAutoExpand = useCallback(
    (id: string) => {
      if (expandTargetRef.current === id) return;
      clearExpandTimer();
      expandTargetRef.current = id;
      expandTimerRef.current = setTimeout(() => {
        expandForDrop(id);
        expandTargetRef.current = null;
      }, AUTO_EXPAND_DELAY_MS);
    },
    [clearExpandTimer, expandForDrop],
  );

  const trackPastLast = useCallback(
    (pointerY: number | null) => {
      const lastItem = sortableItems.at(-1);
      const lastBottom = lastItem
        ? document.querySelector(`[data-item-id="${lastItem.id}"]`)?.getBoundingClientRect().bottom
        : undefined;
      const nextPastLast = pointerY !== null && lastBottom !== undefined && pointerY > lastBottom;
      setIsPastLast((prev) => (prev === nextPastLast ? prev : nextPastLast));
    },
    [sortableItems],
  );

  const handleDragMove = useCallback(
    ({ activatorEvent, delta, over }: DragMoveEvent) => {
      const curOverId = (over?.id as string) ?? null;
      setOverId((prev) => (prev === curOverId ? prev : curOverId));

      const pointerY = 'clientY' in activatorEvent ? (activatorEvent as PointerEvent).clientY + delta.y : null;
      trackPastLast(pointerY);

      if (!curOverId || curOverId === activeId) {
        commitZone('after');
        cancelAutoExpand();

        return;
      }

      if (pointerY === null) return;

      const el = document.querySelector(`[data-item-id="${curOverId}"]`);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (pointerY - rect.top) / rect.height));

      const isFolder = sortableItems.find((item) => item.id === curOverId)?.type === 'folder';
      const sameTarget = curOverId === prevMoveOverIdRef.current;
      prevMoveOverIdRef.current = curOverId;

      const zone = resolveDropZone(isFolder, ratio, zoneRef.current, sameTarget, rect.height);
      commitZone(zone);

      if (zone === 'inside' && isFolder && collapsedIds.has(curOverId)) armAutoExpand(curOverId);
      else cancelAutoExpand();
    },
    [activeId, sortableItems, collapsedIds, trackPastLast, commitZone, cancelAutoExpand, armAutoExpand],
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      clearExpandTimer();

      if (!over || !projected) {
        if (prevCollapsedRef.current) {
          setCollapsedIds(prevCollapsedRef.current);
          prevCollapsedRef.current = null;
        }
        resetDragState();

        return;
      }

      const draggedId = active.id as string;
      const endOverId = over.id as string;

      if (draggedId === endOverId && !isPastLast) {
        if (prevCollapsedRef.current) {
          setCollapsedIds(prevCollapsedRef.current);
          prevCollapsedRef.current = null;
        }
        resetDragState();

        return;
      }

      const activeIndex = sortableItems.findIndex((item) => item.id === draggedId);
      if (activeIndex === -1) {
        resetDragState();

        return;
      }

      const activeItem = sortableItems[activeIndex] as (typeof sortableItems)[number];
      const position = getDropPosition(sortableItems, draggedId, endOverId, projected);

      if (isBulkDragRef.current && selectedIds && selectedIds.size > 1) {
        onBulkMove?.(selectedIds, projected.parentId, position);
      } else {
        onMoveItem?.(draggedId, activeItem.type, projected.parentId, position);
      }

      if (prevCollapsedRef.current) {
        setCollapsedIds(prevCollapsedRef.current);
        prevCollapsedRef.current = null;
      }

      resetDragState();
    },
    [sortableItems, projected, isPastLast, clearExpandTimer, resetDragState, onMoveItem, onBulkMove, selectedIds],
  );

  const handleDragCancel = useCallback(() => {
    clearExpandTimer();
    if (prevCollapsedRef.current) {
      setCollapsedIds(prevCollapsedRef.current);
      prevCollapsedRef.current = null;
    }
    resetDragState();
  }, [clearExpandTimer, resetDragState]);

  useEffect(
    () => () => {
      if (expandTimerRef.current) {
        clearTimeout(expandTimerRef.current);
      }
    },
    [],
  );

  return {
    flattenedItems: sortableItems,
    sortedIds,
    activeId,
    overId,
    projected,
    isPastLast,
    sensors,
    collisionDetection,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
    toggleCollapse,
    expandForDrop,
  };
};
