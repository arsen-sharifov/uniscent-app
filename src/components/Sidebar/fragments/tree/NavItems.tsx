'use client';

import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useCallback, useEffect, useRef, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';

import type { TDropZone, TNavItem, TNavItemType } from '@interfaces';

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
  onToggleSelection: (id: string) => void;
  onSelectRange: (targetId: string, orderedItems: readonly { id: string }[]) => void;
  onClearAndSetAnchor: (id: string) => void;
  setSelectedIds: (ids: Set<string>) => void;
  onItemClick?: (id: string) => void;
  onRequestDelete?: (id: string, name: string, type: TNavItemType) => void;
  onCreateThread?: (folderId?: string) => void;
  onRenameItem?: (id: string, name: string) => void;
  onMoveItem?: (id: string, type: TNavItemType, parentId: string | null, position: number) => void;
  onBulkMove?: (ids: Set<string>, parentId: string | null, position: number) => void;
  autoEditId?: string | null;
  onAutoEditHandled?: () => void;
}

export const NavItems = ({
  items,
  activeItemId,
  selectedIds,
  onToggleSelection,
  onSelectRange,
  onClearAndSetAnchor,
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

  const { editingId, editValue, setEditValue, inputRef, startEditing, commitRename, handleKeyDown } = useInlineEdit({
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
  } = useDndTree({ items, onMoveItem, onBulkMove, editingId, selectedIds });

  const { rect: dragSelectRect } = useDragSelect({
    containerRef,
    onSelectionChange: setSelectedIds,
    enabled: activeId === null,
  });

  const handleItemClick = useCallback(
    (id: string, event: MouseEvent) => {
      if (event.shiftKey) {
        onSelectRange(id, flattenedItems);

        return;
      }
      if (event.ctrlKey || event.metaKey) {
        onToggleSelection(id);

        return;
      }
      onClearAndSetAnchor(id);
      onItemClick?.(id);
    },
    [flattenedItems, onSelectRange, onToggleSelection, onClearAndSetAnchor, onItemClick],
  );

  const prevAutoEditId = useRef(autoEditId);
  useEffect(() => {
    if (autoEditId && autoEditId !== prevAutoEditId.current) {
      const parentId = findParentId(items, autoEditId);
      if (parentId) expandForDrop(parentId);
    }
    prevAutoEditId.current = autoEditId;
  }, [autoEditId, items, expandForDrop]);

  const activeItem = activeId ? flattenedItems.find((item) => item.id === activeId) : null;

  const isBulkDragActive = activeId !== null && selectedIds.size > 1 && selectedIds.has(activeId);
  const bulkCount = isBulkDragActive ? selectedIds.size : undefined;

  const isDragActive = activeId !== null;

  const visualOverId = isPastLast ? (flattenedItems.at(-1)?.id ?? overId) : overId;

  const getDropIndicator = (itemId: string): TDropZone | null => {
    if (!activeId || !visualOverId || itemId !== visualOverId) return null;
    if (itemId === activeId && !isPastLast) return null;

    return projected?.zone ?? null;
  };

  const getDropDepth = (itemId: string): number | null => {
    if (!activeId || !visualOverId || itemId !== visualOverId) return null;
    if (itemId === activeId && !isPastLast) return null;

    return projected?.depth ?? null;
  };

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
              editingId={editingId}
              editValue={editValue}
              setEditValue={setEditValue}
              inputRef={inputRef}
              commitRename={commitRename}
              handleKeyDown={handleKeyDown}
              startEditing={startEditing}
              onItemClick={handleItemClick}
              onRequestDelete={onRequestDelete}
              onCreateThread={onCreateThread}
              onToggleCollapse={toggleCollapse}
              dropIndicator={getDropIndicator(item.id)}
              dropDepth={getDropDepth(item.id)}
              isDragActive={isDragActive}
            />
          ))}
        </div>
      </SortableContext>

      <DragSelectOverlay rect={dragSelectRect} />

      {activeId !== null &&
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
