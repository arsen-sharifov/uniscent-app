'use client';

import {
  closestCenter,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { IProjection, IUseDndTreeOptions, TDropZone } from '@interfaces';

import { AUTO_EXPAND_DELAY_MS, KEYBOARD_SENSOR_OPTIONS, POINTER_SENSOR_OPTIONS, ROOT_TAIL_PROJECTION } from '../consts';
import {
  flattenTree,
  getDropPosition,
  getMaxSubtreeDepth,
  getProjection,
  removeChildrenOf,
  resolveDropZone,
  resolveKeyboardDropZone,
} from '../utils';

export const useDndTree = ({ items, onMoveItem, onBulkMove, editingId, selectedIds }: IUseDndTreeOptions) => {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<TDropZone>('after');
  const [isPastLast, setIsPastLast] = useState(false);

  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandTargetRef = useRef<string | null>(null);
  const previousCollapsedRef = useRef<Set<string> | null>(null);
  const isBulkDragRef = useRef(false);
  const zoneRef = useRef<TDropZone>('after');
  const previousMoveOverIdRef = useRef<string | null>(null);
  const stickyOverIdRef = useRef<string | number | null>(null);

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      stickyOverIdRef.current = pointerCollisions[0]!.id;

      return pointerCollisions;
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

  const draggedIds = useMemo(() => {
    if (!activeId) return null;

    return selectedIds && selectedIds.size > 1 && selectedIds.has(activeId)
      ? new Set([activeId, ...selectedIds])
      : new Set([activeId]);
  }, [activeId, selectedIds]);

  const sortableItems = useMemo(
    () => (draggedIds ? removeChildrenOf(flattenedItems, draggedIds) : flattenedItems),
    [flattenedItems, draggedIds],
  );

  const draggedSubtreeDepth = useMemo(
    () => (draggedIds ? getMaxSubtreeDepth(items, draggedIds) : 0),
    [items, draggedIds],
  );

  const sortedIds = useMemo(() => sortableItems.map((item) => item.id), [sortableItems]);

  const projected: IProjection | null = useMemo(() => {
    if (!activeId || !overId) return null;
    const result: IProjection | null = isPastLast
      ? ROOT_TAIL_PROJECTION
      : getProjection(sortableItems, activeId, overId, dropZone, draggedSubtreeDepth);
    if (!result) return null;
    if (draggedIds && draggedIds.size > 1) return result;

    const activeItem = sortableItems.find((item) => item.id === activeId);
    if (activeItem?.parentId !== result.parentId) return result;

    const activeIndex = sortableItems
      .filter((item) => item.parentId === result.parentId)
      .findIndex((item) => item.id === activeId);
    if (activeIndex === -1) return result;

    if (getDropPosition(sortableItems, activeId, overId, result) === activeIndex) return null;

    return result;
  }, [sortableItems, activeId, overId, dropZone, isPastLast, draggedIds, draggedSubtreeDepth]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      return next;
    });
  }, []);

  const expandForDrop = useCallback((id: string) => {
    setCollapsedIds((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Set(previous);
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

  const restoreCollapsed = useCallback(() => {
    if (!previousCollapsedRef.current) return;

    setCollapsedIds(previousCollapsedRef.current);
    previousCollapsedRef.current = null;
  }, []);

  const resetDragState = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setDropZone('after');
    setIsPastLast(false);
    zoneRef.current = 'after';
    previousMoveOverIdRef.current = null;
    expandTargetRef.current = null;
    previousCollapsedRef.current = null;
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
        previousCollapsedRef.current = new Set(collapsedIds);
        setCollapsedIds((previous) => new Set(previous).add(id));
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
      setIsPastLast((previous) => (previous === nextPastLast ? previous : nextPastLast));
    },
    [sortableItems],
  );

  const handleDragMove = useCallback(
    ({ activatorEvent, delta, over }: DragMoveEvent) => {
      const currentOverId = (over?.id as string) ?? null;
      setOverId((previous) => (previous === currentOverId ? previous : currentOverId));

      const pointerY = 'clientY' in activatorEvent ? (activatorEvent as PointerEvent).clientY + delta.y : null;
      trackPastLast(pointerY);

      if (!currentOverId || currentOverId === activeId) {
        commitZone('after');
        cancelAutoExpand();

        return;
      }

      if (pointerY === null) {
        if (activeId) commitZone(resolveKeyboardDropZone(sortableItems, activeId, currentOverId));

        return;
      }

      const element = document.querySelector(`[data-item-id="${currentOverId}"]`);
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (pointerY - rect.top) / rect.height));

      const isFolder = sortableItems.find((item) => item.id === currentOverId)?.type === 'folder';
      const sameTarget = currentOverId === previousMoveOverIdRef.current;
      previousMoveOverIdRef.current = currentOverId;

      const zone = resolveDropZone(isFolder, ratio, zoneRef.current, sameTarget, rect.height);
      commitZone(zone);

      if (zone === 'inside' && isFolder && collapsedIds.has(currentOverId)) armAutoExpand(currentOverId);
      else cancelAutoExpand();
    },
    [activeId, sortableItems, collapsedIds, trackPastLast, commitZone, cancelAutoExpand, armAutoExpand],
  );

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      clearExpandTimer();

      const draggedId = active.id as string;
      if (!over || !projected || (draggedId === over.id && !isPastLast)) {
        restoreCollapsed();
        resetDragState();

        return;
      }

      if (!sortableItems.some((item) => item.id === draggedId)) {
        resetDragState();

        return;
      }

      const isBulkDrop = isBulkDragRef.current && selectedIds && selectedIds.size > 1;
      const siblingPool = isBulkDrop
        ? sortableItems.filter((item) => item.id === draggedId || !selectedIds.has(item.id))
        : sortableItems;
      const position = getDropPosition(siblingPool, draggedId, over.id as string, projected);

      if (isBulkDrop) {
        onBulkMove?.(selectedIds, projected.parentId, position);
      } else {
        onMoveItem?.(draggedId, projected.parentId, position);
      }

      restoreCollapsed();
      resetDragState();
    },
    [
      sortableItems,
      projected,
      isPastLast,
      clearExpandTimer,
      restoreCollapsed,
      resetDragState,
      onMoveItem,
      onBulkMove,
      selectedIds,
    ],
  );

  const handleDragCancel = useCallback(() => {
    clearExpandTimer();
    restoreCollapsed();
    resetDragState();
  }, [clearExpandTimer, restoreCollapsed, resetDragState]);

  useEffect(() => clearExpandTimer, [clearExpandTimer]);

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
