'use client';

import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useEffect, useRef, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';

import type { TNavItem, TNavItemType } from '@interfaces';

import { useTranslations } from '@/i18n';

import { DND_MEASURING } from '../../consts';
import { useDndTree, useDragSelect, useInlineEdit } from '../../hooks';
import { findInTree, findParentId } from '../../utils';
import { DragOverlayContent } from '../dnd/DragOverlayContent';
import { DragSelectOverlay } from '../dnd/DragSelectOverlay';
import { SortableNavItem } from '../dnd/SortableNavItem';

interface INavItemsProps {
  items: TNavItem[];
  activeItemId?: string;
  selectedIds: Set<string>;
  onSelectClick: (
    id: string,
    event: MouseEvent,
    orderedItems: readonly { id: string }[],
    onActivate?: (id: string) => void,
  ) => void;
  setSelectedIds: (ids: Set<string>) => void;
  onItemClick?: (id: string) => void;
  onRequestDelete?: (id: string, name: string, type: TNavItemType) => void;
  onCreateThread?: (folderId?: string) => void;
  onRenameItem?: (id: string, name: string) => void;
  onMoveItem?: (id: string, parentId: string | null, position: number) => void;
  onBulkMove?: (ids: Set<string>, parentId: string | null, position: number) => void;
  autoEditId?: string | null;
  onAutoEditHandled?: () => void;
}

export const NavItems = ({
  items,
  activeItemId,
  selectedIds,
  onSelectClick,
  setSelectedIds,
  onItemClick,
  onRequestDelete,
  onCreateThread,
  onRenameItem,
  onMoveItem,
  onBulkMove,
  autoEditId,
  onAutoEditHandled,
}: INavItemsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations();

  const edit = useInlineEdit({
    items,
    autoEditId,
    onAutoEditHandled,
    onRename: onRenameItem,
    findItem: (id) => findInTree(items, id),
  });

  const {
    flattenedItems,
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
  } = useDndTree({ items, onMoveItem, onBulkMove, editingId: edit.editingId, selectedIds });

  const { rect: dragSelectRect } = useDragSelect({
    containerRef,
    onSelectionChange: setSelectedIds,
    enabled: activeId === null,
  });

  const handleItemClick = useCallback(
    (id: string, event: MouseEvent) => onSelectClick(id, event, flattenedItems, onItemClick),
    [flattenedItems, onSelectClick, onItemClick],
  );

  const previousAutoEditIdRef = useRef(autoEditId);
  useEffect(() => {
    if (autoEditId && autoEditId !== previousAutoEditIdRef.current) {
      const parentId = findParentId(items, autoEditId);
      if (parentId) expandForDrop(parentId);
    }
    previousAutoEditIdRef.current = autoEditId;
  }, [autoEditId, items, expandForDrop]);

  const isDragActive = activeId !== null;
  const activeItem = isDragActive ? flattenedItems.find((item) => item.id === activeId) : null;

  const isBulkDragActive = isDragActive && selectedIds.size > 1 && selectedIds.has(activeId);
  const bulkCount = isBulkDragActive ? selectedIds.size : undefined;

  const visualOverId = isPastLast ? (flattenedItems.at(-1)?.id ?? overId) : overId;
  const dropTargetId = isDragActive && (visualOverId !== activeId || isPastLast) ? visualOverId : null;
  const projectionFor = (itemId: string) => (itemId === dropTargetId ? projected : null);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      measuring={DND_MEASURING}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
        <div ref={containerRef} role="tree" aria-label={t.platform.sidebar.treeAriaLabel} className="space-y-0.5">
          {flattenedItems.map((item) => (
            <SortableNavItem
              key={item.id}
              item={item}
              activeItemId={activeItemId}
              isActivelyDragged={activeId === item.id}
              isSelected={selectedIds.has(item.id)}
              isBulkDragActive={isBulkDragActive}
              edit={edit}
              onItemClick={handleItemClick}
              onRequestDelete={onRequestDelete}
              onCreateThread={onCreateThread}
              onToggleCollapse={toggleCollapse}
              dropIndicator={projectionFor(item.id)?.zone ?? null}
              dropDepth={projectionFor(item.id)?.depth ?? null}
              isDragActive={isDragActive}
            />
          ))}
        </div>
      </SortableContext>

      <DragSelectOverlay rect={dragSelectRect} />

      {isDragActive &&
        typeof document !== 'undefined' &&
        createPortal(
          <DragOverlay dropAnimation={null}>
            {activeItem ? <DragOverlayContent item={activeItem} bulkCount={bulkCount} /> : null}
          </DragOverlay>,
          document.body,
        )}
    </DndContext>
  );
};
