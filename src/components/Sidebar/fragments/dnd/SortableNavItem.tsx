'use client';

import { useSortable } from '@dnd-kit/sortable';
import { clsx } from 'clsx';
import type { KeyboardEvent, MouseEvent } from 'react';

import type { IFlattenedItem, TDropZone, TNavItemType } from '@interfaces';

import { SelectionStrip } from '@/components/SelectionStrip';
import { useTranslations } from '@/i18n';
import { usePermissionsStore } from '@/lib/stores';

import { DropLineIndicator } from './DropLineIndicator';
import { GripActivator } from './GripActivator';
import { NavItemActions } from './NavItemActions';
import { NavItemButton } from './NavItemButton';
import { INDENTATION_WIDTH } from '../../consts';
import { getDragTransformStyle } from '../../utils';

interface ISortableNavItemProps {
  item: IFlattenedItem;
  activeItemId?: string;
  isActivelyDragged: boolean;
  editingId: string | null;
  editValue: string;
  setEditValue: (value: string) => void;
  inputRef: (element: HTMLInputElement | null) => void;
  commitRename: () => void;
  handleKeyDown: (event: KeyboardEvent) => void;
  startEditing: (id: string, name: string) => void;
  isSelected: boolean;
  isBulkDragActive: boolean;
  onItemClick?: (id: string, event: MouseEvent) => void;
  onRequestDelete?: (id: string, name: string, type: TNavItemType) => void;
  onCreateThread?: (folderId?: string) => void;
  onToggleCollapse: (id: string) => void;
  dropIndicator: TDropZone | null;
  dropDepth: number | null;
  isDragActive: boolean;
}

export const SortableNavItem = ({
  item,
  activeItemId,
  isActivelyDragged,
  isSelected,
  isBulkDragActive,
  editingId,
  editValue,
  setEditValue,
  inputRef,
  commitRename,
  handleKeyDown,
  startEditing,
  onItemClick,
  onRequestDelete,
  onCreateThread,
  onToggleCollapse,
  dropIndicator,
  dropDepth,
  isDragActive,
}: ISortableNavItemProps) => {
  const translations = useTranslations();
  const canManageStructure = usePermissionsStore((s) => s.canManageStructure);
  const isEditing = editingId === item.id;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: isEditing || !canManageStructure,
  });

  const isActive = item.id === activeItemId;
  const showsTools = !isEditing && canManageStructure;

  const handleClick = (event: MouseEvent) => {
    if (item.type === 'thread' || event.ctrlKey || event.metaKey || event.shiftKey) onItemClick?.(item.id, event);
    else if (item.childCount > 0) onToggleCollapse(item.id);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...getDragTransformStyle(transform, transition, isDragActive),
        paddingLeft: item.depth * INDENTATION_WIDTH,
      }}
      data-item-id={item.id}
      className={clsx(
        'group/item relative',
        isBulkDragActive && isSelected && !isActivelyDragged && 'h-0 overflow-hidden opacity-0',
      )}
    >
      {dropIndicator && dropIndicator !== 'inside' && (
        <DropLineIndicator position={dropIndicator} leftOffset={(dropDepth ?? item.depth) * INDENTATION_WIDTH + 6} />
      )}

      {isActive && <SelectionStrip className="z-10" />}

      <div
        className={clsx(
          'relative flex min-h-8 min-w-0 items-stretch overflow-hidden',
          isDragging && 'pointer-events-none rounded-lg opacity-40 shadow-[var(--shadow-card-hover)]',
        )}
      >
        <NavItemButton
          item={item}
          isActive={isActive}
          isSelected={isSelected}
          isEditing={isEditing}
          isDropTarget={dropIndicator === 'inside'}
          showsTools={showsTools}
          editValue={editValue}
          setEditValue={setEditValue}
          inputRef={inputRef}
          commitRename={commitRename}
          handleKeyDown={handleKeyDown}
          onClick={handleClick}
        />

        {showsTools && (
          <GripActivator
            setActivatorRef={setActivatorNodeRef}
            attributes={attributes}
            listeners={listeners}
            isActive={isActive}
            ariaLabel={translations.platform.sidebar.dragToReorder}
            onClick={handleClick}
            className="left-2"
          />
        )}

        {showsTools && !isDragging && (
          <NavItemActions
            item={item}
            isActive={isActive}
            isSelected={isSelected}
            startEditing={startEditing}
            onRequestDelete={onRequestDelete}
            onCreateThread={onCreateThread}
          />
        )}
      </div>
    </div>
  );
};
